// Device Message Service initialization script
import { deviceMessageService } from './deviceMessageService';
import { realDeviceService } from './realDeviceService';

/**
 * Initialize device message service
 * This function should be called at application startup to enable Tencent IoT Cloud integration
 */
export async function initializeDeviceMessageService(): Promise<boolean> {
  try {
    console.log('[DeviceMessageServiceInit] Initializing device message service...');

    // Initialize Tencent IoT Cloud integration
    const tencentIoTEnabled = await deviceMessageService.initializeTencentIoT();
    
    if (tencentIoTEnabled) {
      console.log('[DeviceMessageServiceInit] Tencent IoT Cloud integration enabled');
    } else {
      console.log('[DeviceMessageServiceInit] Using local device management mode');
    }

    // Sync device list
    await deviceMessageService.syncDevicesFromCanister();

    console.log('[DeviceMessageServiceInit] Device message service initialization completed');
    return true;
  } catch (error) {
    console.error('[DeviceMessageServiceInit] Failed to initialize device message service:', error);
    return false;
  }
}

/**
 * Get device connection status summary
 */
export function getDeviceConnectionSummary(): {
  totalDevices: number;
  connectedDevices: number;
  tencentIoTEnabled: boolean;
  deviceList: Array<{
    id: string;
    name: string;
    isConnected: boolean;
    lastSeen?: number;
  }>;
} {
  const connectedDevices = deviceMessageService.getConnectedDevices();
  const tencentIoTDevices = deviceMessageService.getTencentIoTDevices();
  
  return {
    totalDevices: connectedDevices.length,
    connectedDevices: connectedDevices.filter(d => d.isConnected).length,
    tencentIoTEnabled: deviceMessageService.isTencentIoTEnabled(),
    deviceList: connectedDevices.map(device => ({
      id: device.deviceId || 'unknown',
      name: device.deviceName || 'Unknown Device',
      isConnected: device.isConnected,
      lastSeen: device.lastSeen
    }))
  };
}

/**
 * Send test message to all connected devices
 */
export async function sendTestMessageToDevices(message: string): Promise<{
  success: boolean;
  sentTo: string[];
  errors: string[];
}> {
  try {
    return await deviceMessageService.sendTextToDevices(message);
  } catch (error) {
    console.error('[DeviceMessageServiceInit] Failed to send test message:', error);
    return {
      success: false,
      sentTo: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Resync device status
 */
export async function refreshDeviceStatus(): Promise<void> {
  try {
    await deviceMessageService.syncDevicesFromCanister();
    console.log('[DeviceMessageServiceInit] Device status refreshed');
  } catch (error) {
    console.error('[DeviceMessageServiceInit] Failed to refresh device status:', error);
  }
}

/**
 * Cleanup device message service
 */
export function cleanupDeviceMessageService(): void {
  deviceMessageService.cleanup();
  console.log('[DeviceMessageServiceInit] Device message service cleaned up');
}
