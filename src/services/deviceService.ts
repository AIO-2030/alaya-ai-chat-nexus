// Device Service - Handle WiFi, Bluetooth and Device Management
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
  name: string;
  type: string;
  macAddress: string;
  wifiNetwork: string;
  status: string;
  connectedAt: string;
  principalId: string;
}

export interface ConnectionProgress {
  progress: number;
  message: string;
}

class DeviceService {


  // Scan Bluetooth devices
  async scanBluetoothDevices(): Promise<BluetoothDevice[]> {
    try {
      // Simulate Bluetooth scanning API call
      console.log('Starting Bluetooth device scan...');
      
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const devices: BluetoothDevice[] = [
        { id: "1", name: "Smart Speaker Pro", rssi: -45, type: "speaker", mac: "AA:BB:CC:DD:EE:FF" },
        { id: "2", name: "IoT Camera", rssi: -55, type: "camera", mac: "11:22:33:44:55:66" },
        { id: "3", name: "Smart Light Bulb", rssi: -60, type: "light", mac: "AA:11:BB:22:CC:33" },
        { id: "4", name: "Temperature Sensor", rssi: -65, type: "sensor", mac: "DD:44:EE:55:FF:66" },
        { id: "5", name: "Smart Thermostat", rssi: -70, type: "thermostat", mac: "FF:77:AA:88:BB:99" },
      ];
      
      console.log('Bluetooth scan completed, found', devices.length, 'devices');
      return devices;
    } catch (error) {
      console.error('Bluetooth scan failed:', error);
      throw new Error('Bluetooth scan failed');
    }
  }

  // Establish Bluetooth connection
  async connectBluetooth(device: BluetoothDevice): Promise<boolean> {
    try {
      console.log('Connecting to Bluetooth device:', device.name);
      
      // Simulate Bluetooth connection process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Bluetooth connection successful:', device.name);
      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw new Error('Bluetooth connection failed');
    }
  }

  // Configure WiFi via Bluetooth
  async configureWiFiViaBluetooth(
    device: BluetoothDevice, 
    wifiNetwork: WiFiNetwork, 
    password?: string
  ): Promise<boolean> {
    try {
      console.log('Configuring WiFi via Bluetooth:', {
        device: device.name,
        wifi: wifiNetwork.name
      });
      
      // Simulate configuration process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('WiFi configuration successful');
      return true;
    } catch (error) {
      console.error('WiFi configuration failed:', error);
      throw new Error('WiFi configuration failed');
    }
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
      
      // Import API service dynamically to avoid circular dependency
      const { deviceApiService } = await import('./api/deviceApi');
      
      // Convert legacy DeviceRecord to API format
      const apiRecord = {
        id: `device_${Date.now()}`, // Generate unique ID
        name: record.name,
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
      // Return mock data as fallback
      return [
        {
          name: "Smart Speaker Pro",
          type: "speaker",
          macAddress: "AA:BB:CC:DD:EE:FF",
          wifiNetwork: "MyHome_WiFi",
          status: "Connected",
          connectedAt: new Date().toISOString(),
          principalId: "mock-principal-id"
        }
      ];
    }
  }

  // Disconnect device
  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      console.log('Disconnecting device:', deviceId);
      
      // Simulate API call
      const response = await fetch(`/api/devices/${deviceId}/disconnect`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect device');
      }
      
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
      
      // Simulate API call
      const response = await fetch(`/api/devices/${deviceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update device status');
      }
      
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