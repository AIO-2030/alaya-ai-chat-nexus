# Tencent Cloud STS Configuration Guide

## Environment Variables Configuration

According to the [Tencent Cloud STS Service Documentation](https://cloud.tencent.com/document/product/1312/48196), the following parameters need to be configured in environment variables:

### 1. Tencent Cloud IoT Configuration
```env
VITE_TENCENT_IOT_PRODUCT_ID=your_product_id
VITE_TENCENT_IOT_DEVICE_NAME=your_device_name
VITE_TENCENT_IOT_REGION=ap-beijing
VITE_TENCENT_IOT_BROKER_URL=ssl://your_broker_url:8883
VITE_TENCENT_IOT_CLIENT_ID=your_client_id
```

### 2. Tencent Cloud STS Configuration
```env
VITE_TENCENT_STS_REGION=ap-beijing
VITE_TENCENT_STS_SECRET_ID=your_secret_id
VITE_TENCENT_STS_SECRET_KEY=your_secret_key
VITE_TENCENT_STS_ROLE_ARN=qcs::cam::uin/123456789:roleName/IoTDeviceRole
VITE_TENCENT_STS_ROLE_SESSION_NAME=iot-device-access
```

## Tencent Cloud STS API Interface Description

### Interface Information
- **Interface Name**: AssumeRole
- **Interface Version**: 2018-08-13
- **Request Domain**: sts.tencentcloudapi.com
- **Request Method**: POST

### Request Parameters
| Parameter Name | Required | Type | Description |
|---------|------|------|------|
| Action | Yes | String | Interface value: AssumeRole |
| Version | Yes | String | Interface version: 2018-08-13 |
| Region | Yes | String | Region information |
| RoleArn | Yes | String | Role access descriptor name |
| RoleSessionName | Yes | String | Session name |
| DurationSeconds | No | Integer | Temporary access credential validity period (seconds), default 7200 seconds, maximum 43200 seconds |
| Policy | No | String | Policy description |

### Response Parameters
| Parameter Name | Type | Description |
|---------|------|------|
| Credentials | Object | Contains Token, TmpSecretId, TmpSecretKey triplet |
| ExpiredTime | Integer | Temporary access credential expiration time (Unix timestamp) |
| Expiration | String | Temporary access credential expiration time (ISO8601 format) |
| RequestId | String | Unique request ID |

## Security Considerations

### 1. Frontend Security
- **Do not directly expose SecretId and SecretKey**: Frontend code should not contain real Tencent Cloud credentials
- **Use backend proxy**: Recommend using backend canister to proxy STS API calls
- **Environment variable protection**: Sensitive configurations managed through environment variables

### 2. Backend Implementation Suggestions
```typescript
// Backend canister should implement STS proxy interface
interface STSProxyRequest {
  principalId: string;
  durationSeconds?: number;
  policy?: string;
  roleSessionName?: string;
}

interface STSProxyResponse {
  success: boolean;
  data?: {
    credentials: {
      token: string;
      tmpSecretId: string;
      tmpSecretKey: string;
    };
    expiredTime: number;
    expiration: string;
    requestId: string;
  };
  error?: string;
}
```

### 3. Permission Policy Example
```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "Allow",
      "action": [
        "iot:GetDevice",
        "iot:GetDeviceStatus",
        "iot:GetDeviceShadow",
        "iot:UpdateDeviceShadow",
        "iot:GetDeviceList",
        "iot:GetDeviceStatistics",
        "iot:GetDeviceLogs",
        "iot:SendMessageToDevice",
        "iot:GetDeviceMessage",
        "iot:GetDeviceProperty",
        "iot:SetDeviceProperty"
      ],
      "resource": ["*"]
    }
  ]
}
```

## Usage Flow

### 1. Configure Environment Variables
Create `.env.local` file in the project root directory and configure the above environment variables.

### 2. Backend Canister Implementation
Implement STS proxy interface to handle Tencent Cloud STS API calls.

### 3. Frontend Call
```typescript
import { tencentSTSService } from './services/tencentSTS';

// Get STS token
const stsToken = await tencentSTSService.getSTSToken({
  durationSeconds: 3600,
  policy: customPolicy
});

// Use token for MQTT connection
const mqttOptions = {
  username: `${productId}${deviceName}`,
  password: stsToken.credentials.token
};
```

## Error Handling

### Common Error Codes
- `InvalidParameter.ParamError`: Parameter error
- `InvalidParameter.StrategyInvalid`: Invalid policy
- `ResourceNotFound.RoleNotFound`: Role not found
- `UnauthorizedOperation`: Unauthorized operation

### Error Handling Example
```typescript
try {
  const stsToken = await tencentSTSService.getSTSToken();
} catch (error) {
  if (error.message.includes('RoleNotFound')) {
    console.error('STS role does not exist, please check RoleArn configuration');
  } else if (error.message.includes('UnauthorizedOperation')) {
    console.error('STS operation unauthorized, please check permission configuration');
  } else {
    console.error('STS token acquisition failed:', error.message);
  }
}
```

## Monitoring and Logging

### 1. Monitoring Metrics
- STS token acquisition success rate
- Token refresh frequency
- MQTT connection stability

### 2. Logging
- STS API call logs
- Token expiration time
- Error message records

## Testing Recommendations

### 1. Unit Tests
- STS token acquisition tests
- Token caching and refresh tests
- Error handling tests

### 2. Integration Tests
- End-to-end MQTT connection tests
- Permission verification tests
- Network exception handling tests

### 3. Security Tests
- Sensitive information leak checks
- Permission boundary tests
- Exception handling tests
