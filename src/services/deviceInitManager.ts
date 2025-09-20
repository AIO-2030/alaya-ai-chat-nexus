// Device Initialization Manager - Handle complete device setup process
import { realDeviceService, WiFiNetwork, BluetoothDevice, DeviceRecord, ConnectionProgress } from './realDeviceService';
import { getPrincipalId } from '../lib/principal';

// Bluetooth API type declarations
declare global {
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
    productId?: string;
  }
  
  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    connected: boolean;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListener): void;
  }
}

export enum DeviceInitStep {
  INIT = 'init',
  BLUETOOTH_SCAN = 'bluetooth_scan',
  BLUETOOTH_SELECT = 'bluetooth_select',
  BLUETOOTH_CONNECT = 'bluetooth_connect',
  WIFI_SCAN = 'wifi_scan',
  WIFI_SELECT = 'wifi_select',
  WIFI_CONFIG = 'wifi_config',
  SUCCESS = 'success'
}

export interface DeviceInitState {
  step: DeviceInitStep;
  selectedWifi: WiFiNetwork | null;
  selectedBluetoothDevice: BluetoothDevice | null;
  wifiNetworks: WiFiNetwork[];
  bluetoothDevices: BluetoothDevice[];

  isScanningBluetooth: boolean;
  isConnectingBluetooth: boolean;
  isConfiguringWifi: boolean;
  isVerifyingDevice: boolean;
  connectionProgress: number;
  error: string | null;
}

// Device provisioning status interface
export interface DeviceProvisioningStatus {
  isProvisioned: boolean;
  isConnectedToWifi: boolean;
  wifiSSID: string;
  ipAddress: string;
  lastSeen: Date;
}

// Device network information interface
export interface DeviceNetworkInfo {
  ipAddress: string;
  macAddress: string;
  lastSeen: Date;
}

export class DeviceInitManager {
  private state: DeviceInitState;

  constructor() {
    this.state = {
      step: DeviceInitStep.INIT,
      selectedWifi: null,
      selectedBluetoothDevice: null,
      wifiNetworks: [],
      bluetoothDevices: [],

      isScanningBluetooth: false,
      isConnectingBluetooth: false,
      isConfiguringWifi: false,
      isVerifyingDevice: false,
      connectionProgress: 0,
      error: null
    };
  }

  // Get current state
  getState(): DeviceInitState {
    return { ...this.state };
  }

  // Start device initialization process - Step 1: Scan Bluetooth devices
  async startDeviceInit(): Promise<void> {
    try {
      this.state.step = DeviceInitStep.BLUETOOTH_SCAN;
      this.state.isScanningBluetooth = true;
      this.state.error = null;

      // Scan Bluetooth devices
      const devices = await realDeviceService.scanBluetoothDevices();
      this.state.bluetoothDevices = devices;
      this.state.isScanningBluetooth = false;
      this.state.step = DeviceInitStep.BLUETOOTH_SELECT;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Bluetooth scan failed';
      this.state.isScanningBluetooth = false;
      throw error;
    }
  }

  // Step 2: Select Bluetooth device and connect
  async selectBluetoothDevice(device: BluetoothDevice): Promise<void> {
    try {
      this.state.selectedBluetoothDevice = device;
      this.state.step = DeviceInitStep.BLUETOOTH_CONNECT;
      this.state.isConnectingBluetooth = true;
      this.state.error = null;

      // Connect to Bluetooth device
      await realDeviceService.connectBluetooth(device);
      this.state.isConnectingBluetooth = false;
      
      // Get accurate device information via GATT
      await this.getDeviceInfoViaGATT();
      
      // Move to WiFi scanning step
      this.state.step = DeviceInitStep.WIFI_SCAN;
      await this.requestWiFiNetworksFromDevice();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Bluetooth connection failed';
      this.state.isConnectingBluetooth = false;
      throw error;
    }
  }

  // Get Tencent IoT triple information via GATT
  private async getDeviceInfoViaGATT(): Promise<void> {
    try {
      console.log('Getting Tencent IoT triple information via GATT...');
      
      if (!this.state.selectedBluetoothDevice) {
        throw new Error('No Bluetooth device connected');
      }

      // Use realDeviceService's GATT connection wrapper
      const gattServer = await realDeviceService.getGATTConnection(this.state.selectedBluetoothDevice);
      
      // Read device information service
      const deviceInfoService = await gattServer.getPrimaryService('device_info_service_uuid');
      
      // Read Tencent IoT product information: ProductId + DeviceName
      const productIdChar = await deviceInfoService.getCharacteristic('product_id_uuid');
      const productIdData = await productIdChar.readValue();
      const productId = new TextDecoder().decode(productIdData);
      
      const deviceNameChar = await deviceInfoService.getCharacteristic('device_name_uuid');
      const deviceNameData = await deviceNameChar.readValue();
      const deviceName = new TextDecoder().decode(deviceNameData);
      
      // Update device information with Tencent IoT product info
      this.state.selectedBluetoothDevice.name = deviceName;
      (this.state.selectedBluetoothDevice as any).productId = productId;
      
      console.log('Tencent IoT product info retrieved:', {
        productId: productId,
        deviceName: deviceName
      });
      
    } catch (error) {
      console.error('Failed to get Tencent IoT triple via GATT:', error);
      // Don't throw error, continue with basic device info
      console.log('Continuing with basic device information from scan');
    }
  }

  // Step 3: Request WiFi networks from device via Bluetooth
  private async requestWiFiNetworksFromDevice(): Promise<void> {
    try {

      this.state.error = null;

      if (!this.state.selectedBluetoothDevice) {
        throw new Error('No Bluetooth device selected');
      }

      // Request WiFi scan from device via Bluetooth
      const networks = await realDeviceService.requestWiFiScanFromDevice(this.state.selectedBluetoothDevice);
      this.state.wifiNetworks = networks;

      this.state.step = DeviceInitStep.WIFI_SELECT;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'WiFi scan request failed';

      throw error;
    }
  }

  // Step 4: Select WiFi and configure device
  async selectWiFi(wifiNetwork: WiFiNetwork): Promise<void> {
    try {
      this.state.selectedWifi = wifiNetwork;
      this.state.step = DeviceInitStep.WIFI_CONFIG;
      this.state.isConfiguringWifi = true;
      this.state.error = null;
      this.state.connectionProgress = 20; // Start progress

      if (!this.state.selectedBluetoothDevice) {
        throw new Error('No Bluetooth device connected');
      }

      // Configure WiFi on device via Bluetooth
      await realDeviceService.configureWiFiViaBluetooth(
        this.state.selectedBluetoothDevice,
        wifiNetwork
      );

      this.state.isConfiguringWifi = false;
      this.state.connectionProgress = 40; // WiFi configured
      
      // Verify device status after WiFi configuration
      await this.verifyDeviceStatus();
      
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'WiFi configuration failed';
      this.state.isConfiguringWifi = false;
      throw error;
    }
  }


  // Step 5: Verify device status
  private async verifyDeviceStatus(): Promise<void> {
    try {
      this.state.isVerifyingDevice = true;
      this.state.error = null;
      this.state.connectionProgress = 90; // Verifying device

      if (!this.state.selectedBluetoothDevice) {
        throw new Error('No device available');
      }

      // Poll device status
      const isDeviceReady = await this.pollDeviceStatus();
      
      if (!isDeviceReady) {
        throw new Error('Device verification failed');
      }

      this.state.isVerifyingDevice = false;
      this.state.connectionProgress = 100; // Complete
      this.state.step = DeviceInitStep.SUCCESS;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Device verification failed';
      this.state.isVerifyingDevice = false;
      throw error;
    }
  }

  // Poll device status
  private async pollDeviceStatus(): Promise<boolean> {
    try {
      console.log('Starting device status polling...');
      
      const maxAttempts = 30; // Maximum 30 polling attempts
      const pollInterval = 2000; // Poll every 2 seconds
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Read device status via Bluetooth
          const status = await this.readDeviceStatus();
          
          if (status.isProvisioned && status.isConnectedToWifi) {
            console.log('Device is ready!');
            return true;
          }
          
          console.log(`Device status check ${attempt + 1}/${maxAttempts}:`, status);
          
          // Wait for next polling cycle
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
        } catch (pollError) {
          console.log(`Polling attempt ${attempt + 1} failed:`, pollError);
          // Continue with next polling attempt
        }
      }
      
      console.log('Device status polling timeout');
      return false;
      
    } catch (error) {
      console.error('Failed to poll device status:', error);
      return false;
    }
  }

  // Read device status via Bluetooth
  private async readDeviceStatus(): Promise<DeviceProvisioningStatus> {
    try {
      // Use realDeviceService's GATT connection wrapper
      const gattServer = await realDeviceService.getGATTConnection(this.state.selectedBluetoothDevice!);
      const statusService = await gattServer.getPrimaryService('device_status_service_uuid');
      const statusCharacteristic = await statusService.getCharacteristic('provisioning_status_uuid');
      
      // Read status data
      const statusData = await statusCharacteristic.readValue();
      const status = this.parseDeviceStatus(statusData);
      
      return status;
    } catch (error) {
      console.error('Failed to read device status:', error);
      // Return default status
      return {
        isProvisioned: false,
        isConnectedToWifi: false,
        wifiSSID: '',
        ipAddress: '',
        lastSeen: new Date()
      };
    }
  }

  // Parse device status data from Bluetooth characteristic
  private parseDeviceStatus(dataView: DataView): DeviceProvisioningStatus {
    const offset = 0;
    
    // Assume data format: [provisioned_flag][wifi_connected_flag][ssid_length][ssid][ip_length][ip][timestamp]
    const isProvisioned = dataView.getUint8(offset) === 1;
    const isConnectedToWifi = dataView.getUint8(offset + 1) === 1;
    
    let currentOffset = offset + 2;
    
    // Read WiFi SSID
    const ssidLength = dataView.getUint8(currentOffset++);
    const ssidBytes = new Uint8Array(dataView.buffer, currentOffset, ssidLength);
    const wifiSSID = new TextDecoder().decode(ssidBytes);
    currentOffset += ssidLength;
    
    // Read IP address
    const ipLength = dataView.getUint8(currentOffset++);
    const ipBytes = new Uint8Array(dataView.buffer, currentOffset, ipLength);
    const ipAddress = new TextDecoder().decode(ipBytes);
    currentOffset += ipLength;
    
    // Read timestamp
    const timestamp = dataView.getUint32(currentOffset, true);
    
    return {
      isProvisioned,
      isConnectedToWifi,
      wifiSSID,
      ipAddress,
      lastSeen: new Date(timestamp * 1000)
    };
  }


  // Step 5: Submit device record to backend canister
  async submitDeviceRecord(): Promise<boolean> {
    try {
      if (!this.state.selectedBluetoothDevice || !this.state.selectedWifi) {
        throw new Error('No device or WiFi selected');
      }

      // Get current user's principal ID
      const principalId = getPrincipalId();
      if (!principalId) {
        throw new Error('User principal ID not found. Please ensure you are authenticated.');
      }

      const record: DeviceRecord = {
        id: `device_${Date.now()}`, // Generate unique ID
        name: this.state.selectedBluetoothDevice.name, // Use GATT-retrieved device name
        type: this.state.selectedBluetoothDevice.type,
        macAddress: this.state.selectedBluetoothDevice.mac,
        wifiNetwork: this.state.selectedWifi.name,
        status: 'Connected',
        connectedAt: new Date().toISOString(),
        principalId: principalId,
        // Add Tencent IoT product info from GATT
        productId: (this.state.selectedBluetoothDevice as any).productId
      };

      // Submit to backend canister
      const success = await realDeviceService.submitDeviceRecordToCanister(record);
      
      if (success) {
        // Reset state after successful submission
        this.resetState();
      }

      return success;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to submit device record';
      throw error;
    }
  }

  // Reset initialization state
  resetState(): void {
    this.state = {
      step: DeviceInitStep.INIT,
      selectedWifi: null,
      selectedBluetoothDevice: null,
      wifiNetworks: [],
      bluetoothDevices: [],

      isScanningBluetooth: false,
      isConnectingBluetooth: false,
      isConfiguringWifi: false,
      isVerifyingDevice: false,
      connectionProgress: 0,
      error: null
    };
  }

  // Get current step description
  getStepDescription(): string {
    switch (this.state.step) {
      case DeviceInitStep.INIT:
        return 'Device Initialization';
      case DeviceInitStep.BLUETOOTH_SCAN:
        return 'Scanning Bluetooth Devices';
      case DeviceInitStep.BLUETOOTH_SELECT:
        return 'Select Bluetooth Device';
      case DeviceInitStep.BLUETOOTH_CONNECT:
        return 'Connecting to Bluetooth Device';
      case DeviceInitStep.WIFI_SCAN:
        return 'Requesting WiFi Networks from Device';
      case DeviceInitStep.WIFI_SELECT:
        return 'Select WiFi Network';
      case DeviceInitStep.WIFI_CONFIG:
        return 'Configuring WiFi on Device';
      case DeviceInitStep.SUCCESS:
        return 'Device Setup Successful';
      default:
        return 'Unknown Step';
    }
  }

  // Check if current step is complete
  isStepComplete(): boolean {
    switch (this.state.step) {
      case DeviceInitStep.BLUETOOTH_SCAN:
        return !this.state.isScanningBluetooth && this.state.bluetoothDevices.length > 0;
      case DeviceInitStep.BLUETOOTH_CONNECT:
        return !this.state.isConnectingBluetooth;
      case DeviceInitStep.WIFI_SCAN:
        return this.state.wifiNetworks.length > 0;
      case DeviceInitStep.WIFI_CONFIG:
        return !this.state.isConfiguringWifi;
      default:
        return true;
    }
  }

  // Get error message
  getError(): string | null {
    return this.state.error;
  }

  // Clear error
  clearError(): void {
    this.state.error = null;
  }
}

export const deviceInitManager = new DeviceInitManager(); 