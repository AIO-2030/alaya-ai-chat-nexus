// Tencent IoT Cloud Service - Manage device connection status and MQTT communication
import { DeviceRecord } from './api/deviceApi';
import { tencentSTSService, STSToken } from './tencentSTS';

// Tencent IoT Cloud configuration interface
export interface TencentIoTConfig {
  productId: string;
  deviceName: string;
  region: string;
  brokerUrl: string;
  clientId: string;
}

// Device connection status interface
export interface TencentDeviceStatus {
  deviceId: string;
  deviceName: string;
  isOnline: boolean;
  lastSeen: number;
  mqttConnected: boolean;
  ipAddress?: string;
  signalStrength?: number;
  batteryLevel?: number;
}

// MQTT message interface
export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}

class TencentIoTService {
  private config: TencentIoTConfig | null = null;
  private mqttClient: any = null;
  private deviceStatuses: Map<string, TencentDeviceStatus> = new Map();
  private statusUpdateCallbacks: ((statuses: TencentDeviceStatus[]) => void)[] = [];
  private currentSTSToken: STSToken | null = null;

  constructor() {
    this.initializeConfig();
  }

  // Initialize Tencent IoT Cloud configuration
  private initializeConfig(): void {
    // Read Tencent IoT Cloud configuration from environment variables or config file
    this.config = {
      productId: import.meta.env.VITE_TENCENT_IOT_PRODUCT_ID || 'your_product_id',
      deviceName: import.meta.env.VITE_TENCENT_IOT_DEVICE_NAME || 'your_device_name',
      region: import.meta.env.VITE_TENCENT_IOT_REGION || 'ap-beijing',
      brokerUrl: import.meta.env.VITE_TENCENT_IOT_BROKER_URL || 'ssl://your_broker_url:8883',
      clientId: import.meta.env.VITE_TENCENT_IOT_CLIENT_ID || 'your_client_id'
    };
  }

  // Connect to Tencent IoT Cloud MQTT Broker
  async connectToTencentIoT(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('Tencent IoT Cloud configuration not initialized');
      }

      console.log('[TencentIoTService] Connecting to Tencent IoT Cloud MQTT Broker...');

      // Get STS token for authentication
      const stsToken = await tencentSTSService.getSTSToken();
      this.currentSTSToken = stsToken;

      // Dynamically import MQTT client library
      const mqtt = await import('mqtt');
      
      // Build MQTT connection options using STS token
      const connectOptions = {
        clientId: this.config.clientId,
        username: `${this.config.productId}${this.config.deviceName}`,
        password: stsToken.credentials.token, // Use STS token as password
        keepalive: 60,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
      };

      // Connect to MQTT Broker
      this.mqttClient = mqtt.connect(this.config.brokerUrl, connectOptions);

      // Set up connection event listeners
      this.mqttClient.on('connect', () => {
        console.log('[TencentIoTService] Connected to Tencent IoT Cloud MQTT Broker');
        this.subscribeToDeviceTopics();
      });

      this.mqttClient.on('error', (error: any) => {
        console.error('[TencentIoTService] MQTT connection error:', error);
      });

      this.mqttClient.on('close', () => {
        console.log('[TencentIoTService] MQTT connection closed');
      });

      this.mqttClient.on('reconnect', async () => {
        console.log('[TencentIoTService] Reconnecting to MQTT Broker...');
        // Refresh STS token on reconnect
        await this.refreshSTSToken();
      });

      // Set up token refresh interval
      this.setupTokenRefresh();

      return true;
    } catch (error) {
      console.error('[TencentIoTService] Failed to connect to Tencent IoT Cloud:', error);
      return false;
    }
  }

  // Subscribe to device-related topics
  private subscribeToDeviceTopics(): void {
    if (!this.mqttClient || !this.config) return;

    // Subscribe to device status topic
    const statusTopic = `$thing/status/${this.config.productId}/${this.config.deviceName}`;
    this.mqttClient.subscribe(statusTopic, { qos: 1 }, (error: any) => {
      if (error) {
        console.error('[TencentIoTService] Failed to subscribe to device status topic:', error);
      } else {
        console.log('[TencentIoTService] Subscribed to device status topic:', statusTopic);
      }
    });

    // Subscribe to device property topic
    const propertyTopic = `$thing/property/${this.config.productId}/${this.config.deviceName}`;
    this.mqttClient.subscribe(propertyTopic, { qos: 1 }, (error: any) => {
      if (error) {
        console.error('[TencentIoTService] Failed to subscribe to device property topic:', error);
      } else {
        console.log('[TencentIoTService] Subscribed to device property topic:', propertyTopic);
      }
    });

    // Set up message handling
    this.mqttClient.on('message', (topic: string, message: Uint8Array) => {
      this.handleMQTTMessage(topic, new TextDecoder().decode(message));
    });
  }

  // Handle MQTT messages
  private handleMQTTMessage(topic: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      if (topic.includes('/status/')) {
        this.handleDeviceStatusMessage(data);
      } else if (topic.includes('/property/')) {
        this.handleDevicePropertyMessage(data);
      }
    } catch (error) {
      console.error('[TencentIoTService] Failed to handle MQTT message:', error);
    }
  }

  // Handle device status messages
  private handleDeviceStatusMessage(data: any): void {
    const deviceStatus: TencentDeviceStatus = {
      deviceId: data.deviceId || this.config?.deviceName || 'unknown',
      deviceName: data.deviceName || 'Unknown Device',
      isOnline: data.status === 'online',
      lastSeen: Date.now(),
      mqttConnected: true,
      ipAddress: data.ipAddress,
      signalStrength: data.signalStrength,
      batteryLevel: data.batteryLevel
    };

    this.deviceStatuses.set(deviceStatus.deviceId, deviceStatus);
    this.notifyStatusUpdate();
  }

  // Handle device property messages
  private handleDevicePropertyMessage(data: any): void {
    // Update device property information
    console.log('[TencentIoTService] Received device property message:', data);
  }

  // Notify status updates
  private notifyStatusUpdate(): void {
    const statuses = Array.from(this.deviceStatuses.values());
    this.statusUpdateCallbacks.forEach(callback => {
      try {
        callback(statuses);
      } catch (error) {
        console.error('[TencentIoTService] Status update callback failed:', error);
      }
    });
  }

  // Register status update callback
  onDeviceStatusUpdate(callback: (statuses: TencentDeviceStatus[]) => void): void {
    this.statusUpdateCallbacks.push(callback);
  }

  // Remove status update callback
  removeStatusUpdateCallback(callback: (statuses: TencentDeviceStatus[]) => void): void {
    const index = this.statusUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusUpdateCallbacks.splice(index, 1);
    }
  }

  // Get all device statuses
  getDeviceStatuses(): TencentDeviceStatus[] {
    return Array.from(this.deviceStatuses.values());
  }

  // Get online device statuses
  getOnlineDevices(): TencentDeviceStatus[] {
    return Array.from(this.deviceStatuses.values()).filter(device => device.isOnline);
  }

  // Get device status by device ID
  getDeviceStatus(deviceId: string): TencentDeviceStatus | undefined {
    return this.deviceStatuses.get(deviceId);
  }

  // Send message to device
  async sendMessageToDevice(deviceId: string, message: MQTTMessage): Promise<boolean> {
    try {
      if (!this.mqttClient || !this.config) {
        throw new Error('MQTT client not connected');
      }

      const topic = `$thing/down/property/${this.config.productId}/${deviceId}`;
      
      return new Promise((resolve, reject) => {
        this.mqttClient.publish(topic, message.payload, { qos: message.qos, retain: message.retain }, (error: any) => {
          if (error) {
            console.error('[TencentIoTService] Failed to send message:', error);
            reject(error);
          } else {
            console.log('[TencentIoTService] Message sent successfully:', { deviceId, topic });
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('[TencentIoTService] Failed to send message to device:', error);
      return false;
    }
  }

  // Sync device list from backend canister
  async syncDevicesFromCanister(devices: DeviceRecord[]): Promise<void> {
    try {
      console.log('[TencentIoTService] Syncing device list from canister:', devices.length, 'devices');
      
      // Create initial status for each device
      devices.forEach(device => {
        // Use the device name from the canister record (which should be the generated Tencent device name)
        const deviceStatus: TencentDeviceStatus = {
          deviceId: device.id,
          deviceName: device.name, // Use the device name from canister (generated Tencent device name)
          isOnline: false, // Initial status is offline, waiting for MQTT status update
          lastSeen: device.lastSeen || Date.now(),
          mqttConnected: false,
          ipAddress: device.metadata?.ipAddress,
          signalStrength: device.metadata?.signalStrength ? Number(device.metadata.signalStrength) : undefined,
          batteryLevel: device.metadata?.batteryLevel ? Number(device.metadata.batteryLevel) : undefined
        };

        this.deviceStatuses.set(device.id, deviceStatus);
      });

      this.notifyStatusUpdate();
    } catch (error) {
      console.error('[TencentIoTService] Failed to sync device list:', error);
    }
  }

  // Disconnect
  disconnect(): void {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }
    this.deviceStatuses.clear();
    this.statusUpdateCallbacks = [];
  }

  // Check connection status
  isConnected(): boolean {
    return this.mqttClient && this.mqttClient.connected;
  }

  // Get configuration information
  getConfig(): TencentIoTConfig | null {
    return this.config;
  }

  // Setup automatic token refresh
  private setupTokenRefresh(): void {
    // Check token every 5 minutes
    setInterval(async () => {
      if (this.mqttClient && this.mqttClient.connected) {
        await this.refreshSTSToken();
      }
    }, 5 * 60 * 1000);
  }

  // Refresh STS token
  private async refreshSTSToken(): Promise<void> {
    try {
      console.log('[TencentIoTService] Refreshing STS token...');
      const newToken = await tencentSTSService.refreshTokenIfNeeded();
      if (newToken) {
        this.currentSTSToken = newToken;
        console.log('[TencentIoTService] STS token refreshed successfully');
      }
    } catch (error) {
      console.error('[TencentIoTService] Failed to refresh STS token:', error);
    }
  }

  // Get current STS token
  getCurrentSTSToken(): STSToken | null {
    return this.currentSTSToken;
  }

  // Check if STS token is valid
  isSTSTokenValid(): boolean {
    return tencentSTSService.isTokenValid();
  }
}

// Export singleton instance
export const tencentIoTService = new TencentIoTService();
