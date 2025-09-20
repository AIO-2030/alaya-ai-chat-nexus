// Tencent Cloud STS Service - Get temporary access tokens for IoT operations
import { getPrincipalId } from '../lib/principal';

// STS Token interface based on Tencent Cloud STS API
export interface STSToken {
  credentials: {
    token: string;        // Session token (对应文档中的Token)
    tmpSecretId: string;  // Temporary Secret ID (对应文档中的TmpSecretId)
    tmpSecretKey: string; // Temporary Secret Key (对应文档中的TmpSecretKey)
  };
  expiredTime: number;    // Expiration timestamp in seconds
  expiration: string;     // Expiration time in ISO8601 format
  requestId: string;      // Request ID
}

// STS Token request parameters
export interface STSRequestParams {
  durationSeconds?: number;
  policy?: string;
  roleSessionName?: string;
  roleArn?: string;
}

// Tencent Cloud STS API configuration
export interface STSConfig {
  region: string;
  secretId: string;
  secretKey: string;
  roleArn: string;
  roleSessionName: string;
}

// IoT Policy for device operations
export interface IoTPolicy {
  version: string;
  statement: Array<{
    effect: 'Allow' | 'Deny';
    action: string[];
    resource: string[];
  }>;
}

class TencentSTSService {
  private cachedToken: STSToken | null = null;
  private tokenExpiryTime: number = 0;
  private config: STSConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  // Initialize STS configuration
  private initializeConfig(): void {
    this.config = {
      region: import.meta.env.VITE_TENCENT_STS_REGION || 'ap-beijing',
      secretId: import.meta.env.VITE_TENCENT_STS_SECRET_ID || '',
      secretKey: import.meta.env.VITE_TENCENT_STS_SECRET_KEY || '',
      roleArn: import.meta.env.VITE_TENCENT_STS_ROLE_ARN || '',
      roleSessionName: import.meta.env.VITE_TENCENT_STS_ROLE_SESSION_NAME || 'iot-device-access'
    };
  }

  // Get temporary STS token for IoT operations
  async getSTSToken(params?: STSRequestParams): Promise<STSToken> {
    try {
      // Check if we have a valid cached token
      if (this.cachedToken && Date.now() < this.tokenExpiryTime) {
        console.log('[TencentSTS] Using cached STS token');
        return this.cachedToken;
      }

      console.log('[TencentSTS] Requesting new STS token...');

      if (!this.config) {
        throw new Error('STS configuration not initialized');
      }

      // Get current user's principal ID
      const principalId = getPrincipalId();
      if (!principalId) {
        throw new Error('User principal ID not found. Please ensure you are authenticated.');
      }

      // Prepare STS request parameters
      const stsParams = {
        Action: 'AssumeRole',
        Version: '2018-08-13',
        Region: this.config.region,
        RoleArn: params?.roleArn || this.config.roleArn,
        RoleSessionName: params?.roleSessionName || this.config.roleSessionName,
        DurationSeconds: params?.durationSeconds || 3600, // Default 1 hour
        Policy: params?.policy || this.getDefaultIoTPolicy()
      };

      // Call Tencent Cloud STS API
      const response = await this.callTencentSTSAPI(stsParams);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get STS token');
      }

      // Cache the token
      this.cachedToken = response.data;
      this.tokenExpiryTime = response.data.expiredTime * 1000; // Convert to milliseconds

      console.log('[TencentSTS] STS token obtained successfully');
      return response.data;

    } catch (error) {
      console.error('[TencentSTS] Failed to get STS token:', error);
      throw new Error('STS token request failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Call Tencent Cloud STS API
  private async callTencentSTSAPI(params: any): Promise<{ success: boolean; data?: STSToken; error?: string }> {
    try {
      if (!this.config) {
        throw new Error('STS configuration not initialized');
      }

      console.log('[TencentSTS] Calling Tencent Cloud STS API:', params);

      // For production, you should use proper signature authentication
      // For now, we'll use a backend proxy approach for security
      const response = await this.callSTSViaBackend(params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get STS token from backend');
      }

      return response;

    } catch (error) {
      console.error('[TencentSTS] STS API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'STS API call failed'
      };
    }
  }

  // Call STS via backend proxy for security
  private async callSTSViaBackend(params: any): Promise<{ success: boolean; data?: STSToken; error?: string }> {
    try {
      // This should call your backend canister which has the STS credentials
      // The backend will make the actual STS API call with proper authentication
      console.log('[TencentSTS] Calling STS via backend proxy:', params);

      // For now, simulate the backend call
      // In production, replace this with actual backend canister call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock STS token response based on Tencent Cloud STS API format
      const mockToken: STSToken = {
        credentials: {
          token: `mock_token_${Date.now()}`,
          tmpSecretId: `mock_tmp_secret_id_${Date.now()}`,
          tmpSecretKey: `mock_tmp_secret_key_${Date.now()}`
        },
        expiredTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        expiration: new Date(Date.now() + 3600 * 1000).toISOString(),
        requestId: `mock_request_id_${Date.now()}`
      };

      return {
        success: true,
        data: mockToken
      };

    } catch (error) {
      console.error('[TencentSTS] Backend STS call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend STS call failed'
      };
    }
  }

  // Get default IoT policy for device operations
  private getDefaultIoTPolicy(): string {
    const policy: IoTPolicy = {
      version: '2.0',
      statement: [
        {
          effect: 'Allow',
          action: [
            'iot:GetDevice',
            'iot:GetDeviceStatus',
            'iot:GetDeviceShadow',
            'iot:UpdateDeviceShadow',
            'iot:GetDeviceList',
            'iot:GetDeviceStatistics',
            'iot:GetDeviceLogs',
            'iot:SendMessageToDevice',
            'iot:GetDeviceMessage',
            'iot:GetDeviceProperty',
            'iot:SetDeviceProperty'
          ],
          resource: ['*']
        }
      ]
    };

    return JSON.stringify(policy);
  }

  // Check if current token is valid
  isTokenValid(): boolean {
    return this.cachedToken !== null && Date.now() < this.tokenExpiryTime;
  }

  // Get current token (if valid)
  getCurrentToken(): STSToken | null {
    if (this.isTokenValid()) {
      return this.cachedToken;
    }
    return null;
  }

  // Clear cached token
  clearToken(): void {
    this.cachedToken = null;
    this.tokenExpiryTime = 0;
  }

  // Get token expiry time
  getTokenExpiryTime(): number {
    return this.tokenExpiryTime;
  }

  // Check if token will expire soon (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    return this.tokenExpiryTime > 0 && (this.tokenExpiryTime - Date.now()) < 5 * 60 * 1000;
  }

  // Refresh token if needed
  async refreshTokenIfNeeded(): Promise<STSToken | null> {
    if (!this.isTokenValid() || this.isTokenExpiringSoon()) {
      console.log('[TencentSTS] Token expired or expiring soon, refreshing...');
      return await this.getSTSToken();
    }
    return this.getCurrentToken();
  }

  // Get STS configuration
  getConfig(): STSConfig | null {
    return this.config;
  }

  // Check if configuration is valid
  isConfigValid(): boolean {
    return !!(this.config && 
              this.config.region && 
              this.config.roleArn && 
              this.config.roleSessionName);
  }
}

// Export singleton instance
export const tencentSTSService = new TencentSTSService();
