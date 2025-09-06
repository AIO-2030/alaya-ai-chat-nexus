// Device Message Service - Handle sending messages to connected devices
import { GifInfo, PixelArtInfo } from './api/chatApi';

export interface DeviceMessage {
  type: 'text' | 'pixel_art' | 'gif';
  content: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    title?: string;
    palette?: string[];
  };
  timestamp: number;
}

export interface DeviceConnectionStatus {
  isConnected: boolean;
  deviceName?: string;
  deviceId?: string;
  lastSeen?: number;
}

class DeviceMessageService {
  private connectedDevices: Map<string, DeviceConnectionStatus> = new Map();
  private messageQueue: DeviceMessage[] = [];

  // Check if any devices are connected
  isAnyDeviceConnected(): boolean {
    return Array.from(this.connectedDevices.values()).some(device => device.isConnected);
  }

  // Get connected devices list
  getConnectedDevices(): DeviceConnectionStatus[] {
    return Array.from(this.connectedDevices.values()).filter(device => device.isConnected);
  }

  // Add a connected device
  addConnectedDevice(deviceId: string, deviceName: string): void {
    this.connectedDevices.set(deviceId, {
      isConnected: true,
      deviceName,
      deviceId,
      lastSeen: Date.now()
    });
    console.log('[DeviceMessageService] Device connected:', { deviceId, deviceName });
  }

  // Remove a device
  removeDevice(deviceId: string): void {
    this.connectedDevices.delete(deviceId);
    console.log('[DeviceMessageService] Device removed:', deviceId);
  }

  // Update device status
  updateDeviceStatus(deviceId: string, isConnected: boolean): void {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      device.isConnected = isConnected;
      device.lastSeen = Date.now();
      this.connectedDevices.set(deviceId, device);
    }
  }

  // Convert GIF to device message format
  private convertGifToDeviceMessage(gifInfo: GifInfo): DeviceMessage {
    return {
      type: 'gif',
      content: gifInfo.gifUrl, // Use full GIF URL for device
      metadata: {
        width: gifInfo.width,
        height: gifInfo.height,
        duration: gifInfo.duration,
        title: gifInfo.title
      },
      timestamp: Date.now()
    };
  }

  // Convert pixel art to device message format
  private convertPixelArtToDeviceMessage(pixelArt: PixelArtInfo): DeviceMessage {
    return {
      type: 'pixel_art',
      content: pixelArt.deviceFormat, // Use device format JSON
      metadata: {
        width: pixelArt.width,
        height: pixelArt.height,
        palette: pixelArt.palette
      },
      timestamp: Date.now()
    };
  }

  // Convert text to device message format
  private convertTextToDeviceMessage(text: string): DeviceMessage {
    return {
      type: 'text',
      content: text,
      timestamp: Date.now()
    };
  }

  // Send GIF to all connected devices
  async sendGifToDevices(gifInfo: GifInfo): Promise<{ success: boolean; sentTo: string[]; errors: string[] }> {
    const message = this.convertGifToDeviceMessage(gifInfo);
    return this.sendMessageToAllDevices(message);
  }

  // Send pixel art to all connected devices
  async sendPixelArtToDevices(pixelArt: PixelArtInfo): Promise<{ success: boolean; sentTo: string[]; errors: string[] }> {
    const message = this.convertPixelArtToDeviceMessage(pixelArt);
    return this.sendMessageToAllDevices(message);
  }

  // Send text to all connected devices
  async sendTextToDevices(text: string): Promise<{ success: boolean; sentTo: string[]; errors: string[] }> {
    const message = this.convertTextToDeviceMessage(text);
    return this.sendMessageToAllDevices(message);
  }

  // Send message to all connected devices
  private async sendMessageToAllDevices(message: DeviceMessage): Promise<{ success: boolean; sentTo: string[]; errors: string[] }> {
    const connectedDevices = this.getConnectedDevices();
    const sentTo: string[] = [];
    const errors: string[] = [];

    if (connectedDevices.length === 0) {
      return {
        success: false,
        sentTo: [],
        errors: ['No devices connected']
      };
    }

    console.log('[DeviceMessageService] Sending message to devices:', {
      messageType: message.type,
      deviceCount: connectedDevices.length,
      message
    });

    // Send to each connected device
    for (const device of connectedDevices) {
      try {
        await this.sendMessageToDevice(device.deviceId!, message);
        sentTo.push(device.deviceName || device.deviceId!);
      } catch (error) {
        const errorMsg = `Failed to send to ${device.deviceName || device.deviceId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('[DeviceMessageService] Send error:', errorMsg);
      }
    }

    return {
      success: sentTo.length > 0,
      sentTo,
      errors
    };
  }

  // Send message to specific device
  private async sendMessageToDevice(deviceId: string, message: DeviceMessage): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.isConnected) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    console.log('[DeviceMessageService] Sending to device:', {
      deviceId,
      deviceName: device.deviceName,
      messageType: message.type
    });

    // TODO: Implement actual device communication protocol
    // This could be:
    // 1. Bluetooth Low Energy (BLE) characteristic write
    // 2. WebSocket connection to device
    // 3. HTTP POST to device endpoint
    // 4. MQTT message to device topic
    
    // For now, simulate device communication
    await this.simulateDeviceCommunication(deviceId, message);
  }

  // Simulate device communication (replace with actual implementation)
  private async simulateDeviceCommunication(deviceId: string, message: DeviceMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // Simulate occasional failures for testing
        if (Math.random() < 0.1) { // 10% failure rate
          reject(new Error('Device communication timeout'));
          return;
        }

        console.log('[DeviceMessageService] Message sent successfully to device:', {
          deviceId,
          messageType: message.type,
          contentLength: message.content.length,
          metadata: message.metadata
        });

        // Update device last seen
        this.updateDeviceStatus(deviceId, true);
        resolve();
      }, 100 + Math.random() * 200); // 100-300ms delay
    });
  }

  // Get device communication protocol info
  getDeviceProtocolInfo(): {
    supportedTypes: string[];
    maxMessageSize: number;
    requiresConnection: boolean;
  } {
    return {
      supportedTypes: ['text', 'pixel_art', 'gif'],
      maxMessageSize: 1024 * 1024, // 1MB
      requiresConnection: true
    };
  }

  // Queue message for later sending (when device comes online)
  queueMessage(message: DeviceMessage): void {
    this.messageQueue.push(message);
    console.log('[DeviceMessageService] Message queued:', {
      type: message.type,
      queueLength: this.messageQueue.length
    });
  }

  // Process queued messages
  async processQueuedMessages(): Promise<void> {
    if (this.messageQueue.length === 0 || !this.isAnyDeviceConnected()) {
      return;
    }

    console.log('[DeviceMessageService] Processing queued messages:', this.messageQueue.length);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        await this.sendMessageToAllDevices(message);
      } catch (error) {
        console.error('[DeviceMessageService] Failed to process queued message:', error);
        // Re-queue failed messages
        this.messageQueue.push(message);
      }
    }
  }
}

// Export singleton instance
export const deviceMessageService = new DeviceMessageService();
