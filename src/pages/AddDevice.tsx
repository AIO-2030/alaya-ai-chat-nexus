import React, { useState } from 'react';
import { Smartphone, Wifi, Battery, Settings, Bluetooth, Monitor, Plus, X, Check, LogOut, Wallet, Sparkles, Menu, User, Loader2, Signal, Shield, ArrowLeft, Eye, EyeOff, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../lib/auth';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { PageLayout } from '../components/PageLayout';
import { useDeviceManagement } from '../hooks/useDeviceManagement';
import { DeviceInitStep } from '../services/deviceInitManager';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AddDevice = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedWifi, setSelectedWifi] = useState<any>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');
  
  // Manual WiFi input states
  const [showManualWifiDialog, setShowManualWifiDialog] = useState(false);
  const [manualWifiSSID, setManualWifiSSID] = useState('');
  const [manualWifiSecurity, setManualWifiSecurity] = useState('WPA2');
  
  // Inline edit for SSID within WiFi list
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null);
  const [editingSsid, setEditingSsid] = useState('');
  
  // Device management hook - only for device initialization
  const {
    deviceInitState,
    isLoading: deviceLoading,
    error: deviceError,
    startDeviceInit,
    selectWiFi,
    selectManualWiFi,
    selectBluetoothDevice,
    submitDeviceRecord,
    resetDeviceInit,
    clearError,
    currentStep,
    stepDescription
  } = useDeviceManagement();

  const handleStartDeviceInit = async () => {
    try {
      await startDeviceInit();
    } catch (error) {
      console.error('Device initialization failed:', error);
    }
  };

  const handleWifiSelected = async (wifi: any) => {
    // Store the selected WiFi network temporarily
    setSelectedWifi(wifi);
    setShowPasswordDialog(true);
    setIsSubmittingPassword(false);
    setWifiSsid(wifi?.name || '');
  };

  const handleWifiPasswordSubmit = async () => {
    if (!wifiPassword.trim() || isSubmittingPassword) return;
    
    setIsSubmittingPassword(true);
    try {
      // Use the selected WiFi network from local state
      if (!selectedWifi) {
        console.error('No WiFi network selected');
        return;
      }
      
      // Create WiFi network with password
      const wifiWithPassword = {
        ...selectedWifi,
        name: (wifiSsid || '').trim() || selectedWifi.name,
        password: wifiPassword
      };
      
      await selectWiFi(wifiWithPassword);
      
      // Close dialog and reset state after successful submission
      setShowPasswordDialog(false);
      setWifiPassword('');
      setSelectedWifi(null);
      
      // Continue with device initialization after WiFi configuration
      // The deviceInitManager will handle the rest of the process
    } catch (error) {
      console.error('Failed to configure WiFi:', error);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleBluetoothDeviceSelected = async (device: any) => {
    try {
      await selectBluetoothDevice(device);
    } catch (error) {
      console.error('Failed to connect to Bluetooth device:', error);
    }
  };

  const handleManualWifiSubmit = async () => {
    if (!manualWifiSSID.trim()) return;
    
    try {
      // Create a WiFi network object with manual input (without password)
      const manualWifiNetwork = {
        id: `manual_${Date.now()}`,
        name: manualWifiSSID,
        security: manualWifiSecurity,
        strength: -50, // Default strength for manual input
        frequency: 2400, // Default to 2.4GHz
        channel: 6 // Default channel
      };
      
      // Store the manual WiFi network and show password dialog
      setSelectedWifi(manualWifiNetwork);
      setShowManualWifiDialog(false);
      setShowPasswordDialog(true);
      setWifiSsid(manualWifiNetwork.name);
      setManualWifiSSID('');
      setManualWifiSecurity('WPA2');
    } catch (error) {
      console.error('Failed to configure manual WiFi:', error);
    }
  };

  const handleShowManualWifiDialog = () => {
    setShowManualWifiDialog(true);
  };


  const handleSubmitDeviceRecord = async () => {
    try {
      const success = await submitDeviceRecord();
      if (success) {
        navigate('/my-devices');
      }
    } catch (error) {
      console.error('Failed to submit device record:', error);
    }
  };

  const handleGoBack = () => {
    navigate('/my-devices');
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
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
        <AppHeader showSidebarTrigger={false} />
        
        {/* Back Button */}
        <div className="relative z-10 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="text-white hover:bg-white/10 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(100vh-65px-80px)] lg:h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="h-full flex flex-col max-h-[calc(100vh-145px)] lg:max-h-[calc(100vh-65px)]">
              {/* Page Header */}
              <div className="m-2 md:m-4 mb-2 p-4 md:p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="flex items-center gap-3 md:gap-4 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
                      {t('common.addNewDevice')}
                    </h1>
                    <p className="text-white/60 text-sm md:text-base">{t('common.setupDeviceDescription')}</p>
                  </div>
                </div>
              </div>

              {/* Device Initialization Content */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 m-2 md:m-4 mb-4 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Step Progress */}
                    <div className="mb-6 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Step {currentStep === DeviceInitStep.INIT ? 0 : 
                          currentStep === DeviceInitStep.BLUETOOTH_SCAN || currentStep === DeviceInitStep.BLUETOOTH_SELECT ? 1 :
                          currentStep === DeviceInitStep.BLUETOOTH_CONNECT ? 2 :
                          currentStep === DeviceInitStep.WIFI_SCAN || currentStep === DeviceInitStep.WIFI_SELECT || currentStep === DeviceInitStep.WIFI_MANUAL_INPUT ? 3 :
                          currentStep === DeviceInitStep.WIFI_CONFIG ? 4 :
                          currentStep === DeviceInitStep.SUCCESS ? 5 : 0} of 5</span>
                        <span className="text-cyan-400 text-sm font-medium">{stepDescription}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${currentStep === DeviceInitStep.INIT ? 0 :
                              currentStep === DeviceInitStep.BLUETOOTH_SCAN || currentStep === DeviceInitStep.BLUETOOTH_SELECT ? 20 :
                              currentStep === DeviceInitStep.BLUETOOTH_CONNECT ? 40 :
                              currentStep === DeviceInitStep.WIFI_SCAN || currentStep === DeviceInitStep.WIFI_SELECT || currentStep === DeviceInitStep.WIFI_MANUAL_INPUT ? 60 :
                              currentStep === DeviceInitStep.WIFI_CONFIG ? 80 :
                              currentStep === DeviceInitStep.SUCCESS ? 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Device Initialization Steps */}
                    {currentStep === DeviceInitStep.INIT && (
                      <div className="flex-1 flex flex-col justify-center space-y-4 md:space-y-6">
                        <div className="text-center">
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                            <Smartphone className="h-10 w-10 md:h-12 md:w-12 text-white" />
                          </div>
                          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">{t('common.deviceInitialization')}</h3>
                          <p className="text-white/60 text-base md:text-lg">{t('common.deviceInitializationDescription')}</p>
                        </div>

                        <div className="space-y-3 md:space-y-4 max-w-md mx-auto">
                          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-400/20 rounded flex items-center justify-center">
                              <Bluetooth className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">1. Scan and connect Bluetooth device</div>
                              <div className="text-white/60 text-xs md:text-sm">Find and connect to your device</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-cyan-400/20 rounded flex items-center justify-center">
                              <Wifi className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">2. Request WiFi networks from device</div>
                              <div className="text-white/60 text-xs md:text-sm">Device scans for nearby WiFi networks</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-400/20 rounded flex items-center justify-center">
                              <Check className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">3. Configure WiFi and complete setup</div>
                              <div className="text-white/60 text-xs md:text-sm">Send WiFi credentials to device</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Button
                            onClick={handleStartDeviceInit}
                            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 px-6 md:px-8 py-2 md:py-3 text-base md:text-lg"
                          >
                            {t('common.startInitialization')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* WiFi Scanning */}
                    {currentStep === DeviceInitStep.WIFI_SCAN && (
                      <div className="flex-1 flex flex-col justify-center space-y-6 text-center">
                        <div className="py-12">
                          <Loader2 className="h-16 w-16 text-cyan-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">{t('common.requestingWifiNetworksTitle')}</h3>
                          <p className="text-white/60 text-lg">{t('common.requestingWifiNetworksDesc')}</p>
                        </div>
                        
                        <div className="max-w-md mx-auto">
                          <Button
                            onClick={handleShowManualWifiDialog}
                            variant="outline"
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                          >
                            <Wifi className="h-4 w-4 mr-2" />
                            {t('common.enterWifiManually')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual WiFi Input */}
                    {currentStep === DeviceInitStep.WIFI_MANUAL_INPUT && (
                      <div className="flex-1 flex flex-col justify-center space-y-6">
                        <div className="text-center mb-6">
                          <Wifi className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                          <h3 className="text-2xl font-semibold text-white mb-2">{t('common.enterWifiNameTitle')}</h3>
                          <p className="text-white/60 text-lg">{t('common.enterWifiNameDesc')}</p>
                        </div>
                        
                        <div className="max-w-md mx-auto space-y-4">
                          <div className="space-y-2">
                            <label className="text-white text-sm font-medium">{t('common.wifiSsidLabel')}</label>
                            <Input
                              type="text"
                              value={manualWifiSSID}
                              onChange={(e) => setManualWifiSSID(e.target.value)}
                              placeholder={t('common.wifiSsidPlaceholder')}
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                              onKeyPress={(e) => e.key === 'Enter' && handleManualWifiSubmit()}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-white text-sm font-medium">{t('common.wifiSecurityType')}</label>
                            <select
                              value={manualWifiSecurity}
                              onChange={(e) => setManualWifiSecurity(e.target.value)}
                              className="w-full bg-white/5 border border-white/20 text-white rounded-md px-3 py-2 backdrop-blur-sm"
                            >
                              <option value="Open">{t('common.wifiSecurity.openNoPassword')}</option>
                              <option value="WEP">WEP</option>
                              <option value="WPA">WPA</option>
                              <option value="WPA2">WPA2</option>
                              <option value="WPA3">WPA3</option>
                            </select>
                          </div>
                          
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => setShowManualWifiDialog(false)}
                              variant="outline"
                              className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              onClick={handleManualWifiSubmit}
                              disabled={!manualWifiSSID.trim()}
                              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                            >
                              {t('common.continue')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WiFi Selection */}
                    {currentStep === DeviceInitStep.WIFI_SELECT && (
                      <div className="flex flex-col h-full">
                        <div className="text-center mb-4 flex-shrink-0">
                          <Wifi className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                          <h3 className="text-2xl font-semibold text-white mb-2">{t('common.selectWifiNetworkTitle')}</h3>
                          <p className="text-white/60 text-lg">{t('common.selectWifiNetworkDesc')}</p>
                          
                          <div className="mt-4">
                            <Button
                              onClick={handleShowManualWifiDialog}
                              variant="outline"
                              size="sm"
                              className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                            >
                              <Wifi className="h-4 w-4 mr-2" />
                              {t('common.enterWifiManually')}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-h-0 bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                          <div className="h-full overflow-y-auto custom-scrollbar" style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                          }}>
                            <div className="p-3 space-y-2">
                              {deviceInitState.wifiNetworks && deviceInitState.wifiNetworks.length > 0 ? (
                                deviceInitState.wifiNetworks.map((network) => (
                                  <div 
                                    key={network.id} 
                                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                                    onClick={() => { if (editingNetworkId) return; handleWifiSelected(network); }}
                                  >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                      <div className="w-12 h-12 bg-cyan-400/20 rounded flex items-center justify-center flex-shrink-0">
                                        <Wifi className="h-6 w-6 text-cyan-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        {editingNetworkId === network.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="text"
                                              value={editingSsid}
                                              onChange={(e) => setEditingSsid(e.target.value)}
                                              placeholder={network.name}
                                              className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-white bg-white/5 border-white/20 hover:bg-white/10"
                                              onClick={(e) => { e.stopPropagation(); setEditingNetworkId(null); }}
                                            >
                                              {t('common.cancel')}
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                                              onClick={(e) => { e.stopPropagation(); handleWifiSelected({ ...network, name: editingSsid || network.name }); setEditingNetworkId(null); }}
                                              disabled={!editingSsid.trim()}
                                            >
                                              {t('common.connect')}
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <div className="text-white font-medium text-lg truncate">{network.name}</div>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 text-white/70 hover:text-white flex-shrink-0"
                                              onClick={(e) => { e.stopPropagation(); setEditingNetworkId(network.id); setEditingSsid(network.name); }}
                                              aria-label={t('common.edit') as string}
                                              title={t('common.edit') as string}
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}
                                        <div className="text-white/60 flex items-center gap-2 text-sm">
                                          <Shield className="h-4 w-4 flex-shrink-0" />
                                          <span className="truncate">{network.security} • Signal: {network.strength} dBm</span>
                                          {network.frequency && (
                                            <span className="flex-shrink-0"> • {network.frequency > 5000 ? '5GHz' : '2.4GHz'}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                      <div className="flex flex-col items-end">
                                        <div className="text-white/60 text-xs">
                                          {network.strength > -50 ? 'Excellent' : 
                                           network.strength > -60 ? 'Good' : 
                                           network.strength > -70 ? 'Fair' : 'Poor'}
                                        </div>
                                        <div className="text-cyan-400 text-xs">
                                          {network.channel ? `Ch ${network.channel}` : ''}
                                        </div>
                                      </div>
                                      <Signal className="h-6 w-6 text-cyan-400" />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8">
                                  <div className="text-white/40 mb-4">
                                    <Wifi className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium text-white/60 mb-2">{t('common.noWifiNetworksFoundTitle')}</p>
                                    <p className="text-sm text-white/40">{t('common.noWifiNetworksFoundDesc')}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Scanning */}
                    {currentStep === DeviceInitStep.BLUETOOTH_SCAN && (
                      <div className="flex-1 flex flex-col justify-center space-y-6 text-center">
                        <div className="py-12">
                          <Loader2 className="h-16 w-16 text-purple-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">Scanning Bluetooth Devices...</h3>
                          <p className="text-white/60 text-lg">Please wait, searching for nearby Bluetooth devices</p>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Device Selection */}
                    {currentStep === DeviceInitStep.BLUETOOTH_SELECT && (
                      <div className="flex-1 flex flex-col">
                        <div className="text-center mb-6 flex-shrink-0">
                          <Bluetooth className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                          <h3 className="text-2xl font-semibold text-white mb-2">Select Bluetooth Device</h3>
                          <p className="text-white/60 text-lg">Choose the device to configure</p>
                        </div>
                        
                        <div className="flex-1 min-h-0 bg-white/5 rounded-lg border border-white/10 p-2">
                          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            <div className="space-y-3">
                          {deviceInitState.bluetoothDevices && deviceInitState.bluetoothDevices.length > 0 ? (
                            deviceInitState.bluetoothDevices.map((device) => (
                              <div 
                                key={device.id} 
                                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                                onClick={() => handleBluetoothDeviceSelected(device)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-purple-400/20 rounded flex items-center justify-center">
                                    <Smartphone className="h-6 w-6 text-purple-400" />
                                  </div>
                                  <div>
                                    <div className="text-white font-medium text-lg">{device.name}</div>
                                    <div className="text-white/60">
                                      {device.type || 'Unknown'} • Signal: {device.rssi} dBm
                                    </div>
                                  </div>
                                </div>
                                <Bluetooth className="h-6 w-6 text-purple-400" />
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-white/40 mb-4">
                                <Bluetooth className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium text-white/60 mb-2">No Bluetooth devices found</p>
                                <p className="text-sm text-white/40">Try scanning again or check device visibility</p>
                              </div>
                            </div>
                          )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Connection */}
                    {currentStep === DeviceInitStep.BLUETOOTH_CONNECT && (
                      <div className="flex-1 flex flex-col justify-center space-y-6 text-center">
                        <div className="py-12">
                          <Loader2 className="h-16 w-16 text-purple-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">Connecting to Bluetooth Device...</h3>
                          <p className="text-white/60 text-lg">Establishing connection with {deviceInitState.selectedBluetoothDevice?.name}</p>
                        </div>
                      </div>
                    )}

                    {/* WiFi Configuration */}
                    {currentStep === DeviceInitStep.WIFI_CONFIG && (
                      <div className="flex-1 flex flex-col justify-center space-y-6">
                        <div className="text-center">
                          <Loader2 className="h-16 w-16 text-green-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">Configuring WiFi on Device...</h3>
                          <p className="text-white/60 text-lg">Sending WiFi credentials and activation code to device via Bluetooth</p>
                        </div>
                        
                        <div className="space-y-4 max-w-md mx-auto">
                          <div className="w-full bg-white/10 rounded-full h-3">
                            <div 
                              className="h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full transition-all duration-500"
                              style={{ width: `${deviceInitState.connectionProgress}%` }}
                            ></div>
                          </div>
                          <div className="text-center text-white/60">
                            Progress: {deviceInitState.connectionProgress}%
                          </div>
                        </div>
                        
                        <div className="space-y-3 max-w-md mx-auto">
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>{t('common.bluetoothConnectionEstablished')}</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>{t('common.transmittingWifiCredentials')}</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>{t('common.transmittingActivationCode')}</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>{t('common.deviceConnectingToWifi')}</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>{t('common.verifyingWifiConnection')}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Success */}
                    {currentStep === DeviceInitStep.SUCCESS && (
                      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                        <div className="flex-1 flex flex-col justify-start py-4 space-y-4 md:space-y-6">
                          <div className="text-center">
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                              <Check className="h-10 w-10 md:h-12 md:w-12 text-green-400" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-4 px-4">{t('common.deviceConnectedSuccessfully')}</h3>
                            <p className="text-white/60 text-base md:text-lg px-4">{t('common.deviceConnectedDescription')}</p>
                          </div>
                          
                          <div className="space-y-3 md:space-y-4 p-4 md:p-6 bg-white/5 rounded-lg max-w-sm md:max-w-md mx-auto w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="text-white/60 text-sm">Device Name:</span>
                              <span className="text-white font-medium text-sm break-all">{deviceInitState.selectedBluetoothDevice?.name}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="text-white/60 text-sm">WiFi Network:</span>
                              <span className="text-white font-medium text-sm break-all">{deviceInitState.selectedWifi?.name}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <span className="text-white/60 text-sm">Connection Status:</span>
                              <span className="text-green-400 font-medium text-sm">Connected</span>
                            </div>
                          </div>
                          
                          <div className="text-center px-4 pb-4">
                            <Button
                              onClick={handleSubmitDeviceRecord}
                              disabled={deviceLoading}
                              className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white border-0 px-6 md:px-8 py-2 md:py-3 text-base md:text-lg w-full sm:w-auto"
                            >
                              {deviceLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 mr-2 animate-spin" />
                                  {t('common.submitting')}
                                </>
                              ) : (
                                t('common.completeSetup')
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {deviceError && (
                      <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg max-w-md mx-auto">
                        <p className="text-red-400 text-center">{deviceError}</p>
                        <div className="text-center mt-3">
                          <Button
                            onClick={clearError}
                            variant="outline"
                            size="sm"
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                          >
                            {t('common.tryAgain')}
                          </Button>
                        </div>
                      </div>
                    )}
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

        {/* Manual WiFi Input Dialog */}
        <Dialog open={showManualWifiDialog} onOpenChange={setShowManualWifiDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 w-[95vw] max-w-md mx-auto shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Wifi className="h-5 w-5 text-cyan-400" />
                Enter WiFi Network Name
              </DialogTitle>
              <p className="text-white/60 text-sm">
                WiFi scan timed out. Please enter your WiFi network name manually.
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">WiFi Network Name (SSID)</label>
                <Input
                  type="text"
                  value={manualWifiSSID}
                  onChange={(e) => setManualWifiSSID(e.target.value)}
                  placeholder="Enter WiFi network name"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualWifiSubmit()}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Security Type</label>
                <select
                  value={manualWifiSecurity}
                  onChange={(e) => setManualWifiSecurity(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 text-white rounded-md px-3 py-2 backdrop-blur-sm"
                >
                  <option value="Open">Open (No Password)</option>
                  <option value="WEP">WEP</option>
                  <option value="WPA">WPA</option>
                  <option value="WPA2">WPA2</option>
                  <option value="WPA3">WPA3</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowManualWifiDialog(false)}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualWifiSubmit}
                  disabled={!manualWifiSSID.trim()}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                >
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* WiFi Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) {
            setIsSubmittingPassword(false);
            setWifiPassword('');
            setSelectedWifi(null);
            setWifiSsid('');
          }
        }}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 w-[95vw] max-w-md mx-auto shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Wifi className="h-5 w-5 text-cyan-400" />
                {t('common.enterWifiPassword')}
              </DialogTitle>
              <p className="text-white/60 text-sm">
                请输入所选 WiFi 网络的密码以完成设备配置
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">{t('common.network')}</label>
                <Input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder={selectedWifi?.name || ''}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">{t('common.password')}</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder={t('common.enterWifiPasswordPlaceholder')}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm pr-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleWifiPasswordSubmit()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowPasswordDialog(false)}
                  variant="outline"
                  disabled={isSubmittingPassword}
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleWifiPasswordSubmit}
                  disabled={!wifiPassword.trim() || isSubmittingPassword}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.connecting')}
                    </>
                  ) : (
                    t('common.connect')
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageLayout>
  );
};

export default AddDevice; 