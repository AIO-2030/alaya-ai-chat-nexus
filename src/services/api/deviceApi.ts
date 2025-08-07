// Device API Service - Handle backend communication for device management
import { DeviceRecord, WiFiNetwork, BluetoothDevice } from '../deviceService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DeviceListResponse {
  devices: DeviceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface DeviceConnectionRequest {
  deviceId: string;
  wifiNetwork: string;
  password?: string;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSeen?: string;
}

class DeviceApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get device list
  async getDevices(page: number = 1, limit: number = 10): Promise<ApiResponse<DeviceListResponse>> {
    return this.request<DeviceListResponse>(`/devices?page=${page}&limit=${limit}`);
  }

  // Get single device
  async getDevice(deviceId: string): Promise<ApiResponse<DeviceRecord>> {
    return this.request<DeviceRecord>(`/devices/${deviceId}`);
  }

  // Submit device record
  async submitDeviceRecord(record: DeviceRecord): Promise<ApiResponse<DeviceRecord>> {
    return this.request<DeviceRecord>('/devices', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  // Update device status
  async updateDeviceStatus(update: DeviceStatusUpdate): Promise<ApiResponse<DeviceRecord>> {
    return this.request<DeviceRecord>(`/devices/${update.deviceId}/status`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // Disconnect device
  async disconnectDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    return this.request<boolean>(`/devices/${deviceId}/disconnect`, {
      method: 'POST',
    });
  }

  // Delete device
  async deleteDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    return this.request<boolean>(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Scan WiFi networks
  async scanWiFiNetworks(): Promise<ApiResponse<WiFiNetwork[]>> {
    return this.request<WiFiNetwork[]>('/devices/scan/wifi', {
      method: 'POST',
    });
  }

  // Scan Bluetooth devices
  async scanBluetoothDevices(): Promise<ApiResponse<BluetoothDevice[]>> {
    return this.request<BluetoothDevice[]>('/devices/scan/bluetooth', {
      method: 'POST',
    });
  }

  // Connect device to WiFi
  async connectDeviceToWifi(request: DeviceConnectionRequest): Promise<ApiResponse<boolean>> {
    return this.request<boolean>('/devices/connect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get device statistics
  async getDeviceStats(): Promise<ApiResponse<{
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  }>> {
    return this.request('/devices/stats');
  }

  // Get device logs
  async getDeviceLogs(deviceId: string, limit: number = 50): Promise<ApiResponse<{
    logs: Array<{
      timestamp: string;
      level: 'info' | 'warning' | 'error';
      message: string;
    }>;
  }>> {
    return this.request(`/devices/${deviceId}/logs?limit=${limit}`);
  }

  // Test device connection
  async testDeviceConnection(deviceId: string): Promise<ApiResponse<{
    connected: boolean;
    latency?: number;
    signalStrength?: number;
  }>> {
    return this.request(`/devices/${deviceId}/test-connection`, {
      method: 'POST',
    });
  }

  // Get device configuration
  async getDeviceConfig(deviceId: string): Promise<ApiResponse<{
    wifi: {
      ssid: string;
      security: string;
      signalStrength: number;
    };
    bluetooth: {
      name: string;
      address: string;
      rssi: number;
    };
    system: {
      firmware: string;
      uptime: number;
      temperature: number;
    };
  }>> {
    return this.request(`/devices/${deviceId}/config`);
  }

  // Update device configuration
  async updateDeviceConfig(
    deviceId: string,
    config: {
      wifi?: {
        ssid: string;
        password?: string;
      };
      bluetooth?: {
        name: string;
        discoverable: boolean;
      };
      system?: {
        autoConnect: boolean;
        powerSaving: boolean;
      };
    }
  ): Promise<ApiResponse<boolean>> {
    return this.request(`/devices/${deviceId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Restart device
  async restartDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    return this.request(`/devices/${deviceId}/restart`, {
      method: 'POST',
    });
  }

  // Factory reset device
  async factoryResetDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    return this.request(`/devices/${deviceId}/factory-reset`, {
      method: 'POST',
    });
  }
}

export const deviceApiService = new DeviceApiService(); 