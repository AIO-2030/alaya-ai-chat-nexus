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

    // Simulate device disconnection after 30 seconds
    setTimeout(() => {
      this.stopSimulation();
    }, 30000);
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

// Auto-start simulation in development mode
if (import.meta.env.DEV) {
  // Start simulation after a short delay to allow the app to initialize
  setTimeout(() => {
    deviceSimulator.startSimulation();
  }, 2000);
}
