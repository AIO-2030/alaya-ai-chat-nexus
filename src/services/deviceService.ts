// Device Service - Handle WiFi, Bluetooth and Device Management

// Product ID constant - hardcoded
const PRODUCT_ID = "H3PI4FBTV5";

// Device name prefix constant
const DEVICE_NAME_PREFIX = "PixelMug";

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
  // Add parsed device name
  deviceName?: string;
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
  // Add device name and product ID
  deviceName?: string;
  productId?: string;
}

export interface ConnectionProgress {
  progress: number;
  message: string;
}

class DeviceService {

  // Parse Bluetooth device name to extract device_name
  private parseDeviceName(bluetoothName: string): string | null {
    try {
      // Find the last underscore position
      const lastUnderscoreIndex = bluetoothName.lastIndexOf('_');
      
      if (lastUnderscoreIndex !== -1 && lastUnderscoreIndex < bluetoothName.length - 1) {
        // Extract the part after the underscore as device_name
        const deviceName = bluetoothName.substring(lastUnderscoreIndex + 1);
        console.log(`[DeviceService] Parsed device name: ${deviceName} from bluetooth name: ${bluetoothName}`);
        return deviceName;
      }
      
      // If no underscore found, use the original name
      console.log(`[DeviceService] No underscore found, using original name: ${bluetoothName}`);
      return bluetoothName;
    } catch (error) {
      console.error('[DeviceService] Error parsing device name:', error);
      return null;
    }
  }

  // Get product ID
  getProductId(): string {
    return PRODUCT_ID;
  }


  // Scan Bluetooth devices
  async scanBluetoothDevices(): Promise<BluetoothDevice[]> {
    try {
      console.log('Starting Bluetooth device scan...');
      
      // TODO: Implement real Bluetooth scanning API call
      // This should call the actual Bluetooth scanning interface
      const devices: BluetoothDevice[] = [];
      
      // Parse device names
      devices.forEach(device => {
        device.deviceName = this.parseDeviceName(device.name) || undefined;
      });
      
      console.log('[DeviceService] Bluetooth scan completed, found', devices.length, 'devices');
      return devices;
    } catch (error) {
      console.error('Bluetooth scan failed:', error);
      throw new Error('Bluetooth scan failed');
    }
  }


  // Configure WiFi via Bluetooth
  async configureWiFiViaBluetooth(
    device: BluetoothDevice, 
    wifiNetwork: WiFiNetwork, 
    password?: string
  ): Promise<boolean> {
    try {
      const deviceName = this.parseDeviceName(device.name);
      if (!deviceName) {
        throw new Error('Invalid device name format');
      }

      // Ensure device has deviceName set
      device.deviceName = deviceName;

      console.log('Configuring WiFi via Bluetooth:', {
        device: device.name,
        deviceName: deviceName,
        productId: PRODUCT_ID,
        wifi: wifiNetwork.name
      });
      
      // TODO: Implement real WiFi configuration API call
      // This should call the actual WiFi configuration interface
      
      console.log('WiFi configuration successful');
      return true;
    } catch (error) {
      console.error('WiFi configuration failed:', error);
      throw new Error('WiFi configuration failed');
    }
  }

  // Helper method to create a DeviceRecord from BluetoothDevice
  createDeviceRecordFromBluetooth(
    bluetoothDevice: BluetoothDevice,
    wifiNetwork: string,
    principalId: string
  ): DeviceRecord {
    const deviceName = bluetoothDevice.deviceName || this.parseDeviceName(bluetoothDevice.name);
    
    if (!deviceName) {
      throw new Error('Cannot create device record: device name is required');
    }

    return {
      name: bluetoothDevice.name,
      type: bluetoothDevice.type || 'IoT',
      macAddress: bluetoothDevice.mac,
      wifiNetwork: wifiNetwork,
      status: 'Connected',
      connectedAt: new Date().toISOString(),
      principalId: principalId,
      deviceName: deviceName,
      productId: PRODUCT_ID
    };
  }

  // Get connection progress
  async getConnectionProgress(): Promise<ConnectionProgress[]> {
    return [
      { progress: 20, message: "Establishing Bluetooth connection..." },
      { progress: 40, message: "Transmitting WiFi configuration..." },
      { progress: 60, message: "Device connecting to WiFi..." },
      { progress: 80, message: "Verifying connection status..." },
      { progress: 100, message: "Connection successful!" }
    ];
  }

  // Submit device record to backend
  async submitDeviceRecord(record: DeviceRecord): Promise<boolean> {
    try {
      console.log('Submitting device record to backend:', record);
      console.log('Device name:', record.deviceName);
      console.log('Product ID:', record.productId);
      
      // Validate deviceName before submission
      if (!record.deviceName) {
        console.error('Device name is missing in the record:', record);
        throw new Error('Device name is required but not provided in the record');
      }
      
      // Import API service dynamically to avoid circular dependency
      const { deviceApiService } = await import('./api/deviceApi');
      
      // Convert legacy DeviceRecord to API format
      const apiRecord = {
        id: `device_${Date.now()}`, // Generate unique ID
        name: record.name,
        deviceName: record.deviceName, // Add deviceName field (required)
        productId: record.productId || PRODUCT_ID, // Add productId field
        deviceType: this.convertStringToDeviceType(record.type),
        owner: record.principalId, // Use principalId as owner
        status: this.convertStringToDeviceStatus(record.status),
        capabilities: this.getDefaultCapabilities(record.type),
        metadata: {
          macAddress: record.macAddress,
          wifiNetwork: record.wifiNetwork,
          connectedAt: record.connectedAt,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeen: Date.now(),
        deleted: false, // New devices are not deleted
      };
      
      const response = await deviceApiService.submitDeviceRecord(apiRecord);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to submit device record');
      }
      
      console.log('Device record submitted successfully');
      return true;
    } catch (error) {
      console.error('Failed to submit device record:', error);
      throw new Error('Failed to submit device record');
    }
  }

  // Get device list
  async getDeviceList(): Promise<DeviceRecord[]> {
    try {
      // Import API service dynamically to avoid circular dependency
      const { deviceApiService } = await import('./api/deviceApi');
      const response = await deviceApiService.getDevices();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get device list');
      }
      
      // Convert API devices to legacy DeviceRecord[] format
      const legacyDevices: DeviceRecord[] = (response.data?.devices || []).map(apiDevice => 
        this.convertApiDeviceToLegacyDevice(apiDevice)
      );
      
      return legacyDevices;
    } catch (error) {
      console.error('Failed to get device list:', error);
      throw new Error('Failed to get device list');
    }
  }

  // Disconnect device
  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      console.log('Disconnecting device:', deviceId);
      
      // TODO: Implement real device disconnection API call
      // This should call the actual disconnection interface
      
      console.log('Device disconnected successfully');
      return true;
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      throw new Error('Failed to disconnect device');
    }
  }

  // Update device status
  async updateDeviceStatus(deviceId: string, status: string): Promise<boolean> {
    try {
      console.log('Updating device status:', deviceId, status);
      
      // TODO: Implement real device status update API call
      // This should call the actual status update interface
      
      console.log('Device status updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update device status:', error);
      throw new Error('Failed to update device status');
    }
  }

  // Helper methods for type conversion

  // Convert string device type to DeviceType enum
  private convertStringToDeviceType(type: string): any {
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

  // Convert string device status to DeviceStatus enum
  private convertStringToDeviceStatus(status: string): any {
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
  private convertApiDeviceToLegacyDevice(apiDevice: any): DeviceRecord {
    return {
      name: apiDevice.name,
      type: this.convertDeviceTypeToString(apiDevice.deviceType),
      macAddress: apiDevice.metadata.macAddress || 'Unknown',
      wifiNetwork: apiDevice.metadata.wifiNetwork || 'Unknown',
      status: this.convertDeviceStatusToString(apiDevice.status),
      connectedAt: apiDevice.metadata.connectedAt || new Date(apiDevice.createdAt).toISOString(),
      principalId: apiDevice.owner,
      deviceName: apiDevice.deviceName || '',
      productId: apiDevice.productId || PRODUCT_ID,
    };
  }

  // Convert DeviceType enum to string
  private convertDeviceTypeToString(deviceType: any): string {
    if ('Mobile' in deviceType) return 'Mobile';
    if ('Desktop' in deviceType) return 'Desktop';
    if ('Server' in deviceType) return 'Server';
    if ('IoT' in deviceType) return 'IoT';
    if ('Embedded' in deviceType) return 'Embedded';
    if ('Other' in deviceType) return deviceType.Other;
    return 'Unknown';
  }

  // Convert DeviceStatus enum to string
  private convertDeviceStatusToString(status: any): string {
    if ('Online' in status) return 'Connected';
    if ('Offline' in status) return 'Disconnected';
    if ('Maintenance' in status) return 'Maintenance';
    if ('Disabled' in status) return 'Disabled';
    return 'Unknown';
  }
}

export const deviceService = new DeviceService(); 