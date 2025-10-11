import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, Settings, Plus, Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeviceManagement } from '../hooks/useDeviceManagement';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { DeviceRecord } from '../services/api/deviceApi';
import type { DeviceStatus, DeviceType } from '../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import DeviceStatusIndicator from '../components/DeviceStatusIndicator';

const MyDevices = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [showWifiDialog, setShowWifiDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceRecord | null>(null);

  // Use device management hook
  const {
    devices,
    isLoading,
    error,
    loadDevices,
    deleteDevice,
    updateDeviceStatus,
    clearError
  } = useDeviceManagement();

  // Use device status hook for real-time device management
  const {
    deviceStatus,
    hasConnectedDevices,
    isTencentIoTEnabled,
    isLoading: deviceStatusLoading,
    error: deviceStatusError,
    refreshDeviceStatus,
    sendMessageToDevices,
    sendPixelArtToDevices,
    sendGifToDevices
  } = useDeviceStatus();

  // Load devices on component mount
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Helper function to get device type display name
  const getDeviceTypeName = (deviceType: DeviceType): string => {
    if ('Mobile' in deviceType) return 'Mobile';
    if ('Desktop' in deviceType) return 'Desktop';
    if ('Server' in deviceType) return 'Server';
    if ('IoT' in deviceType) return 'IoT';
    if ('Embedded' in deviceType) return 'Embedded';
    if ('Other' in deviceType) return deviceType.Other;
    return 'Unknown';
  };

  // Helper function to get device status display name
  const getDeviceStatusName = (status: DeviceStatus): string => {
    if ('Online' in status) return 'Online';
    if ('Offline' in status) return 'Offline';
    if ('Maintenance' in status) return 'Maintenance';
    if ('Disabled' in status) return 'Disabled';
    return 'Unknown';
  };

  const getStatusColor = (status: DeviceStatus) => {
    if ('Online' in status) return 'text-green-400 bg-green-400/20';
    if ('Offline' in status) return 'text-red-400 bg-red-400/20';
    if ('Maintenance' in status) return 'text-yellow-400 bg-yellow-400/20';
    if ('Disabled' in status) return 'text-gray-400 bg-gray-400/20';
    return 'text-white/60 bg-white/10';
  };

  const handleAddDevice = () => {
    navigate('/add-device');
  };

  const handleLinkToWifi = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setShowWifiDialog(true);
  };

  const handleWifiConnect = (network: any) => {
    console.log('Connecting device to WiFi:', network.name);
    setShowWifiDialog(false);
  };

  const handleDeleteDevice = (device: DeviceRecord) => {
    setDeviceToDelete(device);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDevice = async () => {
    if (deviceToDelete) {
      const success = await deleteDevice(deviceToDelete.id);
      if (success) {
        setShowDeleteDialog(false);
        setDeviceToDelete(null);
      }
    }
  };

  const handleToggleDeviceStatus = async (device: DeviceRecord) => {
    const newStatus = 'Online' in device.status ? { Offline: null } : { Online: null };
    await updateDeviceStatus(device.id, newStatus);
  };



  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
              {t('common.initializingAI')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-x-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-blue-400 rounded-full"></div>
          <svg className="absolute inset-0 w-full h-full">
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" strokeWidth="1" opacity="0.3"/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" strokeWidth="1" opacity="0.3"/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" strokeWidth="1" opacity="0.3"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header */}
        <AppHeader />

        <div className="flex h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="h-full flex flex-col">
              {/* Devices Content */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 m-2 md:m-4 mb-20 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h1 className="text-base sm:text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 whitespace-nowrap overflow-hidden text-ellipsis">
                            {t('common.myDevices')}
                          </h1>
                          {isTencentIoTEnabled && (
                            <div className="text-[10px] sm:text-xs text-blue-400 flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                              <span className="whitespace-nowrap">IoT Cloud Connected</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <Button 
                          onClick={refreshDeviceStatus}
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-2"
                          title="Refresh device status"
                        >
                          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button 
                          onClick={handleAddDevice}
                          size="sm"
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl text-xs sm:text-sm whitespace-nowrap"
                        >
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">{t('common.addDevice')}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Real-time Device Status */}
                    <div className="mb-6">
                      <DeviceStatusIndicator 
                        showDetails={true}
                        onDeviceClick={(deviceId) => {
                          console.log('Device clicked:', deviceId);
                          // Navigate to device details or show device info
                        }}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {isLoading ? (
                        <div className="col-span-full flex items-center justify-center py-12">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                            <span className="text-white/60">{t('common.loading')}</span>
                          </div>
                        </div>
                      ) : devices.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                          <div className="text-white/40 mb-4">
                            <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-white/60 mb-2">{t('common.noDevices')}</p>
                            <p className="text-sm text-white/40">{t('common.addYourFirstDevice')}</p>
                          </div>
                        </div>
                      ) : (
                        devices.map((device) => (
                          <div key={device.id} className="p-6 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm hover:shadow-lg">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Smartphone className="h-8 w-8 text-cyan-400" />
                                <div>
                                  <h3 className="text-white font-medium">{device.name}</h3>
                                  <p className="text-sm text-white/60">{getDeviceTypeName(device.deviceType)}</p>
                                  <p className="text-xs text-white/40">ID: {device.id}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)} backdrop-blur-sm`}>
                                {getDeviceStatusName(device.status)}
                              </span>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleToggleDeviceStatus(device)}
                                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                {('Online' in device.status) ? 'Disconnect' : 'Connect'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleLinkToWifi(device)}
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                              >
                                <Wifi className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteDevice(device)}
                                className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 backdrop-blur-sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>



        {/* WiFi Link Dialog */}
        <Dialog open={showWifiDialog} onOpenChange={setShowWifiDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Wifi className="h-5 w-5 text-cyan-400" />
                {t('common.linkToWifi')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-white/60 text-sm">
                {t('common.selectWifiFor')}: <span className="text-white font-medium">{selectedDevice?.name}</span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[
                  { id: 1, name: t('common.wifiNetworks.myHomeWiFi'), security: t('common.wifiSecurity.wpa2'), strength: -30 },
                  { id: 2, name: t('common.wifiNetworks.guestNetwork'), security: t('common.wifiSecurity.open'), strength: -50 },
                  { id: 3, name: t('common.wifiNetworks.office5G'), security: t('common.wifiSecurity.wpa3'), strength: -65 },
                ].map((network: any) => (
                  <div key={network.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-4 w-4 text-cyan-400" />
                      <div>
                        <div className="text-white font-medium">{network.name}</div>
                        <div className="text-white/60 text-xs">{network.security} • {t('common.signalStrength')}: {network.strength} dBm</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleWifiConnect(network)}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 text-xs"
                    >
                      {t('common.connect')}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowWifiDialog(false)}
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Device Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-red-400" />
                Delete Device
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-white/60 text-sm">
                Are you sure you want to delete the device <span className="text-white font-medium">{deviceToDelete?.name}</span>?
                This action cannot be undone.
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={confirmDeleteDevice}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  Delete
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(false)}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </PageLayout>
  );
};

export default MyDevices;