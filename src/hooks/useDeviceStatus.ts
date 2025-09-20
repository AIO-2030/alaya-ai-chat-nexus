// Device Status Management Hook
import { useState, useEffect, useCallback } from 'react';
import { deviceMessageService } from '../services/deviceMessageService';
import { initializeDeviceMessageService, getDeviceConnectionSummary } from '../services/deviceMessageServiceInit';

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

  // Initialize device message service
  const initializeService = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await initializeDeviceMessageService();
      if (success) {
        setIsInitialized(true);
        console.log('[useDeviceStatus] Device message service initialized successfully');
      } else {
        console.warn('[useDeviceStatus] Device message service initialization failed, using fallback mode');
        setIsInitialized(true); // Still mark as initialized for fallback mode
      }
    } catch (err) {
      console.error('[useDeviceStatus] Failed to initialize device message service:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize device service');
      setIsInitialized(true); // Mark as initialized even on error to prevent infinite loading
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update device status
  const updateDeviceStatus = useCallback(() => {
    try {
      const summary = getDeviceConnectionSummary();
      setDeviceStatus(summary);
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
  const sendPixelArtToDevices = useCallback(async (pixelArt: any) => {
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
  const sendPixelArtViaAlayaMcp = useCallback(async (deviceId: string, pixelArt: any) => {
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
  const sendGifToDevices = useCallback(async (gifInfo: any) => {
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
  const sendPixelAnimationViaAlayaMcp = useCallback(async (deviceId: string, animationData: any) => {
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
  const sendGifViaAlayaMcp = useCallback(async (deviceId: string, gifData: any) => {
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

  // Refresh device status manually
  const refreshDeviceStatus = useCallback(async () => {
    try {
      if (!isInitialized) {
        await initializeService();
      }
      
      await deviceMessageService.syncDevicesFromCanister();
      updateDeviceStatus();
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

    // Set up interval for periodic updates
    const interval = setInterval(updateDeviceStatus, 10000); // Update every 10 seconds

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
    
    // Utilities
    getDeviceById: (id: string) => deviceStatus.deviceList.find(device => device.id === id),
    getConnectedDevices: () => deviceStatus.deviceList.filter(device => device.isConnected),
  };
}
