// Global Device Status Service - Centralized device status management
// Supports both own devices and contact devices with real-time status updates

import { DeviceRecord } from './api/deviceApi';
import { alayaMcpService } from './alayaMcpService';
import { deviceApiService } from './api/deviceApi';
import type { DeviceStatus as BackendDeviceStatus } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// Device status with real-time connection information
export interface DeviceStatusInfo {
  deviceId: string;
  deviceName: string;
  name: string;
  productId?: string;
  ownerPrincipalId: string;
  // Backend stored status
  backendStatus: BackendDeviceStatus;
  // Real-time connection status (from MCP)
  isOnline: boolean;
  mqttConnected: boolean;
  lastSeen?: number;
  lastUpdated: number; // Timestamp when this status was last updated
  ipAddress?: string;
  signalStrength?: number;
  batteryLevel?: number;
}

// Global device status storage structure
interface GlobalDeviceStatusState {
  // Own devices: deviceId -> DeviceStatusInfo
  ownDevices: Map<string, DeviceStatusInfo>;
  // Contact devices: ownerPrincipalId -> Map<deviceId, DeviceStatusInfo>
  contactDevices: Map<string, Map<string, DeviceStatusInfo>>;
  // Last update timestamp
  lastUpdateTime: number;
}

// Listener callback type
type DeviceStatusListener = (state: GlobalDeviceStatusState) => void;

class GlobalDeviceStatusService {
  private static instance: GlobalDeviceStatusService;
  private state: GlobalDeviceStatusState = {
    ownDevices: new Map(),
    contactDevices: new Map(),
    lastUpdateTime: 0,
  };
  private listeners: Set<DeviceStatusListener> = new Set();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly CACHE_DURATION = 4 * 60 * 1000; // 4 minutes cache for MCP calls

  private constructor() {
    console.log('[GlobalDeviceStatusService] Service initialized');
  }

  static getInstance(): GlobalDeviceStatusService {
    if (!GlobalDeviceStatusService.instance) {
      GlobalDeviceStatusService.instance = new GlobalDeviceStatusService();
    }
    return GlobalDeviceStatusService.instance;
  }

  // Subscribe to status updates
  subscribe(listener: DeviceStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[GlobalDeviceStatusService] Error in listener:', error);
      }
    });
  }

  // Get own device status
  getOwnDeviceStatus(deviceId: string): DeviceStatusInfo | undefined {
    return this.state.ownDevices.get(deviceId);
  }

  // Get all own devices
  getAllOwnDevices(): DeviceStatusInfo[] {
    return Array.from(this.state.ownDevices.values());
  }

  // Get contact device status
  getContactDeviceStatus(ownerPrincipalId: string, deviceId: string): DeviceStatusInfo | undefined {
    const contactDevices = this.state.contactDevices.get(ownerPrincipalId);
    return contactDevices?.get(deviceId);
  }

  // Get all devices for a contact
  getContactDevices(ownerPrincipalId: string): DeviceStatusInfo[] {
    const contactDevices = this.state.contactDevices.get(ownerPrincipalId);
    return contactDevices ? Array.from(contactDevices.values()) : [];
  }

  // Update own device status
  async updateOwnDeviceStatus(device: DeviceRecord, realTimeStatus?: {
    isOnline: boolean;
    mqttConnected: boolean;
    lastSeen?: number;
    ipAddress?: string;
  }): Promise<void> {
    const statusInfo: DeviceStatusInfo = {
      deviceId: device.id,
      deviceName: device.deviceName || device.name,
      name: device.name,
      productId: 'H3PI4FBTV5', // Always use fixed productId, not from device record
      ownerPrincipalId: device.owner,
      backendStatus: device.status,
      isOnline: realTimeStatus?.isOnline ?? ('Online' in device.status),
      mqttConnected: realTimeStatus?.mqttConnected ?? false,
      lastSeen: realTimeStatus?.lastSeen ?? device.lastSeen,
      lastUpdated: Date.now(),
      ipAddress: realTimeStatus?.ipAddress,
    };

    this.state.ownDevices.set(device.id, statusInfo);
    this.state.lastUpdateTime = Date.now();
    this.notifyListeners();
  }

  // Update contact device status
  async updateContactDeviceStatus(
    ownerPrincipalId: string,
    device: DeviceRecord,
    realTimeStatus?: {
      isOnline: boolean;
      mqttConnected: boolean;
      lastSeen?: number;
      ipAddress?: string;
    }
  ): Promise<void> {
    if (!this.state.contactDevices.has(ownerPrincipalId)) {
      this.state.contactDevices.set(ownerPrincipalId, new Map());
    }

    const contactDevices = this.state.contactDevices.get(ownerPrincipalId)!;
    const statusInfo: DeviceStatusInfo = {
      deviceId: device.id,
      deviceName: device.deviceName || device.name,
      name: device.name,
      productId: 'H3PI4FBTV5', // Always use fixed productId, not from device record
      ownerPrincipalId: device.owner,
      backendStatus: device.status,
      isOnline: realTimeStatus?.isOnline ?? ('Online' in device.status),
      mqttConnected: realTimeStatus?.mqttConnected ?? false,
      lastSeen: realTimeStatus?.lastSeen ?? device.lastSeen,
      lastUpdated: Date.now(),
      ipAddress: realTimeStatus?.ipAddress,
    };

    contactDevices.set(device.id, statusInfo);
    this.state.lastUpdateTime = Date.now();
    this.notifyListeners();
  }

  // Refresh own devices status from backend and MCP
  async refreshOwnDevices(ownerPrincipalId: string): Promise<void> {
    try {
      console.log('[GlobalDeviceStatusService] Refreshing own devices for:', ownerPrincipalId);
      
      // Get devices from backend
      const response = await deviceApiService.getDevicesByOwner(ownerPrincipalId, 0, 100);
      
      if (!response.success || !response.data) {
        console.warn('[GlobalDeviceStatusService] Failed to get own devices from backend');
        return;
      }

      const devices = response.data.devices;
      console.log(`[GlobalDeviceStatusService] Found ${devices.length} own devices`);

      // Update status for each device with real-time MCP data
      await Promise.all(
        devices.map(async (device) => {
          try {
            // Try to get real-time status from MCP
            let realTimeStatus: {
              isOnline: boolean;
              mqttConnected: boolean;
              lastSeen?: number;
              ipAddress?: string;
            } | undefined;

            // Use default productId (same as other services)
            // productId should always be H3PI4FBTV5, not from device record
            const productId = 'H3PI4FBTV5';
            let deviceName = device.deviceName?.trim() || device.name?.trim();
            
            // Check if this is a development board and map to production device name
            if (deviceName === '142B2F6AF8B4') {
              console.log('[GlobalDeviceStatusService] Development board detected, mapping to production device name');
              deviceName = '3CDC7580F950';
            }
            
            if (deviceName && deviceName.length > 0) {
              try {
                console.log(`[GlobalDeviceStatusService] Checking MCP status for device ${device.id}: productId=${productId}, deviceName=${deviceName}`);
                
                const mcpResult = await alayaMcpService.getDeviceStatus(
                  productId,
                  deviceName
                );

                if (mcpResult.success && mcpResult.data) {
                  const mcpData = mcpResult.data as Record<string, unknown>;
                  const deviceStatusData = mcpData.device_status as Record<string, unknown> || {};
                  
                  realTimeStatus = {
                    isOnline: (deviceStatusData.online as boolean) || false,
                    mqttConnected: (deviceStatusData.online as boolean) || false,
                    lastSeen: (deviceStatusData.last_online_time as number) || device.lastSeen,
                    ipAddress: deviceStatusData.client_ip as string,
                  };
                  
                  console.log(`[GlobalDeviceStatusService] MCP status for ${device.id}:`, realTimeStatus);
                } else if (mcpResult.error) {
                  // Log error but don't fail - use backend status as fallback
                  console.warn(`[GlobalDeviceStatusService] MCP call failed for ${device.id}:`, mcpResult.error);
                }
              } catch (mcpError) {
                // Log error but continue - use backend status as fallback
                console.warn(`[GlobalDeviceStatusService] MCP status check failed for ${device.id}:`, mcpError);
              }
            } else {
              console.log(`[GlobalDeviceStatusService] Skipping MCP check for ${device.id}: missing deviceName (deviceName=${deviceName})`);
            }

            // Update status even if MCP call failed (use backend status)
            await this.updateOwnDeviceStatus(device, realTimeStatus);
          } catch (error) {
            console.error(`[GlobalDeviceStatusService] Error updating device ${device.id}:`, error);
            // Continue with other devices even if one fails
          }
        })
      );

      console.log('[GlobalDeviceStatusService] Own devices refresh completed');
    } catch (error) {
      console.error('[GlobalDeviceStatusService] Error refreshing own devices:', error);
    }
  }

  // Refresh contact devices status from backend and MCP
  async refreshContactDevices(ownerPrincipalId: string): Promise<void> {
    try {
      console.log('[GlobalDeviceStatusService] Refreshing contact devices for:', ownerPrincipalId);
      
      // Get devices from backend
      const response = await deviceApiService.getDevicesByOwner(ownerPrincipalId, 0, 100);
      
      if (!response.success || !response.data) {
        console.warn('[GlobalDeviceStatusService] Failed to get contact devices from backend');
        return;
      }

      const devices = response.data.devices;
      console.log(`[GlobalDeviceStatusService] Found ${devices.length} contact devices`);

      // Update status for each device with real-time MCP data
      await Promise.all(
        devices.map(async (device) => {
          try {
            // Try to get real-time status from MCP
            let realTimeStatus: {
              isOnline: boolean;
              mqttConnected: boolean;
              lastSeen?: number;
              ipAddress?: string;
            } | undefined;

            // Use default productId (same as other services)
            // productId should always be H3PI4FBTV5, not from device record
            const productId = 'H3PI4FBTV5';
            let deviceName = device.deviceName?.trim() || device.name?.trim();
            
            // Check if this is a development board and map to production device name
            if (deviceName === '142B2F6AF8B4') {
              console.log('[GlobalDeviceStatusService] Development board detected, mapping to production device name');
              deviceName = '3CDC7580F950';
            }
            
            if (deviceName && deviceName.length > 0) {
              try {
                console.log(`[GlobalDeviceStatusService] Checking MCP status for contact device ${device.id}: productId=${productId}, deviceName=${deviceName}`);
                
                const mcpResult = await alayaMcpService.getDeviceStatus(
                  productId,
                  deviceName
                );

                if (mcpResult.success && mcpResult.data) {
                  const mcpData = mcpResult.data as Record<string, unknown>;
                  const deviceStatusData = mcpData.device_status as Record<string, unknown> || {};
                  
                  realTimeStatus = {
                    isOnline: (deviceStatusData.online as boolean) || false,
                    mqttConnected: (deviceStatusData.online as boolean) || false,
                    lastSeen: (deviceStatusData.last_online_time as number) || device.lastSeen,
                    ipAddress: deviceStatusData.client_ip as string,
                  };
                  
                  console.log(`[GlobalDeviceStatusService] MCP status for contact device ${device.id}:`, realTimeStatus);
                } else if (mcpResult.error) {
                  // Log error but don't fail - use backend status as fallback
                  console.warn(`[GlobalDeviceStatusService] MCP call failed for contact device ${device.id}:`, mcpResult.error);
                }
              } catch (mcpError) {
                // Log error but continue - use backend status as fallback
                console.warn(`[GlobalDeviceStatusService] MCP status check failed for contact device ${device.id}:`, mcpError);
              }
            } else {
              console.log(`[GlobalDeviceStatusService] Skipping MCP check for contact device ${device.id}: missing productId or deviceName (productId=${productId}, deviceName=${deviceName})`);
            }

            // Update status even if MCP call failed (use backend status)
            await this.updateContactDeviceStatus(ownerPrincipalId, device, realTimeStatus);
          } catch (error) {
            console.error(`[GlobalDeviceStatusService] Error updating contact device ${device.id}:`, error);
            // Continue with other devices even if one fails
          }
        })
      );

      console.log('[GlobalDeviceStatusService] Contact devices refresh completed');
    } catch (error) {
      console.error('[GlobalDeviceStatusService] Error refreshing contact devices:', error);
    }
  }

  // Start automatic refresh
  startAutoRefresh(ownerPrincipalId: string, contactPrincipalIds: string[] = []): void {
    if (this.updateInterval) {
      console.log('[GlobalDeviceStatusService] Auto-refresh already running');
      return;
    }

    console.log('[GlobalDeviceStatusService] Starting auto-refresh');
    
    // Initial refresh
    this.refreshOwnDevices(ownerPrincipalId);
    contactPrincipalIds.forEach(contactId => {
      this.refreshContactDevices(contactId);
    });

    // Set up interval
    this.updateInterval = setInterval(() => {
      this.refreshOwnDevices(ownerPrincipalId);
      contactPrincipalIds.forEach(contactId => {
        this.refreshContactDevices(contactId);
      });
    }, this.UPDATE_INTERVAL);
  }

  // Stop automatic refresh
  stopAutoRefresh(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[GlobalDeviceStatusService] Auto-refresh stopped');
    }
  }

  // Get current state (for debugging)
  getState(): GlobalDeviceStatusState {
    return {
      ownDevices: new Map(this.state.ownDevices),
      contactDevices: new Map(
        Array.from(this.state.contactDevices.entries()).map(([key, value]) => [
          key,
          new Map(value),
        ])
      ),
      lastUpdateTime: this.state.lastUpdateTime,
    };
  }

  // Clear all state
  clear(): void {
    this.state.ownDevices.clear();
    this.state.contactDevices.clear();
    this.state.lastUpdateTime = 0;
    this.notifyListeners();
  }
}

export const globalDeviceStatusService = GlobalDeviceStatusService.getInstance();

