// Device Initialization Manager - Handle complete device setup process
import { realDeviceService, WiFiNetwork, BluetoothDevice, DeviceRecord, ConnectionProgress } from './realDeviceService';
import { getPrincipalId } from '../lib/principal';
import { parseDeviceNameFromAdvertisement } from './blufiProtocol';

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
      this.applyDeviceIdentityFromAdvertisement();
      
      // Move to WiFi scanning step
      this.state.step = DeviceInitStep.WIFI_SCAN;
      await this.requestWiFiNetworksFromDevice();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Bluetooth connection failed';
      this.state.isConnectingBluetooth = false;
      throw error;
    }
  }

  // BLUFI exposes DeviceName through the advertising name. ProductID is not
  // part of the persisted device record.
  private applyDeviceIdentityFromAdvertisement(): void {
    if (!this.state.selectedBluetoothDevice) throw new Error('No Bluetooth device connected');
    const advertisedName = this.state.selectedBluetoothDevice.name;
    this.state.selectedBluetoothDevice.deviceName = parseDeviceNameFromAdvertisement(advertisedName);
    this.state.selectedBluetoothDevice.productId = undefined;
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

      // Stop WiFi scan listening since user is manually entering WiFi info
      if (this.state.selectedBluetoothDevice) {
        console.log('🛑 User manually entering WiFi info, stopping scan listening');
        realDeviceService.stopWiFiScanListening(this.state.selectedBluetoothDevice.id);
      }

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

      // Stop WiFi scan listening since user has selected a network
      console.log('🛑 User selected WiFi network, stopping scan listening');
      realDeviceService.stopWiFiScanListening(this.state.selectedBluetoothDevice.id);

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

      // configureWiFiViaBluetooth resolves only after a validated BLUFI 0x3D
      // report says connectionState=0 (the device obtained an IP address).
      this.state.isVerifyingDevice = false;
      this.state.connectionProgress = 100; // Complete
      this.state.step = DeviceInitStep.SUCCESS;
      
      console.log('Device verification completed successfully');
    } catch (error) {
      console.error('Device verification error:', error);
      
      this.state.isVerifyingDevice = false;
      throw error;
    }
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

      const deviceName = this.state.selectedBluetoothDevice.deviceName
        || parseDeviceNameFromAdvertisement(this.state.selectedBluetoothDevice.name);
      console.log(`[DeviceInitManager] Parsed device name: ${deviceName} from bluetooth name: ${this.state.selectedBluetoothDevice.name}`);

      const record: DeviceRecord = {
        id: `device_${Date.now()}`, // Generate unique ID
        name: this.state.selectedBluetoothDevice.name, // Use full GATT-retrieved device name
        deviceName: deviceName, // Use parsed device name for MCP calls
        type: this.state.selectedBluetoothDevice.type,
        macAddress: this.state.selectedBluetoothDevice.mac,
        wifiNetwork: this.state.selectedWifi.name,
        status: 'Connected',
        connectedAt: new Date().toISOString(),
        principalId: principalId
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

  // Clear error
  clearError(): void {
    this.state.error = null;
  }
}

export const deviceInitManager = new DeviceInitManager();
