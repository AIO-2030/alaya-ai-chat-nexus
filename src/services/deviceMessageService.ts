// Device Message Service - Handle sending messages to connected devices
import { GifInfo, PixelArtInfo, PixelAnimationData } from './api/chatApi';
import { tencentIoTService, TencentDeviceStatus } from './tencentIoTService';
import { DeviceRecord } from './api/deviceApi';
import { alayaMcpService } from './alayaMcpService';

export interface DeviceMessage {
  type: 'text' | 'pixel_art' | 'gif' | 'pixel_animation';
  content: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    title?: string;
    palette?: string[];
    frame_delay?: number;
    loop_count?: number;
    frame_count?: number;
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
  private tencentIoTEnabled: boolean = false;
  private deviceSyncInterval: ReturnType<typeof setInterval> | null = null;

  // Initialize Tencent IoT Cloud integration
  async initializeTencentIoT(): Promise<boolean> {
    try {
      console.log('[DeviceMessageService] Initializing Tencent IoT Cloud integration...');
      
      // Connect to Tencent IoT Cloud
      const connected = await tencentIoTService.connectToTencentIoT();
      if (!connected) {
        console.warn('[DeviceMessageService] Tencent IoT Cloud connection failed, using local device management');
        return false;
      }

      this.tencentIoTEnabled = true;

      // Register device status update callback
      tencentIoTService.onDeviceStatusUpdate((statuses: TencentDeviceStatus[]) => {
        this.updateConnectedDevicesFromTencentIoT(statuses);
      });

      // Start device status synchronization
      this.startDeviceSync();

      console.log('[DeviceMessageService] Tencent IoT Cloud integration initialized successfully');
      return true;
    } catch (error) {
      console.error('[DeviceMessageService] Failed to initialize Tencent IoT Cloud integration:', error);
      return false;
    }
  }

  // Update connected device status from Tencent IoT Cloud
  private updateConnectedDevicesFromTencentIoT(statuses: TencentDeviceStatus[]): void {
    console.log('[DeviceMessageService] Updating device status from Tencent IoT Cloud:', statuses.length, 'devices');
    
    statuses.forEach(status => {
      const deviceStatus: DeviceConnectionStatus = {
        isConnected: status.isOnline && status.mqttConnected,
        deviceName: status.deviceName,
        deviceId: status.deviceId,
        lastSeen: status.lastSeen
      };

      this.connectedDevices.set(status.deviceId, deviceStatus);
    });

    // Remove devices not in Tencent Cloud status
    const tencentDeviceIds = new Set(statuses.map(s => s.deviceId));
    for (const [deviceId, device] of this.connectedDevices.entries()) {
      if (!tencentDeviceIds.has(deviceId)) {
        this.connectedDevices.delete(deviceId);
        console.log('[DeviceMessageService] Removed offline device:', deviceId);
      }
    }
  }

  // Start device status synchronization
  private startDeviceSync(): void {
    if (this.deviceSyncInterval) {
      clearInterval(this.deviceSyncInterval);
    }

    // Sync device status every 30 seconds
    this.deviceSyncInterval = setInterval(async () => {
      if (this.tencentIoTEnabled) {
        await this.syncDevicesFromCanister();
      }
    }, 30000);
  }

  // Sync device list from canister
  async syncDevicesFromCanister(): Promise<void> {
    try {
      // Dynamically import realDeviceService to avoid circular dependency
      const { realDeviceService } = await import('./realDeviceService');
      const devices = await realDeviceService.getDeviceList();
      
      if (this.tencentIoTEnabled) {
        // Convert device record format to match API format
        const apiDevices = devices.map(device => ({
          id: device.id || `device_${Date.now()}`,
          name: device.name,
          deviceType: { Other: device.type } as any,
          owner: device.principalId || '',
          status: device.status === 'Connected' ? { Online: null } : { Offline: null } as any,
          capabilities: [],
          metadata: {
            macAddress: device.macAddress,
            wifiNetwork: device.wifiNetwork,
            connectedAt: device.connectedAt,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastSeen: Date.now(),
        }));
        await tencentIoTService.syncDevicesFromCanister(apiDevices);
      } else {
        // If Tencent IoT Cloud is not enabled, use local device management
        this.updateConnectedDevicesFromLocal(devices);
      }
    } catch (error) {
      console.error('[DeviceMessageService] Failed to sync device list:', error);
    }
  }

  // Update connection status from local device list
  private updateConnectedDevicesFromLocal(devices: any[]): void {
    console.log('[DeviceMessageService] Updating status from local device list:', devices.length, 'devices');
    
    devices.forEach(device => {
      const deviceStatus: DeviceConnectionStatus = {
        isConnected: device.status === 'Connected' || device.status === 'Online',
        deviceName: device.name,
        deviceId: device.id,
        lastSeen: device.lastSeen || Date.now()
      };

      this.connectedDevices.set(device.id, deviceStatus);
    });
  }

  // Check if Tencent IoT Cloud is enabled
  isTencentIoTEnabled(): boolean {
    return this.tencentIoTEnabled;
  }

  // Parse device ID to extract product_id and device_name
  private parseDeviceId(deviceId: string): { productId: string; deviceName: string } {
    if (deviceId.includes(':')) {
      const [productId, deviceName] = deviceId.split(':');
      return { productId, deviceName };
    } else {
      // Use default product ID if not specified
      return { productId: 'DEFAULT_PRODUCT', deviceName: deviceId };
    }
  }

  // Get Tencent IoT Cloud device statuses
  getTencentIoTDevices(): TencentDeviceStatus[] {
    if (!this.tencentIoTEnabled) {
      return [];
    }
    return tencentIoTService.getDeviceStatuses();
  }

  // check if any device is connected
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

  // Convert pixel animation to device message format
  private convertPixelAnimationToDeviceMessage(animationData: PixelAnimationData): DeviceMessage {
    return {
      type: 'pixel_animation',
      content: JSON.stringify(animationData), // Use JSON string for device
      metadata: {
        width: animationData.width,
        height: animationData.height,
        title: animationData.title,
        palette: animationData.palette,
        frame_delay: animationData.frame_delay,
        loop_count: animationData.loop_count,
        frame_count: animationData.frames.length
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

  // Send pixel animation to all connected devices
  async sendPixelAnimationToDevices(animationData: PixelAnimationData): Promise<{ success: boolean; sentTo: string[]; errors: string[] }> {
    const message = this.convertPixelAnimationToDeviceMessage(animationData);
    return this.sendMessageToAllDevices(message);
  }

  // Send pixel art via ALAYA MCP (direct method)
  async sendPixelArtViaAlayaMcp(deviceId: string, pixelArtData: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[DeviceMessageService] Sending pixel art via ALAYA MCP:', { deviceId });
      
      const { productId, deviceName } = this.parseDeviceId(deviceId);
      return await alayaMcpService.sendPixelArtMessage(productId, deviceName, pixelArtData);
    } catch (error) {
      console.error('[DeviceMessageService] Error sending pixel art via ALAYA MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Send pixel animation via ALAYA MCP (direct method)
  async sendPixelAnimationViaAlayaMcp(deviceId: string, animationData: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[DeviceMessageService] Sending pixel animation via ALAYA MCP:', { deviceId });
      
      const { productId, deviceName } = this.parseDeviceId(deviceId);
      return await alayaMcpService.sendPixelAnimationMessage(productId, deviceName, animationData);
    } catch (error) {
      console.error('[DeviceMessageService] Error sending pixel animation via ALAYA MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Send GIF via ALAYA MCP (direct method)
  async sendGifViaAlayaMcp(deviceId: string, gifData: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[DeviceMessageService] Sending GIF via ALAYA MCP:', { deviceId });
      
      const { productId, deviceName } = this.parseDeviceId(deviceId);
      return await alayaMcpService.sendGifMessage(productId, deviceName, gifData);
    } catch (error) {
      console.error('[DeviceMessageService] Error sending GIF via ALAYA MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Send text via ALAYA MCP (direct method)
  async sendTextViaAlayaMcp(deviceId: string, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[DeviceMessageService] Sending text via ALAYA MCP:', { deviceId });
      
      const { productId, deviceName } = this.parseDeviceId(deviceId);
      return await alayaMcpService.sendTextMessage(productId, deviceName, text);
    } catch (error) {
      console.error('[DeviceMessageService] Error sending text via ALAYA MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Advanced MCP call method - directly call any pixelmug_stdio method
  async callPixelMugMcp(deviceId: string, method: string, params: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('[DeviceMessageService] Advanced MCP call:', { deviceId, method });
      
      const { productId, deviceName } = this.parseDeviceId(deviceId);
      
      // Add product_id and device_name to params if not already present
      const mcpParams = {
        product_id: productId,
        device_name: deviceName,
        ...params
      };
      
      return await alayaMcpService.callPixelMugMcp(method, mcpParams);
    } catch (error) {
      console.error('[DeviceMessageService] Error in advanced MCP call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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

    // Priority 1: Try ALAYA MCP service first
    try {
      console.log('[DeviceMessageService] Attempting to send via ALAYA MCP service');
      const alayaResult = await this.sendMessageViaAlayaMcp(deviceId, message);
      if (alayaResult.success) {
        console.log('[DeviceMessageService] Message sent successfully via ALAYA MCP');
        return;
      } else {
        console.warn('[DeviceMessageService] ALAYA MCP failed, falling back to Tencent IoT:', alayaResult.error);
      }
    } catch (error) {
      console.warn('[DeviceMessageService] ALAYA MCP error, falling back to Tencent IoT:', error);
    }

    // Priority 2: Fallback to Tencent IoT Cloud MQTT
    if (this.tencentIoTEnabled) {
      await this.sendMessageViaTencentIoT(deviceId, message);
    } else {
      // Priority 3: Use local simulation as last resort
      await this.simulateDeviceCommunication(deviceId, message);
    }
  }

  // Send message via ALAYA MCP service
  private async sendMessageViaAlayaMcp(deviceId: string, message: DeviceMessage): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[DeviceMessageService] Sending via ALAYA MCP:', {
        deviceId,
        messageType: message.type
      });

      const { productId, deviceName } = this.parseDeviceId(deviceId);

      let result: { success: boolean; error?: string };

      // Route to appropriate MCP method based on message type
      switch (message.type) {
        case 'pixel_art':
          result = await alayaMcpService.sendPixelArtMessage(productId, deviceName, message.content);
          break;
        case 'pixel_animation':
          result = await alayaMcpService.sendPixelAnimationMessage(productId, deviceName, message.content);
          break;
        case 'gif':
          result = await alayaMcpService.sendGifMessage(productId, deviceName, message.content);
          break;
        case 'text':
          result = await alayaMcpService.sendTextMessage(productId, deviceName, message.content);
          break;
        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }
      
      if (result.success) {
        console.log('[DeviceMessageService] Message sent successfully via ALAYA MCP');
      } else {
        console.error('[DeviceMessageService] ALAYA MCP send failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[DeviceMessageService] Error sending via ALAYA MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Send message via Tencent IoT Cloud MQTT
  private async sendMessageViaTencentIoT(deviceId: string, message: DeviceMessage): Promise<void> {
    try {
      // Build MQTT message payload
      const mqttPayload = JSON.stringify({
        type: message.type,
        content: message.content,
        metadata: message.metadata,
        timestamp: message.timestamp,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Send MQTT message
      const success = await tencentIoTService.sendMessageToDevice(deviceId, {
        topic: `$thing/down/property/${tencentIoTService.getConfig()?.productId}/${deviceId}`,
        payload: mqttPayload,
        qos: 1,
        retain: false
      });

      if (!success) {
        throw new Error('Failed to send message via Tencent IoT MQTT');
      }

      console.log('[DeviceMessageService] Message sent via Tencent IoT MQTT:', {
        deviceId,
        messageType: message.type
      });
    } catch (error) {
      console.error('[DeviceMessageService] Failed to send message via Tencent IoT:', error);
      throw error;
    }
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

  // Cleanup resources
  cleanup(): void {
    if (this.deviceSyncInterval) {
      clearInterval(this.deviceSyncInterval);
      this.deviceSyncInterval = null;
    }

    if (this.tencentIoTEnabled) {
      tencentIoTService.disconnect();
      this.tencentIoTEnabled = false;
    }

    this.connectedDevices.clear();
    this.messageQueue = [];
  }

  // Reinitialize service
  async reinitialize(): Promise<void> {
    this.cleanup();
    
    // Try to initialize Tencent IoT Cloud
    await this.initializeTencentIoT();
    
    // If Tencent IoT Cloud initialization fails, use local mode
    if (!this.tencentIoTEnabled) {
      await this.syncDevicesFromCanister();
    }
  }
}

// Export singleton instance
export const deviceMessageService = new DeviceMessageService();
