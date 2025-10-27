// Device Management Hook - Manage device initialization and state
import { useState, useEffect, useCallback } from 'react';
import { deviceInitManager, DeviceInitStep, DeviceInitState } from '../services/deviceInitManager';
import { deviceApiService, DeviceRecord, DeviceListResponse, ApiResponse } from '../services/api/deviceApi';
import { getPrincipalId } from '../lib/principal';

export interface UseDeviceManagementReturn {
  // State
  deviceInitState: DeviceInitState;
  devices: DeviceRecord[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startDeviceInit: () => Promise<void>;
  selectWiFi: (wifiNetwork: any) => Promise<void>;
  selectManualWiFi: (ssid: string, password: string, security?: string) => Promise<void>;
  selectBluetoothDevice: (device: any) => Promise<void>;
  submitDeviceRecord: () => Promise<boolean>;
  resetDeviceInit: () => void;
  clearError: () => void;
  
  // Device management actions
  loadDevices: () => Promise<void>;
  addDevice: (device: DeviceRecord) => Promise<boolean>;
  updateDevice: (deviceId: string, device: DeviceRecord) => Promise<boolean>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
  updateDeviceStatus: (deviceId: string, status: any) => Promise<boolean>;
  
  // Computed
  currentStep: DeviceInitStep;
  isStepComplete: boolean;
  stepDescription: string;
}

export const useDeviceManagement = (): UseDeviceManagementReturn => {
  const [deviceInitState, setDeviceInitState] = useState<DeviceInitState>(deviceInitManager.getState());
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update device init state when manager state changes
  useEffect(() => {
    const updateState = () => {
      setDeviceInitState(deviceInitManager.getState());
    };

    // Update state every 100ms during initialization
    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, []);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Load devices from backend filtered by current user's principal ID
  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current user's principal ID to filter devices
      const ownerPrincipal = getPrincipalId();
      console.log('[useDeviceManagement] Loading devices for owner:', ownerPrincipal);
      
      if (!ownerPrincipal) {
        console.warn('[useDeviceManagement] No principal ID found, cannot load devices');
        setDevices([]);
        setError('User not authenticated. Please log in.');
        return;
      }
      
      // Use getDevicesByOwner to filter devices by owner
      const response = await deviceApiService.getDevicesByOwner(ownerPrincipal, 0, 100);
      console.log('[useDeviceManagement] Loaded devices for owner:', response.data?.devices.length || 0);
      
      if (response.success && response.data) {
        setDevices(response.data.devices);
      } else {
        setError(response.error || 'Failed to load devices');
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      setError('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start device initialization process
  const startDeviceInit = useCallback(async () => {
    try {
      setError(null);
      await deviceInitManager.startDeviceInit();
      setDeviceInitState(deviceInitManager.getState());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Device initialization failed';
      setError(errorMessage);
      console.error('Device initialization failed:', error);
    }
  }, []);

  // Select WiFi network
  const selectWiFi = useCallback(async (wifiNetwork: any) => {
    try {
      setError(null);
      await deviceInitManager.selectWiFi(wifiNetwork);
      setDeviceInitState(deviceInitManager.getState());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'WiFi selection failed';
      setError(errorMessage);
      console.error('WiFi selection failed:', error);
    }
  }, []);

  // Select manual WiFi input
  const selectManualWiFi = useCallback(async (ssid: string, password: string, security: string = 'WPA2') => {
    try {
      setError(null);
      await deviceInitManager.selectManualWiFi(ssid, password, security);
      setDeviceInitState(deviceInitManager.getState());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Manual WiFi input failed';
      setError(errorMessage);
      console.error('Manual WiFi input failed:', error);
    }
  }, []);

  // Select Bluetooth device
  const selectBluetoothDevice = useCallback(async (device: any) => {
    try {
      setError(null);
      await deviceInitManager.selectBluetoothDevice(device);
      setDeviceInitState(deviceInitManager.getState());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bluetooth device selection failed';
      setError(errorMessage);
      console.error('Bluetooth device selection failed:', error);
    }
  }, []);


  // Submit device record to backend
  const submitDeviceRecord = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      
      const success = await deviceInitManager.submitDeviceRecord();
      
      if (success) {
        // Reload devices after successful submission
        await loadDevices();
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit device record';
      setError(errorMessage);
      console.error('Failed to submit device record:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // Reset device initialization state
  const resetDeviceInit = useCallback(() => {
    deviceInitManager.resetState();
    setDeviceInitState(deviceInitManager.getState());
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Add new device
  const addDevice = useCallback(async (device: DeviceRecord): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await deviceApiService.submitDeviceRecord(device);
      if (response.success) {
        await loadDevices(); // Reload devices after successful addition
        return true;
      } else {
        setError(response.error || 'Failed to add device');
        return false;
      }
    } catch (error) {
      console.error('Failed to add device:', error);
      setError('Failed to add device');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // Update device
  const updateDevice = useCallback(async (deviceId: string, device: DeviceRecord): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await deviceApiService.updateDevice(deviceId, device);
      if (response.success) {
        await loadDevices(); // Reload devices after successful update
        return true;
      } else {
        setError(response.error || 'Failed to update device');
        return false;
      }
    } catch (error) {
      console.error('Failed to update device:', error);
      setError('Failed to update device');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // Delete device
  const deleteDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await deviceApiService.deleteDevice(deviceId);
      if (response.success) {
        await loadDevices(); // Reload devices after successful deletion
        return true;
      } else {
        setError(response.error || 'Failed to delete device');
        return false;
      }
    } catch (error) {
      console.error('Failed to delete device:', error);
      setError('Failed to delete device');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // Update device status
  const updateDeviceStatus = useCallback(async (deviceId: string, status: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await deviceApiService.updateDeviceStatus({
        deviceId,
        status,
      });
      if (response.success) {
        await loadDevices(); // Reload devices after successful status update
        return true;
      } else {
        setError(response.error || 'Failed to update device status');
        return false;
      }
    } catch (error) {
      console.error('Failed to update device status:', error);
      setError('Failed to update device status');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // Computed values
  const currentStep = deviceInitState.step;
  const isStepComplete = deviceInitManager.isStepComplete();
  const stepDescription = deviceInitManager.getStepDescription();

  return {
    // State
    deviceInitState,
    devices,
    isLoading,
    error,
    
    // Actions
    startDeviceInit,
    selectWiFi,
    selectManualWiFi,
    selectBluetoothDevice,
    submitDeviceRecord,
    resetDeviceInit,
    clearError,
    
    // Device management actions
    loadDevices,
    addDevice,
    updateDevice,
    deleteDevice,
    updateDeviceStatus,
    
    // Computed
    currentStep,
    isStepComplete,
    stepDescription,
  };
}; 