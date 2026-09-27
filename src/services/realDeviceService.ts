// Real Device Service - Implement actual WiFi and Bluetooth functionality
// botrate:74880
/* eslint-disable @typescript-eslint/no-explicit-any */
import { deviceApiService, DeviceRecord as ApiDeviceRecord } from './api/deviceApi';
import type { DeviceType, DeviceStatus as BackendDeviceStatus } from '../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import {
  BlufiSession,
  BlufiWiFiListAssembler,
  decodeBlufiFrame,
  encodeBlufiFrame,
  getWiFiReportState,
  parseDeviceNameFromAdvertisement,
  validateBlufiCredentials,
} from './blufiProtocol';

const LEGACY_TENCENT_PRODUCT_ID = 'H3PI4FBTV5';

// Bluetooth API type declarations
declare global {
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
  }
  
  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
    connected: boolean;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
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
  deviceName?: string;
  productId?: string;
  paired?: boolean;
  connectable?: boolean;
}

export interface DeviceRecord {
  id?: string;
  name: string;
  deviceName?: string;  // Device name for MCP calls (extracted from Bluetooth name)
  type: string;
  macAddress: string;
  wifiNetwork: string;
  status: string;
  connectedAt: string;
  principalId: string;
  // Deprecated persisted field; new records use deviceName only.
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
  
  private blufiSessions = new Map<string, BlufiSession>();
  private blufiWriteQueues = new Map<string, Promise<void>>();
  private invalidBlufiSessions = new Set<string>();
  private activeBlufiScans = new Set<string>();
  private blufiScanCancels = new Map<string, () => void>();
  
  // ✅ BLUFI FF02 notification subscriptions (persistent across entire session)
  // Key: device ID, Value: FF02 characteristic with active notification
  private blufiNotificationChannels = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private blufiNotificationListeners = new Map<string, (event: any) => void>();
  
  // ✅ Unified notification handlers - routing table for different frame types
  // This prevents multiple handlers from interfering with each other
  private blufiNotificationHandlers = new Map<string, {
    wifiScanHandler?: (data: Uint8Array) => void;
    statusHandler?: (data: Uint8Array) => void;
  }>();

  // WiFi configuration lock to prevent concurrent configuration
  private activeWiFiConfigurations = new Set<string>();
  
  // ✅ Unified notification dispatcher - single entry point for all FF02 notifications
  private createUnifiedNotificationHandler(deviceId: string): (event: any) => void {
    return (event: any) => {
      const dataView: DataView | undefined = event.target.value;
      if (!dataView || dataView.byteLength === 0) {
        console.log(`   🔕 Unified dispatcher: empty notification for device ${deviceId}`);
        return;
      }
      
      let data: Uint8Array;
      try {
        data = decodeBlufiFrame(dataView).raw;
      } catch (error) {
        console.error(`   ❌ Dropping invalid BLUFI notification for ${deviceId}:`, error);
        return;
      }
      const frameType = data[0];
      
      // ✅ Print complete raw data for analysis
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
      
      console.log(`   📋 Available handlers: wifiScanHandler=${!!handlers.wifiScanHandler}, statusHandler=${!!handlers.statusHandler}`);

      // Error-info (0x49) is never an ACK.
      if (frameType === 0x49) {
        console.warn(`   ❌ BLUFI error-info frame received`);
        if (handlers.wifiScanHandler) handlers.wifiScanHandler(data);
        else if (handlers.statusHandler) handlers.statusHandler(data);
      } else if (frameType === 0x3d) {
        if (handlers.statusHandler) handlers.statusHandler(data);
      } else {
        // WiFi scan data or other data frames - low priority
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
      this.blufiNotificationListeners.set(deviceId, unifiedHandler);
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
    type: 'wifiScan' | 'status',
    handler: (data: Uint8Array) => void
  ): void {
    const handlers = this.blufiNotificationHandlers.get(deviceId) || {};
    
    if (type === 'wifiScan') {
      handlers.wifiScanHandler = handler;
      console.log(`   ✅ Registered wifiScan handler for device ${deviceId}`);
    } else if (type === 'status') {
      handlers.statusHandler = handler;
      console.log(`   ✅ Registered status handler for device ${deviceId}`);
    }
    
    this.blufiNotificationHandlers.set(deviceId, handlers);
  }
  
  private unregisterNotificationHandler(
    deviceId: string,
    type: 'wifiScan' | 'status'
  ): void {
    const handlers = this.blufiNotificationHandlers.get(deviceId);
    if (handlers) {
      if (type === 'wifiScan') {
        delete handlers.wifiScanHandler;
        console.log(`   🗑️  Unregistered wifiScan handler for device ${deviceId}`);
      } else if (type === 'status') {
        delete handlers.statusHandler;
        console.log(`   🗑️  Unregistered status handler for device ${deviceId}`);
      }
    }
  }

  private getBlufiSession(deviceId: string): BlufiSession {
    if (this.invalidBlufiSessions.has(deviceId)) {
      throw new Error('BLUFI session is invalid after a failed write; reconnect the device');
    }
    let session = this.blufiSessions.get(deviceId);
    if (!session) {
      session = new BlufiSession();
      this.blufiSessions.set(deviceId, session);
    }
    return session;
  }

  private async writeBlufiCommand(
    deviceId: string,
    characteristic: BluetoothRemoteGATTCharacteristic,
    type: number,
    data: Uint8Array = new Uint8Array(0),
  ): Promise<Uint8Array> {
    const previous = this.blufiWriteQueues.get(deviceId) ?? Promise.resolve();
    let frame: Uint8Array | undefined;
    const write = previous.then(async () => {
      const session = this.getBlufiSession(deviceId);
      try {
        frame = await session.send(type, data, (encoded) => characteristic.writeValue(encoded));
      } catch (error) {
        this.invalidBlufiSessions.add(deviceId);
        this.cleanupBlufiSession(deviceId);
        throw error;
      }
    });
    this.blufiWriteQueues.set(deviceId, write.then(() => undefined, () => undefined));
    await write;
    return frame!;
  }

  private cleanupBlufiSession(deviceId: string): void {
    this.blufiScanCancels.get(deviceId)?.();
    this.blufiScanCancels.delete(deviceId);
    this.activeBlufiScans.delete(deviceId);
    const characteristic = this.blufiNotificationChannels.get(deviceId);
    const listener = this.blufiNotificationListeners.get(deviceId);
    if (characteristic && listener) {
      characteristic.removeEventListener('characteristicvaluechanged', listener);
      void characteristic.stopNotifications().catch(() => undefined);
    }
    this.stopWiFiScanListening(deviceId);
    this.blufiNotificationChannels.delete(deviceId);
    this.blufiNotificationListeners.delete(deviceId);
    this.blufiNotificationHandlers.delete(deviceId);
    this.blufiSessions.delete(deviceId);
    this.blufiWriteQueues.delete(deviceId);
  }

  // Receive and reassemble the ESP-IDF BLUFI WiFi-list response (type 0x45).
  // A fragmented frame has FC bit 0x10 set and begins its payload with a
  // little-endian remaining-length field. The final frame has no fragment bit.
  private waitForBlufiWiFiScanResponse(
    deviceId: string,
    timeoutMs: number
  ): { promise: Promise<WiFiNetwork[]>; cancel: () => void } {
    let cancel: () => void = () => {};
    const promise = new Promise<WiFiNetwork[]>((resolve, reject) => {
      const assembler = new BlufiWiFiListAssembler();
      let completed = false;

      const finish = (error?: Error, networks?: WiFiNetwork[]) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        this.unregisterNotificationHandler(deviceId, 'wifiScan');
        this.blufiScanCancels.delete(deviceId);
        if (error) reject(error);
        else resolve(networks ?? []);
      };

      const handleFrame = (raw: Uint8Array) => {
        try {
          const frame = decodeBlufiFrame(raw);
          if (frame.type === 0x49) {
            const code = frame.data.length ? frame.data[0] : -1;
            finish(new Error(`BLUFI Wi-Fi scan failed with device error ${code}`));
            return;
          }
          if (frame.type !== 0x45) return;
          const networks = assembler.push(frame);
          if (networks) {
            finish(undefined, networks.map((network, index) => ({
              id: `wifi_${index + 1}`,
              name: network.name,
              security: 'Unknown',
              strength: network.strength,
            })));
          }
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const timeout = setTimeout(() => {
        finish(new Error(`BLUFI Wi-Fi scan response timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      cancel = () => finish(new Error('BLUFI Wi-Fi scan wait cancelled'));
      this.blufiScanCancels.set(deviceId, cancel);

      this.registerNotificationHandler(deviceId, 'wifiScan', handleFrame);
    });
    return { promise, cancel };
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
      '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi configuration service
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
          '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi configuration service
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
            '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi configuration service
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
            '0000ffff-0000-1000-8000-00805f9b34fb'   // BLUFI Service (0xffff) - WiFi configuration service
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
          (bluetoothDevice as any).gattServer = server;
          (device as any).gattServer = server;
          (device as any).isConnected = true;
          (device as any).hasGatt = true;
          const deviceId = device.id || device.name;
          this.cleanupBlufiSession(deviceId);
          this.invalidBlufiSessions.delete(deviceId);
          this.blufiSessions.set(deviceId, new BlufiSession());
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
        this.cleanupBlufiSession(device.id || device.name);
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
          // Request device with single strategy (by name with services first)
          console.log('[BLE] Requesting device connection');
          const bluetoothDevice = await this.requestBluetoothDevice(device, 'nameWithServices');

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
              
              // A newly established GATT session owns an independent uplink sequence.
              this.cleanupBlufiSession(device.id || device.name);
              this.invalidBlufiSessions.delete(device.id || device.name);
              this.blufiSessions.set(device.id || device.name, new BlufiSession());
              
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
            this.cleanupBlufiSession(device.id || device.name);
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
    this.cleanupBlufiSession(deviceId);

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
        this.cleanupBlufiSession(deviceId);

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
    this.blufiNotificationListeners.clear();
    this.blufiNotificationHandlers.clear();
    this.blufiSessions.clear();
    this.blufiWriteQueues.clear();
  }

  // Current BLUFI scan path: subscribe once, register the response route, then
  // send exactly one user-requested GET_WIFI_LIST (0x24) frame.
  private async writeWiFiScanCommandToGATT(
    gattServer: BluetoothRemoteGATTServer,
    deviceId?: string,
  ): Promise<WiFiNetwork[]> {
    if (!deviceId) throw new Error('Device ID is required for BLUFI Wi-Fi scan');
    if (this.activeBlufiScans.has(deviceId)) throw new Error('A BLUFI Wi-Fi scan is already active for this device');
    this.activeBlufiScans.add(deviceId);
    let response: { promise: Promise<WiFiNetwork[]>; cancel: () => void } | undefined;
    try {
      const service = await gattServer.getPrimaryService('0000ffff-0000-1000-8000-00805f9b34fb');
      const commandCharacteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
      await this.ensureBlufiNotificationChannel(deviceId, gattServer);
      response = this.waitForBlufiWiFiScanResponse(deviceId, 30000);
      await this.writeBlufiCommand(deviceId, commandCharacteristic, 0x24);
      return await response.promise;
    } catch (error) {
      if (response) {
        response.promise.catch(() => undefined);
        response.cancel();
      }
      throw error;
    } finally {
      this.activeBlufiScans.delete(deviceId);
    }
  }

  // Write WiFi configuration to device via BLE characteristic
  private async writeWiFiConfigToDevice(device: BluetoothDevice, wifiConfig: WiFiConfigData): Promise<any> {
    try {
      console.log('Writing WiFi configuration to device:', wifiConfig);
      
      // ✅ Keep existing GATT connection: don't actively disconnect/reconnect
      const gattServer = await this.getGATTConnection(device);
      const deviceId = device.id || device.name;
      // Ensure FF02 notify is enabled
      await this.ensureBlufiNotificationChannel(deviceId, gattServer);
      
      // ✅ Pass device ID for FF02 notification channel lookup
      const statusResponse = await this.writeWiFiConfigToGATT(gattServer, wifiConfig, deviceId);
      console.log('✅ WiFi configuration written via GATT successfully');
      return statusResponse;
    } catch (error) {
      console.error('❌ Failed to write WiFi configuration:', error);
      throw error; // ✅ Throw directly, no longer fallback to simulated success
    }
  }

  private waitForWiFiProvisioningResult(
    deviceId: string,
    timeoutMs: number,
  ): { promise: Promise<void>; cancel: () => void } {
    let cancel: () => void = () => {};
    const promise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.unregisterNotificationHandler(deviceId, 'status');
        if (error) reject(error);
        else resolve();
      };
      const timeout = setTimeout(
        () => finish(new Error(`BLUFI Wi-Fi connection report timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
      cancel = () => finish(new Error('BLUFI Wi-Fi connection wait cancelled'));
      this.registerNotificationHandler(deviceId, 'status', (raw) => {
        try {
          const frame = decodeBlufiFrame(raw);
          if (frame.type === 0x49) {
            const code = frame.data.length ? frame.data[0] : -1;
            finish(new Error(`BLUFI device reported error ${code}`));
          } else if (frame.type === 0x3d) {
            const state = getWiFiReportState(frame);
            if (state === 'success') finish();
            if (state === 'failure') finish(new Error('BLUFI device reported Wi-Fi connection failure'));
          }
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
    return { promise, cancel };
  }

  // Current provisioning path. Uplink sequence belongs to the device session,
  // not to a fixed workflow step; FC=0x02 deliberately does not request ACK.
  private async writeWiFiConfigToGATT(
    gattServer: BluetoothRemoteGATTServer,
    wifiConfig: WiFiConfigData,
    deviceId: string,
  ): Promise<any> {
    if (this.activeWiFiConfigurations.has(deviceId)) {
      throw new Error('WiFi configuration already in progress for this device');
    }
    this.activeWiFiConfigurations.add(deviceId);
    try {
      const credentials = validateBlufiCredentials(wifiConfig.ssid, wifiConfig.password);
      const service = await gattServer.getPrimaryService('0000ffff-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
      await this.ensureBlufiNotificationChannel(deviceId, gattServer);
      let result: { promise: Promise<void>; cancel: () => void } | undefined;
      try {
        await this.writeBlufiCommand(deviceId, characteristic, 0x04, new Uint8Array([0x01]));
        await this.writeBlufiCommand(deviceId, characteristic, 0x09, credentials.ssid);
        await this.writeBlufiCommand(deviceId, characteristic, 0x0d, credentials.password);
        result = this.waitForWiFiProvisioningResult(deviceId, 30000);
        await this.writeBlufiCommand(deviceId, characteristic, 0x0c);
        await result.promise;
      } catch (error) {
        if (result) {
          result.promise.catch(() => undefined);
          result.cancel();
        }
        this.unregisterNotificationHandler(deviceId, 'status');
        throw error;
      }
      return {
        success: true,
        message: 'WiFi connection established successfully',
        confirmedBy: 'BLUFI 0x3d report',
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.activeWiFiConfigurations.delete(deviceId);
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
      const deviceName = record.deviceName || parseDeviceNameFromAdvertisement(record.name);
      
      // Convert legacy DeviceRecord to ApiDeviceRecord format
      // Use the record's ID if it exists, otherwise generate a new one
      const deviceId = record.id || `device_${Date.now()}`;
      
      const apiRecord: ApiDeviceRecord = {
        id: deviceId,
        name: deviceName, // Use actual Tencent IoT device name from GATT
        deviceName: record.deviceName || deviceName, // Use deviceName for MCP calls
        deviceType: this.convertStringToDeviceType(record.type),
        owner: record.principalId, // Use principalId as owner
        status: this.convertStringToDeviceStatus(record.status),
        capabilities: this.getDefaultCapabilities(record.type),
        metadata: {
          macAddress: record.macAddress,
          wifiNetwork: record.wifiNetwork,
          connectedAt: record.connectedAt,
          userPrincipal: record.principalId, // Store full principal for reference
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeen: Date.now(),
        deleted: false, // New devices are not deleted
      };
      
      // Use deviceApiService to submit to backend canister
      let response = await deviceApiService.submitDeviceRecord(apiRecord);

      // Rolling-deployment compatibility: the old canister required a stored
      // ProductID. New records are DeviceName-only, but retry once against an
      // old canister so the frontend can be released before its upgrade.
      if (!response.success && response.error?.includes('Product ID is required for MCP calls')) {
        console.warn('Legacy canister requires ProductID; retrying with the fixed Tencent product');
        response = await deviceApiService.submitDeviceRecord({
          ...apiRecord,
          productId: LEGACY_TENCENT_PRODUCT_ID,
        });
      }
      
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
  async getDeviceList(ownerPrincipal?: string): Promise<DeviceRecord[]> {
    try {
      console.log('Getting device list from backend canister...', ownerPrincipal ? `for owner: ${ownerPrincipal}` : 'for all devices');
      
      // Use deviceApiService to get devices from backend canister
      const response = await deviceApiService.getDevices(0, 100, ownerPrincipal); // Get first 100 devices
      
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
      id: apiDevice.id,
      name: apiDevice.name,
      deviceName: apiDevice.deviceName, // Include deviceName for MCP calls
      productId: apiDevice.productId, // Include productId for MCP calls
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

  // Cancel only the logical scan waiter. The persistent FF02 subscription is
  // kept for the subsequent provisioning result report.
  stopWiFiScanListening(deviceId: string): void {
    this.blufiScanCancels.get(deviceId)?.();
    this.blufiScanCancels.delete(deviceId);
    this.activeBlufiScans.delete(deviceId);
    this.unregisterNotificationHandler(deviceId, 'wifiScan');
  }

  // Stop all WiFi scan listening
  stopAllWiFiScanListening(): void {
    console.log('🛑 Stopping all WiFi scan listening');
    
    Array.from(this.blufiScanCancels.keys()).forEach((deviceId) => {
      this.stopWiFiScanListening(deviceId);
    });
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
