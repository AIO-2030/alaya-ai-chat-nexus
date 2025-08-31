// Real Device Service - Implement actual WiFi and Bluetooth functionality
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
}

export interface ConnectionProgress {
  progress: number;
  message: string;
}

class RealDeviceService {
  private wifiNetworks: WiFiNetwork[] = [];
  private bluetoothDevices: BluetoothDevice[] = [];
  private isScanningWifi = false;
  private isScanningBluetooth = false;

  // Check if Web Bluetooth API is available
  private isWebBluetoothSupported(): boolean {
    const supported = 'bluetooth' in navigator;
    console.log('[BLE] Web Bluetooth supported:', supported);
    return supported;
  }

  // Check if Web WiFi API is available (experimental)
  private isWebWiFiSupported(): boolean {
    const supported = 'wifi' in navigator || 'networkInformation' in navigator;
    console.log('[WiFi] Web WiFi/NetworkInformation supported:', supported);
    return supported;
  }

  // Try to get WiFi networks using native APIs
  private async getNativeWiFiNetworks(): Promise<WiFiNetwork[]> {
    const networks: WiFiNetwork[] = [];
    
    try {
      // Method 1: Try using Network Information API
      if ('networkInformation' in navigator) {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection && connection.effectiveType) {
          console.log('Current network info:', connection);
          // This gives us current network info, not available networks
        }
      }

      // Method 2: Try using Web WiFi API (Chrome OS only)
      if ('wifi' in navigator) {
        try {
          const wifiManager = (navigator as any).wifi;
          if (wifiManager && wifiManager.getCurrentNetwork) {
            const currentNetwork = await wifiManager.getCurrentNetwork();
            if (currentNetwork) {
              networks.push({
                id: 'current',
                name: currentNetwork.ssid,
                security: currentNetwork.security || 'Unknown',
                strength: currentNetwork.signalStrength || -50,
                frequency: currentNetwork.frequency
              });
            }
          }
        } catch (error) {
          console.log('Web WiFi API not available or failed:', error);
        }
      }

      // Method 3: Try using Network Information API to get available networks
      if ('networkInformation' in navigator) {
        try {
          // Some browsers might support getting available networks
          const connection = (navigator as any).connection;
          if (connection && connection.getNetworkList) {
            const networkList = await connection.getNetworkList();
            console.log('Available networks:', networkList);
          }
        } catch (error) {
          console.log('Network list not available:', error);
        }
      }

      // Method 4: Try using experimental WiFi scanning API
      if ('wifi' in navigator) {
        try {
          const wifiManager = (navigator as any).wifi;
          if (wifiManager && wifiManager.getNetworks) {
            const availableNetworks = await wifiManager.getNetworks();
            console.log('Available WiFi networks:', availableNetworks);
            
            availableNetworks.forEach((network: any) => {
              networks.push({
                id: network.ssid,
                name: network.ssid,
                security: network.security || 'Unknown',
                strength: network.signalStrength || -60,
                frequency: network.frequency,
                channel: network.channel
              });
            });
          }
        } catch (error) {
          console.log('WiFi scanning API not available:', error);
        }
      }

      // Method 5: Try using experimental Network Information API
      if ('networkInformation' in navigator) {
        try {
          const connection = (navigator as any).connection;
          if (connection && connection.getNetworkList) {
            const networks = await connection.getNetworkList();
            console.log('Network list:', networks);
          }
        } catch (error) {
          console.log('Network list API not available:', error);
        }
      }

    } catch (error) {
      console.log('Native WiFi scanning failed:', error);
    }

    return networks;
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
        optionalServices: ['generic_access']
      });

      return !!device;
    } catch (error) {
      console.error('Bluetooth permission denied:', error);
      return false;
    }
  }

  // Scan WiFi networks using available APIs
  async scanWiFiNetworks(): Promise<WiFiNetwork[]> {
    try {
      console.log('Starting real WiFi network scan...');
      this.isScanningWifi = true;
      console.log('[WiFi] isScanningWifi set -> true');

      // Try to get real WiFi networks first
      let networks = await this.getNativeWiFiNetworks();
      
      console.log('Real WiFi networks found:', networks.length);

      // If no real networks found, try additional methods
      if (networks.length === 0) {
        console.log('No real WiFi networks found, trying additional methods...');
        
        // Method 1: Try using experimental WiFi scanning API
        if ('wifi' in navigator) {
          try {
            const wifiManager = (navigator as any).wifi;
            if (wifiManager && wifiManager.getNetworks) {
              const availableNetworks = await wifiManager.getNetworks();
              console.log('Available WiFi networks from API:', availableNetworks);
              
              availableNetworks.forEach((network: any) => {
                networks.push({
                  id: network.ssid,
                  name: network.ssid,
                  security: network.security || 'Unknown',
                  strength: network.signalStrength || -60,
                  frequency: network.frequency,
                  channel: network.channel
                });
              });
            }
          } catch (error) {
            console.log('WiFi scanning API failed:', error);
          }
        }

        // Method 2: Try using Network Information API
        if ('networkInformation' in navigator) {
          try {
            const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            if (connection && connection.effectiveType) {
              console.log('Current network info:', connection);
              // Add current network if available
              if (connection.ssid) {
                networks.push({
                  id: 'current',
                  name: connection.ssid,
                  security: connection.security || 'Unknown',
                  strength: connection.signalStrength || -50,
                  frequency: connection.frequency
                });
              }
            }
          } catch (error) {
            console.log('Network Information API failed:', error);
          }
        }

        // Method 3: Try using experimental Network Information API
        if ('networkInformation' in navigator) {
          try {
            const connection = (navigator as any).connection;
            if (connection && connection.getNetworkList) {
              const networkList = await connection.getNetworkList();
              console.log('Network list from API:', networkList);
              
              if (Array.isArray(networkList)) {
                networkList.forEach((network: any) => {
                  networks.push({
                    id: network.ssid || network.id,
                    name: network.ssid || network.name,
                    security: network.security || 'Unknown',
                    strength: network.signalStrength || -60,
                    frequency: network.frequency,
                    channel: network.channel
                  });
                });
              }
            }
          } catch (error) {
            console.log('Network list API failed:', error);
          }
        }
      }

      // Return whatever networks we found (could be empty array)
      this.wifiNetworks = networks;
      this.isScanningWifi = false;
      console.log('[WiFi] isScanningWifi set -> false');
      console.log('WiFi scan completed, found', networks.length, 'networks');
      return networks;
    } catch (error) {
      this.isScanningWifi = false;
      console.log('[WiFi] isScanningWifi set -> false');
      console.error('WiFi scan failed:', error);
      throw new Error('WiFi scan failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        console.log('Bluetooth scan completed, found', devices.length, 'devices');
        return devices;
      }

      // Try to use real Web Bluetooth API
      try {
        console.log('Attempting real Bluetooth scan...');
        
        // Request Bluetooth permission and scan for devices
        const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['generic_access']
        });

        console.log('Bluetooth device selected:', bluetoothDevice.name);
        
        // Add device to list even if GATT connection fails
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
        
        // Try to connect to GATT server to get additional device information
        try {
          console.log('Attempting to connect to GATT server...');
          
          // 添加超时处理，避免无限等待
          const gattPromise = bluetoothDevice.gatt?.connect();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('GATT connection timeout')), 10000)
          );
          
          const server = await Promise.race([gattPromise, timeoutPromise]);
          
          if (server) {
            console.log('Connected to GATT server');
            
            // Try to get device information service
            try {
              const deviceInfoService = await server.getPrimaryService('device_information');
              if (deviceInfoService) {
                console.log('Device information service found');
                // Update device type if we can get manufacturer info
                const manufacturerCharacteristic = await deviceInfoService.getCharacteristic('manufacturer_name_string');
                if (manufacturerCharacteristic) {
                  const manufacturer = await manufacturerCharacteristic.readValue();
                  console.log('Manufacturer info retrieved');
                }
              }
            } catch (serviceError) {
              console.log('Device information service not available:', serviceError);
            }
          } else {
            console.log('Failed to connect to GATT server, but device is still available');
          }
        } catch (gattError) {
          console.log('GATT connection failed, but device is still available:', gattError);
        }
        
      } catch (bluetoothError) {
        console.log('Web Bluetooth scan failed:', bluetoothError);
        // Return empty array instead of mock data
      }

      this.bluetoothDevices = devices;
      this.isScanningBluetooth = false;
      console.log('[BLE] isScanningBluetooth set -> false');
      console.log('Bluetooth scan completed, found', devices.length, 'devices');
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
        console.log('Bluetooth scan completed, found', devices.length, 'devices');
        return devices;
      }

      // Try to use real Web Bluetooth API with minimal services
      try {
        console.log('Attempting simple Bluetooth scan...');
        
        // Request Bluetooth permission with minimal services
        const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [] // 不请求任何服务，只获取设备信息
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
      console.log('Bluetooth scan completed, found', devices.length, 'devices');
      return devices;
    } catch (error) {
      this.isScanningBluetooth = false;
      console.log('[BLE] isScanningBluetooth set -> false');
      console.error('Bluetooth scan failed:', error);
      throw new Error('Bluetooth scan failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Establish Bluetooth connection
  async connectBluetooth(device: BluetoothDevice): Promise<boolean> {
    try {
      console.log('Connecting to Bluetooth device:', device.name);
      
      // In a real implementation, you would use the Web Bluetooth API here
      if (this.isWebBluetoothSupported()) {
        try {
          // Request device with specific services
          const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
            filters: [
              {
                services: ['generic_access']
              },
              {
                name: device.name
              }
            ],
            optionalServices: ['generic_access', 'device_information']
          });

          // Connect to GATT server
          const server = await bluetoothDevice.gatt?.connect();
          
          if (server) {
            console.log('Bluetooth connection successful:', device.name);
            return true;
          } else {
            throw new Error('Failed to connect to GATT server');
          }
        } catch (bluetoothError) {
          console.log('Web Bluetooth connection failed:', bluetoothError);
          throw new Error('Bluetooth connection failed: ' + (bluetoothError instanceof Error ? bluetoothError.message : 'Unknown error'));
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

  // Configure WiFi via Bluetooth
  async configureWiFiViaBluetooth(
    device: BluetoothDevice, 
    wifiNetwork: WiFiNetwork, 
    password?: string
  ): Promise<boolean> {
    try {
      console.log('Configuring WiFi via Bluetooth:', {
        device: device.name,
        wifi: wifiNetwork.name,
        hasPassword: !!password
      });
      
      // In a real implementation, you would:
      // 1. Write WiFi credentials to the device via Bluetooth
      // 2. Send configuration commands
      // 3. Verify the device connects to WiFi
      
      // For now, return false since we don't have real device communication
      console.log('No real device communication implemented');
      throw new Error('WiFi configuration via Bluetooth not yet implemented');
    } catch (error) {
      console.error('WiFi configuration failed:', error);
      throw new Error('WiFi configuration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
      
      // In a real implementation, you would:
      // 1. Send WiFi scan command to device via Bluetooth
      // 2. Wait for device to scan nearby WiFi networks
      // 3. Receive WiFi network list from device
      
      // For now, return empty array since we don't have real device communication
      console.log('No real device communication implemented, returning empty array');
      return [];
    } catch (error) {
      console.error('Failed to request WiFi networks from device:', error);
      throw new Error('WiFi scan request failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Submit device record to backend canister (mock implementation)
  async submitDeviceRecordToCanister(record: DeviceRecord): Promise<boolean> {
    try {
      console.log('Submitting device record to backend canister:', record);
      
      // TODO: Implement actual canister integration
      // In a real implementation, this would:
      // 1. Call IC canister method to store device record
      // 2. Handle authentication and authorization
      // 3. Return actual response from canister
      
      // Mock canister call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate canister response
      const canisterResponse = {
        success: true,
        deviceId: `device_${Date.now()}`,
        message: "Device record stored successfully in canister"
      };
      
      console.log('Device record submitted to canister successfully:', canisterResponse);
      return true;
    } catch (error) {
      console.error('Failed to submit device record to canister:', error);
      throw new Error('Canister submission failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Legacy method - kept for backward compatibility
  async submitDeviceRecord(record: DeviceRecord): Promise<boolean> {
    return this.submitDeviceRecordToCanister(record);
  }

  // Get device list
  async getDeviceList(): Promise<DeviceRecord[]> {
    try {
      // In a real app, this would be an actual API call
      const response = await fetch('/api/devices');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.devices || [];
    } catch (error) {
      console.error('Failed to get device list:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  // Get current scanning status
  getScanningStatus() {
    return {
      isScanningWifi: this.isScanningWifi,
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
}

export const realDeviceService = new RealDeviceService(); 