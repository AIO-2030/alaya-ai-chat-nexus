// Device Status Management Hook
import { useState, useEffect, useCallback } from 'react';
import { deviceMessageService } from '../services/deviceMessageService';
import { initializeDeviceMessageService, getDeviceConnectionSummary } from '../services/deviceMessageServiceInit';
import { alayaMcpService } from '../services/alayaMcpService';
import { PixelArtInfo, GifInfo } from '../services/api/chatApi';

export interface DeviceStatus {
  id: string;
  name: string;
  isConnected: boolean;
  lastSeen?: number;
  isOnline?: boolean;
  mqttConnected?: boolean;
  ipAddress?: string;
  signalStrength?: number;
  batteryLevel?: number;
  productId?: string;
  deviceName?: string;
}

export interface DeviceStatusSummary {
  totalDevices: number;
  connectedDevices: number;
  tencentIoTEnabled: boolean;
  deviceList: DeviceStatus[];
}

export function useDeviceStatus() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusSummary>({
    totalDevices: 0,
    connectedDevices: 0,
    tencentIoTEnabled: false,
    deviceList: []
  });

  // Initialize device message service using MCP
  const initializeService = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[useDeviceStatus] Initializing device service via MCP...');
      
      // Initialize device message service (this will test MCP availability and sync devices from canister)
      const success = await initializeDeviceMessageService();
      if (success) {
        setIsInitialized(true);
        console.log('[useDeviceStatus] Device message service initialized successfully via MCP');
      } else {
        console.warn('[useDeviceStatus] Device message service initialization failed, using MCP-only mode');
        setIsInitialized(true); // Still mark as initialized for MCP-only mode
      }
    } catch (err) {
      console.error('[useDeviceStatus] Failed to initialize device service via MCP:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize device service');
      setIsInitialized(true); // Mark as initialized even on error to prevent infinite loading
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update device status using MCP service
  const updateDeviceStatus = useCallback(async () => {
    try {
      // First get the basic device summary from the existing service
      const summary = getDeviceConnectionSummary();
      
      // If we have devices, try to get their online status via MCP
      if (summary.deviceList.length > 0) {
        const updatedDevices = await Promise.all(
          summary.deviceList.map(async (device) => {
            try {
              // Convert basic device to extended device type
              const extendedDevice: DeviceStatus = {
                ...device,
                productId: device.id.includes(':') ? device.id.split(':')[0] : 'DEFAULT_PRODUCT',
                deviceName: device.id.includes(':') ? device.id.split(':')[1] : device.id,
                isOnline: device.isConnected,
                mqttConnected: device.isConnected,
                ipAddress: undefined,
                signalStrength: undefined,
                batteryLevel: undefined
              };
              
              // Use MCP to get device status
              const mcpResult = await alayaMcpService.getDeviceStatus(
                extendedDevice.productId!, 
                extendedDevice.deviceName!
              );
              
              if (mcpResult.success && mcpResult.data) {
                const mcpData = mcpResult.data as Record<string, unknown>;
                return {
                  ...extendedDevice,
                  isOnline: mcpData.is_online as boolean || extendedDevice.isOnline,
                  mqttConnected: mcpData.mqtt_connected as boolean || extendedDevice.mqttConnected,
                  lastSeen: mcpData.last_seen as number || extendedDevice.lastSeen,
                  ipAddress: mcpData.ip_address as string || extendedDevice.ipAddress,
                  signalStrength: mcpData.signal_strength as number || extendedDevice.signalStrength,
                  batteryLevel: mcpData.battery_level as number || extendedDevice.batteryLevel,
                  isConnected: (mcpData.is_online as boolean) || extendedDevice.isConnected
                };
              }
              
              // Fallback to extended device data if MCP call fails
              return extendedDevice;
            } catch (mcpError) {
              console.warn(`[useDeviceStatus] MCP status check failed for device ${device.id}:`, mcpError);
              // Return extended device with original data
              return {
                ...device,
                productId: device.id.includes(':') ? device.id.split(':')[0] : 'DEFAULT_PRODUCT',
                deviceName: device.id.includes(':') ? device.id.split(':')[1] : device.id,
                isOnline: device.isConnected,
                mqttConnected: device.isConnected,
                ipAddress: undefined,
                signalStrength: undefined,
                batteryLevel: undefined
              };
            }
          })
        );
        
        // Update the summary with MCP-enhanced device data
        const updatedSummary = {
          ...summary,
          deviceList: updatedDevices,
          connectedDevices: updatedDevices.filter(device => device.isConnected).length
        };
        
        setDeviceStatus(updatedSummary);
      } else {
        // No devices to check, just use the original summary
        setDeviceStatus(summary);
      }
    } catch (err) {
      console.error('[useDeviceStatus] Failed to update device status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update device status');
    }
  }, []);

  // Send message to devices
  const sendMessageToDevices = useCallback(async (message: string) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendTextToDevices(message);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send message to devices:', err);
      throw err;
    }
  }, [isInitialized]);

  // Send pixel art to devices
  const sendPixelArtToDevices = useCallback(async (pixelArt: PixelArtInfo) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendPixelArtToDevices(pixelArt);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send pixel art to devices:', err);
      throw err;
    }
  }, [isInitialized]);

  // Send pixel art via ALAYA MCP (direct method)
  const sendPixelArtViaAlayaMcp = useCallback(async (deviceId: string, pixelArt: Record<string, unknown>) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendPixelArtViaAlayaMcp(deviceId, pixelArt);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send pixel art via ALAYA MCP:', err);
      throw err;
    }
  }, [isInitialized]);

  // Send GIF to devices
  const sendGifToDevices = useCallback(async (gifInfo: GifInfo) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendGifToDevices(gifInfo);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send GIF to devices:', err);
      throw err;
    }
  }, [isInitialized]);

  // Send pixel animation via ALAYA MCP (direct method)
  const sendPixelAnimationViaAlayaMcp = useCallback(async (deviceId: string, animationData: Record<string, unknown>) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendPixelAnimationViaAlayaMcp(deviceId, animationData);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send pixel animation via ALAYA MCP:', err);
      throw err;
    }
  }, [isInitialized]);

  // Send GIF via ALAYA MCP (direct method)
  const sendGifViaAlayaMcp = useCallback(async (deviceId: string, gifData: Record<string, unknown>) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendGifViaAlayaMcp(deviceId, gifData);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send GIF via ALAYA MCP:', err);
      throw err;
    }
  }, [isInitialized]);

  // Send text via ALAYA MCP (direct method)
  const sendTextViaAlayaMcp = useCallback(async (deviceId: string, text: string) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendTextViaAlayaMcp(deviceId, text);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send text via ALAYA MCP:', err);
      throw err;
    }
  }, [isInitialized]);

  // Get device status via MCP (direct method)
  const getDeviceStatusViaMcp = useCallback(async (productId: string, deviceName: string) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await alayaMcpService.getDeviceStatus(productId, deviceName);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to get device status via MCP:', err);
      throw err;
    }
  }, [isInitialized]);

  // Refresh device status manually
  const refreshDeviceStatus = useCallback(async () => {
    try {
      if (!isInitialized) {
        await initializeService();
      }
      
      await deviceMessageService.syncDevicesFromCanister();
      await updateDeviceStatus();
    } catch (err) {
      console.error('[useDeviceStatus] Failed to refresh device status:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh device status');
    }
  }, [isInitialized, initializeService, updateDeviceStatus]);

  // Initialize on mount
  useEffect(() => {
    initializeService();
  }, [initializeService]);

  // Set up periodic status updates
  useEffect(() => {
    if (!isInitialized) return;

    // Initial status update
    updateDeviceStatus();

    // Set up interval for periodic updates with MCP status checks
    const interval = setInterval(async () => {
      await updateDeviceStatus();
    }, 10000); // Update every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, updateDeviceStatus]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    deviceStatus,
    
    // Computed values
    hasConnectedDevices: deviceStatus.connectedDevices > 0,
    isTencentIoTEnabled: deviceStatus.tencentIoTEnabled,
    
    // Actions
    refreshDeviceStatus,
    sendMessageToDevices,
    sendPixelArtToDevices,
    sendGifToDevices,
    
    // ALAYA MCP direct methods
    sendPixelArtViaAlayaMcp,
    sendPixelAnimationViaAlayaMcp,
    sendGifViaAlayaMcp,
    sendTextViaAlayaMcp,
    getDeviceStatusViaMcp,
    
    // Utilities
    getDeviceById: (id: string) => deviceStatus.deviceList.find(device => device.id === id),
    getConnectedDevices: () => deviceStatus.deviceList.filter(device => device.isConnected),
  };
}
