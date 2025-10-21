// Device Message Service - Handle sending messages to connected devices
import { GifInfo, PixelArtInfo, PixelAnimationData } from './api/chatApi';
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

export interface DeviceStatus {
  deviceId: string;
  deviceName: string;
  isOnline: boolean;
  lastSeen: number;
  mqttConnected: boolean;
  ipAddress?: string;
  signalStrength?: number;
  batteryLevel?: number;
  productId?: string;
}

class DeviceMessageService {
  private connectedDevices: Map<string, DeviceConnectionStatus> = new Map();
  private messageQueue: DeviceMessage[] = [];
  private tencentIoTEnabled: boolean = false;
  private deviceSyncInterval: ReturnType<typeof setInterval> | null = null;

  // Initialize Tencent IoT Cloud integration via MCP
  async initializeTencentIoT(): Promise<boolean> {
    try {
      console.log('[DeviceMessageService] Initializing Tencent IoT Cloud integration via MCP...');
      
      // Test MCP service availability
      const helpResult = await alayaMcpService.getHelp();
      if (!helpResult.success) {
        console.warn('[DeviceMessageService] MCP service not available, using local device management');
        return false;
      }

      this.tencentIoTEnabled = true;

      // Start device status synchronization
      this.startDeviceSync();

      console.log('[DeviceMessageService] Tencent IoT Cloud integration initialized successfully via MCP');
      return true;
    } catch (error) {
      console.error('[DeviceMessageService] Failed to initialize Tencent IoT Cloud integration via MCP:', error);
      return false;
    }
  }

  // Update connected device status from MCP service
  private updateConnectedDevicesFromMcp(statuses: DeviceStatus[]): void {
    console.log('[DeviceMessageService] Updating device status from MCP service:', statuses.length, 'devices');
    
    statuses.forEach(status => {
      const deviceStatus: DeviceConnectionStatus = {
        // More lenient connection check: consider device connected if either online or mqtt connected
        // This helps when MCP service is unavailable but device is still functional
        isConnected: status.isOnline || status.mqttConnected,
        deviceName: status.deviceName,
        deviceId: status.deviceId,
        lastSeen: status.lastSeen
      };

      this.connectedDevices.set(status.deviceId, deviceStatus);
    });

    // Update device status based on MCP response, but don't remove devices
    // Device status should only be controlled by MCP, not by local removal
    const tencentDeviceIds = new Set(statuses.map(s => s.deviceId));
    for (const [deviceId, device] of this.connectedDevices.entries()) {
      if (!tencentDeviceIds.has(deviceId)) {
        // Instead of removing, mark as offline but keep in the list
        device.isConnected = false;
        device.lastSeen = Date.now();
        this.connectedDevices.set(deviceId, device);
        console.log('[DeviceMessageService] Marked device as offline (not removed):', deviceId);
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
        // Sync devices via MCP service - get real device status for each device
        await this.syncDevicesViaMcp(devices);
      } else {
        // If Tencent IoT Cloud is not enabled, use local device management
        this.updateConnectedDevicesFromLocal(devices);
      }
    } catch (error) {
      console.error('[DeviceMessageService] Failed to sync device list:', error);
    }
  }

  // Sync devices via MCP service - get real device status
  private async syncDevicesViaMcp(devices: any[]): Promise<void> {
    try {
      console.log('[DeviceMessageService] Syncing devices via MCP service:', devices.length, 'devices');
      
      const deviceStatuses: DeviceStatus[] = [];
      const syncPromises = devices.map(async (device) => {
        try {
          // Parse device ID to get product_id and device_name
          const deviceId = device.id || `device_${Date.now()}`;
          const { productId, deviceName } = this.parseDeviceIdFromRecord(device);
          
          // Call MCP getDeviceStatus for this device
          const mcpResult = await alayaMcpService.getDeviceStatus(productId, deviceName);
          
          if (mcpResult.success && mcpResult.data) {
            // Map MCP response to DeviceStatus format
            const mcpData = mcpResult.data as Record<string, unknown>;
            // Parse MCP response according to new API format
            const deviceStatusData = mcpData.device_status as Record<string, unknown> || {};
            const deviceStatus: DeviceStatus = {
              deviceId: deviceId,
              deviceName: device.name || (deviceStatusData.device_name as string) || 'Unknown Device',
              isOnline: (deviceStatusData.online as boolean) || false,
              lastSeen: (deviceStatusData.last_online_time as number) || Date.now(),
              mqttConnected: (deviceStatusData.online as boolean) || false,
              ipAddress: deviceStatusData.client_ip as string | undefined,
              signalStrength: undefined, // Not available in new API
              batteryLevel: undefined, // Not available in new API
              productId: productId
            };
            
            deviceStatuses.push(deviceStatus);
            console.log('[DeviceMessageService] Device status retrieved via MCP:', {
              deviceId,
              deviceName: deviceStatus.deviceName,
              isOnline: deviceStatus.isOnline,
              mqttConnected: deviceStatus.mqttConnected
            });
          } else {
            // If MCP call failed, create offline status
            console.warn('[DeviceMessageService] MCP device status call failed for device:', {
              deviceId,
              productId,
              deviceName,
              error: mcpResult.error
            });
            
            const offlineStatus: DeviceStatus = {
              deviceId: deviceId,
              deviceName: device.name || 'Unknown Device',
              isOnline: false,
              lastSeen: Date.now(),
              mqttConnected: false,
              productId: productId
            };
            
            deviceStatuses.push(offlineStatus);
          }
        } catch (error) {
          console.error('[DeviceMessageService] Error getting device status via MCP:', {
            deviceId: device.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Add offline status for failed devices
          const offlineStatus: DeviceStatus = {
            deviceId: device.id || `device_${Date.now()}`,
            deviceName: device.name || 'Unknown Device',
            isOnline: false,
            lastSeen: Date.now(),
            mqttConnected: false,
            productId: this.parseDeviceId(device.id || `device_${Date.now()}`).productId
          };
          
          deviceStatuses.push(offlineStatus);
        }
      });

      // Wait for all MCP calls to complete
      await Promise.all(syncPromises);
      
      // Update connected devices with real MCP status
      this.updateConnectedDevicesFromMcp(deviceStatuses);
      
      console.log('[DeviceMessageService] Devices synced via MCP service:', {
        totalDevices: devices.length,
        onlineDevices: deviceStatuses.filter(d => d.isOnline && d.mqttConnected).length,
        offlineDevices: deviceStatuses.filter(d => !d.isOnline || !d.mqttConnected).length
      });
    } catch (error) {
      console.error('[DeviceMessageService] Failed to sync devices via MCP:', error);
      
      // Fallback to local device management if MCP sync fails
      console.log('[DeviceMessageService] Falling back to local device management');
      this.updateConnectedDevicesFromLocal(devices);
    }
  }

  // Update connection status from local device list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // Use hardcoded product ID and device ID as device name
      return { productId: 'H3PI4FBTV5', deviceName: deviceId };
    }
  }

  // Parse device ID from device record with proper product_id and device_name
  private parseDeviceIdFromRecord(device: DeviceRecord): { productId: string; deviceName: string } {
    // Use device_name and product_id from device record if available
    const productId = device.productId || 'H3PI4FBTV5';
    const deviceName = device.deviceName || device.id;
    
    return { productId, deviceName };
  }

  // Get Tencent IoT Cloud device statuses
  getTencentIoTDevices(): DeviceStatus[] {
    if (!this.tencentIoTEnabled) {
      return [];
    }
    // Return connected devices as DeviceStatus array
    return Array.from(this.connectedDevices.entries()).map(([deviceId, status]) => ({
      deviceId,
      deviceName: status.deviceName || 'Unknown Device',
      isOnline: status.isConnected,
      lastSeen: status.lastSeen || Date.now(),
      mqttConnected: status.isConnected,
      ipAddress: undefined,
      signalStrength: undefined,
      batteryLevel: undefined,
      productId: deviceId.includes(':') ? deviceId.split(':')[0] : 'DEFAULT_PRODUCT'
    }));
  }

  // Get real-time device status via MCP using device record
  async getDeviceStatusViaMcpWithRecord(device: DeviceRecord): Promise<{ success: boolean; data?: DeviceStatus; error?: string }> {
    try {
      if (!this.tencentIoTEnabled) {
        return {
          success: false,
          error: 'Tencent IoT Cloud not enabled'
        };
      }

      const { productId, deviceName } = this.parseDeviceIdFromRecord(device);
      
      console.log('[DeviceMessageService] Getting device status via MCP with record:', { 
        deviceId: device.id, 
        productId, 
        deviceName 
      });
      
      const mcpResult = await alayaMcpService.getDeviceStatus(productId, deviceName);
      
      if (mcpResult.success && mcpResult.data) {
        const mcpData = mcpResult.data as Record<string, unknown>;
        // Parse MCP response according to new API format
        const deviceStatusData = mcpData.device_status as Record<string, unknown> || {};
        const deviceStatus: DeviceStatus = {
          deviceId: device.id,
          deviceName: (deviceStatusData.device_name as string) || device.deviceName || 'Unknown Device',
          isOnline: (deviceStatusData.online as boolean) || false,
          lastSeen: (deviceStatusData.last_online_time as number) || Date.now(),
          mqttConnected: (deviceStatusData.online as boolean) || false,
          productId: productId
        };

        return {
          success: true,
          data: deviceStatus
        };
      } else {
        return {
          success: false,
          error: mcpResult.error || 'Failed to get device status from MCP'
        };
      }
    } catch (error) {
      console.error('[DeviceMessageService] Error getting device status via MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get real-time device status via MCP
  async getDeviceStatusViaMcp(deviceId: string): Promise<{ success: boolean; data?: DeviceStatus; error?: string }> {
    try {
      if (!this.tencentIoTEnabled) {
        return {
          success: false,
          error: 'Tencent IoT Cloud not enabled'
        };
      }

      const { productId, deviceName } = this.parseDeviceId(deviceId);
      
      console.log('[DeviceMessageService] Getting device status via MCP:', { deviceId, productId, deviceName });
      
      const mcpResult = await alayaMcpService.getDeviceStatus(productId, deviceName);
      
      if (mcpResult.success && mcpResult.data) {
        const mcpData = mcpResult.data as Record<string, unknown>;
        // Parse MCP response according to new API format
        const deviceStatusData = mcpData.device_status as Record<string, unknown> || {};
        const deviceStatus: DeviceStatus = {
          deviceId: deviceId,
          deviceName: (deviceStatusData.device_name as string) || 'Unknown Device',
          isOnline: (deviceStatusData.online as boolean) || false,
          lastSeen: (deviceStatusData.last_online_time as number) || Date.now(),
          mqttConnected: (deviceStatusData.online as boolean) || false,
          ipAddress: deviceStatusData.client_ip as string | undefined,
          signalStrength: undefined, // Not available in new API
          batteryLevel: undefined, // Not available in new API
          productId: productId
        };
        
        // Update local cache
        this.connectedDevices.set(deviceId, {
          isConnected: deviceStatus.isOnline || deviceStatus.mqttConnected,
          deviceName: deviceStatus.deviceName,
          deviceId: deviceStatus.deviceId,
          lastSeen: deviceStatus.lastSeen
        });
        
        return {
          success: true,
          data: deviceStatus
        };
      } else {
        return {
          success: false,
          error: mcpResult.error || 'Failed to get device status via MCP'
        };
      }
    } catch (error) {
      console.error('[DeviceMessageService] Error getting device status via MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Advanced MCP call method - directly call any mcp_pixelmug method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          result = await alayaMcpService.sendPixelArtMessage(productId, deviceName, message.content as unknown as Record<string, unknown>);
          break;
        case 'pixel_animation':
          result = await alayaMcpService.sendPixelAnimationMessage(productId, deviceName, message.content as unknown as Record<string, unknown>);
          break;
        case 'gif':
          result = await alayaMcpService.sendGifMessage(productId, deviceName, message.content as unknown as Record<string, unknown>);
          break;
        case 'text':
          result = await alayaMcpService.sendDisplayText(productId, deviceName, message.content as string);
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

  // Send message via MCP service
  private async sendMessageViaTencentIoT(deviceId: string, message: DeviceMessage): Promise<void> {
    try {
      // Parse deviceId to extract product_id and device_name
      const { productId, deviceName } = this.parseDeviceId(deviceId);

      // Send message via MCP service based on message type
      let result;
      if (message.type === 'pixel_art') {
        result = await alayaMcpService.sendPixelImage({
          product_id: productId,
          device_name: deviceName,
          image_data: message.content,
          target_width: message.metadata?.width || 16,
          target_height: message.metadata?.height || 16,
          use_cos: true,
          ttl_sec: 900
        });
      } else if (message.type === 'gif' || message.type === 'pixel_animation') {
        result = await alayaMcpService.sendGifAnimation({
          product_id: productId,
          device_name: deviceName,
          gif_data: message.content,
          frame_delay: message.metadata?.frame_delay || 100,
          loop_count: message.metadata?.loop_count || 0,
          target_width: message.metadata?.width || 16,
          target_height: message.metadata?.height || 16,
          use_cos: true,
          ttl_sec: 900
        });
      } else {
        // For text messages, use send_display_text method
        result = await alayaMcpService.sendDisplayText(productId, deviceName, message.content as string);
      }

      if (!result.success) {
        throw new Error('Failed to send message via MCP: ' + result.error);
      }

      console.log('[DeviceMessageService] Message sent via MCP:', {
        deviceId,
        messageType: message.type,
        productId,
        deviceName
      });
    } catch (error) {
      console.error('[DeviceMessageService] Failed to send message via MCP:', error);
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
      // MCP service doesn't need explicit disconnect
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
