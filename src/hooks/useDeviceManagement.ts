// Device Management Hook - Manage device initialization and state
import { useState, useEffect, useCallback } from 'react';
import { deviceInitManager, DeviceInitStep, DeviceInitState } from '../services/deviceInitManager';
import { deviceService, DeviceRecord } from '../services/deviceService';

export interface UseDeviceManagementReturn {
  // State
  deviceInitState: DeviceInitState;
  devices: DeviceRecord[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startDeviceInit: () => Promise<void>;
  selectWiFi: (wifiNetwork: any) => Promise<void>;
  selectBluetoothDevice: (device: any) => Promise<void>;
  submitDeviceRecord: () => Promise<boolean>;
  resetDeviceInit: () => void;
  clearError: () => void;
  
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

  // Load devices from backend
  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const deviceList = await deviceService.getDeviceList();
      setDevices(deviceList);
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
    selectBluetoothDevice,
    submitDeviceRecord,
    resetDeviceInit,
    clearError,
    
    // Computed
    currentStep,
    isStepComplete,
    stepDescription,
  };
}; 