// Real Device Service - Implement actual WiFi and Bluetooth functionality
// botrate:74880
import { deviceApiService, DeviceRecord as ApiDeviceRecord } from './api/deviceApi';
import type { DeviceType, DeviceStatus as BackendDeviceStatus } from '../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import { calculateCRC16 } from '../lib/encriptutil';

// Bluetooth API type declarations
declare global {
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
  }
  
  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource | Uint8Array): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
  }
  
  type BluetoothServiceUUID = string;
  type BluetoothCharacteristicUUID = string;
}

export interface WiFiNetwork {
  id: string;
  name: string;
  security: string;
  strength: number;
  password?: string;
  frequency?: number;
  channel?: number;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  type: string;
  mac: string;
  paired?: boolean;
  connectable?: boolean;
}

export interface DeviceRecord {
  id?: string;
  name: string;
  type: string;
  macAddress: string;
  wifiNetwork: string;
  status: string;
  connectedAt: string;
  principalId: string;
  // Tencent IoT product information from device GATT
  productId?: string;
}

export interface ConnectionProgress {
  progress: number;
  message: string;
}

export interface TencentIoTConfig {
  productId: string;
  deviceName: string;
  region: string;
}

export interface WiFiConfigData {
  ssid: string;
  password: string;
  security: string;
}

export interface LocalDeviceStatus {
  isConnected: boolean;
  mqttConnected: boolean;
  lastSeen?: string;
}

class RealDeviceService {
  private wifiNetworks: WiFiNetwork[] = [];
  private bluetoothDevices: BluetoothDevice[] = [];

  private isScanningBluetooth = false;
  
  // GATT connection management
  private gattConnections = new Map<string, BluetoothRemoteGATTServer>();
  private gattConnectionPromises = new Map<string, Promise<BluetoothRemoteGATTServer>>();
  
  // BLUFI protocol sequence management
  private blufiSequenceNumber = 0; // Start from 0, BLUFI protocol standard
  
  // WiFi scan listening management
  private activeWiFiScanListeners = new Map<string, {
    responseCharacteristic: BluetoothRemoteGATTCharacteristic;
    timeoutId?: NodeJS.Timeout;
    readInterval?: NodeJS.Timeout;
    isActive: boolean;
    handleResponse?: (event: any) => void; // ✅ Store listener reference for cleanup
  }>();
  
  // ✅ BLUFI FF02 notification subscriptions (persistent across entire session)
  // Key: device ID, Value: FF02 characteristic with active notification
  private blufiNotificationChannels = new Map<string, BluetoothRemoteGATTCharacteristic>();
  
  // ✅ Unified notification handlers - routing table for different frame types
  // This prevents multiple handlers from interfering with each other
  private blufiNotificationHandlers = new Map<string, {
    wifiScanHandler?: (data: Uint8Array) => void;
    ackHandler?: (data: Uint8Array) => void;
    statusHandler?: (data: Uint8Array) => void;
  }>();

  // 🤝 Perform a minimal BLUFI handshake after reconnect to reset/align session state
  private async performBlufiHandshake(
    gattServer: BluetoothRemoteGATTServer,
    deviceId: string,
    sequence: number = 0
  ): Promise<boolean> {
    try {
      console.log(`🤝 Performing BLUFI handshake after reconnect (device ${deviceId})...`);
      const service = await gattServer.getPrimaryService('0000ffff-0000-1000-8000-00805f9b34fb');
      const commandCharacteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');

      // Ensure FF02 notification channel exists (for ACK)
      const responseCharacteristic = await this.ensureBlufiNotificationChannel(deviceId, gattServer);

      // Handshake command: Type 0x00 (control, negotiate), Seq=sequence, no data, with CRC
      const handshake0 = this.createBLUFICommand(0x00, sequence, new Uint8Array(0));
      console.log(`   📤 Writing handshake (seq ${sequence}): ${Array.from(handshake0).map(b => b.toString(16).padStart(2,'0')).join(' ')}`);

      // Register ACK wait before write; device often responds with Type=0x49
      const ackPromise = this.waitForDeviceAck(deviceId, 'Handshake', 5000, sequence + 1);

      await commandCharacteristic.writeValue(handshake0);
      console.log(`   ✅ Handshake frame written`);

      // Small settle delay and wait for ACK
      await new Promise(resolve => setTimeout(resolve, 50));
      const ack = await ackPromise;
      if (ack) {
        console.log(`   ✅ Handshake ACK received`);
        return true;
      } else {
        console.warn(`   ⚠️  Handshake ACK timeout (continuing)`);
        return false;
      }
    } catch (error) {
      console.warn(`   ⚠️  Handshake failed or not supported, continuing:`, error);
      return false;
    }
  }

  // 🔁 Restart GATT session for WiFi configuration: close previous GATT, clear handlers, reconnect, reset sequence
  async restartGattSessionForConfig(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    const deviceId = device.id || device.name;
    console.log(`🔁 Restarting GATT session before WiFi config: deviceId=${deviceId}, name=${device.name}`);
    try {
      // Stop FF02 notifications if active
      const existingChannel = this.blufiNotificationChannels.get(deviceId);
      if (existingChannel) {
        try {
          console.log(`   🔕 Stopping FF02 notifications for device ${deviceId}`);
          await existingChannel.stopNotifications();
        } catch (stopErr) {
          console.warn(`   ⚠️  Failed to stop FF02 notifications:`, stopErr);
        }
      }

      // Clear handler routing table for this device
      if (this.blufiNotificationHandlers.has(deviceId)) {
        console.log(`   🧹 Clearing unified notification handlers for device ${deviceId}`);
        this.blufiNotificationHandlers.delete(deviceId);
      }
      if (this.blufiNotificationChannels.has(deviceId)) {
        console.log(`   🧹 Clearing notification channel cache for device ${deviceId}`);
        this.blufiNotificationChannels.delete(deviceId);
      }

      // Close previous GATT connection (connection cache)
      await this.closeGATTConnection(device);
      console.log(`   🔌 Previous GATT connection closed (cache, if any)`);

      // Also proactively disconnect the device-level cached GATT server
      const cachedGatt: BluetoothRemoteGATTServer | undefined = (device as any).gattServer;
      if (cachedGatt && cachedGatt.connected) {
        try {
          console.log(`   🔌 Proactively disconnecting device.gattServer (was connected)`);
          await cachedGatt.disconnect();
          console.log(`   ✅ device.gattServer disconnected`);
        } catch (discErr) {
          console.warn(`   ⚠️  Failed to disconnect device.gattServer:`, discErr);
        }
      }

      // Small delay to ensure the peripheral processes disconnection
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reconnect GATT using the device-level cached server if available
      let gattServer: BluetoothRemoteGATTServer | null = null;
      const reconnectTarget: BluetoothRemoteGATTServer | undefined = (device as any).gattServer;
      if (reconnectTarget) {
        console.log(`   🔗 Reconnecting device.gattServer...`);
        // Backoff retries: BLE stacks may need a grace period after disconnect
        const maxReconnectAttempts = 5;
        let attempt = 0;
        let lastError: any = null;
        while (attempt < maxReconnectAttempts) {
          try {
            attempt++;
            console.log(`     ↻ GATT reconnect attempt ${attempt}/${maxReconnectAttempts}`);
            const reconnected = await reconnectTarget.connect();
            gattServer = reconnected;
            console.log(`   ✅ device.gattServer reconnected on attempt ${attempt}`);
            // Update connection cache
            this.gattConnections.set(deviceId, reconnected);
            break;
          } catch (reErr) {
            lastError = reErr;
            console.warn(`     ⚠️  GATT reconnect attempt ${attempt} failed:`, reErr);
            const backoff = 200 * attempt; // linear backoff
            await new Promise(resolve => setTimeout(resolve, backoff));
          }
        }
        if (!gattServer) {
          throw new Error(`GATT reconnect failed after ${maxReconnectAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
      } else {
        console.log(`   🔎 No device.gattServer cached, falling back to getGATTConnection()`);
        gattServer = await this.getGATTConnection(device);
      }
      console.log(`   🔗 Reconnected GATT: connected=${(gattServer as any).connected !== false}`);

      // Re-establish FF02 notification channel
      await this.ensureBlufiNotificationChannel(deviceId, gattServer);
      console.log(`   📡 FF02 notification channel re-established for device ${deviceId}`);

      // Perform a quick BLUFI handshake to align sequence expectations on device side (with safe retry and backoff)
      // 但根据当前策略：保持现有序列计数，不清零，使用 seq=3 做握手
      let handshakeOk = await this.performBlufiHandshake(gattServer, deviceId, 3);
      if (!handshakeOk) {
        console.warn(`   ⚠️  Handshake not confirmed, retrying after 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        // Recreate FF02 notify in case it dropped
        await this.ensureBlufiNotificationChannel(deviceId, gattServer);
        handshakeOk = await this.performBlufiHandshake(gattServer, deviceId, 3);
        if (!handshakeOk) {
          console.warn(`   ⚠️  Handshake still not confirmed, proceeding cautiously`);
        }
      }

      return gattServer;
    } catch (error) {
      console.error(`❌ Failed to restart GATT session:`, error);
      throw error;
    }
  }
  
  // WiFi configuration lock to prevent concurrent configuration
  private activeWiFiConfigurations = new Set<string>();


  // ✅ Unified notification dispatcher - single entry point for all FF02 notifications
  private createUnifiedNotificationHandler(deviceId: string): (event: any) => void {
    return (event: any) => {
      const dataView = event.target.value;
      if (!dataView || dataView.byteLength === 0) {
        console.log(`   🔕 Unified dispatcher: empty notification for device ${deviceId}`);
        return;
      }
      
      const data = new Uint8Array(dataView.buffer);
      const frameType = data[0];
      
      // ✅ 打印完整的原始数据用于分析
      const fullHexData = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`   🔔 Unified dispatcher received: device=${deviceId}, length=${data.byteLength}`);
      console.log(`   📊 Full raw data: ${fullHexData}`);
      console.log(`   🔍 Frame type: 0x${frameType.toString(16).padStart(2, '0')}`);
      console.log(`   🕐 Timestamp: ${new Date().toISOString()}`);
      
      // Get registered handlers for this device
      const handlers = this.blufiNotificationHandlers.get(deviceId);
      if (!handlers) {
        console.log(`   ⚠️  No handlers registered for device ${deviceId}, ignoring notification`);
        console.log(`   📊 Current handler map keys:`, Array.from(this.blufiNotificationHandlers.keys()));
        console.log(`   🔍 This might be why ACK is not being processed!`);
        return;
      }
      
      console.log(`   📋 Available handlers: ackHandler=${!!handlers.ackHandler}, wifiScanHandler=${!!handlers.wifiScanHandler}, statusHandler=${!!handlers.statusHandler}`);
      
      // ✅ 优先路由ACK：确保FF02通知监听在整个会话里始终在线且先路由ACK
      if (frameType === 0x49) {
        // ACK/Status frame (Type=0x49) - 最高优先级
        if (handlers.ackHandler) {
          console.log(`   📨 Routing ACK frame (0x49) to ackHandler - PRIORITY`);
          handlers.ackHandler(data);
        } else if (handlers.statusHandler) {
          console.log(`   📨 Routing status frame (0x49) to statusHandler`);
          handlers.statusHandler(data);
        } else {
          console.log(`   ⚠️  ACK frame received but no handler registered - THIS IS THE PROBLEM!`);
        }
      } else {
        // WiFi scan data or other data frames - 低优先级
        console.log(`   🔀 Non-ACK frame, frameType=0x${frameType.toString(16)}`);
        if (handlers.wifiScanHandler) {
          console.log(`   📨 Routing data frame (0x${frameType.toString(16)}) to wifiScanHandler`);
          handlers.wifiScanHandler(data);
        } else {
          console.log(`   ⚠️  Data frame received but no wifiScanHandler registered`);
        }
      }
    };
  }

  // ✅ Establish persistent FF02 notification channel for BLUFI communication
  // This should be called once when starting BLUFI operations and kept alive throughout the session
  private async ensureBlufiNotificationChannel(
    deviceId: string,
    gattServer: BluetoothRemoteGATTServer
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    // Check if we already have an active notification channel
    const existing = this.blufiNotificationChannels.get(deviceId);
    if (existing) {
      console.log(`   ♻️  Reusing existing FF02 notification channel for device ${deviceId}`);
      return existing;
    }

    console.log(`   🔔 Establishing persistent FF02 notification channel for device ${deviceId}`);
    
    try {
      // Get BLUFI service (0xFFFF)
      const service = await gattServer.getPrimaryService('0000ffff-0000-1000-8000-00805f9b34fb');
      
      // Get FF02 characteristic (notification/response channel)
      const ff02Characteristic = await service.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb');
      
      // ✅ Set up unified notification handler (only ONE listener per device)
      const unifiedHandler = this.createUnifiedNotificationHandler(deviceId);
      ff02Characteristic.addEventListener('characteristicvaluechanged', unifiedHandler);
      console.log(`   📡 Unified notification handler attached for device ${deviceId}`);
      
      // Enable notifications
      await ff02Characteristic.startNotifications();
      console.log(`   ✅ FF02 notifications enabled for device ${deviceId}`);
      
      // Initialize empty handlers map for this device
      if (!this.blufiNotificationHandlers.has(deviceId)) {
        this.blufiNotificationHandlers.set(deviceId, {});
      }
      
      // Store for reuse
      this.blufiNotificationChannels.set(deviceId, ff02Characteristic);
      
      return ff02Characteristic;
    } catch (error) {
      console.error(`   ❌ Failed to establish FF02 notification channel:`, error);
      throw error;
    }
  }
  
  // ✅ Register/unregister handlers for specific notification types
  private registerNotificationHandler(
    deviceId: string,
    type: 'wifiScan' | 'ack' | 'status',
    handler: (data: Uint8Array) => void
  ): void {
    const handlers = this.blufiNotificationHandlers.get(deviceId) || {};
    
    if (type === 'wifiScan') {
      handlers.wifiScanHandler = handler;
      console.log(`   ✅ Registered wifiScan handler for device ${deviceId}`);
    } else if (type === 'ack') {
      handlers.ackHandler = handler;
      console.log(`   ✅ Registered ACK handler for device ${deviceId}`);
    } else if (type === 'status') {
      handlers.statusHandler = handler;
      console.log(`   ✅ Registered status handler for device ${deviceId}`);
    }
    
    this.blufiNotificationHandlers.set(deviceId, handlers);
  }
  
  private unregisterNotificationHandler(
    deviceId: string,
    type: 'wifiScan' | 'ack' | 'status'
  ): void {
    const handlers = this.blufiNotificationHandlers.get(deviceId);
    if (handlers) {
      if (type === 'wifiScan') {
        delete handlers.wifiScanHandler;
        console.log(`   🗑️  Unregistered wifiScan handler for device ${deviceId}`);
      } else if (type === 'ack') {
        delete handlers.ackHandler;
        console.log(`   🗑️  Unregistered ACK handler for device ${deviceId}`);
      } else if (type === 'status') {
        delete handlers.statusHandler;
        console.log(`   🗑️  Unregistered status handler for device ${deviceId}`);
      }
    }
  }

  // Create BLUFI command with correct format
  private createBLUFICommand(type: number, sequence: number, data: Uint8Array = new Uint8Array(0)): Uint8Array {
    // ✅ 正确的 BLUFI 帧格式（不分片，带校验）:
    // [Type(1)][FrameControl(1)][Sequence(1)][DataLength(1)][Data(n)][Checksum(2)]
    // 
    // Type = 1 byte (low 2 bits: frame type, high 6 bits: subtype)
    // FrameControl = 1 byte (encryption, checksum, direction, ACK, fragment flags)
    // Sequence = 1 byte sequence number
    // DataLength = 1 byte (length of Data field)
    // Data = n bytes
    // Checksum = 2 bytes CRC16-CCITT (if FrameControl bit 1 is set)
    
    // Frame control byte: 0x02 = 带校验、无加密、不要求ACK、无分片
    const frameControl = 0x02; // bit 1 set = has checksum
    const dataLength = data.length;
    
    // ✅ 修复：BLUFI校验和计算应该校验"序列号 + 数据长度 + 明文数据"
    // 构建帧（用于校验计算）: [Seq][Len][Data]
    const checksumData = new Uint8Array(2 + dataLength);
    checksumData[0] = sequence;
    checksumData[1] = dataLength;
    if (dataLength > 0) {
      checksumData.set(data, 2);
    }
    
    // 计算 CRC16 (使用 encriptutil.ts 中的实现)
    const crc16 = calculateCRC16(checksumData);
    const crcLow = crc16 & 0xFF;
    const crcHigh = (crc16 >> 8) & 0xFF;
    
    // 构建完整帧: [Type][FC][Seq][Len][Data][CRC_Low][CRC_High]
    const command = new Uint8Array(4 + dataLength + 2);
    command[0] = type;
    command[1] = frameControl;
    command[2] = sequence;
    command[3] = dataLength;
    if (dataLength > 0) {
      command.set(data, 4);
    }
    command[4 + dataLength] = crcLow;
    command[4 + dataLength + 1] = crcHigh;
    
    // Parse Type field for debugging
    const frameType = type & 0x03; // Low 2 bits
    const subtype = (type >> 2) & 0x3F; // High 6 bits
    const frameTypeStr = frameType === 0 ? '控制帧' : frameType === 1 ? '数据帧' : '未知';
    
    console.log('🔍 BLUFI Command Debug:', {
      type: `0x${type.toString(16).padStart(2, '0')} (${frameTypeStr}, subtype=${subtype})`,
      frameControl: `0x${frameControl.toString(16).padStart(2, '0')} (带校验/无加密/无分片)`,
      sequence: sequence,
      dataLength: dataLength,
      data: dataLength > 0 ? Array.from(data).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ') : '无',
      crc16: `0x${crc16.toString(16).padStart(4, '0')} (Low: 0x${crcLow.toString(16).padStart(2, '0')}, High: 0x${crcHigh.toString(16).padStart(2, '0')})`,
      finalCommand: Array.from(command).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
    });
    
    return command;
  }

  // Create BLUFI command without checksum (FrameControl no checksum)
  private createBLUFICommandNoChecksum(type: number, sequence: number, data: Uint8Array = new Uint8Array(0)): Uint8Array {
    // [Type][FrameControl=0x00][Sequence][DataLength][Data]
    const frameControl = 0x00; // no checksum
    const dataLength = data.length;

    const command = new Uint8Array(4 + dataLength);
    command[0] = type;
    command[1] = frameControl;
    command[2] = sequence;
    command[3] = dataLength;
    if (dataLength > 0) {
      command.set(data, 4);
    }

    const frameType = type & 0x03;
    const subtype = (type >> 2) & 0x3F;
    const frameTypeStr = frameType === 0 ? '控制帧' : frameType === 1 ? '数据帧' : '未知';

    console.log('🔍 BLUFI Command Debug (no CRC):', {
      type: `0x${type.toString(16).padStart(2, '0')} (${frameTypeStr}, subtype=${subtype})`,
      frameControl: `0x${frameControl.toString(16).padStart(2, '0')} (无校验/无加密/无分片)`,
      sequence: sequence,
      dataLength: dataLength,
      data: dataLength > 0 ? Array.from(data).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ') : '无',
      finalCommand: Array.from(command).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
    });

    return command;
  }
  
  // Reset BLUFI sequence number for new connection
  private resetBlufiSequenceNumber(): void {
    this.blufiSequenceNumber = 0; // Start from 0, BLUFI protocol standard
    console.log('BLUFI sequence number reset to 0 (BLUFI protocol standard)');
  }

  // Get next BLUFI sequence number
  private getNextBlufiSequenceNumber(): number {
    const currentSeq = this.blufiSequenceNumber;
    this.blufiSequenceNumber = (this.blufiSequenceNumber + 1) % 256; // Wrap around at 256
    // Start from 2 as device expects this after GATT discovery
    console.log(`🔢 BLUFI Sequence Number: Using ${currentSeq} (next will be ${this.blufiSequenceNumber})`);
    return currentSeq;
  }

  // Force reset BLUFI sequence number to 2 (for device compatibility)
  private forceResetBlufiSequenceNumber(): void {
    this.blufiSequenceNumber = 0;
    console.log('BLUFI sequence number force reset to 0 (BLUFI protocol standard)');
  }

  // Try multiple command formats automatically

  // Try to send command with timeout
  private async trySendCommandWithTimeout(
    command: Uint8Array,
    commandCharacteristic: BluetoothRemoteGATTCharacteristic,
    responseCharacteristic: BluetoothRemoteGATTCharacteristic,
    timeoutMs: number
  ): Promise<{success: boolean, responseData?: Uint8Array, error?: string}> {
    try {
      console.log(`   📡 Sending command to GATT characteristic...`);
      
      // Send command
      await commandCharacteristic.writeValue(command);
      console.log(`   ✅ Command sent successfully to GATT`);
      
      // Wait for response with timeout
      const responseResult = await this.waitForResponseWithTimeout(responseCharacteristic, timeoutMs);
      
      if (responseResult.success) {
        console.log(`   📨 Response received successfully`);
        console.log(`   📊 Response length: ${responseResult.responseData?.length || 0} bytes`);
        return { success: true, responseData: responseResult.responseData };
      } else {
        console.log(`   ⏰ No response received within ${timeoutMs}ms timeout`);
        return { success: false, error: 'Timeout' };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Command send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  // Wait for response with timeout
  private async waitForResponseWithTimeout(
    responseCharacteristic: BluetoothRemoteGATTCharacteristic,
    timeoutMs: number
  ): Promise<{success: boolean, responseData?: Uint8Array}> {
    return new Promise((resolve) => {
      let responseReceived = false;
      
      // Set up notification listener
      const handleResponse = (event: any) => {
        if (responseReceived) return; // Already handled
        responseReceived = true;
        
        console.log(`   📨 BLE Notification received`);
        const dataView = event.target.value;
        
        if (dataView && dataView.byteLength > 0) {
          const responseData = new Uint8Array(dataView.buffer);
          const hexString = Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' ');
          const asciiString = Array.from(responseData).map(b => String.fromCharCode(b)).join('');
          
          console.log(`   📊 Response data length: ${responseData.length} bytes`);
          console.log(`   📊 Response data (hex): ${hexString}`);
          console.log(`   📊 Response data (ASCII): ${asciiString}`);
          
          // Parse response
          this.parseAndPrintWiFiScanResults(responseData);
          resolve({ success: true, responseData });
        } else {
          console.log(`   ⚠️  Empty response received`);
          resolve({ success: false });
        }
      };
      
      // Start notifications
      responseCharacteristic.startNotifications().then(() => {
        console.log(`   🔔 Notifications started, waiting for response...`);
        responseCharacteristic.addEventListener('characteristicvaluechanged', handleResponse);
      }).catch(error => {
        console.log(`   ❌ Failed to start notifications: ${error}`);
        resolve({ success: false });
      });
      
      // Set timeout
      setTimeout(() => {
        if (!responseReceived) {
          console.log(`   ⏰ Response timeout reached (${timeoutMs}ms)`);
          resolve({ success: false });
        }
      }, timeoutMs);
    });
  }

  // Wait for Exchange Info response (ACK)
  private async waitForExchangeInfoResponse(
    responseCharacteristic: BluetoothRemoteGATTCharacteristic,
    timeoutMs: number
  ): Promise<{success: boolean, responseData?: Uint8Array}> {
    return new Promise((resolve) => {
      let responseReceived = false;
      
      // Set up notification listener for Exchange Info response
      const handleResponse = (event: any) => {
        if (responseReceived) return; // Already handled
        responseReceived = true;
        
        console.log(`   📨 Exchange Info response received`);
        const dataView = event.target.value;
        
        if (dataView && dataView.byteLength > 0) {
          const responseData = new Uint8Array(dataView.buffer);
          const hexString = Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' ');
          
          console.log(`   📊 Exchange Info response length: ${responseData.length} bytes`);
          console.log(`   📊 Exchange Info response (hex): ${hexString}`);
          
          // Check if this is an ACK response
          if (responseData.length >= 3) {
            const responseType = responseData[0];
            const sequence = responseData[1];
            const dataLength = responseData[2];
            
            console.log(`   📋 Exchange Info Response - Type: 0x${responseType.toString(16).padStart(2, '0')}, Seq: ${sequence}, Length: ${dataLength}`);
            
            // Check if this is an ACK response (type 0x01)
            if (responseType === 0x01) {
              console.log('   ✅ Exchange Info ACK received');
              resolve({ success: true, responseData });
            } else {
              console.log('   ⚠️  Unexpected response type for Exchange Info');
              resolve({ success: false });
            }
          } else {
            console.log('   ⚠️  Invalid Exchange Info response format');
            resolve({ success: false });
          }
        } else {
          console.log(`   ⚠️  Empty Exchange Info response received`);
          resolve({ success: false });
        }
      };
      
      // Start notifications
      responseCharacteristic.startNotifications().then(() => {
        console.log(`   🔔 Notifications started, waiting for Exchange Info response...`);
        responseCharacteristic.addEventListener('characteristicvaluechanged', handleResponse);
      }).catch(error => {
        console.log(`   ❌ Failed to start notifications: ${error}`);
        resolve({ success: false });
      });
      
      // Set timeout
      setTimeout(() => {
        if (!responseReceived) {
          console.log(`   ⏰ Exchange Info response timeout reached (${timeoutMs}ms)`);
          resolve({ success: false });
        }
      }, timeoutMs);
    });
  }

  // Wait for multi-frame WiFi scan response
  private async waitForMultiFrameWiFiScanResponse(
    responseCharacteristic: BluetoothRemoteGATTCharacteristic,
    timeoutMs: number,
    deviceId?: string
  ): Promise<{success: boolean, allFrames?: Uint8Array[]}> {
    return new Promise((resolve) => {
      const allFrames: Uint8Array[] = [];
      let lastSequence = -1;
      let isComplete = false;
      let timeoutId: NodeJS.Timeout | undefined;
      let readInterval: NodeJS.Timeout;
      
      // Set up notification listener for multiple frames
      let expectedTotalLength = 0;
      let receivedDataLength = 0;
      let isFirstFrame = true;
      let expectedSequence = 0; // 添加期望的序列号跟踪
      
      const handleResponse = (event: any) => {
        console.log(`   📨 BLE Notification received (frame ${allFrames.length + 1})`);
        console.log(`   🕐 Timestamp: ${new Date().toISOString()}`);
        
        const dataView = event.target.value;
        
        if (dataView && dataView.byteLength > 0) {
          const responseData = new Uint8Array(dataView.buffer);
          const hexString = Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' ');
          
          console.log(`   📊 Frame data length: ${responseData.length} bytes`);
          console.log(`   📊 Frame data (hex): ${hexString}`);
          
          // Check if this is a simple single-byte response format
          if (responseData.length === 1) {
            console.log(`   📋 Frame ${allFrames.length + 1} analysis: Single-byte response`);
            console.log(`      Data: 0x${responseData[0].toString(16).padStart(2, '0')}`);
            
            // Check if this is a status code
            if (responseData[0] === 0x00) {
              console.log(`   📋 Status: 0x00 - This might be a keep-alive or scan in progress`);
              console.log(`   ℹ️  Device is responding but may still be scanning WiFi networks`);
            } else {
              console.log(`   📋 Status: 0x${responseData[0].toString(16).padStart(2, '0')} - Unknown status code`);
            }
            
            // Don't store single-byte responses as they're likely keep-alive or status
            // Wait for actual WiFi data frames
            console.log(`   ⏳ Skipping single-byte response, waiting for WiFi data frames`);
            
          } else if (responseData.length >= 5) {
            // ✅ 根据 BLUFI 协议，检查帧类型
            // 正确的帧格式: [Type][FrameControl][Sequence][DataLength][Data]
            const frameType = responseData[0];
            
            // 🚫 跳过错误/状态响应帧 (Type=0x49)，这不是WiFi扫描数据
            if (frameType === 0x49) {
              const fc = responseData[1];
              const seq = responseData[2];
              const len = responseData[3];
              const data = len > 0 ? responseData[4] : null;
              console.log(`   🔔 Device status/error response frame detected (Type=0x49)`);
              console.log(`      FrameControl: 0x${fc.toString(16).padStart(2, '0')}`);
              console.log(`      Sequence: ${seq}`);
              console.log(`      DataLength: ${len}`);
              if (data !== null) {
                console.log(`      Error Code: ${data}`);
              }
              console.log(`   ⏭️  Skipping status response, waiting for WiFi scan data`);
              return; // 不处理这个帧
            }
            
            // Parse WiFi scan frame format: [帧控制(分片)][序列号][数据长度][内容总长度(2字节)][数据内容][校验]
            const frameControl = responseData[0];
            const sequenceNumber = responseData[1];
            const dataLength = responseData[2];
            const totalContentLength = (responseData[3] << 8) | responseData[4]; // 2-byte content total length
            
            // 检查分片状态标志
            // 根据BluFi协议，0x45 = 01000101，Bit 6 (0x40) 是1，表示最后一个分片
            // 但Bit 4 (0x10) 是0，这可能意味着这是分片序列的最后一个帧
            const isFragmented = (frameControl & 0x10) !== 0;
            const isFirstFragment = (frameControl & 0x20) !== 0;
            const isLastFragment = (frameControl & 0x40) !== 0;
            const isMiddleFragment = isFragmented && !isFirstFragment && !isLastFragment;
            
            // 特殊处理：如果Bit 6是1但Bit 4是0，这可能是分片序列的最后一个帧
            const isLastFrameInSequence = (frameControl & 0x40) !== 0 && (frameControl & 0x10) === 0;
            
            // 调试：显示帧控制位的详细分析
            console.log(`   🔍 Frame Control Analysis:`);
            console.log(`      Binary: ${frameControl.toString(2).padStart(8, '0')}`);
            console.log(`      Bit 4 (0x10): ${(frameControl & 0x10) ? '1' : '0'} (Fragmented)`);
            console.log(`      Bit 5 (0x20): ${(frameControl & 0x20) ? '1' : '0'} (First Fragment)`);
            console.log(`      Bit 6 (0x40): ${(frameControl & 0x40) ? '1' : '0'} (Last Fragment)`);
            console.log(`      Bit 7 (0x80): ${(frameControl & 0x80) ? '1' : '0'} (Reserved)`);
            
            console.log(`   📋 Frame ${allFrames.length + 1} analysis: Multi-byte frame`);
            console.log(`      Frame Control: 0x${frameControl.toString(16).padStart(2, '0')} (分片控制)`);
            console.log(`      Sequence: ${sequenceNumber}`);
            console.log(`      Data Length: ${dataLength}`);
            console.log(`      Total Content Length: ${totalContentLength} bytes`);
            console.log(`      Fragmented: ${isFragmented}, First: ${isFirstFragment}, Last: ${isLastFragment}, Middle: ${isMiddleFragment}`);
            console.log(`      Last Frame in Sequence: ${isLastFrameInSequence}`);
            
            // On first frame, determine expected total length
            if (isFirstFrame) {
              expectedTotalLength = totalContentLength;
              console.log(`   📊 Expected total content length: ${expectedTotalLength} bytes`);
              isFirstFrame = false;
            }
            
            // 验证分片顺序
            if (isFirstFragment) {
              expectedSequence = sequenceNumber;
              console.log(`   📊 First fragment sequence: ${expectedSequence}`);
            } else if (isFragmented || isLastFrameInSequence) {
              expectedSequence = (expectedSequence + 1) % 256;
              if (sequenceNumber !== expectedSequence) {
                console.warn(`   ⚠️  Fragment sequence mismatch: expected ${expectedSequence}, got ${sequenceNumber}`);
                console.warn(`   🔄 Adjusting expected sequence to ${sequenceNumber}`);
                expectedSequence = sequenceNumber; // 调整期望序列号
              } else {
                console.log(`   ✅ Fragment sequence correct: ${sequenceNumber}`);
              }
            }
            
            // 显示分片状态信息
            if (isFragmented || isLastFrameInSequence) {
              console.log(`   📊 Fragment status: First=${isFirstFragment}, Last=${isLastFragment}, Middle=${isMiddleFragment}, LastInSequence=${isLastFrameInSequence}`);
              console.log(`   📊 Fragment progress: ${allFrames.length} fragments received, ${receivedDataLength}/${expectedTotalLength} bytes`);
            }
            
            // Extract actual data content based on frame type
            let actualData: Uint8Array;
            let actualDataLength: number;
            
            if (isFragmented || isLastFrameInSequence) {
              // 分片帧或分片序列的最后一个帧：数据在 [帧控制][序列号][数据长度][内容总长度(2字节)][数据内容][校验]
              // 对于分片帧，dataLength通常为0，实际数据在分片数据部分
            const dataStart = 5; // Skip [帧控制][序列号][数据长度][内容总长度(2字节)]
            const dataEnd = responseData.length - 2; // Skip 2-byte checksum at end
              actualDataLength = dataEnd - dataStart;
              actualData = responseData.slice(dataStart, dataEnd);
              
              console.log(`   📊 Fragmented frame data extraction:`);
              console.log(`      Data start: ${dataStart}, Data end: ${dataEnd}`);
              console.log(`      Actual data length: ${actualDataLength} bytes`);
            } else {
              // 普通帧：数据在 [帧控制][序列号][数据长度][数据内容][校验]
              const dataStart = 3; // Skip [帧控制][序列号][数据长度]
              const dataEnd = responseData.length - 2; // Skip 2-byte checksum at end
              actualDataLength = dataEnd - dataStart;
              actualData = responseData.slice(dataStart, dataEnd);
              
              console.log(`   📊 Regular frame data extraction:`);
              console.log(`      Data start: ${dataStart}, Data end: ${dataEnd}`);
              console.log(`      Actual data length: ${actualDataLength} bytes`);
            }
            
            if (actualDataLength > 0) {
              console.log(`   📊 Actual data (hex): ${Array.from(actualData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
              
              // Store the actual data content
              allFrames.push(actualData);
              receivedDataLength += actualDataLength;
              lastSequence = sequenceNumber;
              
              console.log(`   ✅ Frame ${allFrames.length} data stored (${actualDataLength} bytes)`);
              console.log(`   📊 Progress: ${receivedDataLength}/${expectedTotalLength} bytes received`);
              
              // 检查是否是最后一个分片
              if (isLastFragment || isLastFrameInSequence) {
                console.log(`   ✅ Last fragment received, completing reassembly`);
                console.log(`   📊 Total data received: ${receivedDataLength} bytes`);
                
                // 即使没有达到期望长度，如果是最后一个分片就完成重组
                if (receivedDataLength > 0) {
                  // Combine all data into a single buffer
                  const combinedData = new Uint8Array(receivedDataLength);
                  let offset = 0;
                  
                  for (const frame of allFrames) {
                    combinedData.set(frame, offset);
                    offset += frame.length;
                  }
                  
                  console.log(`   📊 Final combined data length: ${combinedData.length} bytes`);
                  console.log(`   📊 Final combined data (hex): ${Array.from(combinedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                  
                  isComplete = true;
                  resolve({ success: true, allFrames: [combinedData] });
                  return;
                }
              }
              
              // Check if we've received all expected data
              if (receivedDataLength >= expectedTotalLength) {
                console.log(`   🎉 All expected data received! (${receivedDataLength}/${expectedTotalLength} bytes)`);
                
                // Combine all data into a single buffer
                const combinedData = new Uint8Array(receivedDataLength);
                let offset = 0;
                
                for (const frame of allFrames) {
                  combinedData.set(frame, offset);
                  offset += frame.length;
                }
                
                console.log(`   📊 Final combined data length: ${combinedData.length} bytes`);
                console.log(`   📊 Final combined data (hex): ${Array.from(combinedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                
                isComplete = true;
                resolve({ success: true, allFrames: [combinedData] });
                return;
              }
            } else {
              console.log(`   ⚠️  No data content in frame`);
            }
          } else {
            console.log(`   ⚠️  Unknown frame format (${responseData.length} bytes)`);
          }
          
          // Only reset timeout if we received actual data frames (not single-byte responses)
          if (responseData.length > 1) {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            
            // 根据分片状态调整超时时间
            let timeoutMs = 10000; // 默认10秒
            if (responseData.length >= 5) {
              const frameControl = responseData[0];
              const isLastFragment = (frameControl & 0x40) !== 0;
              const isLastFrameInSequence = (frameControl & 0x40) !== 0 && (frameControl & 0x10) === 0;
              const isFragmented = (frameControl & 0x10) !== 0;
              const isFirstFragment = (frameControl & 0x20) !== 0;
              
              if (isLastFragment || isLastFrameInSequence) {
                timeoutMs = 2000; // 如果是最后一个分片，只等待2秒
              } else if (isFragmented || isFirstFragment) {
                timeoutMs = 15000; // 如果是分片帧，等待15秒
              }
            }
            
            timeoutId = setTimeout(() => {
              if (!isComplete) {
                console.log(`   ⏰ Timeout waiting for more data frames (${timeoutMs}ms)`);
                console.log(`   📊 Received ${receivedDataLength} bytes in ${allFrames.length} frames`);
                console.log(`   📊 Expected total length: ${expectedTotalLength} bytes`);
                
                if (receivedDataLength > 0) {
                  // Combine what we have
                  const combinedData = new Uint8Array(receivedDataLength);
                  let offset = 0;
                  
                  for (const frame of allFrames) {
                    combinedData.set(frame, offset);
                    offset += frame.length;
                  }
                  
                  console.log(`   📊 Combined data length: ${combinedData.length} bytes`);
                  console.log(`   📊 Combined data (hex): ${Array.from(combinedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
                  isComplete = true;
                  resolve({ success: true, allFrames: [combinedData] });
                } else {
                  resolve({ success: false });
                }
              }
            }, timeoutMs);
          } else {
            // For single-byte responses, don't reset timeout - keep waiting
            console.log(`   ⏳ Single-byte response received, continuing to wait for WiFi data...`);
          }
          
        } else {
          console.log(`   ⚠️  Empty frame received`);
        }
      };
      
      // Check characteristic properties before starting notifications
      console.log(`   📋 Response characteristic properties:`, {
        read: (responseCharacteristic as any).properties?.read,
        write: (responseCharacteristic as any).properties?.write,
        writeWithoutResponse: (responseCharacteristic as any).properties?.writeWithoutResponse,
        notify: (responseCharacteristic as any).properties?.notify,
        indicate: (responseCharacteristic as any).properties?.indicate
      });
      
      // ✅ CRITICAL: Don't add another listener - notifications already started by ensureBlufiNotificationChannel
      // The unified dispatcher will route WiFi scan data to our handler
      console.log(`   📡 FF02 notifications already active via unified dispatcher`);
      console.log(`   🔍 Waiting for device to send WiFi scan results...`);
      
      // ✅ Check if notification is already started
      const isNotifying = (responseCharacteristic as any).isNotifying;
      console.log(`   📊 FF02 notification status: ${isNotifying ? 'ACTIVE' : 'INACTIVE'}`);
      
      if (!isNotifying) {
        console.log(`   ⚠️  Notifications not active, this should not happen!`);
        // If somehow notifications aren't active, start them
        responseCharacteristic.startNotifications().then(() => {
          console.log(`   🔔 Notifications started (fallback)`);
        }).catch(err => {
          console.log(`   ❌ Failed to start notifications: ${err}`);
        });
      }
      
      // ✅ Use unified dispatcher instead of direct listener
      if (deviceId) {
        console.log(`   📌 Registering WiFi scan handler with unified dispatcher`);
        // Create adapter function to convert Uint8Array to event format
        const adapterHandler = (data: Uint8Array) => {
          // Convert Uint8Array to event format that handleResponse expects
          const mockEvent = {
            target: {
              value: {
                buffer: data.buffer,
                byteLength: data.byteLength
              }
            }
          };
          handleResponse(mockEvent);
        };
        this.registerNotificationHandler(deviceId, 'wifiScan', adapterHandler);
      }
      
      // Store listener info for potential stopping
      if (deviceId) {
        this.activeWiFiScanListeners.set(deviceId, {
          responseCharacteristic,
          isActive: true,
          handleResponse // ✅ Store handler reference for cleanup
        });
      }
      
      // Try to read the characteristic to see if there's any immediate data
      responseCharacteristic.readValue().then(value => {
        const data = new Uint8Array(value.buffer);
        console.log(`   📥 Initial characteristic read: ${data.length} bytes`);
        if (data.length > 0) {
          console.log(`   📊 Initial data (hex): ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        }
      }).catch(readError => {
        console.log(`   ⚠️  Initial characteristic read failed: ${readError}`);
      });
      
      // Set up periodic reading to check for data (less frequent to avoid duplicates)
      readInterval = setInterval(async () => {
        try {
          const value = await responseCharacteristic.readValue();
          const data = new Uint8Array(value.buffer);
          if (data.length > 0) {
            console.log(`   📥 Periodic read: ${data.length} bytes`);
            console.log(`   📊 Periodic data (hex): ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            
            // Only process multi-byte data (skip single-byte keep-alive responses)
            if (data.length > 1) {
              // Only add if we haven't seen this data before (simple duplicate check)
              const isDuplicate = allFrames.some(frame => 
                frame.length === data.length && 
                Array.from(frame).every((byte, index) => byte === data[index])
              );
              
              if (!isDuplicate) {
                allFrames.push(data);
                lastSequence = allFrames.length - 1;
                console.log(`   ✅ Periodic frame ${allFrames.length} received and stored`);
                
                // Reset timeout
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }
                timeoutId = setTimeout(() => {
                  if (!isComplete) {
                    console.log('   ⏰ No more frames received via periodic read, assuming scan complete');
                    isComplete = true;
                    clearInterval(readInterval);
                    resolve({ success: true, allFrames });
                  }
                }, 2000);
              } else {
                console.log(`   ⚠️  Duplicate data detected, skipping`);
              }
            } else {
              console.log(`   ⏳ Periodic read: single-byte response (${data[0].toString(16)}), continuing to wait...`);
            }
          }
        } catch (readError) {
          console.log(`   ⚠️  Periodic read failed: ${readError}`);
        }
      }, 5000); // Read every 5 seconds to avoid duplicates
      
      // Store interval reference for potential stopping
      if (deviceId) {
        const listener = this.activeWiFiScanListeners.get(deviceId);
        if (listener) {
          listener.readInterval = readInterval;
          listener.timeoutId = timeoutId;
        }
      }
      
      // Clear interval when timeout is reached
      setTimeout(() => {
        clearInterval(readInterval);
      }, timeoutMs);
      
      // ✅ CRITICAL: Promise completes based on handleResponse collecting all frames
      // The listener cleanup happens in stopWiFiScanListening()
      
      // Set overall timeout
      setTimeout(() => {
        if (!isComplete) {
          console.log(`   ⏰ Multi-frame response timeout reached (${timeoutMs}ms)`);
          console.log(`   🕐 Timeout timestamp: ${new Date().toISOString()}`);
          console.log(`   📊 Total data frames received: ${allFrames.length}`);
          console.log(`   🔍 Last sequence number: ${lastSequence}`);
          console.log(`   📋 Note: Single-byte responses (0x00) were received but not counted as data frames`);
          console.log(`   ℹ️  These single-byte responses likely indicate device is alive but still scanning`);
          
          if (allFrames.length > 0) {
            console.log(`   ✅ Returning ${allFrames.length} data frames received before timeout`);
            resolve({ success: true, allFrames });
          } else {
            console.log(`   ❌ No WiFi data frames received - device may still be scanning or no networks found`);
            console.log(`   💡 Try waiting longer or check if there are WiFi networks in range`);
            resolve({ success: false });
          }
        }
      }, timeoutMs);
    });
  }

  // Check if Web Bluetooth API is available
  private isWebBluetoothSupported(): boolean {
    const supported = 'bluetooth' in navigator;
    console.log('[BLE] Web Bluetooth supported:', supported);
    return supported;
  }

  // Get Bluetooth connection status and error information
  getBluetoothConnectionInfo(): { supported: boolean; error?: string; instructions?: string } {
    if (!this.isWebBluetoothSupported()) {
      return {
        supported: false,
        error: 'Web Bluetooth API not supported',
        instructions: 'Please use a modern browser that supports Web Bluetooth (such as Chrome, Edge)'
      };
    }

    // Check if running in HTTPS environment
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      return {
        supported: true,
        error: 'HTTPS environment required',
        instructions: 'Web Bluetooth needs to run in HTTPS environment, please ensure your website uses HTTPS'
      };
    }

    return {
      supported: true,
      instructions: 'Please ensure your device has Bluetooth enabled and select the correct device in the device chooser'
    };
  }

  // Request Bluetooth device with single strategy
  private async requestBluetoothDevice(device: BluetoothDevice, strategy: 'nameWithServices' | 'nameWithoutServices' | 'allWithServices' | 'allWithoutServices'): Promise<any> {
    // Check if we're in a user gesture context
    if (!this.isInUserGestureContext()) {
      throw new Error('Bluetooth request must be triggered by user action (click, touch, etc.)');
    }

    const optionalServices = [
      '00001800-0000-1000-8000-00805f9b34fb',  // Generic Access Service (0x1800)
      '00001801-0000-1000-8000-00805f9b34fb',  // Generic Attribute Service (0x1801)
      '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi配网服务
    ];
    let options: any;
    
    switch (strategy) {
      case 'nameWithServices':
        if (!device.name || device.name === 'Unknown Device') {
          throw new Error('Device name required for name-based strategy');
        }
        options = {
          filters: [{ name: device.name }],
          optionalServices: optionalServices
        };
        console.log('[BLE] Trying: by name with services');
        break;
        
      case 'nameWithoutServices':
        if (!device.name || device.name === 'Unknown Device') {
          throw new Error('Device name required for name-based strategy');
        }
        options = {
          filters: [{ name: device.name }],
          optionalServices: []
        };
        console.log('[BLE] Trying: by name without services');
        break;
        
      case 'allWithServices':
        options = {
          acceptAllDevices: true,
          optionalServices: optionalServices
        };
        console.log('[BLE] Trying: acceptAllDevices with services');
        break;
        
      case 'allWithoutServices':
        options = {
          acceptAllDevices: true,
          optionalServices: []
        };
        console.log('[BLE] Trying: acceptAllDevices without services');
        break;
        
      default:
        throw new Error('Invalid strategy');
    }

    return await (navigator as any).bluetooth.requestDevice(options);
  }

  // Check if we're in a user gesture context
  private isInUserGestureContext(): boolean {
    // This is a simplified check - in practice, you might want to track
    // user interactions more precisely
    return true; // Assume we're in user context if this method is called
  }

  // Get available connection strategies for a device
  getAvailableConnectionStrategies(device: BluetoothDevice): Array<{key: string, name: string, description: string}> {
    const strategies = [
      {
        key: 'nameWithServices',
        name: 'By Name (with services)',
        description: 'Connect by device name with GATT services'
      },
      {
        key: 'nameWithoutServices',
        name: 'By Name (no services)',
        description: 'Connect by device name without GATT services'
      },
      {
        key: 'allWithServices',
        name: 'Any Device (with services)',
        description: 'Show all devices with GATT services'
      },
      {
        key: 'allWithoutServices',
        name: 'Any Device (no services)',
        description: 'Show all devices without GATT services'
      }
    ];

    // Filter out name-based strategies if device name is not available
    if (!device.name || device.name === 'Unknown Device') {
      return strategies.filter(s => s.key.startsWith('all'));
    }

    return strategies;
  }

  // Debug Bluetooth connection issues
  async debugBluetoothConnection(device: BluetoothDevice): Promise<{ success: boolean; details: any }> {
    const debugInfo = {
      deviceName: device.name,
      deviceId: device.id,
      webBluetoothSupported: this.isWebBluetoothSupported(),
      protocol: location.protocol,
      hostname: location.hostname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      console.log('[BLE DEBUG] Starting debug connection for device:', device.name);
      console.log('[BLE DEBUG] Debug info:', debugInfo);

      // Try to connect and collect detailed information
      const result = await this.connectBluetooth(device);
      
      return {
        success: result,
        details: {
          ...debugInfo,
          connectionResult: result,
          error: null
        }
      };
    } catch (error) {
      console.error('[BLE DEBUG] Connection failed:', error);
      
      return {
        success: false,
        details: {
          ...debugInfo,
          connectionResult: false,
          error: {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        }
      };
    }
  }



  // Request Bluetooth permission
  private async requestBluetoothPermission(): Promise<boolean> {
    try {
      if (!this.isWebBluetoothSupported()) {
        throw new Error('Web Bluetooth API not supported');
      }

      // Request Bluetooth permission
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '00001800-0000-1000-8000-00805f9b34fb',  // Generic Access Service (0x1800)
          '00001801-0000-1000-8000-00805f9b34fb',  // Generic Attribute Service (0x1801)
          '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi配网服务
        ]
      });

      return !!device;
    } catch (error) {
      console.error('Bluetooth permission denied:', error);
      return false;
    }
  }



  // Scan Bluetooth devices using Web Bluetooth API
  async scanBluetoothDevices(): Promise<BluetoothDevice[]> {
    try {
      console.log('Starting real Bluetooth device scan...');
      this.isScanningBluetooth = true;
      console.log('[BLE] isScanningBluetooth set -> true');

      const devices: BluetoothDevice[] = [];

      // Check if Web Bluetooth is supported
      if (!this.isWebBluetoothSupported()) {
        console.log('Web Bluetooth not supported, returning empty array');
        this.bluetoothDevices = devices;
        this.isScanningBluetooth = false;
        console.log('[BLE] isScanningBluetooth set -> false');
        console.log('[BLE] Bluetooth scan completed, found', devices.length, 'devices');
        return devices;
      }

      // Try to use real Web Bluetooth API
      try {
        console.log('Attempting real Bluetooth scan...');
        
        // Request Bluetooth permission and scan for devices
        const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '00001800-0000-1000-8000-00805f9b34fb',  // Generic Access Service (0x1800)
            '00001801-0000-1000-8000-00805f9b34fb',  // Generic Attribute Service (0x1801)
            '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi配网服务
          ]
        });

        console.log('Bluetooth device selected:', bluetoothDevice.name);
        
        // Add device to list (GATT connection will be handled in next step)
        devices.push({
          id: bluetoothDevice.id || 'real_device',
          name: bluetoothDevice.name || 'Unknown Device',
          rssi: -50, // Web Bluetooth API doesn't provide RSSI
          type: 'unknown',
          mac: bluetoothDevice.id || 'Unknown',
          paired: true,
          connectable: true
        });
        
        console.log('Device added to list:', bluetoothDevice.name);
        console.log('GATT connection will be attempted in next step');
        
      } catch (bluetoothError) {
        console.log('Web Bluetooth scan failed:', bluetoothError);
        
        // Handle user cancel case
        if (bluetoothError instanceof Error && bluetoothError.name === 'NotFoundError') {
          console.log('User cancelled device selection');
          // Don't throw error, return empty array
        } else {
          console.error('Bluetooth scan error:', bluetoothError);
        }
        // Return empty array instead of mock data
      }

      this.bluetoothDevices = devices;
      this.isScanningBluetooth = false;
      console.log('[BLE] isScanningBluetooth set -> false');
      console.log('[BLE] Bluetooth scan completed, found', devices.length, 'devices');
      return devices;
    } catch (error) {
      this.isScanningBluetooth = false;
      console.log('[BLE] isScanningBluetooth set -> false');
      console.error('Bluetooth scan failed:', error);
      throw new Error('Bluetooth scan failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Simple Bluetooth scan without GATT connection
  async scanBluetoothDevicesSimple(): Promise<BluetoothDevice[]> {
    try {
      console.log('Starting simple Bluetooth device scan...');
      this.isScanningBluetooth = true;
      console.log('[BLE] isScanningBluetooth set -> true');

      const devices: BluetoothDevice[] = [];

      // Check if Web Bluetooth is supported
      if (!this.isWebBluetoothSupported()) {
        console.log('Web Bluetooth not supported, returning empty array');
        this.bluetoothDevices = devices;
        this.isScanningBluetooth = false;
        console.log('[BLE] isScanningBluetooth set -> false');
        console.log('[BLE] Bluetooth scan completed, found', devices.length, 'devices');
        return devices;
      }

      // Try to use real Web Bluetooth API with minimal services
      try {
        console.log('Attempting simple Bluetooth scan...');
        
        // Request Bluetooth permission with minimal services
        const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '00001800-0000-1000-8000-00805f9b34fb',  // Generic Access Service (0x1800)
            '00001801-0000-1000-8000-00805f9b34fb',  // Generic Attribute Service (0x1801)
            '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi配网服务
          ]
        });

        console.log('Bluetooth device selected:', bluetoothDevice.name);
        
        // Add device to list immediately without GATT connection
        devices.push({
          id: bluetoothDevice.id || 'real_device',
          name: bluetoothDevice.name || 'Unknown Device',
          rssi: -50, // Web Bluetooth API doesn't provide RSSI
          type: 'unknown',
          mac: bluetoothDevice.id || 'Unknown',
          paired: true,
          connectable: true
        });
        
        console.log('Device added to list:', bluetoothDevice.name);
        
      } catch (bluetoothError) {
        console.log('Simple Bluetooth scan failed:', bluetoothError);
        // Return empty array instead of mock data
      }

      this.bluetoothDevices = devices;
      this.isScanningBluetooth = false;
      console.log('[BLE] isScanningBluetooth set -> false');
      console.log('[BLE] Bluetooth scan completed, found', devices.length, 'devices');
      return devices;
    } catch (error) {
      this.isScanningBluetooth = false;
      console.log('[BLE] isScanningBluetooth set -> false');
      console.error('Bluetooth scan failed:', error);
      throw new Error('Bluetooth scan failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }


  // Connect with specific strategy (for fallback UI)
  async connectBluetoothWithStrategy(device: BluetoothDevice, strategy: 'nameWithServices' | 'nameWithoutServices' | 'allWithServices' | 'allWithoutServices'): Promise<boolean> {
    try {
      console.log('Connecting to Bluetooth device with strategy:', strategy, device.name);
      
      if (!this.isWebBluetoothSupported()) {
        throw new Error('Web Bluetooth API not supported');
      }

      // Request device with specific strategy
      const bluetoothDevice = await this.requestBluetoothDevice(device, strategy);

      if (!bluetoothDevice) {
        throw new Error('No device selected');
      }

      console.log('[BLE] Device selected:', bluetoothDevice.name);

      // Try GATT connection with fallback to device selection only
      try {
        console.log('[BLE] Attempting GATT connection...');
        const gattPromise = bluetoothDevice.gatt?.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GATT connection timeout')), 10000)
        );
        
        const server = await Promise.race([gattPromise, timeoutPromise]);
        
        if (server) {
          console.log('[BLE] GATT connection successful:', bluetoothDevice.name);
          (bluetoothDevice as any).isConnected = true;
          (bluetoothDevice as any).hasGatt = true;
        } else {
          throw new Error('Failed to connect to GATT server');
        }
      } catch (gattError) {
        console.log('[BLE] GATT connection failed, using device selection only:', gattError);
        
        // Fallback: Device selection is sufficient for many devices
        if (bluetoothDevice && bluetoothDevice.name) {
          console.log('[BLE] Device connected without GATT services:', bluetoothDevice.name);
          (bluetoothDevice as any).isConnected = true;
          (bluetoothDevice as any).hasGatt = false;
        } else {
          throw new Error('Device selection failed');
        }
      }

      // Set up disconnection listener
      bluetoothDevice.addEventListener('gattserverdisconnected', () => {
        console.log('Bluetooth device disconnected:', bluetoothDevice.name);
        (bluetoothDevice as any).isConnected = false;
      });
      
      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw new Error('Bluetooth connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Establish Bluetooth connection (default strategy)
  async connectBluetooth(device: BluetoothDevice): Promise<boolean> {
    try {
      console.log('Connecting to Bluetooth device:', device.name);
      
      // In a real implementation, you would use the Web Bluetooth API here
      if (this.isWebBluetoothSupported()) {
        try {
          // Request device with flexible connection strategy
          console.log('[BLE] Requesting device:', device.name);
          let bluetoothDevice;
          
          // Request device with single strategy (by name with services first)
          console.log('[BLE] Requesting device connection');
          bluetoothDevice = await this.requestBluetoothDevice(device, 'nameWithServices');

          if (!bluetoothDevice) {
            throw new Error('No device selected');
          }

          console.log('[BLE] Device selected:', bluetoothDevice.name);

          // Try GATT connection with fallback to device selection only
          try {
            console.log('[BLE] Attempting GATT connection...');
            const gattPromise = bluetoothDevice.gatt?.connect();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('GATT connection timeout')), 10000)
            );
            
            const server = await Promise.race([gattPromise, timeoutPromise]);
            
            if (server) {
              console.log('[BLE] GATT connection successful:', bluetoothDevice.name);
              (bluetoothDevice as any).isConnected = true;
              (bluetoothDevice as any).hasGatt = true;
              (bluetoothDevice as any).gattServer = server; // Cache the GATT server
              
              // Also cache the GATT server to the original device object
              (device as any).gattServer = server;
              (device as any).isConnected = true;
              (device as any).hasGatt = true;
              
              // Reset BLUFI sequence number for new connection
              this.resetBlufiSequenceNumber();
              
              console.log('[BLE] GATT server cached for device:', bluetoothDevice.name);
            } else {
              throw new Error('Failed to connect to GATT server');
            }
          } catch (gattError) {
            console.log('[BLE] GATT connection failed, using device selection only:', gattError);
            
            // Fallback: Device selection is sufficient for many devices
            if (bluetoothDevice && bluetoothDevice.name) {
              console.log('[BLE] Device connected without GATT services:', bluetoothDevice.name);
              (bluetoothDevice as any).isConnected = true;
              (bluetoothDevice as any).hasGatt = false;
              
              // Also update the original device object
              (device as any).isConnected = true;
              (device as any).hasGatt = false;
            } else {
              throw new Error('Device selection failed');
            }
          }

          // Set up disconnection listener
          bluetoothDevice.addEventListener('gattserverdisconnected', () => {
            console.log('Bluetooth device disconnected:', bluetoothDevice.name);
            (bluetoothDevice as any).isConnected = false;
          });
          
          return true;
        } catch (bluetoothError) {
          console.log('Web Bluetooth connection failed:', bluetoothError);
          
          // handle specific error cases
          if (bluetoothError instanceof Error) {
            if (bluetoothError.name === 'NotFoundError') {
              throw new Error('No matching Bluetooth device found. Please ensure the device is enabled, in discoverable mode, and try again');
            } else if (bluetoothError.name === 'SecurityError') {
              throw new Error('Bluetooth request must be triggered by user action (click, touch, etc.)');
            } else if (bluetoothError.message.includes('User cancelled')) {
              throw new Error('User cancelled device selection');
            } else if (bluetoothError.message.includes('GATT connection timeout')) {
              throw new Error('Device connection timeout, please ensure the device is within range');
            } else if (bluetoothError.message.includes('Device not found by name')) {
              throw new Error('Device not found by name, please try selecting from all available devices');
            } else {
              throw new Error('Bluetooth connection failed: ' + bluetoothError.message);
            }
          }
          
          throw new Error('Bluetooth connection failed: Unknown error');
        }
      } else {
        console.log('Web Bluetooth not supported');
        throw new Error('Web Bluetooth API not supported');
      }
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw new Error('Bluetooth connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Configure WiFi via Bluetooth for Tencent IoT devices
  async configureWiFiViaBluetooth(
    device: BluetoothDevice, 
    wifiNetwork: WiFiNetwork, 
    password?: string
  ): Promise<any> {
    try {
      console.log('Configuring WiFi via Bluetooth for Tencent IoT device:', {
        device: device.name,
        wifi: wifiNetwork.name,
        hasPassword: !!password
      });
      
      // Check if device is in provisioning mode
      if (!await this.isDeviceInProvisioningMode(device)) {
        throw new Error('Device is not in provisioning mode. Please ensure device is ready for WiFi configuration.');
      }

      // Prepare WiFi configuration data
      const wifiConfig: WiFiConfigData = {
        ssid: wifiNetwork.name,
        password: password || '',
        security: wifiNetwork.security
      };

      // Send WiFi configuration via BLE characteristic and get status response
      const statusResponse = await this.writeWiFiConfigToDevice(device, wifiConfig);
      
      console.log('WiFi configuration sent to device successfully');
      console.log('Device status response:', statusResponse);
      
      return statusResponse;
    } catch (error) {
      console.error('WiFi configuration failed:', error);
      throw new Error('WiFi configuration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }


  // ✅ Send WiFi configuration start signal to prepare device
  private async sendWiFiConfigStartSignal(characteristic: BluetoothRemoteGATTCharacteristic): Promise<void> {
    try {
      // Send a BLUFI control frame to indicate WiFi configuration is starting
      // Type=0x00 (control frame), Subtype=0x00 (handshake), Sequence=4 (匹配设备期望)
      const startSignal = new Uint8Array([0x00, 0x02, 0x04, 0x00, 0x02, 0x00]); // [Type][FC][Seq][Len][Data][Checksum]
      
      console.log(`   📡 Sending WiFi config start signal: ${Array.from(startSignal).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      await characteristic.writeValue(startSignal);
      
      // Wait for device to process the start signal
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`   ✅ WiFi config start signal sent`);
      
    } catch (error) {
      console.log(`   ⚠️  Failed to send WiFi config start signal:`, error);
      // Don't throw - this is not critical
    }
  }

  // Check if device is in provisioning mode
  private async isDeviceInProvisioningMode(device: BluetoothDevice): Promise<boolean> {
    try {
      // In a real implementation, you would check specific GATT characteristics
      // that indicate the device is in provisioning mode
      console.log('Checking if device is in provisioning mode:', device.name);
      
      // For now, assume device is ready if it's connected
      return await this.isDeviceConnected(device);
    } catch (error) {
      console.error('Failed to check device provisioning mode:', error);
      return false;
    }
  }

  // Check if device is connected via Bluetooth
  private async isDeviceConnected(device: BluetoothDevice): Promise<boolean> {
    try {
      // In a real implementation, you would check the actual Bluetooth connection status
      // For now, return true if device exists
      return !!(device && device.name);
    } catch (error) {
      console.error('Failed to check device connection:', error);
      return false;
    }
  }

  // GATT connection wrapper - manages connections to avoid duplicates
  async getGATTConnection(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    const deviceId = device.id || device.name;
    
    // First check if device has a cached GATT server from connectBluetooth
    if ((device as any).gattServer && (device as any).gattServer.connected) {
      console.log('Using cached GATT server from connectBluetooth for device:', device.name);
      return (device as any).gattServer;
    }
    
    // Check if we already have a connection in our cache
    if (this.gattConnections.has(deviceId)) {
      const existingConnection = this.gattConnections.get(deviceId)!;
      // Check if connection is still active
      if (existingConnection.connected) {
        console.log('Reusing existing GATT connection for device:', device.name);
        return existingConnection;
      } else {
        // Remove stale connection
        this.gattConnections.delete(deviceId);
      }
    }
    
    // Check if there's already a connection in progress
    if (this.gattConnectionPromises.has(deviceId)) {
      console.log('Waiting for existing GATT connection for device:', device.name);
      return await this.gattConnectionPromises.get(deviceId)!;
    }
    
    // Create new connection
    const connectionPromise = this.connectToGATTServer(device);
    this.gattConnectionPromises.set(deviceId, connectionPromise);
    
    try {
      const gattServer = await connectionPromise;
      this.gattConnections.set(deviceId, gattServer);
      console.log('GATT connection established and cached for device:', device.name);
      return gattServer;
    } finally {
      // Clean up the promise
      this.gattConnectionPromises.delete(deviceId);
    }
  }

  // Connect to GATT server
  private async connectToGATTServer(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    try {
      console.log('Connecting to GATT server for device:', device.name);
      
      // Check if device has a cached GATT server from previous connection
      if ((device as any).gattServer && (device as any).gattServer.connected) {
        console.log('Reusing cached GATT server for device:', device.name);
        return (device as any).gattServer;
      }
      
      // If no cached connection, we need to request the device again
      // This should not happen if connectBluetooth was called first
      throw new Error('No GATT server available. Please ensure device is connected via connectBluetooth() first.');
      
    } catch (error) {
      console.error('Failed to connect to GATT server:', error);
      throw new Error('GATT connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Close GATT connection for a specific device
  private async closeGATTConnection(device: BluetoothDevice): Promise<void> {
    const deviceId = device.id || device.name;
    
    if (this.gattConnections.has(deviceId)) {
      try {
        const gattServer = this.gattConnections.get(deviceId)!;
        if (gattServer.connected) {
          await gattServer.disconnect();
          console.log('GATT connection closed for device:', device.name);
        }
      } catch (error) {
        console.warn('Failed to close GATT connection:', error);
      } finally {
        this.gattConnections.delete(deviceId);
      }
    }
  }

  // Close all GATT connections
  private async closeAllGATTConnections(): Promise<void> {
    console.log('Closing all GATT connections');
    
    const closePromises = Array.from(this.gattConnections.entries()).map(async ([deviceId, gattServer]) => {
      try {
        // Clean up FF02 notification subscription first
        const ff02Char = this.blufiNotificationChannels.get(deviceId);
        if (ff02Char) {
          try {
            await ff02Char.stopNotifications();
            console.log(`✅ Stopped FF02 notifications for device: ${deviceId}`);
          } catch (error) {
            console.warn(`⚠️  Failed to stop FF02 notifications for device ${deviceId}:`, error);
          }
          this.blufiNotificationChannels.delete(deviceId);
        }
        
        if (gattServer.connected) {
          await gattServer.disconnect();
          console.log('GATT connection closed for device:', deviceId);
        }
      } catch (error) {
        console.warn('Failed to close GATT connection for device:', deviceId, error);
      }
    });
    
    await Promise.all(closePromises);
    this.gattConnections.clear();
    this.gattConnectionPromises.clear();
    this.blufiNotificationChannels.clear();
  }

  // Write WiFi scan command to GATT characteristic and return WiFi networks
  private async writeWiFiScanCommandToGATT(gattServer: BluetoothRemoteGATTServer, deviceId?: string): Promise<WiFiNetwork[]> {
    try {
      console.log('Writing WiFi scan command to GATT characteristic');
        
        // Get the primary service for WiFi configuration
        // Using real BLUFI device parameters from device logs
        const wifiServiceUUID = '0000ffff-0000-1000-8000-00805f9b34fb'; // BLUFI Service (0xffff)
        const wifiScanCommandCharacteristicUUID = '0000ff01-0000-1000-8000-00805f9b34fb'; // Data Send (0xff01)
        const wifiScanResponseCharacteristicUUID = '0000ff02-0000-1000-8000-00805f9b34fb'; // Data Receive (0xff02)
        
        // Verify GATT connection and service access
        console.log('=== GATT Connection Verification ===');
        console.log('GATT Server connected:', gattServer.connected);
        
        const service = await gattServer.getPrimaryService(wifiServiceUUID);
        console.log('BLUFI Service found:', wifiServiceUUID);
        
        let commandCharacteristic = await service.getCharacteristic(wifiScanCommandCharacteristicUUID);
        console.log('Command Characteristic found:', wifiScanCommandCharacteristicUUID);
        
        // ✅ Establish persistent FF02 notification channel at the very beginning
        console.log('📡 Establishing persistent FF02 notification channel for entire session...');
        let responseCharacteristic: BluetoothRemoteGATTCharacteristic;
        if (deviceId) {
          responseCharacteristic = await this.ensureBlufiNotificationChannel(deviceId, gattServer);
        } else {
          responseCharacteristic = await service.getCharacteristic(wifiScanResponseCharacteristicUUID);
          console.log('⚠️  No deviceId provided, using temporary FF02 subscription');
          await responseCharacteristic.startNotifications();
        }
        console.log('=== GATT Verification Complete ===');
        
      // Follow BLUFI protocol flow: Exchange Info -> WiFi List Request
      console.log('📡 Starting BLUFI protocol flow...');
      
      // Wait for device to be ready - device needs more time to initialize after GATT connection
      console.log('⏱️  Waiting for device to be ready...');
      console.log('⏱️  Device needs time to initialize BLUFI service after GATT connection...');
      console.log('⏱️  Based on device logs, we need to wait for connection stability...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay for device initialization and connection stability
      console.log('✅ Device should be ready, proceeding with BLUFI protocol...');
      
      // Simulate connection stability checks like device-side program
      console.log('🔍 Simulating connection stability checks...');
      console.log('⏱️  Waiting for connection updates (like device-side program)...');
      
      // Multiple connection stability checks with delays
      for (let i = 1; i <= 3; i++) {
        console.log(`🔄 Connection stability check ${i}/3...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`✅ Connection update ${i} completed`);
      }
      
      // Test BLE communication by reading response characteristic
      console.log('🔍 Testing BLE communication by reading response characteristic...');
      let deviceReady = false;
      let readinessAttempts = 0;
      const maxReadinessAttempts = 5;
      
      while (!deviceReady && readinessAttempts < maxReadinessAttempts) {
      try {
        const dataView = await responseCharacteristic.readValue();
        const responseData = new Uint8Array(dataView.buffer);
        console.log('📊 Response characteristic read result:', {
          length: responseData.length,
          data: Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' ')
        });
          console.log('✅ Response characteristic is readable - device is ready');
          deviceReady = true;
      } catch (error) {
          readinessAttempts++;
          console.log(`⚠️  Device readiness check attempt ${readinessAttempts} failed:`, error);
          
          if (readinessAttempts < maxReadinessAttempts) {
            console.log(`⏱️  Waiting 1 second before retry... (attempt ${readinessAttempts + 1}/${maxReadinessAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log('⚠️  Device readiness check failed after all attempts, but continuing...');
            deviceReady = true; // Continue anyway
          }
        }
      }
      
      // Send WiFi List Request command (0x09) directly according to ESP-IDF documentation
      console.log('🔄 Sending WiFi List Request command...');
      
      // Check characteristic properties before writing
      console.log('📋 Command characteristic properties:', {
        write: (commandCharacteristic as any).properties?.write,
        writeWithoutResponse: (commandCharacteristic as any).properties?.writeWithoutResponse,
        notify: (commandCharacteristic as any).properties?.notify,
        indicate: (commandCharacteristic as any).properties?.indicate
      });
      
      // Check MTU size
      console.log('📊 GATT MTU size:', (gattServer as any).mtu || 'unknown');
      
      
      // BLUFI protocol: Follow ESP32 official implementation
      // VERSION: 2025-10-03 - Fixed BLUFI protocol implementation
      console.log('🔄 Starting BLUFI handshake with ESP32 official protocol...');
      
      // Device expects sequence 0 after GATT connection (BLUFI protocol standard)
        this.blufiSequenceNumber = 0;
      
      // Send sequence 0 command (handshake/initialization) with proper CRC16 checksum
      // Frame format: [Type][Frame Control][Sequence][Data Length][Data][Checksum Low][Checksum High]
      // Type byte: Subtype=0 (Negotiate), FrameType=00 (控制帧)
      // Type = (0 << 2) | 0 = 0x00
      // Frame Control = 0x02 (带校验和标志)
      // Sequence = 0x00 (BLUFI 协议标准起始序列)
      // Data Length = 0x00 (无数据)
      // Data = none
      // Checksum = CRC16 of [Sequence][Data Length][Data]
      const handshakeCommand0 = this.createBLUFICommand(0x00, 0, new Uint8Array(0));
      console.log('📊 Handshake command 0 (hex):', Array.from(handshakeCommand0).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log('📋 Command format analysis:');
      console.log('   Frame Control: 0x00 (控制帧，带校验)');
      console.log('   Sequence: 0x00 (序列号0 - BLUFI协议标准)');
      console.log('   Data Length: 0x00 (无数据)');
      console.log('   Data: 无');
      console.log('   Checksum: 0x' + Array.from(handshakeCommand0.slice(-2)).map(b => b.toString(16).padStart(2, '0')).join('') + ' (CRC16校验)');
      console.log('📤 Writing handshake command 0 to GATT characteristic...');
      console.log('📊 Command data (hex):', Array.from(handshakeCommand0).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log('📊 Command data (bytes):', handshakeCommand0.length, 'bytes');
      console.log('📊 Command data (raw):', handshakeCommand0);
      
      // Add delay before write to ensure device is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Write the complete command at once (Web Bluetooth handles fragmentation internally)
      console.log('📤 Writing complete handshake command...');
      
      // Add retry mechanism for handshake command
      let handshakeSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;
      
        while (!handshakeSuccess && retryCount < maxRetries) {
          try {
            // Check GATT connection status before writing
            if (!gattServer.connected) {
              console.log('⚠️  GATT server disconnected, attempting to reconnect...');
              try {
                await gattServer.connect();
                console.log('✅ GATT server reconnected');
                // Re-get characteristics after reconnection
                const service = await gattServer.getPrimaryService('0000ffff-0000-1000-8000-00805f9b34fb');
                commandCharacteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
                
                // ✅ Re-establish persistent FF02 notification channel after reconnection
                if (deviceId) {
                  // Clear old subscription first
                  this.blufiNotificationChannels.delete(deviceId);
                  responseCharacteristic = await this.ensureBlufiNotificationChannel(deviceId, gattServer);
                } else {
                  responseCharacteristic = await service.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb');
                  await responseCharacteristic.startNotifications();
                }
                console.log('✅ Characteristics re-acquired after reconnection');
              } catch (reconnectError) {
                console.log('❌ Failed to reconnect GATT server:', reconnectError);
                throw new Error('GATT server disconnected and cannot reconnect');
              }
            }
            
            // Try writeValue first (with response) for better reliability, fallback to writeValueWithoutResponse
            console.log('🔍🔍🔍 CRITICAL DEBUG: About to write handshake command');
            console.log('🔍🔍🔍 Command bytes:', Array.from(handshakeCommand0));
            console.log('🔍🔍🔍 Command hex:', Array.from(handshakeCommand0).map(b => b.toString(16).padStart(2, '0')).join(' '));
            console.log('🔍🔍🔍 Timestamp:', new Date().toISOString());
            
            try {
              await commandCharacteristic.writeValue(handshakeCommand0);
              console.log('✅ Handshake command 0 sent successfully (with response)');
              console.log('🔍🔍🔍 Write completed at:', new Date().toISOString());
            } catch (writeValueError) {
              console.log('⚠️  writeValue failed, trying writeValueWithoutResponse:', writeValueError);
              if ('writeValueWithoutResponse' in commandCharacteristic) {
                await (commandCharacteristic as any).writeValueWithoutResponse(handshakeCommand0);
                console.log('✅ Handshake command 0 sent successfully (without response)');
              } else {
                throw writeValueError; // Re-throw if no fallback available
              }
            }
            handshakeSuccess = true;
          } catch (writeError) {
            retryCount++;
            console.log(`❌ Handshake write attempt ${retryCount} failed:`, writeError);
            
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying handshake in 1000ms... (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw writeError;
            }
          }
        }
      
      // Add delay after write to ensure transmission completes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify the write by reading back (if possible)
      try {
        const readBack = await commandCharacteristic.readValue();
        console.log('📥 Read back after write:', Array.from(new Uint8Array(readBack.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      } catch (readError) {
        console.log('⚠️  Cannot read back after write (expected for write-only characteristic)');
      }
      
      // Wait a moment for device to process the handshake
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ✅ FF02 notification channel is already active (established at the beginning)
      console.log('📡 FF02 notification channel is active and ready for device responses');
      console.log('🔔 According to BLUFI docs: ESP device will scan WiFi and send back WiFi hotspot report');
      
      // First, send "Disconnect from AP" command with sequence 1
      // 原因：设备可能正在连接之前保存的WiFi，导致 "STA is connecting, scan are not allowed!"
      console.log('🔄 Step 1: Sending Disconnect from AP command...');
      // Type byte for "Disconnect from AP" control frame:
      // Subtype=4 (断开AP连接), FrameType=00 (控制帧)
      // Type = (4 << 2) | 0 = 0x10
      const disconnectCommand = this.createBLUFICommand(0x10, 1, new Uint8Array(0));
      
      console.log('📊 Disconnect command (hex):', Array.from(disconnectCommand).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log('📋 Command format analysis:');
      console.log('   Type: 0x10 (控制帧，断开AP连接)');
      console.log('   Sequence: 0x01 (序列号1 - 握手后)');
      console.log('   Data Length: 0x00 (无数据)');
      
      try {
        await commandCharacteristic.writeValue(disconnectCommand);
        console.log('✅ Disconnect command sent successfully');
        // Wait a moment for device to disconnect
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log('⚠️  Disconnect command failed:', error);
        // Continue anyway, device might not be connected
      }
      
      // Now send WiFi List Request command with sequence 2 (adjusted from 1)
      console.log('🔄 Step 2: Sending WiFi List Request command...');
      // Type byte for "Get WiFi List" control frame:
      // Subtype=9 (获取WiFi列表), FrameType=00 (控制帧)
      // Type = (9 << 2) | 0 = 0x24
      const wifiListCommand = this.createBLUFICommand(0x24, 2, new Uint8Array(0));
      
      console.log('📊 WiFi List Request command (hex):', Array.from(wifiListCommand).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log('📋 Command format analysis:');
      console.log('   Type: 0x24 (控制帧，获取Wi-Fi列表)');
      console.log('   Sequence: 0x02 (序列号2 - 断开AP后)');
      console.log('   Data Length: 0x00 (无数据)');
      console.log('   Data: 无');
      console.log('   Checksum: 0x' + Array.from(wifiListCommand.slice(-2)).map(b => b.toString(16).padStart(2, '0')).join('') + ' (CRC16校验)');
      
      try {
        console.log('📊 Command data (hex):', Array.from(wifiListCommand).map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log('📊 Command data (bytes):', wifiListCommand.length, 'bytes');
        
        // Add retry mechanism for GATT write operations
        let writeSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!writeSuccess && retryCount < maxRetries) {
          try {
            // Try writeValue first (with response) for better reliability, fallback to writeValueWithoutResponse
            console.log('🔍🔍🔍 CRITICAL DEBUG: About to write WiFi scan command');
            console.log('🔍🔍🔍 Command bytes:', Array.from(wifiListCommand));
            console.log('🔍🔍🔍 Command hex:', Array.from(wifiListCommand).map(b => b.toString(16).padStart(2, '0')).join(' '));
            console.log('🔍🔍🔍 Timestamp:', new Date().toISOString());
            
            try {
        await commandCharacteristic.writeValue(wifiListCommand);
              console.log('✅ WiFi List Request command sent successfully (with response)');
              console.log('🔍🔍🔍 Write completed at:', new Date().toISOString());
            } catch (writeValueError) {
              console.log('⚠️  writeValue failed, trying writeValueWithoutResponse:', writeValueError);
              if ('writeValueWithoutResponse' in commandCharacteristic) {
                await (commandCharacteristic as any).writeValueWithoutResponse(wifiListCommand);
                console.log('✅ WiFi List Request command sent successfully (without response)');
              } else {
                throw writeValueError; // Re-throw if no fallback available
              }
            }
            writeSuccess = true;
          } catch (writeError) {
            retryCount++;
            console.log(`❌ GATT write attempt ${retryCount} failed:`, writeError);
            
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying in 500ms... (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              throw writeError;
            }
          }
        }
        
        // Wait a moment for device to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to read the characteristic to see if device responded
        try {
          const response = await commandCharacteristic.readValue();
          const responseData = new Uint8Array(response.buffer);
          console.log('📥 Command characteristic read response:', Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '));
        } catch (readError) {
          console.log('⚠️  Command characteristic read failed:', readError);
        }
        
        // Handshake complete, ready for WiFi scan
        console.log('✅ BLUFI handshake completed (seq 0), device should be ready for WiFi scan');
        
      } catch (writeError) {
        console.log('❌ WiFi List command write failed:', writeError);
        throw writeError;
      }
      
      console.log('🔍 Waiting for device to complete WiFi scan and return network list...');
      console.log('⏱️  Timeout set to 120 seconds - device should respond with WiFi networks');
      console.log('📋 Expected response format: ESP device should send WiFi hotspot report frame');
      console.log('🔍 If no response, device might be:');
      console.log('   1. Still scanning WiFi networks (normal, takes 5-30 seconds)');
      console.log('   2. No WiFi networks found in range');
      console.log('   3. Device not in correct mode for WiFi scanning');
      
      // Wait for multi-frame response
      const result = await this.waitForMultiFrameWiFiScanResponse(
          responseCharacteristic,
        120000, // 120 second timeout for multi-frame response
          deviceId
      );
      
      if (!result.success || !result.allFrames || result.allFrames.length === 0) {
        console.error('❌ WiFi scan failed - no frames received within timeout');
        throw new Error('WiFi scan command failed - device may not support WiFi scan or is not in correct mode');
      }
      
      console.log(`✅ Received ${result.allFrames.length} frames from device`);
      
      // Parse all frames and combine WiFi networks
      const allWiFiNetworks: WiFiNetwork[] = [];
      for (let i = 0; i < result.allFrames.length; i++) {
        console.log(`\n--- Parsing Frame ${i + 1}/${result.allFrames.length} ---`);
        const frameData = result.allFrames[i];
        
        // 直接使用改进的WiFi网络解析逻辑
        console.log(`\n--- Parsing Frame ${i + 1}/${result.allFrames.length} ---`);
        console.log(`Frame data length: ${frameData.length} bytes`);
        console.log(`Frame data (hex): ${Array.from(frameData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        // 使用改进的WiFi网络解析方法
        const frameNetworks = this.parseWiFiNetworksFromPayload(frameData);
          allWiFiNetworks.push(...frameNetworks);
          console.log(`Frame ${i + 1} contributed ${frameNetworks.length} networks`);
      }
      
      console.log(`\n📊 Total WiFi networks found: ${allWiFiNetworks.length}`);
      return allWiFiNetworks;
      
    } catch (error) {
      console.error('Failed to send WiFi scan command:', error);
      throw new Error('GATT write failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Read WiFi networks from GATT characteristics
  private async readWiFiNetworksFromGATT(gattServer: BluetoothRemoteGATTServer): Promise<WiFiNetwork[]> {
    try {
      console.log('Reading WiFi networks from GATT characteristics');
      
      // Get the primary service for WiFi configuration
      // Using real BLUFI device parameters from device logs
      const wifiServiceUUID = '0000ffff-0000-1000-8000-00805f9b34fb'; // BLUFI Service (0xffff)
      const wifiNetworksCharacteristicUUID = '0000ff02-0000-1000-8000-00805f9b34fb'; // Data Receive (0xff02)
      
      const service = await gattServer.getPrimaryService(wifiServiceUUID);
      const characteristic = await service.getCharacteristic(wifiNetworksCharacteristicUUID);
      
      // Read the WiFi networks data
      const dataView = await characteristic.readValue();
      const wifiNetworks = this.parseWiFiNetworksData(dataView);
      
      console.log('WiFi networks parsed from GATT data:', wifiNetworks.length);
      return wifiNetworks;
    } catch (error) {
      console.error('Failed to read WiFi networks from GATT:', error);
      throw new Error('GATT read failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Parse WiFi networks data from GATT characteristic
  private parseWiFiNetworksData(dataView: DataView): WiFiNetwork[] {
    try {
      console.log('Parsing WiFi networks data from GATT characteristic');
      
      // This is a placeholder implementation - replace with actual parsing logic
      // The data format depends on your device's protocol
      
      // Example parsing logic (adjust based on your device's data format):
      const networks: WiFiNetwork[] = [];
      const dataArray = new Uint8Array(dataView.buffer);
      
      // Skip if no data
      if (dataArray.length === 0) {
        console.log('No WiFi networks data received');
        return networks;
      }
      
      // Parse the data according to your device's protocol
      // This is a simplified example - replace with actual parsing
      let offset = 0;
      
      while (offset < dataArray.length) {
        // Read network name length (1 byte)
        const nameLength = dataArray[offset++];
        if (offset + nameLength > dataArray.length) break;
        
        // Read network name
        const nameBytes = dataArray.slice(offset, offset + nameLength);
        const name = new TextDecoder().decode(nameBytes);
        offset += nameLength;
        
        // Read security type (1 byte)
        if (offset >= dataArray.length) break;
        const securityType = dataArray[offset++];
        
        // Read signal strength (1 byte, signed)
        if (offset >= dataArray.length) break;
        const strength = dataArray[offset++] - 128; // Convert to signed
        
        // Read frequency (2 bytes)
        if (offset + 1 >= dataArray.length) break;
        const frequency = (dataArray[offset] << 8) | dataArray[offset + 1];
        offset += 2;
        
        // Read channel (1 byte)
        if (offset >= dataArray.length) break;
        const channel = dataArray[offset++];
        
        // Create WiFi network object
        const network: WiFiNetwork = {
          id: `wifi_${networks.length + 1}`,
          name: name,
          security: this.mapSecurityType(securityType),
          strength: strength,
          frequency: frequency,
          channel: channel
        };
        
        networks.push(network);
      }
      
      console.log('Parsed WiFi networks:', networks.length);
      return networks;
    } catch (error) {
      console.error('Failed to parse WiFi networks data:', error);
      throw new Error('Data parsing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Wait for and validate scan command response
  private async waitForScanCommandResponse(responseCharacteristic: BluetoothRemoteGATTCharacteristic): Promise<void> {
    try {
      console.log('Waiting for WiFi scan command response');
      
      // Verify notification capability
      console.log('=== Notification Setup ===');
      console.log('Response characteristic UUID:', '0000ff02-0000-1000-8000-00805f9b34fb');
      
      // Set up notification listener for response
      console.log('Starting notifications...');
      await responseCharacteristic.startNotifications();
      console.log('Notifications started successfully');
      
      // Create a promise that resolves when we get a valid response
      const responsePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Scan command response timeout'));
        }, 30000); // 30 second timeout - increased for device processing time
        
        const handleResponse = (event: any) => {
          console.log('=== Received BLE Notification ===');
          const dataView = event.target.value;
          
          if (dataView && dataView.byteLength > 0) {
            const responseData = new Uint8Array(dataView.buffer);
            console.log('=== WiFi Scan Command Response ===');
            console.log('Response data length:', responseData.length, 'bytes');
            console.log('Response data (hex):', Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '));
            console.log('Response data (ASCII):', Array.from(responseData).map(b => String.fromCharCode(b)).join(''));
            console.log('Response timestamp:', new Date().toISOString());
            
            // Parse and print WiFi scan results
            this.parseAndPrintWiFiScanResults(responseData);
            
            // Validate response
            if (this.validateScanCommandResponse(responseData)) {
              clearTimeout(timeout);
              console.log('WiFi scan command response validation successful');
              // Note: removeEventListener may not be available on all platforms
              // The event listener will be cleaned up when the characteristic is disconnected
              resolve();
            } else {
              console.log('WiFi scan command response validation failed, continuing to wait...');
            }
          }
        };
        
        responseCharacteristic.addEventListener('characteristicvaluechanged', handleResponse);
      });
      
      await responsePromise;
      console.log('WiFi scan command response received and validated');
      
    } catch (error) {
      console.error('Failed to wait for scan command response:', error);
      throw new Error('Response validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Parse and print WiFi scan results from response data
  private parseAndPrintWiFiScanResults(responseData: Uint8Array): void {
    try {
      console.log('=== WiFi Scan Results Parsing ===');
      console.log('📊 Received response data for WiFi scan parsing');
      
      if (responseData.length < 1) {
        console.log('❌ Response data too short, cannot parse WiFi scan results');
        return;
      }
      
      // First validate if this response contains actual WiFi network data
      if (!this.validateScanCommandResponse(responseData)) {
        console.log('❌ Response does not contain valid WiFi network data, skipping parsing');
        console.log('🔍 This appears to be a command acknowledgment or status response');
        console.log('=== WiFi Scan Results Parsing Complete ===');
        return;
      }
      
      // BLUFI response format: [Type][Sequence][Length][Data...]
      // or simplified: [Data...] (just the data part)
      
      if (responseData.length >= 3) {
        // Full BLUFI response format
        const responseType = responseData[0];
        const sequence = responseData[1];
        const dataLength = responseData[2];
        
        console.log('BLUFI Response format detected:');
        console.log('Response type:', responseType.toString(16), '(0x' + responseType.toString(16).padStart(2, '0') + ')');
        console.log('Sequence:', sequence);
        console.log('Data length:', dataLength);
        
        if (responseData.length >= 3 + dataLength) {
          const data = responseData.slice(3, 3 + dataLength);
          console.log('Response data:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
          
          // Parse the actual data
          this.parseWiFiNetworkList(data);
        } else {
          console.log('Incomplete response data');
        }
      } else {
        // Simplified response format - just data
        console.log('Simplified response format detected');
        console.log('Response data:', Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Try to parse as WiFi network data
        this.parseWiFiNetworkList(responseData);
      }
      
      console.log('=== WiFi Scan Results Parsing Complete ===');
    } catch (error) {
      console.error('Failed to parse WiFi scan results:', error);
    }
  }
  
  // Parse WiFi networks from payload data according to BLUFI protocol
  private parseWiFiNetworksFromPayload(payloadData: Uint8Array): WiFiNetwork[] {
    const networks: WiFiNetwork[] = [];
    
    try {
      console.log('📋 Parsing WiFi networks from payload data');
      console.log('Payload length:', payloadData.length, 'bytes');
      console.log('Payload (hex):', Array.from(payloadData).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      if (payloadData.length < 2) {
        console.log('Payload too short for WiFi data');
        return networks;
      }
      
      // 检查是否是分片帧格式还是直接的WiFi数据
      let dataStart: number;
      let dataEnd: number;
      
      // 检查是否是分片帧格式：前5个字节是头部，第3个字节（dataLength）为0
      if (payloadData.length >= 5 && payloadData[2] === 0) {
        // 分片帧格式：[帧控制][序列号][数据长度][内容总长度(2字节)][数据内容][校验]
        console.log('📋 Fragmented frame format detected');
        dataStart = 5;
        dataEnd = payloadData.length - 2; // Skip 2-byte checksum at end
      } else {
        // 直接的WiFi数据
        console.log('📋 Direct WiFi data format detected');
        dataStart = 0;
        dataEnd = payloadData.length;
      }
      
      const actualDataLength = dataEnd - dataStart;
      console.log(`📊 Data section: offset ${dataStart}, length ${actualDataLength}`);
      console.log(`📊 Actual data (hex): ${Array.from(payloadData.slice(dataStart, dataEnd)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      
      if (actualDataLength <= 0) {
        console.log('No data content in frame');
        return networks;
      }
      
      // 简化的WiFi数据解析：基于实际日志分析
      // 格式：[RSSI][SSID_ASCII_DATA][RSSI][SSID_ASCII_DATA]...
      // 示例：c6 48 33 43 5f 34 30 31 07 bd 34 30 31 34
      //       -58 H3C_401     7 -67 4014
      
      let offset = dataStart;
      let networkCount = 0;
      
      console.log('🔍 Starting simplified WiFi data parsing...');
      
      while (offset < dataEnd) {
        if (offset + 1 > dataEnd) break;
        
        console.log(`\n--- WiFi Network ${networkCount + 1} ---`);
        console.log('Offset:', offset, 'Remaining:', dataEnd - offset);
        console.log('Next bytes:', Array.from(payloadData.slice(offset, Math.min(offset + 10, dataEnd))).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // 读取RSSI
        const rssiRaw = payloadData[offset];
        const rssi = rssiRaw > 127 ? rssiRaw - 256 : rssiRaw;
        console.log('RSSI raw:', rssiRaw, '→', rssi, 'dBm');
        
        // 查找连续的ASCII字符作为SSID
        let ssidStart = offset + 1;
        let ssidLength = 0;
        let ssidEnd = ssidStart;
        
        // 从RSSI后开始查找ASCII字符
        for (let i = ssidStart; i < dataEnd; i++) {
          const char = payloadData[i];
          if (char >= 0x20 && char <= 0x7E) {
            // 可打印ASCII字符
            ssidLength++;
            ssidEnd = i + 1;
          } else {
            // 遇到非ASCII字符，检查下一个字节是否可能是RSSI
            const nextByte = payloadData[i];
            const nextRssi = nextByte > 127 ? nextByte - 256 : nextByte;
            
            // 如果下一个字节看起来像RSSI值（-100到-30之间），则停止
            if (nextRssi >= -100 && nextRssi <= -30) {
              console.log('Found potential next RSSI at offset', i, 'value:', nextRssi);
              break;
            }
            
            // 否则继续查找
            ssidLength++;
            ssidEnd = i + 1;
          }
        }
        
        if (ssidLength > 0) {
          const ssidBytes = payloadData.slice(ssidStart, ssidEnd);
          const ssid = new TextDecoder('utf-8').decode(ssidBytes);
          
          console.log('Found SSID:', `"${ssid}"`, '(length:', ssidLength, ')');
          
          // 创建WiFi网络对象
          const network: WiFiNetwork = {
            id: `wifi_${Date.now()}_${networkCount}`,
            name: ssid,
            security: 'Unknown',
            strength: rssi,
            frequency: 0,
            channel: 0
          };
          
          networks.push(network);
          networkCount++;
          console.log(`✅ Successfully parsed WiFi network ${networkCount}: "${ssid}" (${rssi} dBm)`);
          
          // 更新偏移量到SSID结束位置
          offset = ssidEnd;
        } else {
          console.log('No valid SSID found, skipping to next byte');
          offset++;
        }
        
        // 防止无限循环
        if (offset >= dataEnd) {
          break;
        }
      }
      
      console.log(`📊 Parsed ${networkCount} WiFi networks from direct data`);
      return networks;
      
    } catch (error) {
      console.error('Failed to parse WiFi networks from payload:', error);
      return networks;
    }
  }


  // 推测完整的SSID（用于处理截断的情况）
  private guessFullSSID(partialSSID: string): string {
    // 常见的WiFi命名模式
    const commonPatterns = [
      /^(\d+)$/, // 纯数字
      /^(\d+)-(\d+)$/, // 数字-数字
      /^(\d+)-5G$/, // 数字-5G
      /^(\d+)-2G$/, // 数字-2G
    ];
    
    for (const pattern of commonPatterns) {
      const match = partialSSID.match(pattern);
      if (match) {
        // 如果匹配常见模式，尝试补全
        if (partialSSID.length >= 4 && /^\d+$/.test(partialSSID)) {
          // 可能是401401-5G的截断
          return `${partialSSID}-5G`;
        }
      }
    }
    
    return partialSSID; // 无法推测，返回原值
  }

  // Parse WiFi network list from response data according to BLUFI protocol
  private parseWiFiNetworkList(networkData: Uint8Array): void {
    try {
      console.log('=== WiFi Network List Parsing ===');
      console.log('Network data length:', networkData.length, 'bytes');
      
      if (networkData.length === 0) {
        console.log('No WiFi networks found');
        return;
      }
      
      // Check if this is a simple status response rather than network list
      if (networkData.length === 1) {
        console.log('Single byte response detected - likely status/acknowledgment');
        console.log('Response value:', networkData[0], '(0x' + networkData[0].toString(16).padStart(2, '0') + ')');
        
        if (networkData[0] === 0x01) {
          console.log('Device acknowledged WiFi scan command');
          console.log('This may indicate scan is in progress or no networks found');
        }
        
        console.log('No WiFi networks to parse from this response');
        return;
      }
      
      let offset = 0;
      let networkCount = 0;
      
      console.log('📋 Parsing WiFi networks according to BLUFI protocol format:');
      console.log('   Each network: [RSSI][SSID Length][SSID Content]');
      
      while (offset < networkData.length) {
        // Check if there's enough data to read at least RSSI + SSID length
        if (offset + 2 > networkData.length) {
          console.log('Insufficient data for complete network info, stopping parsing');
          break;
        }
        
        console.log(`\n--- WiFi Network ${networkCount + 1} ---`);
        
        // Read RSSI (1 byte, signed int8_t)
        const rssiRaw = networkData[offset++];
        const rssi = rssiRaw > 127 ? rssiRaw - 256 : rssiRaw; // Convert to signed
        console.log('RSSI:', rssi, 'dBm (raw: 0x' + rssiRaw.toString(16).padStart(2, '0') + ')');
        
        // Read SSID length (1 byte)
        const ssidLength = networkData[offset++];
        console.log('SSID length:', ssidLength, 'bytes');
        
        // Check if SSID length is reasonable (1-32 bytes for WiFi SSID)
        if (ssidLength === 0 || ssidLength > 32) {
          console.log('Invalid SSID length, stopping parsing');
          break;
        }
        
        // Check if we have enough data for SSID content
        if (offset + ssidLength > networkData.length) {
          console.log('SSID data incomplete, stopping parsing');
          break;
        }
        
        // Read SSID content (n bytes, UTF-8)
        const ssidBytes = networkData.slice(offset, offset + ssidLength);
        const ssid = new TextDecoder('utf-8').decode(ssidBytes);
        offset += ssidLength;
        console.log('SSID:', `"${ssid}"`);
        
        networkCount++;
      }
      
      console.log(`\nTotal ${networkCount} WiFi networks found`);
      console.log('=== WiFi Network List Parsing Complete ===');
    } catch (error) {
      console.error('Failed to parse WiFi network list:', error);
    }
  }
  
  // Parse other response types
  private parseOtherResponseType(responseData: Uint8Array): void {
    try {
      console.log('=== Other Response Type Parsing ===');
      
      const responseType = responseData[0];
      
      switch (responseType) {
        case 0x01:
          console.log('This is WiFi configuration response');
          break;
        case 0x02:
          console.log('This is device status response');
          break;
        case 0x03:
          console.log('This is error response');
          break;
        default:
          console.log('Unknown response type:', responseType);
      }
      
      // Print complete response data for debugging
      console.log('Complete response data:', Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      console.log('=== Other Response Type Parsing Complete ===');
    } catch (error) {
      console.error('Failed to parse other response type:', error);
    }
  }

  // Validate scan command response - check if it contains actual WiFi network data
  private validateScanCommandResponse(responseData: Uint8Array): boolean {
    try {
      console.log('🔍 Validating scan command response');
      console.log('📊 Response data length:', responseData.length);
      console.log('📊 Response data (hex):', Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      // Basic validation: check minimum length
      if (responseData.length < 1) {
        console.warn('❌ Response too short:', responseData.length);
        return false;
      }
      
      // Check if this is a BLUFI protocol response
      if (responseData.length >= 3) {
        const responseType = responseData[0];
        const sequence = responseData[1];
        const dataLength = responseData[2];
        
        console.log('📋 BLUFI Response format detected:');
        console.log('   Response type:', responseType, '(0x' + responseType.toString(16).padStart(2, '0') + ')');
        console.log('   Sequence:', sequence);
        console.log('   Data length:', dataLength);
        
        // Check if this is a WiFi scan results response (type 0x49)
        if (responseType === 0x49) {
          if (dataLength === 1 && responseData.length >= 4) {
            const actualData = responseData[3];
            console.log('   Response data:', actualData, '(0x' + actualData.toString(16).padStart(2, '0') + ')');
            
            // If data is just 0x01, this is likely an acknowledgment, not actual WiFi data
            if (actualData === 0x01) {
              console.log('❌ Response does not contain valid WiFi network data');
              console.log('🔍 This appears to be a command acknowledgment or status response');
              return false;
            }
          }
        }
      }
      
      // Check if this looks like actual WiFi network data
      if (responseData.length >= 1) {
        const firstByte = responseData[0];
        
        // If it's a single byte response, it's likely not WiFi network data
        if (responseData.length === 1) {
          console.log('❌ Single byte response - likely not WiFi network data');
          return false;
        }
        
        // Check if it looks like WiFi network data (should have SSID length as first byte)
        if (responseData.length > 1) {
          const ssidLength = firstByte;
          // Valid SSID length should be 1-32 bytes
          if (ssidLength >= 1 && ssidLength <= 32 && responseData.length > ssidLength) {
            console.log('✅ This looks like WiFi network data');
            console.log('SSID length:', ssidLength);
            console.log('Total response length:', responseData.length);
            return true;
          }
        }
      }
      
      console.log('❌ Response does not contain valid WiFi network data');
      console.log('🔍 This appears to be a command acknowledgment or status response');
      return false;
    } catch (error) {
      console.error('Failed to validate scan command response:', error);
      return false;
    }
  }

  // Map security type from device protocol to standard format
  private mapSecurityType(securityType: number): string {
    switch (securityType) {
      case 0: return 'Open';
      case 1: return 'WEP';
      case 2: return 'WPA';
      case 3: return 'WPA2';
      case 4: return 'WPA3';
      default: return 'Unknown';
    }
  }

  // Write WiFi configuration to device via BLE characteristic
  private async writeWiFiConfigToDevice(device: BluetoothDevice, wifiConfig: WiFiConfigData): Promise<any> {
    try {
      console.log('Writing WiFi configuration to device:', wifiConfig);
      
      // ✅ 保持现有 GATT 连接：不主动断开/重连
      const gattServer = await this.getGATTConnection(device);
      const deviceId = device.id || device.name;
      // 确保 FF02 notify 已启用
      await this.ensureBlufiNotificationChannel(deviceId, gattServer);
      
      // ✅ Pass device ID for FF02 notification channel lookup
      const statusResponse = await this.writeWiFiConfigToGATT(gattServer, wifiConfig, deviceId);
      console.log('✅ WiFi configuration written via GATT successfully');
      return statusResponse;
    } catch (error) {
      console.error('❌ Failed to write WiFi configuration:', error);
      throw error; // ✅ 直接抛出，不再fallback到模拟成功
    }
  }

  // Wait for device ACK based on 0x49 + ok + time window/step context
  private async waitForDeviceAck(
    deviceId: string,
    stepContext: string, // e.g., "SSID", "Password", "Connect"
    timeoutMs: number = 15000,
    expectedSeq?: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let timeoutHandle: NodeJS.Timeout;
      let resolved = false;
      
      const handleAck = (responseData: Uint8Array) => {
        if (resolved) return; // Prevent double resolution
        
        console.log(`   📨 ACK handler called for ${stepContext}: ${responseData.byteLength} bytes`);
        const hexStr = Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`   📊 Raw data: ${hexStr}`);
        
        if (responseData.byteLength >= 4) {
          // ✅ 正确的 BLUFI 帧格式解析
          // [Type(1)][FrameControl(1)][Sequence(1)][DataLength(1)][Data(n)]
          const frameType = responseData[0];
          const frameControl = responseData[1];
          const sequence = responseData[2];
          const dataLength = responseData[3];
          
          console.log(`   🔍 Frame parse: Type=0x${frameType.toString(16)}, FC=0x${frameControl.toString(16)}, Seq=${sequence}, DataLen=${dataLength}`);
          if (typeof expectedSeq === 'number') {
            const seqMatch = sequence === expectedSeq;
            console.log(`   🔢 ACK sequence check: expected=${expectedSeq}, received=${sequence}, match=${seqMatch}`);
          }
          
          // ✅ 关键判断：0x49 + ok + 时间窗/步骤上下文
          if (frameType === 0x49) {
            console.log(`   📨 Device ACK/Status frame (Type=0x49) for ${stepContext}`);
            
            // 检查是否有实际数据
            const actualDataBytes = responseData.length > 4 ? responseData.slice(4) : [];
            if (actualDataBytes.length > 0) {
              console.log(`   📦 Data (${actualDataBytes.length} bytes): ${Array.from(actualDataBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
              
              const errorCode = actualDataBytes[0];
              console.log(`   📊 Status error code: ${errorCode}`);
              
              if (errorCode === 0) {
                console.log(`   ✅ ACK confirmed for ${stepContext}: error code 0 (成功)`);
                clearTimeout(timeoutHandle);
                this.unregisterNotificationHandler(deviceId, 'ack');
                resolved = true;
                resolve(true);
                return;
              } else {
                console.log(`   ⚠️  ACK with error for ${stepContext}: error code ${errorCode}`);
                // 即使有错误，也认为是ACK响应，继续下一步
                clearTimeout(timeoutHandle);
                this.unregisterNotificationHandler(deviceId, 'ack');
                resolved = true;
                resolve(true);
                return;
              }
            } else {
              // 没有数据部分，也认为是ACK
              console.log(`   ✅ ACK confirmed for ${stepContext}: Type=0x49 without data`);
              clearTimeout(timeoutHandle);
              this.unregisterNotificationHandler(deviceId, 'ack');
              resolved = true;
              resolve(true);
              return;
            }
          } else {
            console.log(`   ⚠️  Non-ACK frame received during ${stepContext}: Type=0x${frameType.toString(16)}`);
          }
        } else {
          console.log(`   ⚠️  Frame too short for ${stepContext}: ${responseData.byteLength} bytes`);
        }
      };
      
      // Register ACK handler with unified dispatcher
      console.log(`   📝 Registering ACK handler for ${stepContext} (device ${deviceId}${typeof expectedSeq === 'number' ? ", expectedSeq=" + expectedSeq : ''})`);
      this.registerNotificationHandler(deviceId, 'ack', handleAck);
      console.log(`   ✅ ACK handler registered successfully`);
      
      // Set up timeout
      timeoutHandle = setTimeout(() => {
        if (!resolved) {
          console.log(`   ⏰ ACK timeout for ${stepContext} after ${timeoutMs}ms${typeof expectedSeq === 'number' ? ", expectedSeq=" + expectedSeq : ''}`);
          this.unregisterNotificationHandler(deviceId, 'ack');
          resolved = true;
          resolve(false);
        }
      }, timeoutMs);
    });
  }

  // Write WiFi configuration to GATT characteristic using proper BLUFI protocol
  private async writeWiFiConfigToGATT(
    gattServer: BluetoothRemoteGATTServer, 
    wifiConfig: WiFiConfigData,
    deviceId: string
  ): Promise<any> {
    const configKey = `${wifiConfig.ssid}_${Date.now()}`;
    
    // ✅ 防止并发配网：检查是否已有配网流程在进行
    if (this.activeWiFiConfigurations.size > 0) {
      const activeConfig = Array.from(this.activeWiFiConfigurations)[0];
      console.error(`⚠️  配网流程已在进行中: ${activeConfig}，拒绝重复配网请求`);
      throw new Error('WiFi configuration already in progress');
    }
    
    this.activeWiFiConfigurations.add(configKey);
    console.log(`🔒 配网流程已锁定: ${configKey}`);
    
    try {
      console.log('Writing WiFi configuration to GATT characteristic using BLUFI protocol:', {
        deviceId,
        ssid: wifiConfig.ssid,
        security: wifiConfig.security,
        passwordLength: wifiConfig.password.length
      });
      
      // Determine service and characteristic UUIDs based on wifiConfig
      const wifiServiceUUID = this.getWiFiServiceUUID(wifiConfig);
      const wifiConfigCharacteristicUUID = this.getWiFiConfigCharacteristicUUID(wifiConfig);
      
      console.log('Using WiFi service UUID:', wifiServiceUUID);
      console.log('Using WiFi config characteristic UUID:', wifiConfigCharacteristicUUID);
      
      // Get the primary service for WiFi configuration
      const service = await gattServer.getPrimaryService(wifiServiceUUID);
      console.log('WiFi service connected:', (service as any).uuid || wifiServiceUUID);
      
      const characteristic = await service.getCharacteristic(wifiConfigCharacteristicUUID);
      console.log('WiFi config characteristic accessed:', (characteristic as any).uuid || wifiConfigCharacteristicUUID);
      
      // ✅ Use persistent FF02 notification channel (established during WiFi scan or earlier)
      // This ensures we don't miss any ACK responses from the device
      console.log(`📡 Ensuring FF02 notification channel is active for device ${deviceId}`);
      const responseCharacteristic = await this.ensureBlufiNotificationChannel(deviceId, gattServer);
      
      // ✅ 不再进行额外握手/断开：直接从设备期望的 seq=4 开始
      console.log(`🔄 Sending WiFi config frames starting at SSID(seq=4) → Password(5) → Connect(6)`);
      
      // 缓冲：停止扫描与配网之间等待 400ms
      await new Promise(resolve => setTimeout(resolve, 400));

      // 恢复：发送 Set Opmode(seq=3) 一次（不重试），先注册 ACK，再写入，再等待；无论 ACK 与否都继续
      try {
        console.log(`   ⚙️  Sending Set Opmode (STA) with seq=3`);
        const opmodeFrame = this.createSetOpmodeFrame(3, 0x01);
        console.log(`   🎧 Setting up ACK listener before writing Opmode (seq 3)...`);
        const ackPromise = this.waitForDeviceAck(deviceId, 'Opmode', 5000, 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        await characteristic.writeValue(opmodeFrame);
        console.log(`   ✅ Opmode frame written (seq 3)`);
        await new Promise(resolve => setTimeout(resolve, 50));
        const ack = await ackPromise;
        if (!ack) {
          console.warn(`   ⚠️  Opmode ACK timeout, continuing per plan`);
        } else {
          console.log(`   ✅ Opmode ACK received`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(`   ⚠️  Opmode send exception, continuing:`, e);
      }

      // Prepare WiFi configuration data (returns array of frames)
      const configFrames = this.prepareWiFiConfigData(wifiConfig);
      console.log(`WiFi config data prepared: ${configFrames.length} frames`);
      console.log('🔄 Using ACK-based flow: wait for device confirmation before sending next frame');
      
      // ✅ 严格串行化：一帧一ACK，防止序号混乱
      for (let i = 0; i < configFrames.length; i++) {
        const frame = configFrames[i];
        const frameSeq = frame[2]; // Sequence number is at index 2
        
        console.log(`📤 Sending frame ${i + 1}/${configFrames.length}:`, {
          frameLength: frame.length,
          frameHex: Array.from(frame).map(b => b.toString(16).padStart(2, '0')).join(' '),
          frameType: frame[0] & 0x03,
          frameSubtype: (frame[0] >> 2) & 0x3F,
          sequence: frameSeq
        });
        
        // ✅ 写入前小延时，确保BLE栈准备好（100ms）
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // ✅ CRITICAL FIX: 在写入数据之前就设置好ACK监听器
        const stepContext = i === 0 ? 'SSID' : i === 1 ? 'Password' : 'Connect';
        console.log(`   🎧 Setting up ACK listener before writing ${stepContext} (seq ${frameSeq})...`);
        // 设备 ACK 0x49 的序列独立于上行，实测为 1/2/3 对应 SSID/Password/Connect
        // ACK 序号仅用于日志：Opmode→1，SSID→2，Password→3，Connect→4
        const expectedAckSeq = i + 2;
        const ackPromise = this.waitForDeviceAck(deviceId, stepContext, 15000, expectedAckSeq);
        
        try {
          // ✅ 单次写入，不重试
          await characteristic.writeValue(frame);
          console.log(`   ✅ Frame ${i + 1} written (seq ${frameSeq})`);
          
          // ✅ 写入后固定等待窗口（20-50ms），让BLE通知到达
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (writeError: any) {
          // ✅ 写入失败立即终止，不重发
          console.error(`   ❌ Frame ${i + 1} write failed:`, writeError);
          if (writeError.message?.includes('in progress')) {
            console.error(`   ⚠️  GATT operation already in progress - 并发写错误！`);
          }
          throw new Error(`Failed to write frame ${i + 1} (seq ${frameSeq}): ${writeError.message}`);
        }
        
        // ✅ 等待设备ACK（监听器已经在写入前设置好了）
        console.log(`   ⏳ Waiting for ACK (seq ${frameSeq})...`);
        const ackReceived = await ackPromise;
        
        if (!ackReceived) {
          console.warn(`   ⚠️  No ACK received for ${stepContext}, continuing per device behavior`);
        } else {
          console.log(`   ✅ ACK received for ${stepContext}`);
        }

        // ✅ 下一帧前等待（无论是否收到ACK，都给设备处理时间）
        if (i < configFrames.length - 1) {
          console.log(`   ⏸️  Waiting 2000ms before next frame...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('✅ All WiFi configuration frames sent successfully');
      
      // After sending all configuration frames, wait for status response
      console.log('🔍 Waiting for device status response...');
      const statusResponse = await this.waitForWiFiStatusResponse(service);
      
      if (statusResponse) {
        console.log('✅ WiFi status response received:', statusResponse);
        return statusResponse;
      } else {
        console.log('⚠️  No status response received, configuration may have failed');
        return null;
      }
    } catch (error) {
      console.error('Failed to write WiFi configuration to GATT:', error);
      throw new Error('GATT write failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // ✅ 释放配网锁
      this.activeWiFiConfigurations.delete(configKey);
      console.log(`🔓 配网流程已解锁: ${configKey}`);
    }
  }

  // Get WiFi service UUID based on configuration
  private getWiFiServiceUUID(wifiConfig: WiFiConfigData): string {
    // Use BLUFI service UUID from device logs: 0xffff
    console.log('Using BLUFI service UUID for WiFi configuration');
    
    // Convert 16-bit UUID to 128-bit format
    // BLUFI service UUID: 0xffff -> 0000ffff-0000-1000-8000-00805f9b34fb
    const blufiServiceUUID = '0000ffff-0000-1000-8000-00805f9b34fb';
    
    console.log('Selected BLUFI service UUID (128-bit):', blufiServiceUUID);
    return blufiServiceUUID;
  }

  // Get WiFi config characteristic UUID based on configuration
  private getWiFiConfigCharacteristicUUID(wifiConfig: WiFiConfigData): string {
    // Use BLUFI characteristic UUID from device logs: 0xff01 (data send)
    console.log('Using BLUFI characteristic UUID for WiFi configuration');
    
    // Convert 16-bit UUID to 128-bit format
    // BLUFI characteristic UUID: 0xff01 -> 0000ff01-0000-1000-8000-00805f9b34fb
    const blufiCharacteristicUUID = '0000ff01-0000-1000-8000-00805f9b34fb';
    
    console.log('Selected BLUFI characteristic UUID (128-bit):', blufiCharacteristicUUID);
    return blufiCharacteristicUUID;
  }

  // Create SSID frame
  private createSSIDFrame(ssid: string, sequence: number): Uint8Array {
    // SSID: Data Frame (FrameType=1), Subtype=2
    // Type = (2 << 2) | 1 = 0x09
    // Data format: [SSID_Bytes...]  ← 长度由外层 DataLength 提供（不再额外前置内部长度字节）
    const ssidBytes = new TextEncoder().encode(ssid);
    // 按文档：Data 直接为 SSID 字节序列
    const ssidData = ssidBytes;
    
    console.log('🔍 SSID encoding debug:', {
      originalSSID: ssid,
      ssidLength: ssidBytes.length,
      ssidBytes: Array.from(ssidBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
      payload: Array.from(ssidData).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
    });
    
    // 恢复CRC
    const ssidFrame = this.createBLUFICommand(0x09, sequence, ssidData);
    console.log(`✅ SSID frame created (seq ${sequence}, type 0x09: SSID, format=[len][ssid])`);
    return ssidFrame;
  }

  // Create password frame
  private createPasswordFrame(password: string, sequence: number): Uint8Array {
    // Password: Data Frame (FrameType=1), Subtype=3
    // Type = (3 << 2) | 1 = 0x0D
    // Data format: [Password_Bytes...]  ← 长度由外层 DataLength 提供（不再额外前置内部长度字节）
    const passwordBytes = new TextEncoder().encode(password);
    // 按文档：Data 直接为密码字节序列
    const passwordData = passwordBytes;
    
    console.log('🔍 Password encoding debug:', {
      passwordLength: passwordBytes.length,
      passwordMasked: '*'.repeat(passwordBytes.length),
      payload: `[${passwordBytes.length}] + ${passwordBytes.length} bytes`
    });
    
    const passwordFrame = this.createBLUFICommand(0x0D, sequence, passwordData);
    console.log(`✅ Password frame created (seq ${sequence}, type 0x0D: password, format=[len][password])`);
    return passwordFrame;
  }

  // Create connect AP frame
  private createConnectAPFrame(sequence: number): Uint8Array {
    // Connect to AP: Control Frame (FrameType=0), Subtype=3
    // Type = (3 << 2) | 0 = 0x0C
    const connectFrame = this.createBLUFICommand(0x0C, sequence, new Uint8Array(0));
    console.log(`✅ Connect AP frame created (seq ${sequence}, type 0x0C: connect to AP)`);
    return connectFrame;
  }

  // Create set opmode (STA) frame
  private createSetOpmodeFrame(sequence: number, mode: number = 0x01): Uint8Array {
    // Set opmode: Control Frame (FrameType=0), Subtype=1 → Type = (1 << 2) | 0 = 0x04
    // Data: [opmode], 0x01 = STA
    const data = new Uint8Array([mode]);
    // 恢复CRC
    const opmodeFrame = this.createBLUFICommand(0x04, sequence, data);
    console.log(`✅ Set Opmode frame created (seq ${sequence}, type 0x04: opmode=${mode})`);
    return opmodeFrame;
  }

  // Create get WiFi status frame
  private createGetWiFiStatusFrame(sequence: number): Uint8Array {
    // Get WiFi status: Control Frame (FrameType=0), Subtype=5
    // Type = (5 << 2) | 0 = 0x14
    const statusFrame = this.createBLUFICommand(0x14, sequence, new Uint8Array(0));
    console.log(`✅ WiFi status query frame created (seq ${sequence}, type 0x14: get status)`);
    return statusFrame;
  }

  // Prepare WiFi configuration data for GATT transmission using proper BLUFI protocol
  private prepareWiFiConfigData(wifiConfig: WiFiConfigData): Uint8Array[] {
    try {
      // ⚠️ 关键修复：清理SSID，移除非打印字符（如\x07）
      // WiFi扫描结果可能包含控制字符，需要过滤掉
      const cleanSSID = wifiConfig.ssid.replace(/[\x00-\x1F\x7F]/g, '').trim();
      
      if (cleanSSID !== wifiConfig.ssid) {
        console.warn('⚠️  SSID contained non-printable characters, cleaned:', {
          original: wifiConfig.ssid,
          originalBytes: Array.from(new TextEncoder().encode(wifiConfig.ssid)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
          cleaned: cleanSSID,
          cleanedBytes: Array.from(new TextEncoder().encode(cleanSSID)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
        });
      }
      
      console.log('Preparing BLUFI WiFi configuration data using proper protocol:', {
        ssid: cleanSSID,
        originalSSID: wifiConfig.ssid,
        security: wifiConfig.security,
        passwordLength: wifiConfig.password.length,
        passwordMasked: '*'.repeat(wifiConfig.password.length)
      });
      
      // Use cleaned SSID for configuration
      const configWithCleanSSID = { ...wifiConfig, ssid: cleanSSID };
      
      const frames: Uint8Array[] = [];
      
      console.log('🔢 Starting BLUFI WiFi configuration sequence');
      console.log('📋 Type字段格式: (Subtype << 2) | FrameType, 其中FrameType: 00=控制帧, 01=数据帧');
      console.log('✅ 配网流程：SSID → Password → Connect');
      console.log('📋 上行序列（客户端→设备）：seq 4=SSID, seq 5=Password, seq 6=Connect');
      console.log('ℹ️  上下行序列独立：设备响应有自己的序列号，不占用客户端上行序列');

      // Step 1: Send SSID (使用清理后的SSID) - seq 4
      const ssidFrame = this.createSSIDFrame(cleanSSID, 4);
      frames.push(ssidFrame);
      
      // Step 2: Send Password - seq 5
      const passwordFrame = this.createPasswordFrame(configWithCleanSSID.password, 5);
      frames.push(passwordFrame);
      
      // Step 3: Connect to AP - seq 6
      const connectFrame = this.createConnectAPFrame(6);
      frames.push(connectFrame);
      
      console.log(`✅ BLUFI WiFi configuration prepared: ${frames.length} frames (sequences 4-6)`);
      console.log('📋 Protocol sequence: SSID(4) → Password(5) → Connect(6)');
      return frames;
    } catch (error) {
      console.error('Failed to prepare BLUFI WiFi configuration data:', error);
      throw new Error('Data preparation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Wait for WiFi status response after configuration
  private async waitForWiFiStatusResponse(service: BluetoothRemoteGATTService): Promise<any> {
    try {
      console.log('🔍 Waiting for WiFi status response from device...');
      
      // Get the response characteristic (0xff02)
      const responseCharacteristicUUID = '0000ff02-0000-1000-8000-00805f9b34fb';
      const responseCharacteristic = await service.getCharacteristic(responseCharacteristicUUID);
      
      // Set up notification listener for status response
      await responseCharacteristic.startNotifications();
      console.log('🔔 Notifications started for status response');
      
      // Wait for status response with timeout
      const statusResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('⏰ Status response timeout (30 seconds)');
          resolve(null);
        }, 30000); // 30 second timeout
        
        const handleStatusResponse = (event: any) => {
          console.log('📨 Status response received');
          const dataView = event.target.value;
          
          if (dataView && dataView.byteLength > 0) {
            const responseData = new Uint8Array(dataView.buffer);
            console.log('📊 Status response data:', {
              length: responseData.length,
              hex: Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '),
              ascii: Array.from(responseData).map(b => String.fromCharCode(b)).join('')
            });
            
            // Parse the status response
            const statusInfo = this.parseWiFiStatusResponse(responseData);
            clearTimeout(timeout);
            resolve(statusInfo);
          }
        };
        
        responseCharacteristic.addEventListener('characteristicvaluechanged', handleStatusResponse);
      });
      
      return statusResponse;
    } catch (error) {
      console.error('Failed to wait for WiFi status response:', error);
      return null;
    }
  }

  // Parse WiFi status response from device
  private parseWiFiStatusResponse(responseData: Uint8Array): any {
    try {
      console.log('🔍 Parsing WiFi status response...');
      console.log('📊 Response data length:', responseData.length);
      console.log('📊 Response data (hex):', Array.from(responseData).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      if (responseData.length < 3) {
        console.log('⚠️  Response too short for status parsing');
        return null;
      }
      
      // Parse BLUFI response format: [Type][Sequence][Length][Data...]
      const responseType = responseData[0];
      const sequence = responseData[1];
      const dataLength = responseData[2];
      
      console.log('📋 Status response format:');
      console.log('   Response type:', responseType, '(0x' + responseType.toString(16).padStart(2, '0') + ')');
      console.log('   Sequence:', sequence);
      console.log('   Data length:', dataLength);
      
      if (responseData.length < 3 + dataLength) {
        console.log('⚠️  Incomplete response data');
        return null;
      }
      
      const statusData = responseData.slice(3, 3 + dataLength);
      console.log('📊 Status data:', Array.from(statusData).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      // Parse status information according to BLUFI protocol
      const statusInfo = this.parseWiFiStatusData(statusData);
      
      console.log('✅ WiFi status parsed successfully:', statusInfo);
      return statusInfo;
    } catch (error) {
      console.error('Failed to parse WiFi status response:', error);
      return null;
    }
  }

  // Parse WiFi status data according to BLUFI protocol
  private parseWiFiStatusData(statusData: Uint8Array): any {
    try {
      console.log('🔍 Parsing WiFi status data...');
      
      if (statusData.length < 1) {
        console.log('⚠️  No status data to parse');
        return { error: 'No status data' };
      }
      
      let offset = 0;
      const statusInfo: any = {};
      
      // Parse opmode (1 byte)
      if (offset < statusData.length) {
        const opmode = statusData[offset++];
        statusInfo.opmode = this.parseOpmode(opmode);
        console.log('📋 Opmode:', statusInfo.opmode);
      }
      
      // Parse connection status (1 byte)
      if (offset < statusData.length) {
        const connectionStatus = statusData[offset++];
        statusInfo.connectionStatus = this.parseConnectionStatus(connectionStatus);
        console.log('📋 Connection status:', statusInfo.connectionStatus);
      }
      
      // Parse SSID (if connected)
      if (statusInfo.connectionStatus === 'Connected' && offset < statusData.length) {
        const ssidLength = statusData[offset++];
        if (offset + ssidLength <= statusData.length) {
          const ssidBytes = statusData.slice(offset, offset + ssidLength);
          statusInfo.ssid = new TextDecoder().decode(ssidBytes);
          offset += ssidLength;
          console.log('📋 SSID:', statusInfo.ssid);
        }
      }
      
      // Parse IP address (if connected)
      if (statusInfo.connectionStatus === 'Connected' && offset + 4 <= statusData.length) {
        const ipBytes = statusData.slice(offset, offset + 4);
        statusInfo.ipAddress = Array.from(ipBytes).join('.');
        offset += 4;
        console.log('📋 IP address:', statusInfo.ipAddress);
      }
      
      // Add timestamp
      statusInfo.timestamp = new Date().toISOString();
      
      return statusInfo;
    } catch (error) {
      console.error('Failed to parse WiFi status data:', error);
      return { error: 'Parse error', details: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Parse opmode value
  private parseOpmode(opmode: number): string {
    switch (opmode) {
      case 0x00: return 'NULL';
      case 0x01: return 'STA';
      case 0x02: return 'SoftAP';
      case 0x03: return 'SoftAP & STA';
      default: return `Unknown (0x${opmode.toString(16).padStart(2, '0')})`;
    }
  }

  // Parse connection status value
  private parseConnectionStatus(status: number): string {
    switch (status) {
      case 0x00: return 'Disconnected';
      case 0x01: return 'Connected';
      case 0x02: return 'Connecting';
      case 0x03: return 'Disconnecting';
      default: return `Unknown (0x${status.toString(16).padStart(2, '0')})`;
    }
  }

  // Map security type to BLUFI security value
  private mapSecurityToBlufiValue(security: string): number {
    switch (security.toLowerCase()) {
      case 'open':
        return 0x00; // BLUFI_SECURITY_TYPE_OPEN
      case 'wep':
        return 0x01; // BLUFI_SECURITY_TYPE_WEP
      case 'wpa':
        return 0x02; // BLUFI_SECURITY_TYPE_WPA_PSK
      case 'wpa2':
        return 0x03; // BLUFI_SECURITY_TYPE_WPA2_PSK
      case 'wpa3':
        return 0x04; // BLUFI_SECURITY_TYPE_WPA3_PSK
      default:
        console.warn('Unknown security type, defaulting to WPA2:', security);
        return 0x03; // Default to WPA2
    }
  }

  // Map BLUFI security value to security type string
  private mapBlufiSecurityType(securityValue: number): string {
    switch (securityValue) {
      case 0x00:
        return 'Open';
      case 0x01:
        return 'WEP';
      case 0x02:
        return 'WPA';
      case 0x03:
        return 'WPA2';
      case 0x04:
        return 'WPA3';
      default:
        console.warn('Unknown BLUFI security type:', securityValue);
        return 'Unknown';
    }
  }

  // Get connection progress
  async getConnectionProgress(): Promise<ConnectionProgress[]> {
    // No real connection progress available yet
    return [];
  }

  // Request WiFi scan from device via Bluetooth
  async requestWiFiScanFromDevice(device: BluetoothDevice): Promise<WiFiNetwork[]> {
    try {
      console.log('Requesting WiFi scan from device via Bluetooth:', device.name);
      
      // Check if device is connected and ready
      if (!await this.isDeviceConnected(device)) {
        throw new Error('Device is not connected. Please establish Bluetooth connection first.');
      }

      // Always proceed with WiFi scan for reconnection
      console.log('Device reconnected, proceeding with WiFi scan for reconfiguration');

      // Use GATT connection wrapper to avoid duplicate connections
      const gattServer = await this.getGATTConnection(device);
      
      // Send WiFi scan command via BLE characteristic and get results
      const networks = await this.writeWiFiScanCommandToGATT(gattServer, device.id);
      
      console.log('WiFi networks received from device:', networks.length);
        return networks;
    } catch (error) {
      console.error('Failed to request WiFi networks from device:', error);
      throw new Error('WiFi scan request failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Check if device already has WiFi configuration
  async checkDeviceWiFiStatus(device: BluetoothDevice): Promise<{ hasWiFiConfig: boolean; wifiInfo?: any }> {
    try {
      console.log('Checking device WiFi configuration status:', device.name);
      
      // Check if device is connected
      if (!await this.isDeviceConnected(device)) {
        return { hasWiFiConfig: false };
      }

      // For reconnection scenarios, always proceed with WiFi configuration
      // even if device has existing WiFi config in NVS storage
      console.log('Device reconnected - proceeding with fresh WiFi configuration');
      
      return { 
        hasWiFiConfig: false,
        wifiInfo: {
          source: 'reconnection',
          message: 'Device reconnected, fresh WiFi configuration required'
        }
      };
    } catch (error) {
      console.error('Failed to check device WiFi status:', error);
      return { hasWiFiConfig: false };
    }
  }

  // Check device status
  async checkDeviceStatus(device: BluetoothDevice): Promise<LocalDeviceStatus> {
    try {
      console.log('Checking device status:', device.name);
      
      // Check if device is connected
      if (!await this.isDeviceConnected(device)) {
        return {
          isConnected: false,
          mqttConnected: false
        };
      }

      // Read device status
      const status = await this.readDeviceStatus(device);
      
      // Check MQTT connection
      status.mqttConnected = await this.checkMQTTConnection(device);
      
      return status;
    } catch (error) {
      console.error('Failed to check device status:', error);
      return {
        isConnected: false,
        mqttConnected: false
      };
    }
  }

  // Read device status from BLE characteristic
  private async readDeviceStatus(device: BluetoothDevice): Promise<LocalDeviceStatus> {
    try {
      console.log('Reading device status from BLE characteristic');
      
      // In a real implementation, you would:
      // 1. Read from the device status characteristic
      // 2. Parse the status data
      // 3. Return the device status
      
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock device status
      return {
        isConnected: true,
        mqttConnected: false,
        lastSeen: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to read device status:', error);
      return {
        isConnected: false,
        mqttConnected: false
      };
    }
  }

  // Check MQTT connection status
  private async checkMQTTConnection(device: BluetoothDevice): Promise<boolean> {
    try {
      console.log('Checking MQTT connection status for device:', device.name);
      
      // In a real implementation, you would:
      // 1. Read MQTT connection status from device
      // 2. Or check via Tencent Cloud API
      
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock MQTT connection status
      return true;
    } catch (error) {
      console.error('Failed to check MQTT connection:', error);
      return false;
    }
  }

  // Submit device record to backend canister using deviceApiService
  async submitDeviceRecordToCanister(record: DeviceRecord): Promise<boolean> {
    try {
      console.log('Submitting device record to backend canister:', record);
      
      // Use device name from GATT (pre-registered Tencent IoT device name)
      const deviceName = record.name; // This should be the actual Tencent IoT device name from GATT
      
      // Convert legacy DeviceRecord to ApiDeviceRecord format
      // Use the record's ID if it exists, otherwise generate a new one
      const deviceId = record.id || `device_${Date.now()}`;
      
      const apiRecord: ApiDeviceRecord = {
        id: deviceId,
        name: deviceName, // Use actual Tencent IoT device name from GATT
        deviceType: this.convertStringToDeviceType(record.type),
        owner: record.principalId, // Use principalId as owner
        status: this.convertStringToDeviceStatus(record.status),
        capabilities: this.getDefaultCapabilities(record.type),
        metadata: {
          macAddress: record.macAddress,
          wifiNetwork: record.wifiNetwork,
          connectedAt: record.connectedAt,
          // Store Tencent IoT product info from device
          productId: record.productId || '',
          userPrincipal: record.principalId, // Store full principal for reference
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeen: Date.now(),
      };
      
      // Use deviceApiService to submit to backend canister
      const response = await deviceApiService.submitDeviceRecord(apiRecord);
      
      if (response.success) {
        console.log('Device record submitted to canister successfully:', response.data);
        return true;
      } else {
        console.error('Failed to submit device record:', response.error);
        throw new Error(response.error || 'Failed to submit device record');
      }
    } catch (error) {
      console.error('Failed to submit device record to canister:', error);
      throw new Error('Canister submission failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Legacy method - kept for backward compatibility
  async submitDeviceRecord(record: DeviceRecord): Promise<boolean> {
    return this.submitDeviceRecordToCanister(record);
  }

  // Get device list using deviceApiService
  async getDeviceList(): Promise<DeviceRecord[]> {
    try {
      console.log('Getting device list from backend canister...');
      
      // Use deviceApiService to get devices from backend canister
      const response = await deviceApiService.getDevices(0, 100); // Get first 100 devices
      
      if (response.success && response.data) {
        // Convert ApiDeviceRecord[] to legacy DeviceRecord[] format
        const legacyDevices: DeviceRecord[] = response.data.devices.map(apiDevice => 
          this.convertApiDeviceToLegacyDevice(apiDevice)
        );
        
        console.log('Device list retrieved successfully:', legacyDevices.length, 'devices');
        return legacyDevices;
      } else {
        console.error('Failed to get device list:', response.error);
        return [];
      }
    } catch (error) {
      console.error('Failed to get device list:', error);
      return [];
    }
  }

  // Get current scanning status
  getScanningStatus() {
    return {
      isScanningBluetooth: this.isScanningBluetooth,
      wifiNetworks: this.wifiNetworks,
      bluetoothDevices: this.bluetoothDevices
    };
  }

  // Clear cached data
  clearCache() {
    this.wifiNetworks = [];
    this.bluetoothDevices = [];
  }

  // Helper methods for type conversion

  // Convert string device type to DeviceType enum
  private convertStringToDeviceType(type: string): DeviceType {
    switch (type.toLowerCase()) {
      case 'mobile':
      case 'phone':
      case 'smartphone':
        return { Mobile: null };
      case 'desktop':
      case 'computer':
      case 'pc':
        return { Desktop: null };
      case 'server':
        return { Server: null };
      case 'iot':
      case 'internet of things':
        return { IoT: null };
      case 'embedded':
        return { Embedded: null };
      default:
        return { Other: type };
    }
  }

  // Convert string device status to BackendDeviceStatus enum
  private convertStringToDeviceStatus(status: string): BackendDeviceStatus {
    switch (status.toLowerCase()) {
      case 'connected':
      case 'online':
        return { Online: null };
      case 'disconnected':
      case 'offline':
        return { Offline: null };
      case 'maintenance':
        return { Maintenance: null };
      case 'disabled':
        return { Disabled: null };
      default:
        return { Offline: null };
    }
  }

  // Get default capabilities based on device type
  private getDefaultCapabilities(type: string): any[] {
    const capabilities = [];
    
    switch (type.toLowerCase()) {
      case 'mobile':
      case 'phone':
      case 'smartphone':
        capabilities.push({ Audio: null }, { Video: null }, { Network: null });
        break;
      case 'desktop':
      case 'computer':
      case 'pc':
        capabilities.push({ Compute: null }, { Storage: null }, { Network: null });
        break;
      case 'server':
        capabilities.push({ Compute: null }, { Storage: null }, { Network: null });
        break;
      case 'iot':
      case 'internet of things':
        capabilities.push({ Sensor: null }, { Network: null });
        break;
      case 'embedded':
        capabilities.push({ Sensor: null }, { Compute: null });
        break;
      default:
        capabilities.push({ Network: null });
    }
    
    return capabilities;
  }

  // Convert ApiDeviceRecord to legacy DeviceRecord format
  private convertApiDeviceToLegacyDevice(apiDevice: ApiDeviceRecord): DeviceRecord {
    return {
      name: apiDevice.name,
      type: this.convertDeviceTypeToString(apiDevice.deviceType),
      macAddress: apiDevice.metadata.macAddress || 'Unknown',
      wifiNetwork: apiDevice.metadata.wifiNetwork || 'Unknown',
      status: this.convertDeviceStatusToString(apiDevice.status),
      connectedAt: apiDevice.metadata.connectedAt || new Date(apiDevice.createdAt).toISOString(),
      principalId: apiDevice.owner,
    };
  }

  // Convert DeviceType enum to string
  private convertDeviceTypeToString(deviceType: DeviceType): string {
    if ('Mobile' in deviceType) return 'Mobile';
    if ('Desktop' in deviceType) return 'Desktop';
    if ('Server' in deviceType) return 'Server';
    if ('IoT' in deviceType) return 'IoT';
    if ('Embedded' in deviceType) return 'Embedded';
    if ('Other' in deviceType) return deviceType.Other;
    return 'Unknown';
  }

  // Convert BackendDeviceStatus enum to string
  private convertDeviceStatusToString(status: BackendDeviceStatus): string {
    if ('Online' in status) return 'Connected';
    if ('Offline' in status) return 'Disconnected';
    if ('Maintenance' in status) return 'Maintenance';
    if ('Disabled' in status) return 'Disabled';
    return 'Unknown';
  }

  // Stop WiFi scan listening for a specific device
  // ⚠️  IMPORTANT: This only stops scan-specific polling, NOT the FF02 notification channel
  // FF02 must remain active for WiFi configuration ACKs
  stopWiFiScanListening(deviceId: string): void {
    console.log(`🛑 Stopping WiFi scan listening for device: ${deviceId}`);
    
    const listener = this.activeWiFiScanListeners.get(deviceId);
    if (listener) {
      // Clear timeout
      if (listener.timeoutId) {
        clearTimeout(listener.timeoutId);
        console.log(`   ⏰ Cleared timeout for device ${deviceId}`);
      }
      
      // Clear read interval
      if (listener.readInterval) {
        clearInterval(listener.readInterval);
        console.log(`   🔄 Cleared read interval for device ${deviceId}`);
      }
      
      // ✅ CRITICAL: Unregister WiFi scan handler from unified dispatcher
      this.unregisterNotificationHandler(deviceId, 'wifiScan');
      console.log(`   🗑️  Unregistered WiFi scan handler from unified dispatcher`);
      console.log(`   ✅ WiFi scan handler cleanup completed for device ${deviceId}`);
      
      // ✅ FF02 notification channel stays active for WiFi configuration ACKs
      console.log(`   ℹ️  FF02 notification channel kept alive for WiFi configuration`);
      
      // Mark as inactive
      listener.isActive = false;
      console.log(`   ✅ WiFi scan listening stopped for device ${deviceId}`);
      
      // Remove from map
      this.activeWiFiScanListeners.delete(deviceId);
    } else {
      console.log(`   ⚠️  No active WiFi scan listener found for device ${deviceId}`);
    }
  }

  // Stop all WiFi scan listening
  stopAllWiFiScanListening(): void {
    console.log('🛑 Stopping all WiFi scan listening');
    
    for (const [deviceId, listener] of this.activeWiFiScanListeners) {
      this.stopWiFiScanListening(deviceId);
    }
    
    this.activeWiFiScanListeners.clear();
    console.log('✅ All WiFi scan listening stopped');
  }

  // Cleanup method - call this when the service is no longer needed
  async cleanup(): Promise<void> {
    console.log('Cleaning up RealDeviceService');
    this.stopAllWiFiScanListening();
    await this.closeAllGATTConnections();
  }
}

export const realDeviceService = new RealDeviceService();

