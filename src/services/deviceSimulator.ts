// Device Simulator - For testing device communication without real hardware
import { deviceMessageService } from './deviceMessageService';

class DeviceSimulator {
  private isSimulating = false;
  private deviceId = 'simulated-device-001';
  private deviceName = 'Test Device';

  // Start simulating a connected device
  startSimulation(): void {
    if (this.isSimulating) {
      console.log('[DeviceSimulator] Already simulating');
      return;
    }

    this.isSimulating = true;
    deviceMessageService.addConnectedDevice(this.deviceId, this.deviceName);
    
    console.log('[DeviceSimulator] Started simulation - device connected:', {
      deviceId: this.deviceId,
      deviceName: this.deviceName
    });

    // Device simulator now runs indefinitely until manually stopped
    // No automatic disconnection
  }

  // Stop simulating
  stopSimulation(): void {
    if (!this.isSimulating) {
      return;
    }

    this.isSimulating = false;
    deviceMessageService.removeDevice(this.deviceId);
    
    console.log('[DeviceSimulator] Stopped simulation - device disconnected');
  }

  // Check if currently simulating
  isCurrentlySimulating(): boolean {
    return this.isSimulating;
  }

  // Get simulation status
  getSimulationStatus(): {
    isSimulating: boolean;
    deviceId: string;
    deviceName: string;
  } {
    return {
      isSimulating: this.isSimulating,
      deviceId: this.deviceId,
      deviceName: this.deviceName
    };
  }
}

// Export singleton instance
export const deviceSimulator = new DeviceSimulator();

// Device simulator is now only available for manual testing
// No automatic startup in any mode
