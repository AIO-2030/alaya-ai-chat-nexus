// Device Service - Handle WiFi, Bluetooth and Device Management
export interface WiFiNetwork {
  id: number;
  name: string;
  security: string;
  strength: number;
  password?: string;
}

export interface BluetoothDevice {
  id: number;
  name: string;
  rssi: number;
  type: string;
  mac: string;
}

export interface DeviceRecord {
  name: string;
  type: string;
  macAddress: string;
  wifiNetwork: string;
  status: string;
  connectedAt: string;
}

export interface ConnectionProgress {
  progress: number;
  message: string;
}

class DeviceService {
  // Scan WiFi networks
  async scanWiFiNetworks(): Promise<WiFiNetwork[]> {
    try {
      // Simulate WiFi scanning API call
      console.log('Starting WiFi network scan...');
      
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const networks: WiFiNetwork[] = [
        { id: 1, name: "MyHome_WiFi", security: "WPA2", strength: -30 },
        { id: 2, name: "Guest_Network", security: "Open", strength: -50 },
        { id: 3, name: "Office_5G", security: "WPA3", strength: -65 },
        { id: 4, name: "Neighbor_WiFi", security: "WPA2", strength: -70 },
        { id: 5, name: "Public_WiFi", security: "Open", strength: -80 },
      ];
      
      console.log('WiFi scan completed, found', networks.length, 'networks');
      return networks;
    } catch (error) {
      console.error('WiFi scan failed:', error);
      throw new Error('WiFi scan failed');
    }
  }

  // Scan Bluetooth devices
  async scanBluetoothDevices(): Promise<BluetoothDevice[]> {
    try {
      // Simulate Bluetooth scanning API call
      console.log('Starting Bluetooth device scan...');
      
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const devices: BluetoothDevice[] = [
        { id: 1, name: "Smart Speaker Pro", rssi: -45, type: "speaker", mac: "AA:BB:CC:DD:EE:FF" },
        { id: 2, name: "IoT Camera", rssi: -55, type: "camera", mac: "11:22:33:44:55:66" },
        { id: 3, name: "Smart Light Bulb", rssi: -60, type: "light", mac: "AA:11:BB:22:CC:33" },
        { id: 4, name: "Temperature Sensor", rssi: -65, type: "sensor", mac: "DD:44:EE:55:FF:66" },
        { id: 5, name: "Smart Thermostat", rssi: -70, type: "thermostat", mac: "FF:77:AA:88:BB:99" },
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
      const response = await deviceApiService.submitDeviceRecord(record);
      
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
      
      return response.data?.devices || [];
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
          connectedAt: new Date().toISOString()
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
}

export const deviceService = new DeviceService(); 