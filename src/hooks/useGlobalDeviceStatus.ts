// Hook for accessing global device status
import { useState, useEffect, useCallback } from 'react';
import { globalDeviceStatusService, DeviceStatusInfo } from '../services/globalDeviceStatusService';
import { getPrincipalId } from '../lib/principal';

export interface UseGlobalDeviceStatusReturn {
  // Own devices
  ownDevices: DeviceStatusInfo[];
  getOwnDeviceStatus: (deviceId: string) => DeviceStatusInfo | undefined;
  
  // Contact devices
  getContactDeviceStatus: (ownerPrincipalId: string, deviceId: string) => DeviceStatusInfo | undefined;
  getContactDevices: (ownerPrincipalId: string) => DeviceStatusInfo[];
  
  // Actions
  refreshOwnDevices: () => Promise<void>;
  refreshContactDevices: (ownerPrincipalId: string) => Promise<void>;
  
  // State
  lastUpdateTime: number;
}

export function useGlobalDeviceStatus(
  contactPrincipalIds: string[] = []
): UseGlobalDeviceStatusReturn {
  const [ownDevices, setOwnDevices] = useState<DeviceStatusInfo[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  // Subscribe to status updates
  useEffect(() => {
    const ownerPrincipalId = getPrincipalId();
    if (!ownerPrincipalId) {
      console.warn('[useGlobalDeviceStatus] No principal ID available');
      return;
    }

    // Subscribe to updates
    const unsubscribe = globalDeviceStatusService.subscribe((state) => {
      setOwnDevices(Array.from(state.ownDevices.values()));
      setLastUpdateTime(state.lastUpdateTime);
    });

    // Removed auto-refresh - pages will manually refresh when active
    // Chat.tsx will refresh contact devices, MyDevices.tsx will refresh own devices

    return () => {
      unsubscribe();
    };
  }, [contactPrincipalIds.join(',')]); // Re-run when contact IDs change

  const getOwnDeviceStatus = useCallback((deviceId: string) => {
    return globalDeviceStatusService.getOwnDeviceStatus(deviceId);
  }, []);

  const getContactDeviceStatus = useCallback((ownerPrincipalId: string, deviceId: string) => {
    return globalDeviceStatusService.getContactDeviceStatus(ownerPrincipalId, deviceId);
  }, []);

  const getContactDevices = useCallback((ownerPrincipalId: string) => {
    return globalDeviceStatusService.getContactDevices(ownerPrincipalId);
  }, []);

  const refreshOwnDevices = useCallback(async () => {
    const ownerPrincipalId = getPrincipalId();
    if (ownerPrincipalId) {
      await globalDeviceStatusService.refreshOwnDevices(ownerPrincipalId);
    }
  }, []);

  const refreshContactDevices = useCallback(async (ownerPrincipalId: string) => {
    await globalDeviceStatusService.refreshContactDevices(ownerPrincipalId);
  }, []);

  return {
    ownDevices,
    getOwnDeviceStatus,
    getContactDeviceStatus,
    getContactDevices,
    refreshOwnDevices,
    refreshContactDevices,
    lastUpdateTime,
  };
}

