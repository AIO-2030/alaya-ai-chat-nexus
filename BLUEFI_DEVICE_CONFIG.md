# ESP32 BLUFI 配网协议开发文档

本文档面向 ESP32 嵌入式开发工程师，详细说明 BLUFI (Bluetooth Low Energy WiFi Configuration) 配网协议的实现规范，确保设备端与前端 Web 应用的正确通信。

## 1. 设备硬件要求

- **芯片**: ESP32 (支持 BLE 4.0+)
- **蓝牙**: 2.4GHz BLE (Bluetooth Low Energy)
- **WiFi**: 2.4GHz / 5GHz 双频支持
- **协议版本**: BLUFI VERSION 0103

## 2. GATT 服务配置

设备必须实现以下 GATT 服务和特性：

### 2.1 Generic Access Service (0x1800)

**服务 UUID**: `00001800-0000-1000-8000-00805f9b34fb` (短UUID: `0x1800`)

**必需特性**:
- `0x2A00` - Device Name (设备名称)
- `0x2A01` - Appearance (外观)

### 2.2 Generic Attribute Service (0x1801)

**服务 UUID**: `00001801-0000-1000-8000-00805f9b34fb` (短UUID: `0x1801`)

**必需特性**:
- `0x2A05` - Service Changed (服务变更通知)

### 2.3 BLUFI Service (0xFFFF) - 核心配网服务

**服务 UUID**: `0000FFFF-0000-1000-8000-00805F9B34FB` (短UUID: `0xFFFF`)

**特性配置**:

#### 特性 1: Data Send (0xFF01)
- **UUID**: `0000FF01-0000-1000-8000-00805F9B34FB` (短UUID: `0xFF01`)
- **属性**: 
  - `PROPERTY_WRITE` - 支持写入
  - `PROPERTY_WRITE_NO_RESPONSE` - 支持无响应写入
- **用途**: 接收客户端发送的 BLUFI 命令帧
- **MTU**: 建议 256 字节（最小 23 字节）

#### 特性 2: Data Receive (0xFF02)
- **UUID**: `0000FF02-0000-1000-8000-00805F9B34FB` (短UUID: `0xFF02`)
- **属性**:
  - `PROPERTY_READ` - 支持读取
  - `PROPERTY_NOTIFY` - 支持通知
- **用途**: 向客户端发送 BLUFI 响应帧和状态通知

### 2.4 ESP-IDF 配置示例

```c
#include "esp_blufi_api.h"

// BLUFI Service UUID
#define BLUFI_SERVICE_UUID    0xFFFF
#define BLUFI_CHAR_UUID_FF01 0xFF01  // Data Send
#define BLUFI_CHAR_UUID_FF02 0xFF02  // Data Receive

// 使用 ESP-IDF BLUFI API 初始化
esp_blufi_callbacks_t blufi_callbacks = {
    .event_cb = blufi_event_callback,
    .negotiate_data_handler = blufi_negotiate_data_handler,
    .encrypt_func = blufi_encrypt_func,
    .decrypt_func = blufi_decrypt_func,
    .checksum_func = blufi_checksum_func,
};

esp_blufi_profile_init(&blufi_callbacks);
```

## 3. BLUFI 协议帧格式

### 3.1 标准帧结构

所有 BLUFI 帧遵循以下格式：

```
[Type(1)][FrameControl(1)][Sequence(1)][DataLength(1)][Data(n)][Checksum(2)]
```

**总长度**: `5 + DataLength + 2` 字节

### 3.2 字段详细说明

#### Type (1 字节)

Type 字段编码规则：
```
Type = (Subtype << 2) | FrameType
```

- **FrameType** (低 2 位):
  - `0b00` = 控制帧 (Control Frame)
  - `0b01` = 数据帧 (Data Frame)
  - `0b10` = 保留
  - `0b11` = 保留

- **Subtype** (高 6 位): 子类型，定义具体命令

**常用 Type 值**:
- `0x00` = 握手/协商 (Control, Subtype=0)
- `0x04` = 设置工作模式 (Control, Subtype=1)
- `0x09` = SSID 数据 (Data, Subtype=2)
- `0x0C` = 连接 AP (Control, Subtype=3)
- `0x0D` = 密码数据 (Data, Subtype=3)
- `0x14` = 获取 WiFi 状态 (Control, Subtype=5)
- `0x24` = WiFi 列表请求 (Control, Subtype=9)

#### FrameControl (1 字节)

帧控制标志位：

```
Bit 0: 加密标志 (Encryption)
Bit 1: 校验和标志 (Checksum) - 1=有校验和
Bit 2: 方向标志 (Direction) - 0=客户端→设备, 1=设备→客户端
Bit 3: ACK 要求 (ACK Required)
Bit 4: 分片标志 (Fragmented)
Bit 5: 首分片标志 (First Fragment)
Bit 6: 末分片标志 (Last Fragment)
Bit 7: 保留
```

**常用值**:
- `0x02` = 带校验和，无加密，无分片（客户端发送）
- `0x03` = 带校验和，无加密，无分片，需要 ACK（客户端发送）
- `0x42` = 带校验和，无加密，无分片（设备响应）

#### Sequence (1 字节)

序列号，用于命令确认和分片重组：
- 范围: `0x00` - `0xFF` (0-255)
- 每次发送后递增，超过 255 回绕到 0
- **重要**: 客户端序列号从 0 开始，设备端序列号独立管理

#### DataLength (1 字节)

数据部分长度（不包括 Type, FrameControl, Sequence, DataLength, Checksum）

#### Data (n 字节)

具体数据内容，格式取决于命令类型

#### Checksum (2 字节)

CRC16-CCITT 校验和，小端序存储（低字节在前）

### 3.3 CRC16 校验和计算

#### 算法规范

- **算法**: CRC16-CCITT (多项式: 0x1021)
- **初始值**: 0xFFFF
- **最终 XOR**: 0xFFFF
- **计算数据**: `[Sequence][DataLength][Data]`（不包括 Type 和 FrameControl）
- **存储格式**: 小端序（低字节在前）

#### C 语言实现

```c
#include <stdint.h>

// CRC16-CCITT 查找表 (Big-Endian)
static const uint16_t crc16_be_table[256] = {
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
    0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
    0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
    0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
    0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
    0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
    0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
    0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
    0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
    0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
    0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
    0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
    0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
    0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
    0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
    0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
    0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
    0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
    0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
    0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
    0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
    0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
    0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
    0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
    0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
    0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
    0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
    0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
};

/**
 * 计算 CRC16-CCITT 校验和
 * @param data 数据缓冲区
 * @param len 数据长度
 * @return CRC16 校验和值
 */
uint16_t calculate_crc16(const uint8_t *data, size_t len) {
    uint16_t crc = 0xFFFF;  // 初始值
    
    for (size_t i = 0; i < len; i++) {
        crc = crc16_be_table[(crc >> 8) ^ data[i]] ^ (crc << 8);
        crc &= 0xFFFF;  // 保持 16 位
    }
    
    return crc ^ 0xFFFF;  // 最终 XOR
}

/**
 * 构建 BLUFI 帧并计算校验和
 * @param type 帧类型
 * @param frame_control 帧控制
 * @param sequence 序列号
 * @param data 数据部分
 * @param data_len 数据长度
 * @param output 输出缓冲区（必须足够大）
 * @return 帧总长度
 */
size_t build_blufi_frame(uint8_t type, uint8_t frame_control, uint8_t sequence,
                         const uint8_t *data, size_t data_len, uint8_t *output) {
    size_t offset = 0;
    
    // 构建帧头
    output[offset++] = type;
    output[offset++] = frame_control;
    output[offset++] = sequence;
    output[offset++] = (uint8_t)data_len;
    
    // 复制数据
    if (data_len > 0) {
        memcpy(output + offset, data, data_len);
        offset += data_len;
    }
    
    // 计算校验和（对 [Sequence][DataLength][Data] 计算）
    uint8_t checksum_data[256];
    size_t checksum_len = 1 + 1 + data_len;  // Sequence + DataLength + Data
    checksum_data[0] = sequence;
    checksum_data[1] = (uint8_t)data_len;
    if (data_len > 0) {
        memcpy(checksum_data + 2, data, data_len);
    }
    
    uint16_t crc = calculate_crc16(checksum_data, checksum_len);
    
    // 小端序存储校验和
    output[offset++] = crc & 0xFF;        // 低字节
    output[offset++] = (crc >> 8) & 0xFF; // 高字节
    
    return offset;  // 返回总长度
}
```

## 4. 配网流程与命令序列

### 4.1 完整配网流程

```
客户端                         设备端
  |                              |
  |--- GATT 连接 ----------------|
  |                              |
  |--- 握手 (seq=0) ------------>|
  |<-- ACK (Type=0x49) ----------|
  |                              |
  |--- WiFi 列表请求 (seq=2) --->|
  |<-- WiFi 列表响应 ------------|
  |                              |
  |--- SSID (seq=4) ------------>|
  |<-- ACK ----------------------|
  |                              |
  |--- Password (seq=5) -------->|
  |<-- ACK ----------------------|
  |                              |
  |--- Connect (seq=6) --------->|
  |<-- WiFi 状态响应 ------------|
  |                              |
```

### 4.2 命令帧详细格式

#### 4.2.1 握手命令 (Handshake)

**客户端发送**:
```
Type: 0x00 (Control, Subtype=0)
FrameControl: 0x02 (带校验和)
Sequence: 0x00
DataLength: 0x00
Data: (无)
Checksum: [计算值]
```

**示例字节流**:
```
00 02 00 00 [CRC_Low] [CRC_High]
```

**设备响应**:
```
Type: 0x49 (ACK 响应)
FrameControl: 0x42 (带校验和，设备→客户端)
Sequence: [设备序列号]
DataLength: 0x00 或 0x01
Data: 0x00 (成功) 或错误码
Checksum: [计算值]
```

#### 4.2.2 WiFi 列表请求 (WiFi List Request)

**客户端发送**:
```
Type: 0x24 (Control, Subtype=9)
FrameControl: 0x02
Sequence: 0x02
DataLength: 0x00
Data: (无)
Checksum: [计算值]
```

**设备响应 - WiFi 列表格式**:

完整响应帧:
```
[Type][FrameControl][Sequence][DataLength][WiFi_List_Data][Checksum]
```

WiFi 列表数据格式（每个网络）:
```
[RSSI(1)][SSID_Length(1)][SSID_Content(n)]
```

**示例**:
```
网络1: [0xC6][0x06][0x48 0x33 0x43 0x5F 0x34 0x30]  // RSSI=-58, SSID="H3C_40"
网络2: [0xBD][0x04][0x34 0x30 0x31 0x34]            // RSSI=-67, SSID="4014"
```

**注意**: 如果数据较大，可能使用分片传输（FrameControl 的 Bit 4-6 标志分片）

#### 4.2.3 SSID 配置 (SSID Configuration)

**客户端发送**:
```
Type: 0x09 (Data, Subtype=2)
FrameControl: 0x02
Sequence: 0x04
DataLength: [SSID长度 + 1]
Data: [SSID_Length(1)][SSID_Content(n)]
Checksum: [计算值]
```

**示例** (SSID="MyWiFi", 长度=6):
```
09 02 04 07 06 4D 79 57 69 46 69 [CRC_Low] [CRC_High]
│  │  │  │  │  └─ SSID: "MyWiFi"
│  │  │  │  └─ SSID Length: 6
│  │  │  └─ DataLength: 7 (1+6)
│  │  └─ Sequence: 4
│  └─ FrameControl: 0x02
└─ Type: 0x09 (Data Frame, SSID)
```

#### 4.2.4 密码配置 (Password Configuration)

**客户端发送**:
```
Type: 0x0D (Data, Subtype=3)
FrameControl: 0x02
Sequence: 0x05
DataLength: [Password长度]
Data: [Password_Content(n)]  // 直接是密码字节，无长度前缀
Checksum: [计算值]
```

**示例** (Password="password123", 长度=11):
```
0D 02 05 0B 70 61 73 73 77 6F 72 64 31 32 33 [CRC_Low] [CRC_High]
│  │  │  │  └─ Password: "password123"
│  │  │  └─ DataLength: 11
│  │  └─ Sequence: 5
│  └─ FrameControl: 0x02
└─ Type: 0x0D (Data Frame, Password)
```

#### 4.2.5 连接 AP (Connect to AP)

**客户端发送**:
```
Type: 0x0C (Control, Subtype=3)
FrameControl: 0x02
Sequence: 0x06
DataLength: 0x00
Data: (无)
Checksum: [计算值]
```

**设备响应 - WiFi 状态**:

状态响应帧:
```
[Type][FrameControl][Sequence][DataLength][Status_Data][Checksum]
```

状态数据格式:
```
[Opmode(1)][Connection_Status(1)][SSID_Length(1)][SSID(n)][IP_Address(4)]
```

**字段说明**:
- **Opmode**: 
  - `0x00` = NULL
  - `0x01` = STA (Station 模式)
  - `0x02` = SoftAP
  - `0x03` = SoftAP & STA

- **Connection_Status**:
  - `0x00` = Disconnected
  - `0x01` = Connected
  - `0x02` = Connecting
  - `0x03` = Disconnecting

- **SSID_Length**: SSID 长度（如果已连接）
- **SSID**: UTF-8 编码的 SSID 字符串
- **IP_Address**: 4 字节 IP 地址（如果已连接）

**示例** (已连接，SSID="MyWiFi", IP=192.168.1.100):
```
[0x01][0x01][0x06][0x4D 0x79 0x57 0x69 0x46 0x69][0xC0 0xA8 0x01 0x64]
│      │      │     └─ SSID: "MyWiFi"            └─ IP: 192.168.1.100
│      │      └─ SSID Length: 6
│      └─ Connection Status: 0x01 (Connected)
└─ Opmode: 0x01 (STA)
```

### 4.3 安全类型映射

WiFi 安全类型在 BLUFI 协议中的值：

| 安全类型 | BLUFI 值 | ESP-IDF 常量 |
|---------|---------|-------------|
| Open | 0x00 | `BLUFI_SECURITY_TYPE_OPEN` |
| WEP | 0x01 | `BLUFI_SECURITY_TYPE_WEP` |
| WPA | 0x02 | `BLUFI_SECURITY_TYPE_WPA_PSK` |
| WPA2 | 0x03 | `BLUFI_SECURITY_TYPE_WPA2_PSK` |
| WPA3 | 0x04 | `BLUFI_SECURITY_TYPE_WPA3_PSK` |

**注意**: 前端通过 SSID 和 Password 的组合自动判断安全类型，设备端应根据接收到的密码长度和 WiFi 扫描结果确定安全类型。

## 5. 设备端实现要点

### 5.1 序列号管理

- **客户端序列号**: 从 0 开始，每次发送递增（0, 1, 2, 3, 4, 5, 6...）
- **设备端序列号**: 独立管理，响应时使用设备自己的序列号
- **序列号回绕**: 超过 255 时回绕到 0
- **错误处理**: 如果收到序列号不匹配的帧，应记录错误并发送错误响应

### 5.2 校验和验证

**必须验证每个接收帧的校验和**:

```c
bool verify_blufi_frame(const uint8_t *frame, size_t frame_len) {
    if (frame_len < 7) {  // 最小帧长度
        return false;
    }
    
    uint8_t sequence = frame[2];
    uint8_t data_len = frame[3];
    
    if (frame_len != 5 + data_len + 2) {  // 验证总长度
        return false;
    }
    
    // 提取校验和
    uint16_t received_checksum = frame[frame_len - 2] | (frame[frame_len - 1] << 8);
    
    // 计算校验和（对 [Sequence][DataLength][Data] 计算）
    uint8_t checksum_data[256];
    checksum_data[0] = sequence;
    checksum_data[1] = data_len;
    if (data_len > 0) {
        memcpy(checksum_data + 2, frame + 4, data_len);
    }
    
    uint16_t calculated_checksum = calculate_crc16(checksum_data, 1 + 1 + data_len);
    
    return (received_checksum == calculated_checksum);
}
```

### 5.3 响应帧构建

**构建 ACK 响应**:

```c
void send_ack_response(uint8_t client_sequence, uint8_t status) {
    uint8_t response[8];
    uint8_t data[1] = {status};  // 0x00=成功
    
    size_t len = build_blufi_frame(
        0x49,           // Type: ACK
        0x42,           // FrameControl: 带校验和，设备→客户端
        device_sequence++,  // 设备序列号
        data,           // 状态数据
        1,              // 数据长度
        response
    );
    
    // 通过 0xFF02 特性发送
    esp_ble_gatts_send_indicate(gatt_if, conn_id, char_handle_ff02, len, response, false);
}
```

### 5.4 WiFi 列表响应构建

```c
void send_wifi_list_response(const wifi_ap_record_t *ap_list, size_t ap_count) {
    // 计算总数据长度
    size_t total_data_len = 0;
    for (size_t i = 0; i < ap_count; i++) {
        total_data_len += 1 + 1 + ap_list[i].ssid_len;  // RSSI + Length + SSID
    }
    
    // 构建数据部分
    uint8_t *data = malloc(total_data_len);
    size_t offset = 0;
    
    for (size_t i = 0; i < ap_count; i++) {
        data[offset++] = (uint8_t)ap_list[i].rssi;  // RSSI (signed to unsigned)
        data[offset++] = ap_list[i].ssid_len;        // SSID 长度
        memcpy(data + offset, ap_list[i].ssid, ap_list[i].ssid_len);
        offset += ap_list[i].ssid_len;
    }
    
    // 构建响应帧
    uint8_t response[256];
    size_t frame_len = build_blufi_frame(
        0x24,              // Type: WiFi List Response
        0x42,              // FrameControl
        device_sequence++, // 设备序列号
        data,              // WiFi 列表数据
        total_data_len,    // 数据长度
        response
    );
    
    // 如果数据较大，需要分片发送
    if (frame_len > MTU_SIZE - 3) {
        // 实现分片逻辑
        send_fragmented_response(response, frame_len);
    } else {
        esp_ble_gatts_send_indicate(gatt_if, conn_id, char_handle_ff02, frame_len, response, false);
    }
    
    free(data);
}
```

### 5.5 WiFi 配置处理

```c
typedef struct {
    uint8_t ssid[32];
    uint8_t ssid_len;
    uint8_t password[64];
    uint8_t password_len;
    bool ssid_received;
    bool password_received;
} wifi_config_state_t;

static wifi_config_state_t config_state = {0};

void handle_ssid_frame(const uint8_t *data, size_t data_len) {
    if (data_len < 1) {
        send_error_response(1);  // 错误码 1: 数据格式错误
        return;
    }
    
    uint8_t ssid_len = data[0];
    if (ssid_len > 32 || data_len < 1 + ssid_len) {
        send_error_response(1);
        return;
    }
    
    memcpy(config_state.ssid, data + 1, ssid_len);
    config_state.ssid_len = ssid_len;
    config_state.ssid_received = true;
    
    send_ack_response(client_sequence, 0x00);  // 成功
}

void handle_password_frame(const uint8_t *data, size_t data_len) {
    if (data_len > 64) {
        send_error_response(1);
        return;
    }
    
    memcpy(config_state.password, data, data_len);
    config_state.password_len = data_len;
    config_state.password_received = true;
    
    send_ack_response(client_sequence, 0x00);  // 成功
}

void handle_connect_frame() {
    if (!config_state.ssid_received || !config_state.password_received) {
        send_error_response(2);  // 错误码 2: 配置不完整
        return;
    }
    
    // 配置 WiFi
    wifi_config_t wifi_config = {
        .sta = {
            .ssid = {0},
            .password = {0},
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    
    memcpy(wifi_config.sta.ssid, config_state.ssid, config_state.ssid_len);
    memcpy(wifi_config.sta.password, config_state.password, config_state.password_len);
    
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_connect();
    
    // 发送 ACK
    send_ack_response(client_sequence, 0x00);
    
    // 等待连接完成后发送状态响应
    // (在 WiFi 事件处理函数中)
}
```

### 5.6 WiFi 状态响应

```c
void send_wifi_status_response() {
    wifi_ap_record_t ap_info;
    esp_err_t ret = esp_wifi_sta_get_ap_info(&ap_info);
    
    uint8_t status_data[64];
    size_t offset = 0;
    
    // Opmode
    status_data[offset++] = 0x01;  // STA 模式
    
    // Connection Status
    if (ret == ESP_OK) {
        status_data[offset++] = 0x01;  // Connected
    } else {
        status_data[offset++] = 0x00;  // Disconnected
    }
    
    if (ret == ESP_OK) {
        // SSID Length
        status_data[offset++] = ap_info.ssid_len;
        
        // SSID
        memcpy(status_data + offset, ap_info.ssid, ap_info.ssid_len);
        offset += ap_info.ssid_len;
        
        // IP Address
        tcpip_adapter_ip_info_t ip_info;
        if (tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_STA, &ip_info) == ESP_OK) {
            memcpy(status_data + offset, &ip_info.ip.addr, 4);
            offset += 4;
        }
    }
    
    // 构建响应帧
    uint8_t response[128];
    size_t frame_len = build_blufi_frame(
        0x14,              // Type: WiFi Status Response
        0x42,              // FrameControl
        device_sequence++, // 设备序列号
        status_data,       // 状态数据
        offset,            // 数据长度
        response
    );
    
    esp_ble_gatts_send_indicate(gatt_if, conn_id, char_handle_ff02, frame_len, response, false);
}
```

## 6. 错误处理

### 6.1 错误响应格式

设备端应发送错误响应帧：

```
Type: 0x49 (ACK/Error Response)
FrameControl: 0x42
Sequence: [设备序列号]
DataLength: 0x01
Data: [Error_Code(1)]
Checksum: [计算值]
```

### 6.2 错误码定义

| 错误码 | 说明 |
|-------|------|
| 0x00 | 成功 |
| 0x01 | 数据格式错误 |
| 0x02 | 配置不完整 |
| 0x03 | 校验和错误 |
| 0x04 | 序列号错误 |
| 0x05 | WiFi 连接失败 |

### 6.3 错误处理示例

```c
void send_error_response(uint8_t error_code) {
    uint8_t data[1] = {error_code};
    uint8_t response[8];
    
    size_t len = build_blufi_frame(
        0x49,              // Type: Error Response
        0x42,              // FrameControl
        device_sequence++, // 设备序列号
        data,              // 错误码
        1,                 // 数据长度
        response
    );
    
    esp_ble_gatts_send_indicate(gatt_if, conn_id, char_handle_ff02, len, response, false);
}
```

## 7. 测试与调试

### 7.1 日志输出建议

设备端应输出详细的日志信息：

```c
#define BLUFI_TAG "BLUFI"

ESP_LOGI(BLUFI_TAG, "Received frame: Type=0x%02X, FC=0x%02X, Seq=%d, Len=%d",
         frame[0], frame[1], frame[2], frame[3]);

ESP_LOGI(BLUFI_TAG, "Frame data: %s", 
         esp_log_buffer_hex(BLUFI_TAG, frame, frame_len));

uint16_t calculated_crc = calculate_crc16(checksum_data, checksum_len);
uint16_t received_crc = frame[frame_len-2] | (frame[frame_len-1] << 8);
ESP_LOGI(BLUFI_TAG, "Checksum: calculated=0x%04X, received=0x%04X", 
         calculated_crc, received_crc);
```

### 7.2 常见问题排查

1. **校验和错误**: 检查 CRC16 计算是否正确，确保计算数据为 `[Sequence][DataLength][Data]`
2. **序列号错误**: 确保设备端正确跟踪客户端序列号，响应时使用设备自己的序列号
3. **帧格式错误**: 验证帧结构是否符合规范，特别是 FrameControl 字段
4. **MTU 限制**: 大数据包需要分片，检查分片标志位设置

## 8. 参考实现

### 8.1 ESP-IDF BLUFI API

ESP-IDF 提供了完整的 BLUFI 实现，建议使用官方 API：

```c
#include "esp_blufi_api.h"

// 初始化 BLUFI
esp_blufi_callbacks_t blufi_callbacks = {
    .event_cb = blufi_event_callback,
    .negotiate_data_handler = blufi_negotiate_data_handler,
    .encrypt_func = blufi_encrypt_func,
    .decrypt_func = blufi_decrypt_func,
    .checksum_func = blufi_checksum_func,
};

esp_blufi_profile_init(&blufi_callbacks);
```

### 8.2 官方文档

- [ESP-IDF BLUFI API 文档](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/protocols/esp_blufi.html)
- [BLUFI 协议规范](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/protocols/esp_blufi.html#blufi-protocol)

## 9. 总结

本文档详细说明了 ESP32 BLUFI 配网协议的实现规范，包括：

1. **GATT 服务配置**: 必须实现的服务和特性
2. **帧格式规范**: 完整的帧结构和字段说明
3. **CRC16 校验**: 校验和计算算法和实现
4. **配网流程**: 完整的命令序列和响应格式
5. **代码示例**: C 语言实现示例

遵循本文档规范实现，可确保设备端与前端 Web 应用的正确通信和配网功能。

---

**版本**: 1.0  
**更新日期**: 2025-01-XX  
**适用平台**: ESP32 (ESP-IDF 4.0+)
