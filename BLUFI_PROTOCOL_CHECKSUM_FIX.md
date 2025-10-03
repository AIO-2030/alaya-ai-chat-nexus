# BLUFI协议校验和错误修复

## 问题描述

设备端日志出现校验和错误：
```
E (70475) BT_BTC: btc_blufi_recv_handler checksum error e2f0, pkt 000a
E (70475) LGDC ERR: BLUFI report error, error code 1
```

## 根本原因分析

1. **错误的控制包类型**：使用了0x80作为控制包类型，但BLUFI协议的有效控制包类型范围是0x00-0x16
2. **缺少校验和**：BLUFI协议需要校验和计算，但原实现中缺少
3. **协议格式错误**：数据包结构不符合ESP32 BLUFI标准

## 修复方案

### 1. 修正控制包类型

**错误**：使用0x80作为WiFi扫描命令类型
**正确**：使用0x01作为WiFi扫描命令类型

```typescript
// 错误的实现
commandData[0] = 0x80; // 无效的控制包类型

// 正确的实现
commandData[0] = 0x01; // 有效的BLUFI控制包类型
```

### 2. 添加校验和计算

**BLUFI协议要求**：每个数据包必须包含校验和
**计算方法**：对所有字节（除校验和本身）进行XOR运算

```typescript
// 计算校验和
let checksum = 0;
for (let i = 0; i < totalLength - 1; i++) {
  checksum ^= commandData[i];
}
commandData[offset++] = checksum;
```

### 3. 修正数据包结构

**完整的数据包格式**：
```
[Type][Length][Sequence][Data...][Checksum]
```

**WiFi扫描命令数据包**：
```
[0x01][0x07][0x00][0x00][0x0A][0x00][0x00][0x00][0x00][0x00][0xXX]
│     │     │     │     │     │     │     │     │     │     └─ Checksum
│     │     │     │     │     │     │     │     │     └─ Reserved (4 bytes)
│     │     │     │     │     └─ Timeout High (0x00)
│     │     │     │     └─ Timeout Low (0x0A = 10 seconds)
│     │     │     └─ Scan Type (0x00 = Active scan)
│     │     └─ Sequence (0x00)
│     └─ Length (0x07 = 7 bytes)
└─ Type (0x01 = WiFi Scan Command)
```

## 修复详情

### 1. 完整WiFi扫描命令

```typescript
private createWiFiScanCommand(): Uint8Array {
  // 数据包结构：[Type][Length][Sequence][Data...][Checksum]
  const dataLength = 7; // 数据长度
  const totalLength = 4 + dataLength; // 总长度（包含校验和）
  
  const commandData = new Uint8Array(totalLength);
  let offset = 0;
  
  // 控制包类型：0x01 (WiFi扫描命令)
  commandData[offset++] = 0x01;
  
  // 数据长度
  commandData[offset++] = dataLength;
  
  // 序列号
  commandData[offset++] = currentSequence;
  
  // 扫描类型
  commandData[offset++] = 0x00; // Active scan
  
  // 超时时间（2字节，小端序）
  commandData[offset++] = 10 & 0xFF;
  commandData[offset++] = (10 >> 8) & 0xFF;
  
  // 保留字节（4字节）
  commandData[offset++] = 0x00;
  commandData[offset++] = 0x00;
  commandData[offset++] = 0x00;
  commandData[offset++] = 0x00;
  
  // 计算校验和
  let checksum = 0;
  for (let i = 0; i < totalLength - 1; i++) {
    checksum ^= commandData[i];
  }
  commandData[offset++] = checksum;
  
  return commandData;
}
```

### 2. 简化WiFi扫描命令

```typescript
private createSimpleWiFiScanCommand(): Uint8Array {
  const commandData = new Uint8Array(5);
  
  // 控制包类型：0x01
  commandData[0] = 0x01;
  
  // 数据长度：1
  commandData[1] = 0x01;
  
  // 序列号
  commandData[2] = currentSequence;
  
  // 扫描类型
  commandData[3] = 0x00;
  
  // 校验和
  let checksum = 0;
  for (let i = 0; i < 4; i++) {
    checksum ^= commandData[i];
  }
  commandData[4] = checksum;
  
  return commandData;
}
```

## 技术细节

### BLUFI控制包类型

根据ESP32 BLUFI协议规范，有效的控制包类型包括：

| 类型 | 值 | 描述 |
|------|-----|------|
| 0x00 | 0 | 保留 |
| 0x01 | 1 | WiFi扫描命令 |
| 0x02 | 2 | WiFi配置命令 |
| 0x03 | 3 | 设备状态查询 |
| ... | ... | ... |
| 0x16 | 22 | 最大有效类型 |

**注意**：0x80不在有效范围内，这就是为什么设备报告"unknown ctrl pkt 80"错误。

### 校验和计算

BLUFI协议使用简单的XOR校验和：

```typescript
// 对所有字节（除校验和本身）进行XOR运算
let checksum = 0;
for (let i = 0; i < packetLength - 1; i++) {
  checksum ^= packet[i];
}
packet[packetLength - 1] = checksum;
```

### 数据包验证

设备端会验证：
1. 控制包类型是否有效
2. 数据长度是否正确
3. 校验和是否匹配

如果任何一项验证失败，设备会报告错误。

## 预期效果

修复后，设备端应该不再出现以下错误：
- ❌ `btc_blufi_recv_handler unknown ctrl pkt 80`
- ❌ `btc_blufi_recv_handler checksum error e2f0`
- ❌ `LGDC ERR: BLUFI report error, error code 1`

设备应该能够正确识别和处理WiFi扫描命令，并返回扫描结果。

## 测试验证

1. **数据包格式验证**：检查生成的数据包是否符合BLUFI协议规范
2. **校验和验证**：确保校验和计算正确
3. **设备响应验证**：确认设备能够正确响应WiFi扫描命令
4. **错误日志检查**：验证设备端不再出现校验和错误

## 文件修改

- `src/services/realDeviceService.ts`
  - `createWiFiScanCommand()` - 修复完整命令格式
  - `createSimpleWiFiScanCommand()` - 修复简化命令格式
  - 添加校验和计算逻辑
  - 更新日志输出

这个修复确保了BLUFI协议的正确实现，解决了校验和错误问题，让设备能够正确识别和处理WiFi扫描命令。
