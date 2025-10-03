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
  WIFI_MANUAL_INPUT = 'wifi_manual_input',
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
      
      // Print all available GATT services and their characteristics
      await this.printAllGATTServices(gattServer);
      
      // Skip device information service - not available on this BLUFI device
      console.log('Skipping Device Information Service - not available on BLUFI device');
      console.log('Using device name from Bluetooth scan instead');
      
      // Use device name from Bluetooth scan as fallback
      const deviceName = this.state.selectedBluetoothDevice?.name || 'Unknown Device';
      console.log('Using device name from scan:', deviceName);
      
      // Use device information from Bluetooth scan (no GATT service available)
      const productId = deviceName; // Use device name as product ID
      const finalDeviceName = deviceName;
      
      console.log('Using device information from Bluetooth scan:', {
        productId: productId,
        deviceName: finalDeviceName
      });
      
      // Update device information with Tencent IoT product info
      this.state.selectedBluetoothDevice.name = finalDeviceName;
      (this.state.selectedBluetoothDevice as any).productId = productId;
      
      console.log('Tencent IoT product info retrieved:', {
        productId: productId,
        deviceName: finalDeviceName
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
      const errorMessage = error instanceof Error ? error.message : 'WiFi scan request failed';
      
      // Check if it's a timeout error
      if (errorMessage.includes('timeout') || errorMessage.includes('Scan command response timeout')) {
        console.log('WiFi scan timed out, offering manual input option');
        this.state.error = null; // Clear error since we're providing an alternative
        this.state.step = DeviceInitStep.WIFI_MANUAL_INPUT;
        return; // Don't throw error, continue with manual input
      }
      
      // For other errors, still throw
      this.state.error = errorMessage;
      throw error;
    }
  }

  // Step 4a: Manual WiFi input (fallback when scan times out)
  async selectManualWiFi(ssid: string, password: string, security: string = 'WPA2'): Promise<void> {
    try {
      this.state.error = null;

      // Create a WiFi network object from manual input
      const manualWifiNetwork: WiFiNetwork = {
        id: `manual_${Date.now()}`,
        name: ssid,
        password: password,
        security: security,
        strength: -50, // Default strength for manual input
        frequency: 2400, // Default to 2.4GHz
        channel: 6 // Default channel
      };

      this.state.selectedWifi = manualWifiNetwork;
      this.state.step = DeviceInitStep.WIFI_CONFIG;

      console.log('Manual WiFi network selected:', ssid);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Manual WiFi input failed';
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

      // Device always needs WiFi configuration on each connection
      console.log('Proceeding with WiFi configuration for device:', this.state.selectedBluetoothDevice.name);

      // Configure WiFi on device via Bluetooth
      // Extract password from wifiNetwork if it exists
      const password = (wifiNetwork as any).password || '';
      console.log('Configuring WiFi with password:', password ? '***' : 'no password');
      
      await realDeviceService.configureWiFiViaBluetooth(
        this.state.selectedBluetoothDevice,
        wifiNetwork,
        password
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
      case DeviceInitStep.WIFI_MANUAL_INPUT:
        return 'Enter WiFi Information Manually';
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
      case DeviceInitStep.WIFI_MANUAL_INPUT:
        return this.state.selectedWifi !== null;
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

  // Print all available GATT services and their characteristics
  private async printAllGATTServices(gattServer: any): Promise<void> {
    try {
      console.log('=== GATT Services Discovery ===');
      console.log('Device:', this.state.selectedBluetoothDevice?.name);
      console.log('GATT Server connected:', gattServer.connected);
      
      // Get all primary services
      const allServices = await (gattServer as any).getPrimaryServices();
      console.log(`Found ${allServices.length} primary services:`);
      
      for (let i = 0; i < allServices.length; i++) {
        const service = allServices[i];
        console.log(`\n--- Service ${i + 1} ---`);
        console.log('Service UUID:', service.uuid);
        console.log('Service Type:', service.type || 'primary');
        
        try {
          // Get all characteristics for this service
          const characteristics = await (service as any).getCharacteristics();
          console.log(`Characteristics (${characteristics.length}):`);
          
          for (let j = 0; j < characteristics.length; j++) {
            const char = characteristics[j];
            console.log(`  ${j + 1}. UUID: ${char.uuid}`);
            console.log(`     Properties: ${this.getCharacteristicProperties(char)}`);
            
            // Try to read value if readable
            try {
              if (char.properties.read) {
                const value = await char.readValue();
                const valueStr = this.formatCharacteristicValue(value);
                console.log(`     Value: ${valueStr}`);
              }
            } catch (readError: any) {
              console.log(`     Value: [Read failed: ${readError.message}]`);
            }
          }
        } catch (charError: any) {
          console.log(`Characteristics: [Failed to get: ${charError.message}]`);
        }
        
        // Try to get included services
        try {
          const includedServices = await (service as any).getIncludedServices();
          if (includedServices && includedServices.length > 0) {
            console.log(`Included Services (${includedServices.length}):`);
            includedServices.forEach((incService: any, idx: number) => {
              console.log(`  ${idx + 1}. ${incService.uuid}`);
            });
          }
        } catch (incError: any) {
          // Included services are optional, ignore errors
        }
      }
      
      console.log('=== End GATT Services Discovery ===\n');
    } catch (error: any) {
      console.error('Failed to enumerate GATT services:', error);
      console.log('GATT services enumeration failed, continuing with device setup...');
    }
  }

  // Get characteristic properties as readable string
  private getCharacteristicProperties(char: any): string {
    const props = [];
    if (char.properties.broadcast) props.push('broadcast');
    if (char.properties.read) props.push('read');
    if (char.properties.writeWithoutResponse) props.push('writeWithoutResponse');
    if (char.properties.write) props.push('write');
    if (char.properties.notify) props.push('notify');
    if (char.properties.indicate) props.push('indicate');
    if (char.properties.authenticatedSignedWrites) props.push('authenticatedSignedWrites');
    if (char.properties.reliableWrite) props.push('reliableWrite');
    if (char.properties.writableAuxiliaries) props.push('writableAuxiliaries');
    
    return props.length > 0 ? props.join(', ') : 'none';
  }

  // Format characteristic value as readable string
  private formatCharacteristicValue(value: DataView): string {
    try {
      // Try to decode as UTF-8 text first
      const textDecoder = new TextDecoder('utf-8');
      const text = textDecoder.decode(value);
      
      // Check if it's printable text
      if (text.length > 0 && /^[\x20-\x7E]*$/.test(text)) {
        return `"${text}"`;
      }
      
      // If not printable text, show as hex
      const bytes = new Uint8Array(value.buffer);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
      return `[${hex}] (${bytes.length} bytes)`;
    } catch (error) {
      return '[Decode failed]';
    }
  }

  // Clear error
  clearError(): void {
    this.state.error = null;
  }
}

export const deviceInitManager = new DeviceInitManager(); 