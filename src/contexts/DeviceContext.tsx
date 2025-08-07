// Device Context - Global device state management
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { DeviceRecord } from '../services/deviceService';
import { deviceService } from '../services/deviceService';

interface DeviceState {
  devices: DeviceRecord[];
  loading: boolean;
  error: string | null;
  selectedDevice: DeviceRecord | null;
  deviceStats: {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  };
}

type DeviceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DEVICES'; payload: DeviceRecord[] }
  | { type: 'ADD_DEVICE'; payload: DeviceRecord }
  | { type: 'UPDATE_DEVICE'; payload: DeviceRecord }
  | { type: 'REMOVE_DEVICE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SELECT_DEVICE'; payload: DeviceRecord | null }
  | { type: 'SET_DEVICE_STATS'; payload: any }
  | { type: 'REFRESH_DEVICES' };

interface DeviceContextType {
  state: DeviceState;
  dispatch: React.Dispatch<DeviceAction>;
  loadDevices: () => Promise<void>;
  addDevice: (device: DeviceRecord) => Promise<void>;
  updateDevice: (device: DeviceRecord) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  selectDevice: (device: DeviceRecord | null) => void;
  refreshDevices: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

const initialState: DeviceState = {
  devices: [],
  loading: false,
  error: null,
  selectedDevice: null,
  deviceStats: {
    total: 0,
    connected: 0,
    disconnected: 0,
    error: 0,
  },
};

function deviceReducer(state: DeviceState, action: DeviceAction): DeviceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
    
    case 'ADD_DEVICE':
      return { 
        ...state, 
        devices: [...state.devices, action.payload],
        deviceStats: {
          ...state.deviceStats,
          total: state.deviceStats.total + 1,
          connected: action.payload.status === 'Connected' ? state.deviceStats.connected + 1 : state.deviceStats.connected,
          disconnected: action.payload.status === 'Disconnected' ? state.deviceStats.disconnected + 1 : state.deviceStats.disconnected,
          error: action.payload.status === 'Error' ? state.deviceStats.error + 1 : state.deviceStats.error,
        }
      };
    
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device => 
          device.macAddress === action.payload.macAddress ? action.payload : device
        ),
        selectedDevice: state.selectedDevice?.macAddress === action.payload.macAddress 
          ? action.payload 
          : state.selectedDevice,
      };
    
    case 'REMOVE_DEVICE':
      const removedDevice = state.devices.find(d => d.macAddress === action.payload);
      return {
        ...state,
        devices: state.devices.filter(device => device.macAddress !== action.payload),
        selectedDevice: state.selectedDevice?.macAddress === action.payload ? null : state.selectedDevice,
        deviceStats: removedDevice ? {
          ...state.deviceStats,
          total: state.deviceStats.total - 1,
          connected: removedDevice.status === 'Connected' ? state.deviceStats.connected - 1 : state.deviceStats.connected,
          disconnected: removedDevice.status === 'Disconnected' ? state.deviceStats.disconnected - 1 : state.deviceStats.disconnected,
          error: removedDevice.status === 'Error' ? state.deviceStats.error - 1 : state.deviceStats.error,
        } : state.deviceStats,
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SELECT_DEVICE':
      return { ...state, selectedDevice: action.payload };
    
    case 'SET_DEVICE_STATS':
      return { ...state, deviceStats: action.payload };
    
    case 'REFRESH_DEVICES':
      return { ...state };
    
    default:
      return state;
  }
}

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const [state, dispatch] = useReducer(deviceReducer, initialState);

  const loadDevices = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const devices = await deviceService.getDeviceList();
      dispatch({ type: 'SET_DEVICES', payload: devices });
      
      // Calculate stats
      const stats = {
        total: devices.length,
        connected: devices.filter(d => d.status === 'Connected').length,
        disconnected: devices.filter(d => d.status === 'Disconnected').length,
        error: devices.filter(d => d.status === 'Error').length,
      };
      dispatch({ type: 'SET_DEVICE_STATS', payload: stats });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load devices' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addDevice = async (device: DeviceRecord) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const success = await deviceService.submitDeviceRecord(device);
      if (success) {
        dispatch({ type: 'ADD_DEVICE', payload: device });
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add device' 
      });
    }
  };

  const updateDevice = async (device: DeviceRecord) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Here you would call the API to update the device
      // For now, we'll just update the local state
      dispatch({ type: 'UPDATE_DEVICE', payload: device });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to update device' 
      });
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Here you would call the API to remove the device
      // For now, we'll just update the local state
      dispatch({ type: 'REMOVE_DEVICE', payload: deviceId });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to remove device' 
      });
    }
  };

  const selectDevice = (device: DeviceRecord | null) => {
    dispatch({ type: 'SELECT_DEVICE', payload: device });
  };

  const refreshDevices = async () => {
    await loadDevices();
  };

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  const value: DeviceContextType = {
    state,
    dispatch,
    loadDevices,
    addDevice,
    updateDevice,
    removeDevice,
    selectDevice,
    refreshDevices,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDeviceContext() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDeviceContext must be used within a DeviceProvider');
  }
  return context;
} 