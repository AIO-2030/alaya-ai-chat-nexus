# BLUFI 设备配置说明

## 设备信息

### 设备类型
- **设备**: ESP32 with BLUFI (Bluetooth Low Energy WiFi Configuration)
- **协议**: BLUFI VERSION 0103
- **MAC地址**: 14:2b:2f:6a:f8:b4

### GATT 服务配置

#### 1. Generic Access Service (0x1800)
- **服务UUID**: `00001800-0000-1000-8000-00805f9b34fb`
- **特性**:
  - `00002a00-0000-1000-8000-00805f9b34fb` - Device Name
  - `00002a01-0000-1000-8000-00805f9b34fb` - Appearance

#### 2. Generic Attribute Service (0x1801)
- **服务UUID**: `00001801-0000-1000-8000-00805f9b34fb`
- **特性**:
  - `00002a05-0000-1000-8000-00805f9b34fb` - Service Changed
  - `00002b3a-0000-1000-8000-00805f9b34fb` - Generic Media Control Point
  - `00002b29-0000-1000-8000-00805f9b34fb` - Generic Media Control Data

#### 3. BLUFI Service (0xffff) - WiFi配网服务
- **服务UUID**: `0000ffff-0000-1000-8000-00805f9b34fb`
- **特性**:
  - `0000ff01-0000-1000-8000-00805f9b34fb` - Data Send (WiFi配置发送)
    - **属性**: Write, Write Without Response
    - **用途**: 发送WiFi配置数据到设备
    - **数据格式**: BLUFI协议帧格式
  - `0000ff02-0000-1000-8000-00805f9b34fb` - Data Receive (WiFi配置接收)
    - **属性**: Read, Notify
    - **用途**: 接收设备状态和WiFi扫描结果
    - **数据格式**: BLUFI协议响应格式

### GATT服务详细参数

#### BLUFI服务特性详细说明

##### Data Send特性 (0xff01)
- **Handle**: 16 (从设备日志: `val_handle=16`)
- **属性**: 
  - Write: 支持写入WiFi配置数据
  - Write Without Response: 支持无响应写入
- **MTU**: 256字节 (从设备日志: `mtu=256`)
- **数据限制**: 单次写入最大约244字节 (MTU - 3字节ATT头)

##### Data Receive特性 (0xff02)
- **Handle**: 18 (从设备日志: `val_handle=18`)
- **属性**:
  - Read: 可读取设备当前状态
  - Notify: 订阅设备状态变化通知
- **订阅事件**: `subscribe event; conn_handle=1 attr_handle=8 reason=1`
- **用途**: 接收WiFi扫描结果和配网状态

## WiFi 配网协议

### 重要说明
**设备每次重新连接都需要进行WiFi配网**，因为：
- WiFi信息是通过设备GATT服务返回的
- 设备重启后会丢失之前的WiFi配置
- 需要通过BLUFI协议重新发送WiFi配置
- **重新连接策略**: 即使设备NVS中存储了WiFi配置，重新连接时仍需要完整配网流程

### BLUFI 数据格式

#### 帧结构
```
[Type][FrameControl][Sequence][DataLength][Data...][Checksum]
```

#### 字段说明
- **Type**: 1字节，低2位区分数据帧(0b10)和控制帧(0b00)，高6位表示子类型
- **FrameControl**: 1字节，帧控制标志，通常为0x00
- **Sequence**: 1字节，序列号，用于命令确认
- **DataLength**: 1字节，数据部分长度
- **Data**: 可变长度，具体数据内容
- **Checksum**: 2字节，16位校验和（小端序）

#### WiFi 扫描命令帧 (Type: 0x01)
```
[0x01][0x00][Sequence][DataLength][ScanType][Timeout][Reserved][Checksum]
```

#### WiFi 配置帧 (Type: 0x01)
```
[0x01][0x00][Sequence][DataLength][SSID_LEN][SSID][PASSWORD_LEN][PASSWORD][SECURITY][Checksum]
```

#### 控制帧类型范围
- **有效范围**: 0x00 - 0x3F (0b00000000 - 0b00111111)
- **WiFi扫描命令**: 0x01 (控制帧0b00 + 扫描命令0b000001)
- **WiFi配置命令**: 0x01 (控制帧0b00 + 配置命令0b000001)

#### 校验和计算
- **算法**: 16位累加校验和（CRC16-like）
- **计算方式**: 对所有字节（除校验和本身）进行累加
- **最终值**: 对累加结果取反加1（二进制补码）
- **存储格式**: 小端序（低字节在前）
- **示例**: 如果累加和为0x1234，则校验和为0xEDCC（取反加1）

### 安全类型映射

| 安全类型 | BLUFI值 | 说明 |
|---------|---------|------|
| Open | 0x00 | BLUFI_SECURITY_TYPE_OPEN |
| WEP | 0x01 | BLUFI_SECURITY_TYPE_WEP |
| WPA | 0x02 | BLUFI_SECURITY_TYPE_WPA_PSK |
| WPA2 | 0x03 | BLUFI_SECURITY_TYPE_WPA2_PSK |
| WPA3 | 0x04 | BLUFI_SECURITY_TYPE_WPA3_PSK |

### 数据包示例

#### 示例1: WiFi扫描命令
```
01 00 00 01 00 [Checksum]
│  │  │  │  └─ Scan Type: Active (0x00)
│  │  │  └─ Data Length: 1
│  │  └─ Sequence: 0
│  └─ Frame Control: 0x00
└─ Type: Control Frame + WiFi Scan (0x01)
```

#### 示例2: Open网络配置
- SSID: "MyWiFi"
- Password: ""
- Security: Open

```
01 00 00 07 06 4D 79 57 69 46 69 00 00 [Checksum]
│  │  │  │  │  └─ SSID: "MyWiFi" ─┘  │  └─ Security: Open (0x00)
│  │  │  │  └─ SSID Length: 6         └─ Password Length: 0
│  │  │  └─ Data Length: 7
│  │  └─ Sequence: 0
│  └─ Frame Control: 0x00
└─ Type: Control Frame + WiFi Config (0x01)
```

#### 示例3: WPA2网络配置
- SSID: "MyWiFi"
- Password: "password123"
- Security: WPA2

```
01 00 00 0E 06 4D 79 57 69 46 69 0B 70 61 73 73 77 6F 72 64 31 32 33 03 [Checksum]
│  │  │  │  │  └─ SSID: "MyWiFi" ─┘  │  └─ Password: "password123" ─┘ │
│  │  │  │  └─ SSID Length: 6         └─ Password Length: 11          └─ Security: WPA2 (0x03)
│  │  │  └─ Data Length: 14
│  │  └─ Sequence: 0
│  └─ Frame Control: 0x00
└─ Type: Control Frame + WiFi Config (0x01)
```

## 配网流程

### 完整配网步骤

#### 1. 设备扫描阶段
- **操作**: 使用Web Bluetooth API扫描设备
- **设备名称**: "BLUFI_142B2F6AF8B4"
- **MAC地址**: 14:2b:2f:6a:f8:b4
- **注意**: 只进行设备发现，不建立GATT连接

#### 2. GATT连接阶段
- **操作**: 连接到设备的GATT服务器
- **连接状态**: `connection established; status=0`
- **MTU协商**: `mtu update event; conn_handle=1 cid=4 mtu=256`
- **服务枚举**: 枚举所有可用的服务和特性
- **订阅通知**: `subscribe event; conn_handle=1 attr_handle=8 reason=1`

#### 3. WiFi扫描阶段
- **操作**: 请求设备扫描可用WiFi网络
- **服务**: BLUFI Service (0xffff)
- **特性**: Data Receive (0xff02) - 接收扫描结果
- **数据格式**: BLUFI协议WiFi网络列表

#### 4. WiFi配置阶段
- **操作**: 发送WiFi配置到设备
- **服务**: BLUFI Service (0xffff)
- **特性**: Data Send (0xff01) - 发送配置数据
- **数据格式**: BLUFI WiFi配置帧
- **MTU限制**: 最大244字节 (256 - 3字节ATT头)

#### 5. 配置验证阶段
- **操作**: 监听设备响应和状态变化
- **特性**: Data Receive (0xff02) - 接收状态通知
- **验证内容**: WiFi连接状态、IP地址、MQTT连接等

### 关键注意事项

#### 每次连接都需要配网
- **原因**: WiFi信息通过GATT服务返回，设备重启后丢失
- **流程**: 必须完整执行所有配网步骤
- **跳过条件**: 无，每次连接都需要重新配网

#### Web Bluetooth安全限制
- **服务声明**: 必须在`requestDevice()`时声明所有要访问的服务UUID
- **必需服务**: 所有三个GATT服务都必须包含在`optionalServices`中
  - `00001800-0000-1000-8000-00805f9b34fb` - Generic Access Service
  - `00001801-0000-1000-8000-00805f9b34fb` - Generic Attribute Service  
  - `0000ffff-0000-1000-8000-00805f9b34fb` - BLUFI Service
- **错误**: `SecurityError: Origin is not allowed to access the service`表示服务未声明
- **解决方案**: 在设备扫描阶段就声明所有GATT服务UUID

#### GATT连接管理
- **连接复用**: 避免重复连接同一设备
- **连接缓存**: 缓存GATT服务器引用
- **错误处理**: 连接失败时的重试机制

#### 数据包大小限制
- **MTU**: 256字节
- **实际可用**: 244字节 (减去ATT头)
- **分包处理**: 大数据包需要分包发送

#### BLUFI序列号管理
- **序列号**: 每个命令必须包含序列号，从1开始递增
- **重置**: 每次新连接时序列号重置为0
- **错误**: 序列号不匹配会导致 `btc_blufi_recv_handler seq X is not expect Y` 错误
- **范围**: 序列号范围0-255，超过255时回绕到0

## 技术细节

### UUID转换
- 设备日志显示16位短UUID (如 0xffff, 0xff01)
- Web Bluetooth API需要128位完整UUID
- 转换规则: `0000[16位UUID]-0000-1000-8000-00805f9b34fb`

### 正确的服务声明代码示例

```typescript
// 在requestDevice()时必须声明所有GATT服务
const bluetoothDevice = await navigator.bluetooth.requestDevice({
  acceptAllDevices: true,
  optionalServices: [
    '00001800-0000-1000-8000-00805f9b34fb',  // Generic Access Service (0x1800)
    '00001801-0000-1000-8000-00805f9b34fb',  // Generic Attribute Service (0x1801)
    '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi配网服务
  ]
});

// 错误示例 - 缺少GATT服务声明
const bluetoothDevice = await navigator.bluetooth.requestDevice({
  acceptAllDevices: true,
  optionalServices: ['generic_access']  // 缺少BLUFI服务，会导致SecurityError
});
```

### 错误处理
- GATT连接超时: 10秒
- 数据写入失败时使用fallback模拟
- 详细的错误日志记录

### 日志输出
- 完整的GATT服务枚举
- 特性属性和值显示
- BLUFI数据包十六进制输出
- 连接状态和错误信息

## 兼容性

### 支持的设备
- ESP32 with BLUFI firmware
- BLUFI VERSION 0103
- 支持Web Bluetooth的现代浏览器

### 浏览器要求
- Chrome 56+
- Edge 79+
- Opera 43+
- 需要HTTPS环境
- 需要用户手势触发

## 故障排除

### 常见问题
1. **Web Bluetooth不支持**: 使用支持的浏览器
2. **HTTPS要求**: 确保在HTTPS环境下运行
3. **用户手势**: 确保蓝牙操作由用户点击触发
4. **设备未发现**: 确保设备处于可发现模式
5. **GATT连接失败**: 检查设备是否支持所需的GATT服务

### 调试信息
- 启用控制台日志查看详细连接过程
- 检查GATT服务枚举输出
- 验证BLUFI数据包格式
- 监控设备响应和错误信息
