import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, Battery, Settings, Bluetooth, Monitor, Plus, X, Check, User, Loader2, Signal, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppHeader } from '../components/AppHeader';
import {
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useDeviceManagement } from '../hooks/useDeviceManagement';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const MyDevices = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [showWifiDialog, setShowWifiDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  
  // Device management hook
  const {
    devices: managedDevices,
    isLoading: deviceLoading,
    error: deviceError,
  } = useDeviceManagement();

  const devices = [
    { id: 1, name: "iPhone 15 Pro", type: "Mobile", status: "Connected", network: "WiFi", battery: 85 },
    { id: 2, name: "MacBook Pro", type: "Laptop", status: "Connected", network: "Ethernet", battery: 72 },
    { id: 3, name: "Smart Speaker", type: "IoT", status: "Disconnected", network: "WiFi", battery: 45 },
    { id: 4, name: "Tablet Pro", type: "Tablet", status: "Connected", network: "Cellular", battery: 92 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'text-green-400 bg-green-400/20';
      case 'Disconnected': return 'text-red-400 bg-red-400/20';
      case 'Syncing': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-400';
    if (battery > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleAddDevice = () => {
    navigate('/add-device');
  };

  const handleConnectBluetooth = (device: any) => {
    console.log('Connecting to Bluetooth device:', device.name);
    // Navigate to add device page instead of showing dialog
    navigate('/add-device');
  };

  const handleLinkToWifi = (device: any) => {
    setSelectedDevice(device);
    setShowWifiDialog(true);
  };

  const handleWifiConnect = (network: any) => {
    console.log('Connecting device to WiFi:', network.name);
    setShowWifiDialog(false);
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
    <SidebarProvider>
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
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
                            {t('common.myDevices')}
                          </h1>
                          <p className="text-white/60">{t('common.myDevicesSubtitle')}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAddDevice}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('common.addDevice')}
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {devices.map((device) => (
                        <div key={device.id} className="p-6 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm hover:shadow-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Smartphone className="h-8 w-8 text-cyan-400" />
                              <div>
                                <h3 className="text-white font-medium">{device.name}</h3>
                                <p className="text-sm text-white/60">{device.type}</p>
                              </div>
                            </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)} backdrop-blur-sm`}>
                              {t(`common.device${device.status}` as any)}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Wifi className="h-4 w-4 text-cyan-400" />
                              <span className="text-sm text-white/80">{device.network}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Battery className={`h-4 w-4 ${getBatteryColor(device.battery)}`} />
                               <span className="text-sm text-white/80">Battery: {device.battery}%</span>
                            </div>

                            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                              <div 
                                className={`h-2 rounded-full ${device.battery > 60 ? 'bg-green-400' : device.battery > 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${device.battery}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                              <Settings className="h-4 w-4 mr-2" />
                              {t('common.manage')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleLinkToWifi(device)}
                              className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                            >
                              <Wifi className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
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
                  { id: 1, name: "MyHome_WiFi", security: "WPA2", strength: -30 },
                  { id: 2, name: "Guest_Network", security: "Open", strength: -50 },
                  { id: 3, name: "Office_5G", security: "WPA3", strength: -65 },
                ].map((network: any) => (
                  <div key={network.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-4 w-4 text-cyan-400" />
                      <div>
                        <div className="text-white font-medium">{network.name}</div>
                        <div className="text-white/60 text-xs">{network.security} • Signal: {network.strength} dBm</div>
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


      </div>
    </SidebarProvider>
  );
};

export default MyDevices;