# 腾讯云STS集成总结

## 概述

根据用户要求，dapp不再持有和消费device_secret，而是使用腾讯云STS服务获取临时访问token。这提高了安全性，避免了长期存储敏感凭据的风险。

## 主要变更

### 1. 新增文件

#### `src/services/tencentSTS.ts`
- **功能**: 腾讯云STS服务，用于获取临时访问token
- **主要特性**:
  - 自动token缓存和刷新
  - 基于用户principal ID的认证
  - 默认IoT策略配置
  - Token过期检测和自动续期

#### `src/services/tencentSTS.ts` 主要接口:
```typescript
interface STSToken {
  credentials: {
    sessionToken: string;
    tmpSecretId: string;
    tmpSecretKey: string;
  };
  expiredTime: number;
  expiration: string;
  requestId: string;
}
```

### 2. 修改的文件

#### `src/services/tencentIoTService.ts`
- **移除**: `deviceSecret` 字段从 `TencentIoTConfig` 接口
- **新增**: STS token集成
  - 使用STS session token作为MQTT密码
  - 自动token刷新机制
  - Token过期检测

#### `src/services/realDeviceService.ts`
- **移除**: `deviceSecret` 字段从 `DeviceRecord` 和 `DeviceStatus` 接口
- **简化**: 设备状态检查逻辑，不再需要device_secret

#### `src/services/deviceInitManager.ts`
- **移除**: device_secret相关的GATT读取逻辑
- **简化**: 设备信息获取，只读取productId和deviceName

## 安全改进

### 1. 临时凭据
- 使用STS临时token替代长期device_secret
- Token自动过期和刷新
- 基于用户身份的访问控制

### 2. 最小权限原则
- STS策略只包含必要的IoT操作权限
- 临时token限制访问范围
- 基于principal ID的访问控制

### 3. 无敏感数据存储
- dapp不再存储device_secret
- 所有敏感操作通过STS token进行
- 减少数据泄露风险

## 技术实现

### 1. STS Token获取流程
```typescript
// 1. 获取用户principal ID
const principalId = getPrincipalId();

// 2. 请求STS token
const stsToken = await tencentSTSService.getSTSToken({
  durationSeconds: 3600, // 1小时有效期
  policy: iotPolicy,     // IoT操作策略
  roleSessionName: `iot-access-${Date.now()}`
});

// 3. 使用token作为MQTT密码
const mqttOptions = {
  username: `${productId}${deviceName}`,
  password: stsToken.credentials.token
};
```

### 2. 自动Token刷新
```typescript
// 每5分钟检查token状态
setInterval(async () => {
  if (mqttClient.connected) {
    await refreshSTSToken();
  }
}, 5 * 60 * 1000);
```

### 3. 设备配网流程更新
1. 蓝牙设备扫描和连接
2. 从GATT读取productId和deviceName（不再读取device_secret）
3. WiFi配置
4. 使用STS token进行MQTT连接
5. 设备状态验证

## 配置要求

### 1. 环境变量
```env
# 腾讯云IoT配置
VITE_TENCENT_IOT_PRODUCT_ID=your_product_id
VITE_TENCENT_IOT_DEVICE_NAME=your_device_name
VITE_TENCENT_IOT_REGION=ap-beijing
VITE_TENCENT_IOT_BROKER_URL=ssl://your_broker_url:8883
VITE_TENCENT_IOT_CLIENT_ID=your_client_id

# 腾讯云STS配置
VITE_TENCENT_STS_REGION=ap-beijing
VITE_TENCENT_STS_SECRET_ID=your_secret_id
VITE_TENCENT_STS_SECRET_KEY=your_secret_key
VITE_TENCENT_STS_ROLE_ARN=qcs::cam::uin/123456789:roleName/IoTDeviceRole
VITE_TENCENT_STS_ROLE_SESSION_NAME=iot-device-access
```

### 2. 后端canister集成
- 需要实现STS token获取接口
- 基于用户principal ID进行认证
- 返回临时访问凭据

## 兼容性

### 1. 向后兼容
- 保持现有的设备配网流程
- 保持现有的MQTT通信接口
- 保持现有的设备状态管理

### 2. 数据迁移
- 现有设备记录中的device_secret字段将被忽略
- 新的设备记录只包含productId
- 所有IoT操作通过STS token进行

## 安全考虑

### 1. Token管理
- Token自动过期（默认1小时）
- 自动刷新机制
- 连接断开时清理token

### 2. 权限控制
- 基于用户principal ID的访问控制
- 最小权限原则的STS策略
- 临时访问凭据，无长期存储

### 3. 错误处理
- Token获取失败时的降级处理
- 网络错误时的重试机制
- 用户认证失败时的清理

## 测试建议

### 1. 功能测试
- STS token获取和刷新
- MQTT连接使用STS token
- 设备配网流程完整性
- Token过期处理

### 2. 安全测试
- Token权限验证
- 过期token处理
- 用户认证失败处理
- 网络异常处理

### 3. 性能测试
- Token获取延迟
- 自动刷新性能
- MQTT连接稳定性
- 内存使用情况

## 部署注意事项

### 1. 环境配置
- 确保后端canister支持STS token获取
- 配置正确的腾讯云STS权限
- 设置合适的token过期时间

### 2. 监控
- 监控STS token获取成功率
- 监控MQTT连接稳定性
- 监控token刷新频率

### 3. 日志
- 记录STS token获取和刷新
- 记录MQTT连接状态
- 记录设备配网过程

## 总结

通过集成腾讯云STS服务，dapp现在使用临时访问token而不是长期存储的device_secret，大大提高了安全性。这种设计符合现代安全最佳实践，减少了敏感数据泄露的风险，同时保持了良好的用户体验。
