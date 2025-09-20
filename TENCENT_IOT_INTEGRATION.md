# 腾讯 IoT 云集成指南

本指南说明如何在项目中使用腾讯 IoT 云来获取和管理设备连接状态。

## 功能概述

通过集成腾讯 IoT 云，`deviceMessageService` 可以：

1. **实时获取设备连接状态** - 通过 MQTT 订阅设备状态主题
2. **发送消息到设备** - 通过 MQTT 发布消息到设备
3. **同步设备列表** - 从后端 canister 同步设备信息
4. **自动状态更新** - 定期同步设备状态

## 环境配置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```bash
# 腾讯 IoT 云配置
VITE_TENCENT_IOT_PRODUCT_ID=your_product_id
VITE_TENCENT_IOT_DEVICE_NAME=your_device_name
VITE_TENCENT_IOT_DEVICE_SECRET=your_device_secret
VITE_TENCENT_IOT_REGION=ap-beijing
VITE_TENCENT_IOT_BROKER_URL=ssl://your_broker_url:8883
VITE_TENCENT_IOT_CLIENT_ID=your_client_id
```

## 使用方法

### 1. 初始化服务

```typescript
import { initializeDeviceMessageService } from './services/deviceMessageServiceInit';

// 在应用启动时调用
const success = await initializeDeviceMessageService();
if (success) {
  console.log('设备消息服务初始化成功');
}
```

### 2. 获取设备连接状态

```typescript
import { deviceMessageService } from './services/deviceMessageService';

// 检查是否有设备连接
const hasDevices = deviceMessageService.isAnyDeviceConnected();

// 获取连接的设备列表
const connectedDevices = deviceMessageService.getConnectedDevices();

// 获取腾讯 IoT 云设备状态
const tencentDevices = deviceMessageService.getTencentIoTDevices();
```

### 3. 发送消息到设备

```typescript
// 发送文本消息
const result = await deviceMessageService.sendTextToDevices('Hello, devices!');

// 发送像素艺术
const pixelArt = {
  deviceFormat: '{"pixels": [[1,2,3], [4,5,6]]}',
  width: 8,
  height: 8,
  palette: ['#FF0000', '#00FF00', '#0000FF']
};
await deviceMessageService.sendPixelArtToDevices(pixelArt);

// 发送 GIF
const gifInfo = {
  gifUrl: 'https://example.com/animation.gif',
  width: 100,
  height: 100,
  duration: 2000,
  title: 'Animation'
};
await deviceMessageService.sendGifToDevices(gifInfo);
```

### 4. 监控设备状态

```typescript
import { getDeviceConnectionSummary } from './services/deviceMessageServiceInit';

// 获取设备连接摘要
const summary = getDeviceConnectionSummary();
console.log(`总设备数: ${summary.totalDevices}`);
console.log(`连接设备数: ${summary.connectedDevices}`);
console.log(`腾讯 IoT 云启用: ${summary.tencentIoTEnabled}`);
```

## 架构说明

### 核心组件

1. **`tencentIoTService.ts`** - 腾讯 IoT 云 MQTT 客户端服务
2. **`deviceMessageService.ts`** - 设备消息管理服务（已更新）
3. **`deviceMessageServiceInit.ts`** - 初始化和管理脚本

### 数据流

```
后端 Canister ←→ realDeviceService ←→ deviceMessageService ←→ tencentIoTService ←→ 腾讯 IoT 云
                     ↓
                connectedDevices Map
```

### 状态同步机制

1. **初始化时** - 从 canister 获取设备列表
2. **MQTT 订阅** - 实时接收设备状态更新
3. **定期同步** - 每30秒同步一次设备状态
4. **状态映射** - 将腾讯云状态映射到本地 `connectedDevices`

## 故障处理

### 腾讯 IoT 云连接失败

如果腾讯 IoT 云连接失败，服务会自动降级到本地模式：

```typescript
// 检查是否启用了腾讯 IoT 云
const isEnabled = deviceMessageService.isTencentIoTEnabled();
if (!isEnabled) {
  console.log('使用本地设备管理模式');
}
```

### 重新初始化

```typescript
import { deviceMessageService } from './services/deviceMessageService';

// 重新初始化服务
await deviceMessageService.reinitialize();
```

### 清理资源

```typescript
import { cleanupDeviceMessageService } from './services/deviceMessageServiceInit';

// 清理资源
cleanupDeviceMessageService();
```

## 依赖安装

确保安装了 MQTT 客户端库：

```bash
npm install mqtt
npm install @types/mqtt --save-dev
```

## 注意事项

1. **环境变量** - 确保所有腾讯 IoT 云配置正确
2. **HTTPS** - MQTT 连接需要 HTTPS 环境
3. **网络** - 确保网络可以访问腾讯 IoT 云服务
4. **设备注册** - 设备需要在腾讯 IoT 云平台注册
5. **权限** - 确保有足够的权限访问设备状态和发送消息

## 调试

启用详细日志：

```typescript
// 在浏览器控制台查看详细日志
console.log('[DeviceMessageService] 设备状态:', deviceMessageService.getConnectedDevices());
console.log('[TencentIoTService] 腾讯云设备:', tencentIoTService.getDeviceStatuses());
```
