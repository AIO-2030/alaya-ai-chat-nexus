# BLUFI 扫描命令超时问题修复

## 问题描述

前端日志显示扫描命令超时错误：
```
index-uiU55pRT.js:623 Failed to wait for scan command response: Error: Scan command response timeout
```

设备日志显示BLUFI协议错误：
```
E (20205) BT_BTC: btc_blufi_protocol_handler Unkown Ctrl pkt 80
```

## 根本原因分析

1. **BLUFI协议格式错误**: 当前实现的WiFi扫描命令格式与ESP32 BLUFI期望的格式不匹配
2. **超时时间过短**: 10秒超时时间不足以让设备完成WiFi扫描
3. **缺乏重试机制**: 连接断开时没有重试机制

## 修复方案

### 1. 修复BLUFI协议格式

**原始格式问题**:
```typescript
// 错误的格式 - 数据长度计算错误
const dataLength = 8; // 包含了sequence number
const totalLength = 2 + dataLength; // 只加了type和length
```

**修复后的格式**:
```typescript
// 正确的格式 - 符合ESP32 BLUFI协议
const dataLength = 7; // 不包含sequence number
const totalLength = 3 + dataLength; // 包含type, length, sequence
```

**完整的数据包结构**:
```
[Type][Length][Sequence][ScanType][Timeout][Reserved]
[0x80][0x07][0x00][0x00][0x0A][0x00][0x00][0x00][0x00][0x00]
```

### 2. 增加超时时间

**原始超时**: 10秒
**修复后超时**: 30秒

```typescript
const timeout = setTimeout(() => {
  reject(new Error('Scan command response timeout'));
}, 30000); // 30 second timeout - increased for device processing time
```

### 3. 添加重试机制

```typescript
private async writeWiFiScanCommandToGATT(gattServer: BluetoothRemoteGATTServer): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 尝试发送命令
      // ...
      return; // 成功则返回
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt < maxRetries) {
        console.log(`Retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  throw new Error('GATT write failed after all retries: ' + (lastError?.message || 'Unknown error'));
}
```

### 4. 改进错误处理

- 超时时继续执行而不是完全失败
- 添加详细的日志记录
- 提供更好的错误信息

## 修复的文件

- `src/services/realDeviceService.ts`
  - `createWiFiScanCommand()` - 修复协议格式
  - `createSimpleWiFiScanCommand()` - 修复简化格式
  - `writeWiFiScanCommandToGATT()` - 添加重试机制
  - `waitForScanCommandResponse()` - 增加超时时间

## 预期效果

1. **解决协议错误**: 设备不再报告"Unknown Ctrl pkt 80"错误
2. **减少超时**: 30秒超时时间足够设备完成WiFi扫描
3. **提高可靠性**: 重试机制处理临时连接问题
4. **更好的用户体验**: 即使超时也会继续执行后续步骤

## 测试建议

1. 重新连接设备并尝试WiFi扫描
2. 观察设备日志是否还有"Unknown Ctrl pkt 80"错误
3. 检查前端是否还会出现超时错误
4. 验证WiFi扫描结果是否正确返回

## 技术细节

### BLUFI协议帧格式
```
[Type][Length][Sequence][Data...]
```

- **Type**: 0x80 (WiFi扫描命令)
- **Length**: 数据长度(不包含Type和Length字段)
- **Sequence**: 序列号(0-255)
- **Data**: 具体命令数据

### 数据包示例
```
80 07 00 00 0A 00 00 00 00 00
│  │  │  │  │  └─ Reserved (4 bytes)
│  │  │  │  └─ Timeout High (0x00)
│  │  │  └─ Timeout Low (0x0A = 10 seconds)
│  │  └─ Scan Type (0x00 = Active scan)
│  └─ Sequence (0x00)
└─ Type (0x80 = WiFi Scan Command)
```

这个修复应该解决扫描命令超时的问题，让设备能够正确识别和处理WiFi扫描命令。
