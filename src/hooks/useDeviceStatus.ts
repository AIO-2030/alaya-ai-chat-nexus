// Device Status Management Hook
import { useState, useEffect, useCallback } from 'react';
import { deviceMessageService } from '../services/deviceMessageService';
import { initializeDeviceMessageService, getDeviceConnectionSummary } from '../services/deviceMessageServiceInit';
import { alayaMcpService } from '../services/alayaMcpService';
import { PixelArtInfo, GifInfo } from '../services/api/chatApi';
import { getPrincipalId } from '../lib/principal';

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
  // Initialize from localStorage to persist across page refreshes
  const [isInitialized, setIsInitialized] = useState(() => {
    const stored = localStorage.getItem('deviceServiceInitialized');
    return stored === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusSummary>({
    totalDevices: 0,
    connectedDevices: 0,
    tencentIoTEnabled: false,
    deviceList: []
  });

  // Helper function to persist initialization state
  const persistInitializedState = useCallback((value: boolean) => {
    setIsInitialized(value);
    localStorage.setItem('deviceServiceInitialized', value.toString());
    console.log('[useDeviceStatus] Device service initialized state updated:', value);
  }, []);

  // Initialize device message service using MCP
  const initializeService = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[useDeviceStatus] Initializing device service via MCP...');
      
      // Get current user's principal ID to filter devices
      const ownerPrincipal = getPrincipalId();
      console.log('[useDeviceStatus] Initializing with user principal:', ownerPrincipal);
      
      // Initialize device message service (this will test MCP availability and sync devices from canister)
      const success = await initializeDeviceMessageService();
      if (success) {
        console.log('[useDeviceStatus] Device message service initialized successfully via MCP');
        
        // Sync devices for the current user
        if (ownerPrincipal) {
          await deviceMessageService.syncDevicesFromCanister(ownerPrincipal);
        }
        
        // After initialization, check if we have any devices from canister
        const summary = getDeviceConnectionSummary();
        console.log('[useDeviceStatus] Initial device check from canister:', {
          totalDevices: summary.totalDevices,
          deviceListLength: summary.deviceList.length,
          tencentIoTEnabled: summary.tencentIoTEnabled
        });
        
        // If we have devices, mark as initialized and persist the state
        if (summary.deviceList.length > 0) {
          persistInitializedState(true);
          console.log('[useDeviceStatus] Found devices from canister, marking service as initialized');
        } else {
          console.log('[useDeviceStatus] No devices found in canister, will initialize on first device connection');
          // Don't mark as initialized yet - wait for first device to be added
        }
      } else {
        console.warn('[useDeviceStatus] Device message service initialization failed, using MCP-only mode');
        // Don't mark as initialized if service failed to initialize
      }
    } catch (err) {
      console.error('[useDeviceStatus] Failed to initialize device service via MCP:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize device service');
      // Don't mark as initialized on error
    } finally {
      setIsLoading(false);
    }
  }, [persistInitializedState]);

  // Update device status using MCP service
  const updateDeviceStatus = useCallback(async () => {
    try {
      // Get current user's principal ID to filter devices
      const ownerPrincipal = getPrincipalId();
      console.log('[useDeviceStatus] Current user principal:', ownerPrincipal);
      
      // Sync devices from canister for the current user
      if (ownerPrincipal) {
        await deviceMessageService.syncDevicesFromCanister(ownerPrincipal);
      }
      
      // First get the basic device summary from the existing service
      const summary = getDeviceConnectionSummary();
      
      console.log('[useDeviceStatus] Device summary from canister:', {
        totalDevices: summary.totalDevices,
        connectedDevices: summary.connectedDevices,
        tencentIoTEnabled: summary.tencentIoTEnabled,
        deviceListLength: summary.deviceList.length
      });
      
      // If we have devices, try to get their online status via MCP
      if (summary.deviceList.length > 0) {
        console.log('[useDeviceStatus] Found devices from canister, checking status via MCP...');
        
        const updatedDevices = await Promise.all(
          summary.deviceList.map(async (device) => {
            try {
              // Parse device ID to get product_id and device_name
              let deviceName = device.name.includes('_') ? device.name.split('_')[1] : device.name;
              
              // Check if this is a development board (142B2F6AF8B4) and map to production device name
              if (deviceName === '142B2F6AF8B4') {
                console.log('[useDeviceStatus] Development board detected, mapping to production device name');
                deviceName = '3CDC7580F950';
              }
              
              // Convert basic device to extended device type
              const extendedDevice: DeviceStatus = {
                ...device,
                productId: 'H3PI4FBTV5',
                deviceName,
                isOnline: device.isConnected,
                mqttConnected: device.isConnected,
                ipAddress: undefined,
                signalStrength: undefined,
                batteryLevel: undefined
              };
              
              console.log(`[useDeviceStatus] Checking MCP status for device: ${device.id} (${device.name}) -> productId: ${extendedDevice.productId}, deviceName: ${extendedDevice.deviceName}`);
              
              // Use MCP to get device status
              const mcpResult = await alayaMcpService.getDeviceStatus(
                extendedDevice.productId!, 
                extendedDevice.deviceName!
              );
              
              if (mcpResult.success && mcpResult.data) {
                const mcpData = mcpResult.data as Record<string, unknown>;
                // Parse MCP response according to new API format
                const deviceStatusData = mcpData.device_status as Record<string, unknown> || {};
                console.log(`[useDeviceStatus] MCP status for ${device.id}:`, deviceStatusData);
                
                return {
                  ...extendedDevice,
                  isOnline: (deviceStatusData.online as boolean) || false,
                  mqttConnected: (deviceStatusData.online as boolean) || false,
                  lastSeen: (deviceStatusData.last_online_time as number) || extendedDevice.lastSeen,
                  ipAddress: deviceStatusData.client_ip as string || extendedDevice.ipAddress,
                  signalStrength: undefined, // Not available in new API
                  batteryLevel: undefined, // Not available in new API
                  isConnected: (deviceStatusData.online as boolean) || false
                };
              }
              
              // If MCP call fails, keep device in current state (don't mark as offline)
              console.warn(`[useDeviceStatus] MCP call failed for device ${device.id}, keeping current state`);
              return {
                ...extendedDevice,
                // Keep existing connection state if MCP fails
                isOnline: extendedDevice.isOnline,
                mqttConnected: extendedDevice.mqttConnected,
                isConnected: extendedDevice.isConnected
              };
            } catch (mcpError) {
              console.warn(`[useDeviceStatus] MCP status check failed for device ${device.id}:`, mcpError);
              
              // Parse device name with development board mapping
              let deviceName = device.id.includes(':') ? device.id.split(':')[1] : device.id;
              if (deviceName === '142B2F6AF8B4') {
                deviceName = '3CDC7580F950';
              }
              
              // Keep device in current state if MCP call fails
              return {
                ...device,
                productId: 'H3PI4FBTV5',
                deviceName,
                isOnline: device.isConnected, // Keep current state
                mqttConnected: device.isConnected, // Keep current state
                ipAddress: undefined,
                signalStrength: undefined,
                batteryLevel: undefined,
                isConnected: device.isConnected // Keep current connection state
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
        
        console.log('[useDeviceStatus] Updated device status with MCP data:', {
          totalDevices: updatedSummary.totalDevices,
          connectedDevices: updatedSummary.connectedDevices,
          deviceListLength: updatedSummary.deviceList.length
        });
        
        // If we have at least one connected device and service is not initialized yet,
        // mark it as initialized now (this handles the case of first device connection after pairing)
        if (updatedSummary.connectedDevices > 0 && !isInitialized) {
          persistInitializedState(true);
          console.log('[useDeviceStatus] First device connected and online, marking service as initialized');
        }
        
        // Only mark as uninitialized if ALL devices are offline and we had devices before
        // This prevents false negatives from temporary network issues
        if (updatedSummary.totalDevices > 0 && updatedSummary.connectedDevices === 0 && isInitialized) {
          // Check if all devices have been offline for a significant time (e.g., > 1 hour)
          const allDevicesLongOffline = updatedDevices.every(device => {
            if (!device.lastSeen) return false;
            const hoursSinceLastSeen = (Date.now() - device.lastSeen) / (1000 * 60 * 60);
            return hoursSinceLastSeen > 1;
          });
          
          if (allDevicesLongOffline) {
            console.warn('[useDeviceStatus] All devices have been offline for over 1 hour, marking service as uninitialized');
            persistInitializedState(false);
          } else {
            console.log('[useDeviceStatus] All devices currently offline but recently seen, keeping initialized state');
          }
        }
        
        setDeviceStatus(updatedSummary);
      } else {
        // No devices to check, just use the original summary
        console.log('[useDeviceStatus] No devices found from canister, using basic summary');
        setDeviceStatus(summary);
      }
    } catch (err) {
      console.error('[useDeviceStatus] Failed to update device status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update device status');
    }
  }, [isInitialized, persistInitializedState]);

  // Send message to devices
  const sendMessageToDevices = useCallback(async (message: string, deviceName?: string) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendTextToDevices(message, deviceName);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send message to devices:', err);
      throw err;
    }
  }, [isInitialized]);

  // 像素图现在统一通过GIF格式发送，不再需要单独的sendPixelArtToDevices函数

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

  // Send GIF to specific device
  const sendGifToDevice = useCallback(async (deviceId: string, gifInfo: GifInfo) => {
    try {
      if (!isInitialized) {
        throw new Error('Device service not initialized');
      }
      
      const result = await deviceMessageService.sendGifToDevice(deviceId, gifInfo);
      return result;
    } catch (err) {
      console.error('[useDeviceStatus] Failed to send GIF to device:', err);
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
      console.log('[useDeviceStatus] Getting device status via MCP:', productId, deviceName);
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
    // Only run periodic updates if we have devices to check
    const interval = setInterval(async () => {
      const summary = getDeviceConnectionSummary();
      if (summary.deviceList.length > 0) {
        console.log('[useDeviceStatus] Running periodic device status update...');
        await updateDeviceStatus();
      } else {
        console.log('[useDeviceStatus] Skipping periodic update - no devices to check');
      }
    }, 5 * 60 * 1000); // Update every 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, updateDeviceStatus]);

  // Manual reset of initialization state (for debugging or special cases)
  const resetInitializationState = useCallback(() => {
    console.log('[useDeviceStatus] Manually resetting initialization state');
    persistInitializedState(false);
  }, [persistInitializedState]);

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
    resetInitializationState,
    sendMessageToDevices,
    sendGifToDevices,
    sendGifToDevice,
    
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
