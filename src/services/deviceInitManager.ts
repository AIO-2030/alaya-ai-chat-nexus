// Device Initialization Manager - Handle complete device setup process
import { realDeviceService, WiFiNetwork, BluetoothDevice, DeviceRecord, ConnectionProgress } from './realDeviceService';
import { getPrincipalId } from '../lib/principal';

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
  activationCode: string | null;

  isScanningBluetooth: boolean;
  isConnectingBluetooth: boolean;
  isConfiguringWifi: boolean;
  isTransmittingActivationCode: boolean;
  isVerifyingActivation: boolean;
  connectionProgress: number;
  error: string | null;
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
      activationCode: null,

      isScanningBluetooth: false,
      isConnectingBluetooth: false,
      isConfiguringWifi: false,
      isTransmittingActivationCode: false,
      isVerifyingActivation: false,
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
      
      // Move to WiFi scanning step
      this.state.step = DeviceInitStep.WIFI_SCAN;
      await this.requestWiFiNetworksFromDevice();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Bluetooth connection failed';
      this.state.isConnectingBluetooth = false;
      throw error;
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
      
      // Since activation code dialog is removed, automatically send a default activation code
      // and complete the setup process
      await this.sendActivationCode('default_activation_code');
      
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'WiFi configuration failed';
      this.state.isConfiguringWifi = false;
      throw error;
    }
  }

  // Step 5: Send activation code to device
  async sendActivationCode(activationCode: string): Promise<void> {
    try {
      this.state.activationCode = activationCode;
      this.state.isTransmittingActivationCode = true;
      this.state.error = null;
      this.state.connectionProgress = 60; // Sending activation code

      if (!this.state.selectedBluetoothDevice) {
        throw new Error('No Bluetooth device connected');
      }

      // Send activation code to device via Bluetooth
      await realDeviceService.sendActivationCodeToDevice(
        this.state.selectedBluetoothDevice,
        activationCode
      );

      this.state.isTransmittingActivationCode = false;
      this.state.connectionProgress = 80; // Activation code sent
      
      // Move to activation verification
      await this.verifyDeviceActivation();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Activation code transmission failed';
      this.state.isTransmittingActivationCode = false;
      throw error;
    }
  }

  // Step 6: Verify device activation
  private async verifyDeviceActivation(): Promise<void> {
    try {
      this.state.isVerifyingActivation = true;
      this.state.error = null;
      this.state.connectionProgress = 90; // Verifying activation

      if (!this.state.selectedBluetoothDevice || !this.state.activationCode) {
        throw new Error('No device or activation code available');
      }

      // Verify activation via Tencent Cloud API
      const isActivated = await realDeviceService.verifyDeviceActivationViaTencentCloud(
        this.state.selectedBluetoothDevice,
        this.state.activationCode
      );

      if (!isActivated) {
        throw new Error('Device activation verification failed');
      }

      this.state.isVerifyingActivation = false;
      this.state.connectionProgress = 100; // Complete
      this.state.step = DeviceInitStep.SUCCESS;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Device activation verification failed';
      this.state.isVerifyingActivation = false;
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

      const record: DeviceRecord = {
        id: `device_${Date.now()}`, // Generate unique ID
        name: this.state.selectedBluetoothDevice.name,
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
      activationCode: null,

      isScanningBluetooth: false,
      isConnectingBluetooth: false,
      isConfiguringWifi: false,
      isTransmittingActivationCode: false,
      isVerifyingActivation: false,
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