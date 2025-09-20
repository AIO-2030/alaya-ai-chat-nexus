# 设备集成元数据配置指南

## 📋 概述

本文档详细列出了`realDeviceService.ts`和`deviceInitManager.ts`中所有需要设备方确认和配置的元数据值，包括占位符、默认值和协议定义。

## 🔧 GATT服务和特征UUID配置

### 1. WiFi配置服务
```typescript
// 当前占位符 → 需要设备方提供真实UUID
const wifiServiceUUID = '12345678-1234-1234-1234-123456789abc';
const wifiScanCommandCharacteristicUUID = '12345678-1234-1234-1234-123456789abe';
const wifiScanResponseCharacteristicUUID = '12345678-1234-1234-1234-123456789abf';
const wifiNetworksCharacteristicUUID = '12345678-1234-1234-1234-123456789abd';
const wifiConfigCharacteristicUUID = '12345678-1234-1234-1234-123456789abe';
```

### 2. 设备信息服务
```typescript
// 当前占位符 → 需要设备方提供真实UUID
const deviceInfoServiceUUID = 'device_info_service_uuid';
const productIdCharacteristicUUID = 'product_id_uuid';
const deviceNameCharacteristicUUID = 'device_name_uuid';
const deviceSecretCharacteristicUUID = 'device_secret_uuid';
```

### 3. 激活码服务
```typescript
// 当前占位符 → 需要设备方提供真实UUID
const activationServiceUUID = '12345678-1234-1234-1234-123456789acf';
const activationCodeCharacteristicUUID = '12345678-1234-1234-1234-123456789ad0';
```

### 4. 设备状态服务
```typescript
// 当前占位符 → 需要设备方提供真实UUID
const deviceStatusServiceUUID = 'device_status_service_uuid';
const provisioningStatusCharacteristicUUID = 'provisioning_status_uuid';
```

## 📊 数据协议定义

### 1. WiFi扫描命令协议
```typescript
// 当前实现格式（需要设备方确认）
interface WiFiScanCommand {
  commandType: number;    // 0x01 = WiFi扫描命令
  scanType: number;       // 0x00 = 主动扫描, 0x01 = 被动扫描
  timeout: number;        // 超时时间（秒，小端序）
  reserved: number[];     // 保留字节（4字节）
}

// 默认值配置
const DEFAULT_SCAN_TIMEOUT = 10; // 秒
const DEFAULT_SCAN_TYPE = 0x00;  // 主动扫描
```

### 2. WiFi网络数据解析协议
```typescript
// 当前实现格式（需要设备方确认）
interface WiFiNetworkData {
  nameLength: number;     // 网络名称长度（1字节）
  name: string;           // 网络名称（UTF-8编码）
  securityType: number;   // 安全类型（1字节）
  strength: number;       // 信号强度（1字节，有符号）
  frequency: number;      // 频率（2字节，大端序）
  channel: number;        // 信道（1字节）
}

// 安全类型映射（需要设备方确认）
const SECURITY_TYPE_MAP = {
  0: 'Open',
  1: 'WEP',
  2: 'WPA',
  3: 'WPA2',
  4: 'WPA3'
};
```

### 3. 设备状态数据协议
```typescript
// 当前实现格式（需要设备方确认）
interface DeviceStatusData {
  isProvisioned: boolean;      // 是否已配网（1字节）
  isConnectedToWifi: boolean;  // 是否连接WiFi（1字节）
  wifiSSID: string;           // WiFi SSID（长度+数据）
  ipAddress: string;          // IP地址（长度+数据）
  timestamp: number;          // 时间戳（4字节，小端序）
}
```

### 4. WiFi配置数据协议
```typescript
// 当前实现格式（需要设备方确认）
interface WiFiConfigData {
  ssidLength: number;     // SSID长度（1字节）
  ssid: string;           // SSID（UTF-8编码）
  passwordLength: number; // 密码长度（1字节）
  password: string;       // 密码（UTF-8编码）
  securityLength: number; // 安全类型长度（1字节）
  security: string;       // 安全类型（UTF-8编码）
}
```

## ⏱️ 超时和重试配置

### 1. 连接超时设置
```typescript
// 当前默认值（需要设备方确认）
const GATT_CONNECTION_TIMEOUT = 10000;        // 10秒
const SCAN_COMMAND_RESPONSE_TIMEOUT = 15000;  // 15秒
const DEVICE_STATUS_POLL_INTERVAL = 2000;     // 2秒
const MAX_POLL_ATTEMPTS = 30;                 // 30次
```

### 2. 重试机制
```typescript
// 当前实现（需要设备方确认）
const RETRY_STRATEGIES = {
  gattConnection: 'immediate',     // GATT连接重试策略
  wifiScan: 'exponential_backoff', // WiFi扫描重试策略
  deviceStatus: 'linear_interval'  // 设备状态轮询策略
};
```

## 🔐 认证和激活配置

### 1. 设备认证流程
```typescript
// 当前模拟实现（需要设备方确认）
interface DeviceActivationStatus {
  isActivated: boolean;
  deviceSecret?: string;    // 当前为 'mock_device_secret'
  mqttConnected: boolean;   // 当前为模拟值
  lastSeen?: string;
}
```

### 2. MQTT连接状态
```typescript
// 当前模拟实现（需要设备方确认）
const MQTT_CONNECTION_CHECK = {
  enabled: true,
  timeout: 5000,           // 5秒超时
  retryCount: 3,           // 重试3次
  mockValue: true          // 当前返回固定值true
};
```

## 🎯 设备能力配置

### 1. 默认设备能力
```typescript
// 当前默认配置（需要设备方确认）
const DEFAULT_CAPABILITIES = {
  Mobile: ['Audio', 'Video', 'Network'],
  Desktop: ['Compute', 'Storage', 'Network'],
  Server: ['Compute', 'Storage', 'Network'],
  IoT: ['Sensor', 'Network'],
  Embedded: ['Sensor', 'Compute'],
  Other: ['Network']
};
```

### 2. 设备类型映射
```typescript
// 当前映射规则（需要设备方确认）
const DEVICE_TYPE_MAPPING = {
  'mobile': 'Mobile',
  'phone': 'Mobile',
  'smartphone': 'Mobile',
  'desktop': 'Desktop',
  'computer': 'Desktop',
  'pc': 'Desktop',
  'server': 'Server',
  'iot': 'IoT',
  'internet of things': 'IoT',
  'embedded': 'Embedded'
};
```

## 🚨 错误处理配置

### 1. 错误码映射
```typescript
// 需要设备方提供完整的错误码列表
const ERROR_CODES = {
  // GATT连接错误
  GATT_CONNECTION_FAILED: 'GATT连接失败',
  GATT_SERVICE_NOT_FOUND: 'GATT服务未找到',
  GATT_CHARACTERISTIC_NOT_FOUND: 'GATT特征未找到',
  
  // WiFi配置错误
  WIFI_SCAN_FAILED: 'WiFi扫描失败',
  WIFI_CONFIG_FAILED: 'WiFi配置失败',
  WIFI_CONNECTION_FAILED: 'WiFi连接失败',
  
  // 设备激活错误
  ACTIVATION_CODE_INVALID: '激活码无效',
  DEVICE_NOT_ACTIVATED: '设备未激活',
  MQTT_CONNECTION_FAILED: 'MQTT连接失败'
};
```

### 2. 错误恢复策略
```typescript
// 当前实现（需要设备方确认）
const ERROR_RECOVERY = {
  gattDisconnected: 'reconnect',
  wifiScanTimeout: 'retry_with_backoff',
  activationFailed: 'manual_retry',
  mqttConnectionLost: 'reconnect_with_retry'
};
```

## 📝 实施检查清单

### 阶段1：基础配置
- [ ] 提供所有GATT服务和特征的UUID
- [ ] 确认数据协议格式和字节序
- [ ] 验证安全类型映射表
- [ ] 确认超时时间设置

### 阶段2：协议实现
- [ ] 实现WiFi扫描命令协议
- [ ] 实现WiFi网络数据解析
- [ ] 实现设备状态数据解析
- [ ] 实现WiFi配置数据格式

### 阶段3：错误处理
- [ ] 提供完整的错误码列表
- [ ] 实现错误恢复策略
- [ ] 添加重试机制
- [ ] 实现超时处理

### 阶段4：认证和激活
- [ ] 实现真实的设备认证流程
- [ ] 实现MQTT连接状态检查
- [ ] 实现激活码验证
- [ ] 实现设备状态轮询

### 阶段5：测试和优化
- [ ] 测试所有GATT操作
- [ ] 验证数据解析正确性
- [ ] 测试错误处理机制
- [ ] 优化性能和稳定性

## 🔄 配置更新流程

1. **设备方提供配置**：按照上述格式提供所有必需的元数据
2. **代码更新**：替换所有占位符和默认值
3. **测试验证**：确保所有功能正常工作
4. **文档更新**：更新相关技术文档
5. **部署发布**：发布更新后的代码

## 📞 联系信息

如有任何配置问题或需要技术支持，请联系开发团队。

---

**注意**：本文档中的所有占位符和默认值都需要根据实际设备规格进行替换和配置。
