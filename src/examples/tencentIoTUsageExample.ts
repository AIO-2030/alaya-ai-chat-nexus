// Tencent IoT Cloud integration usage examples
import { deviceMessageService } from '../services/deviceMessageService';
import { initializeDeviceMessageService, getDeviceConnectionSummary } from '../services/deviceMessageServiceInit';

/**
 * Examples: How to use Tencent IoT Cloud integration in applications
 */
export class TencentIoTUsageExample {
  
  /**
   * Example 1: Initialize device message service
   */
  static async initializeService(): Promise<void> {
    console.log('=== Example 1: Initialize device message service ===');
    
    try {
      const success = await initializeDeviceMessageService();
      if (success) {
        console.log('✅ Device message service initialized successfully');
        
        // Check if Tencent IoT Cloud is enabled
        const isTencentEnabled = deviceMessageService.isTencentIoTEnabled();
        console.log(`Tencent IoT Cloud status: ${isTencentEnabled ? 'Enabled' : 'Disabled'}`);
      } else {
        console.log('❌ Failed to initialize device message service');
      }
    } catch (error) {
      console.error('Error occurred during initialization:', error);
    }
  }

  /**
   * Example 2: Get device connection status
   */
  static async getDeviceStatus(): Promise<void> {
    console.log('=== Example 2: Get device connection status ===');
    
    try {
      // Get device connection summary
      const summary = getDeviceConnectionSummary();
      console.log('Device connection summary:', summary);
      
      // Check if any devices are connected
      const hasDevices = deviceMessageService.isAnyDeviceConnected();
      console.log(`Are there any connected devices: ${hasDevices}`);
      
      // Get connected device list
      const connectedDevices = deviceMessageService.getConnectedDevices();
      console.log('Connected devices:', connectedDevices);
      
      // Get Tencent IoT Cloud device status (if enabled)
      if (deviceMessageService.isTencentIoTEnabled()) {
        const tencentDevices = deviceMessageService.getTencentIoTDevices();
        console.log('Tencent IoT Cloud device status:', tencentDevices);
      }
    } catch (error) {
      console.error('Error occurred while getting device status:', error);
    }
  }

  /**
   * Example 3: Send messages to devices
   */
  static async sendMessagesToDevices(): Promise<void> {
    console.log('=== Example 3: Send messages to devices ===');
    
    try {
      // Send text message
      console.log('Sending text message...');
      const textResult = await deviceMessageService.sendTextToDevices('Hello from the app!');
      console.log('Text message send result:', textResult);
      
      // Send pixel art
      console.log('Sending pixel art...');
      const pixelArt = {
        chatFormat: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Placeholder base64
        deviceFormat: JSON.stringify({
          pixels: [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 16]
          ],
          width: 4,
          height: 4
        }),
        width: 4,
        height: 4,
        palette: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
        sourceType: 'creation'
      };
      const pixelResult = await deviceMessageService.sendPixelArtToDevices(pixelArt);
      console.log('Pixel art send result:', pixelResult);
      
      // Send GIF
      console.log('Sending GIF...');
      const gifInfo = {
        gifUrl: 'https://example.com/animation.gif',
        thumbnailUrl: 'https://example.com/animation_thumb.jpg',
        width: 100,
        height: 100,
        duration: 2000,
        title: 'Test Animation',
        sourceType: 'gif'
      };
      const gifResult = await deviceMessageService.sendGifToDevices(gifInfo);
      console.log('GIF send result:', gifResult);
      
    } catch (error) {
      console.error('Error occurred while sending messages:', error);
    }
  }

  /**
   * Example 4: Monitor device status changes
   */
  static async monitorDeviceStatus(): Promise<void> {
    console.log('=== Example 4: Monitor device status changes ===');
    
    try {
      // Set up periodic device status checks
      const statusCheckInterval = setInterval(() => {
        const summary = getDeviceConnectionSummary();
        console.log(`[${new Date().toLocaleTimeString()}] Device status update:`, {
          totalDevices: summary.totalDevices,
          connectedDevices: summary.connectedDevices,
          tencentCloudEnabled: summary.tencentIoTEnabled
        });
        
        // If device status changes, perform corresponding actions
        if (summary.connectedDevices > 0) {
          console.log('Connected devices detected, can send messages');
        }
      }, 10000); // Check every 10 seconds
      
      // Stop monitoring after 5 minutes
      setTimeout(() => {
        clearInterval(statusCheckInterval);
        console.log('Device status monitoring stopped');
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error occurred while monitoring device status:', error);
    }
  }

  /**
   * Example 5: Handle device connection and disconnection
   */
  static async handleDeviceConnectionEvents(): Promise<void> {
    console.log('=== Example 5: Handle device connection and disconnection events ===');
    
    try {
      // Simulate device connection events
      const simulateDeviceConnection = () => {
        const deviceId = `device_${Date.now()}`;
        const deviceName = `Test Device ${Math.floor(Math.random() * 100)}`;
        
        deviceMessageService.addConnectedDevice(deviceId, deviceName);
        console.log(`Device connected: ${deviceName} (${deviceId})`);
        
        // Disconnect device after 5 seconds
        setTimeout(() => {
          deviceMessageService.removeDevice(deviceId);
          console.log(`Device disconnected: ${deviceName} (${deviceId})`);
        }, 5000);
      };
      
      // Simulate a device connection every 15 seconds
      const connectionInterval = setInterval(simulateDeviceConnection, 15000);
      
      // Stop simulation after 2 minutes
      setTimeout(() => {
        clearInterval(connectionInterval);
        console.log('Device connection simulation stopped');
      }, 2 * 60 * 1000);
      
    } catch (error) {
      console.error('Error occurred while handling device connection events:', error);
    }
  }

  /**
   * Example 6: Complete device management flow
   */
  static async fullDeviceManagementFlow(): Promise<void> {
    console.log('=== Example 6: Complete device management flow ===');
    
    try {
      // 1. Initialize service
      console.log('Step 1: Initialize service...');
      await this.initializeService();
      
      // 2. Wait for device connection
      console.log('Step 2: Wait for device connection...');
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 30 seconds
      
      while (attempts < maxAttempts) {
        const hasDevices = deviceMessageService.isAnyDeviceConnected();
        if (hasDevices) {
          console.log('✅ Connected devices detected');
          break;
        }
        
        console.log(`Waiting for device connection... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.log('⚠️ No connected devices detected, using simulated device for demo');
        // Add a simulated device
        deviceMessageService.addConnectedDevice('demo_device', 'Demo Device');
      }
      
      // 3. Get device status
      console.log('Step 3: Get device status...');
      await this.getDeviceStatus();
      
      // 4. Send test messages
      console.log('Step 4: Send test messages...');
      await this.sendMessagesToDevices();
      
      // 5. Cleanup
      console.log('Step 5: Cleanup resources...');
      deviceMessageService.cleanup();
      
      console.log('✅ Complete device management flow completed');
      
    } catch (error) {
      console.error('Error occurred during complete flow execution:', error);
    }
  }
}

// Export usage examples
export default TencentIoTUsageExample;
