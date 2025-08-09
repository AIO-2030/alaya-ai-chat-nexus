// Device Initialization Manager - Handle complete device setup process
import { realDeviceService, WiFiNetwork, BluetoothDevice, DeviceRecord, ConnectionProgress } from './realDeviceService';

export enum DeviceInitStep {
  INIT = 'init',
  WIFI_SCAN = 'wifi_scan',
  WIFI_SELECT = 'wifi_select',
  BLUETOOTH_SCAN = 'bluetooth_scan',
  BLUETOOTH_SELECT = 'bluetooth_select',
  CONNECTING = 'connecting',
  SUCCESS = 'success'
}

export interface DeviceInitState {
  step: DeviceInitStep;
  selectedWifi: WiFiNetwork | null;
  selectedBluetoothDevice: BluetoothDevice | null;
  wifiNetworks: WiFiNetwork[];
  bluetoothDevices: BluetoothDevice[];
  isScanningWifi: boolean;
  isScanningBluetooth: boolean;
  isConnecting: boolean;
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
      isScanningWifi: false,
      isScanningBluetooth: false,
      isConnecting: false,
      connectionProgress: 0,
      error: null
    };
  }

  // Get current state
  getState(): DeviceInitState {
    return { ...this.state };
  }

  // Start device initialization process
  async startDeviceInit(): Promise<void> {
    try {
      this.state.step = DeviceInitStep.WIFI_SCAN;
      this.state.isScanningWifi = true;
      this.state.error = null;

      // Scan WiFi networks
      const networks = await realDeviceService.scanWiFiNetworks();
      this.state.wifiNetworks = networks;
      this.state.isScanningWifi = false;
      this.state.step = DeviceInitStep.WIFI_SELECT;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'WiFi scan failed';
      this.state.isScanningWifi = false;
      throw error;
    }
  }

  // Select WiFi network
  async selectWiFi(wifiNetwork: WiFiNetwork): Promise<void> {
    try {
      this.state.selectedWifi = wifiNetwork;
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

  // Select Bluetooth device and start connection process
  async selectBluetoothDevice(device: BluetoothDevice): Promise<void> {
    try {
      this.state.selectedBluetoothDevice = device;
      this.state.step = DeviceInitStep.CONNECTING;
      this.state.isConnecting = true;
      this.state.error = null;

      // Start connection process
      await this.connectDeviceToWifi();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Device connection failed';
      this.state.isConnecting = false;
      throw error;
    }
  }

  // Connect device to WiFi via Bluetooth
  private async connectDeviceToWifi(): Promise<void> {
    try {
      if (!this.state.selectedBluetoothDevice || !this.state.selectedWifi) {
        throw new Error('No device or WiFi selected');
      }

      const steps = await realDeviceService.getConnectionProgress();
      
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.state.connectionProgress = step.progress;
      }

      // Establish Bluetooth connection
      await realDeviceService.connectBluetooth(this.state.selectedBluetoothDevice);

      // Configure WiFi via Bluetooth
      await realDeviceService.configureWiFiViaBluetooth(
        this.state.selectedBluetoothDevice,
        this.state.selectedWifi
      );

      this.state.isConnecting = false;
      this.state.step = DeviceInitStep.SUCCESS;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Connection failed';
      this.state.isConnecting = false;
      throw error;
    }
  }

  // Submit device record to backend
  async submitDeviceRecord(): Promise<boolean> {
    try {
      if (!this.state.selectedBluetoothDevice || !this.state.selectedWifi) {
        throw new Error('No device or WiFi selected');
      }

      const record: DeviceRecord = {
        name: this.state.selectedBluetoothDevice.name,
        type: this.state.selectedBluetoothDevice.type,
        macAddress: this.state.selectedBluetoothDevice.mac,
        wifiNetwork: this.state.selectedWifi.name,
        status: 'Connected',
        connectedAt: new Date().toISOString()
      };

      const success = await realDeviceService.submitDeviceRecord(record);
      
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
      isScanningWifi: false,
      isScanningBluetooth: false,
      isConnecting: false,
      connectionProgress: 0,
      error: null
    };
  }

  // Get current step description
  getStepDescription(): string {
    switch (this.state.step) {
      case DeviceInitStep.INIT:
        return 'Device Initialization';
      case DeviceInitStep.WIFI_SCAN:
        return 'Scanning WiFi Networks';
      case DeviceInitStep.WIFI_SELECT:
        return 'Select WiFi Network';
      case DeviceInitStep.BLUETOOTH_SCAN:
        return 'Scanning Bluetooth Devices';
      case DeviceInitStep.BLUETOOTH_SELECT:
        return 'Select Bluetooth Device';
      case DeviceInitStep.CONNECTING:
        return 'Connecting Device';
      case DeviceInitStep.SUCCESS:
        return 'Connection Successful';
      default:
        return 'Unknown Step';
    }
  }

  // Check if current step is complete
  isStepComplete(): boolean {
    switch (this.state.step) {
      case DeviceInitStep.WIFI_SCAN:
        return !this.state.isScanningWifi && this.state.wifiNetworks.length > 0;
      case DeviceInitStep.BLUETOOTH_SCAN:
        return !this.state.isScanningBluetooth && this.state.bluetoothDevices.length > 0;
      case DeviceInitStep.CONNECTING:
        return !this.state.isConnecting && this.state.connectionProgress === 100;
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