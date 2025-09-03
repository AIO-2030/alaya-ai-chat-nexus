// Real Device Service - Implement actual WiFi and Bluetooth functionality
import { deviceApiService, DeviceRecord as ApiDeviceRecord } from './api/deviceApi';
import type { DeviceType, DeviceStatus } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

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

class RealDeviceService {
  private wifiNetworks: WiFiNetwork[] = [];
  private bluetoothDevices: BluetoothDevice[] = [];

  private isScanningBluetooth = false;

  // Check if Web Bluetooth API is available
  private isWebBluetoothSupported(): boolean {
    const supported = 'bluetooth' in navigator;
    console.log('[BLE] Web Bluetooth supported:', supported);
    return supported;
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

  // Submit device record to backend canister using deviceApiService
  async submitDeviceRecordToCanister(record: DeviceRecord): Promise<boolean> {
    try {
      console.log('Submitting device record to backend canister:', record);
      
      // Convert legacy DeviceRecord to ApiDeviceRecord format
      const apiRecord: ApiDeviceRecord = {
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

  // Convert string device status to DeviceStatus enum
  private convertStringToDeviceStatus(status: string): DeviceStatus {
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

  // Convert DeviceStatus enum to string
  private convertDeviceStatusToString(status: DeviceStatus): string {
    if ('Online' in status) return 'Connected';
    if ('Offline' in status) return 'Disconnected';
    if ('Maintenance' in status) return 'Maintenance';
    if ('Disabled' in status) return 'Disabled';
    return 'Unknown';
  }
}

export const realDeviceService = new RealDeviceService(); 