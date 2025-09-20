# 设备配置替换指南

## 🎯 快速替换清单

### 1. GATT UUID替换（优先级：高）

#### 在 `realDeviceService.ts` 中替换以下占位符：

```typescript
// 第809-811行：WiFi扫描服务
const wifiServiceUUID = 'YOUR_WIFI_SERVICE_UUID';
const wifiScanCommandCharacteristicUUID = 'YOUR_WIFI_SCAN_COMMAND_UUID';
const wifiScanResponseCharacteristicUUID = 'YOUR_WIFI_SCAN_RESPONSE_UUID';

// 第841-842行：WiFi网络读取
const wifiNetworksCharacteristicUUID = 'YOUR_WIFI_NETWORKS_UUID';

// 第1081-1082行：WiFi配置
const wifiConfigCharacteristicUUID = 'YOUR_WIFI_CONFIG_UUID';

// 第1170-1171行：激活码服务
const activationServiceUUID = 'YOUR_ACTIVATION_SERVICE_UUID';
const activationCodeCharacteristicUUID = 'YOUR_ACTIVATION_CODE_UUID';
```

#### 在 `deviceInitManager.ts` 中替换以下占位符：

```typescript
// 第160行：设备信息服务
const deviceInfoService = await gattServer.getPrimaryService('YOUR_DEVICE_INFO_SERVICE_UUID');

// 第163-171行：设备信息特征
const productIdChar = await deviceInfoService.getCharacteristic('YOUR_PRODUCT_ID_UUID');
const deviceNameChar = await deviceInfoService.getCharacteristic('YOUR_DEVICE_NAME_UUID');
const deviceSecretChar = await deviceInfoService.getCharacteristic('YOUR_DEVICE_SECRET_UUID');

// 第350-351行：设备状态服务
const statusService = await gattServer.getPrimaryService('YOUR_DEVICE_STATUS_SERVICE_UUID');
const statusCharacteristic = await statusService.getCharacteristic('YOUR_PROVISIONING_STATUS_UUID');
```

### 2. 协议格式确认（优先级：高）

#### WiFi扫描命令格式确认：
```typescript
// 第1014-1029行：createWiFiScanCommand方法
// 确认命令格式是否符合设备要求
const commandData = new Uint8Array(8);
commandData[0] = 0x01;  // 确认：命令类型
commandData[1] = 0x00;  // 确认：扫描类型（0x00=主动，0x01=被动）
// 确认：超时时间格式和字节序
// 确认：保留字节数量
```

#### WiFi网络数据解析确认：
```typescript
// 第881-919行：parseWiFiNetworksData方法
// 确认数据格式是否符合设备协议
// 确认字段顺序和字节长度
// 确认编码格式（UTF-8）
```

#### 设备状态数据解析确认：
```typescript
// 第372-403行：parseDeviceStatus方法
// 确认数据格式是否符合设备协议
// 确认字段顺序和字节长度
// 确认时间戳格式
```

### 3. 超时配置调整（优先级：中）

```typescript
// 第1021行：WiFi扫描超时
const timeoutSeconds = 10; // 根据设备性能调整

// 第941行：扫描命令响应超时
setTimeout(() => {
  reject(new Error('Scan command response timeout'));
}, 15000); // 根据设备响应时间调整

// 第312-313行：设备状态轮询
const maxAttempts = 30;     // 根据配网时间调整
const pollInterval = 2000;  // 根据设备状态更新频率调整
```

### 4. 安全类型映射确认（优先级：中）

```typescript
// 第1041-1048行：mapSecurityType方法
// 确认安全类型数值映射是否符合设备规范
switch (securityType) {
  case 0: return 'Open';
  case 1: return 'WEP';
  case 2: return 'WPA';
  case 3: return 'WPA2';
  case 4: return 'WPA3';
  default: return 'Unknown';
}
```

### 5. 模拟数据替换（优先级：中）

```typescript
// 第1270行：设备密钥模拟
deviceSecret: 'mock_device_secret', // 替换为真实读取

// 第1296行：MQTT连接状态模拟
return true; // 替换为真实MQTT状态检查

// 第1268-1273行：激活状态模拟
return {
  isActivated: true,  // 替换为真实状态读取
  deviceSecret: 'mock_device_secret', // 替换为真实读取
  mqttConnected: false, // 替换为真实状态检查
  lastSeen: new Date().toISOString()
};
```

## 🔧 具体实施步骤

### 步骤1：准备设备规格文档
1. 收集设备的GATT服务架构图
2. 获取所有服务和特征的UUID
3. 确认数据协议规范文档
4. 了解设备的错误码定义

### 步骤2：创建配置常量文件
```typescript
// 新建文件：src/config/deviceConfig.ts
export const DEVICE_CONFIG = {
  // GATT服务UUID
  SERVICES: {
    WIFI: 'your-wifi-service-uuid',
    DEVICE_INFO: 'your-device-info-service-uuid',
    ACTIVATION: 'your-activation-service-uuid',
    STATUS: 'your-status-service-uuid'
  },
  
  // GATT特征UUID
  CHARACTERISTICS: {
    WIFI_SCAN_COMMAND: 'your-wifi-scan-command-uuid',
    WIFI_SCAN_RESPONSE: 'your-wifi-scan-response-uuid',
    WIFI_NETWORKS: 'your-wifi-networks-uuid',
    WIFI_CONFIG: 'your-wifi-config-uuid',
    PRODUCT_ID: 'your-product-id-uuid',
    DEVICE_NAME: 'your-device-name-uuid',
    DEVICE_SECRET: 'your-device-secret-uuid',
    ACTIVATION_CODE: 'your-activation-code-uuid',
    PROVISIONING_STATUS: 'your-provisioning-status-uuid'
  },
  
  // 协议配置
  PROTOCOL: {
    WIFI_SCAN_TIMEOUT: 10,
    SCAN_RESPONSE_TIMEOUT: 15,
    STATUS_POLL_INTERVAL: 2000,
    MAX_POLL_ATTEMPTS: 30
  },
  
  // 安全类型映射
  SECURITY_TYPES: {
    0: 'Open',
    1: 'WEP',
    2: 'WPA',
    3: 'WPA2',
    4: 'WPA3'
  }
};
```

### 步骤3：更新服务文件
1. 导入配置常量
2. 替换所有硬编码的UUID
3. 替换所有硬编码的超时值
4. 替换所有硬编码的协议参数

### 步骤4：测试和验证
1. 单元测试：测试所有GATT操作
2. 集成测试：测试完整的配网流程
3. 错误测试：测试各种错误情况
4. 性能测试：测试超时和重试机制

## ⚠️ 注意事项

1. **UUID格式**：确保UUID格式正确（标准128位UUID格式）
2. **字节序**：确认多字节数据的字节序（大端序/小端序）
3. **编码格式**：确认字符串数据的编码格式（UTF-8）
4. **错误处理**：实现完整的错误码映射和处理
5. **向后兼容**：保持API接口的向后兼容性

## 📋 验证清单

- [ ] 所有GATT UUID已替换
- [ ] 数据协议格式已确认
- [ ] 超时配置已调整
- [ ] 安全类型映射已确认
- [ ] 模拟数据已替换
- [ ] 错误处理已完善
- [ ] 单元测试已通过
- [ ] 集成测试已通过
- [ ] 性能测试已通过

## 🚀 部署建议

1. **分阶段部署**：先部署到测试环境验证
2. **回滚准备**：准备快速回滚方案
3. **监控配置**：添加详细的日志和监控
4. **用户通知**：提前通知用户可能的配置变更

---

**重要**：在替换任何配置之前，请确保与设备方充分沟通，确认所有技术细节。
