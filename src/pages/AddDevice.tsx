import React, { useState } from 'react';
import { Smartphone, Wifi, Battery, Settings, Bluetooth, Monitor, Plus, X, Check, LogOut, Wallet, Sparkles, Menu, User, Loader2, Signal, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../lib/auth';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import {
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useDeviceManagement } from '../hooks/useDeviceManagement';
import { DeviceInitStep } from '../services/deviceInitManager';
import { useNavigate } from 'react-router-dom';

const AddDevice = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedWifi, setSelectedWifi] = useState<any>(null);
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Device management hook
  const {
    deviceInitState,
    devices: managedDevices,
    isLoading: deviceLoading,
    error: deviceError,
    startDeviceInit,
    selectWiFi,
    selectBluetoothDevice,
    submitDeviceRecord,
    resetDeviceInit,
    clearError,
    currentStep,
    stepDescription
  } = useDeviceManagement();

  const handleStartDeviceInit = async () => {
    await startDeviceInit();
  };

  const handleWifiSelected = async (wifi: any) => {
    setSelectedWifi(wifi);
    setShowPasswordDialog(true);
  };

  const handleWifiPasswordSubmit = async () => {
    if (!selectedWifi) return;
    
    try {
      // Add password to WiFi network
      const wifiWithPassword = {
        ...selectedWifi,
        password: wifiPassword
      };
      
      await selectWiFi(wifiWithPassword);
      setShowPasswordDialog(false);
      setWifiPassword('');
      setSelectedWifi(null);
    } catch (error) {
      console.error('Failed to select WiFi:', error);
    }
  };

  const handleBluetoothDeviceSelected = async (device: any) => {
    await selectBluetoothDevice(device);
  };

  const handleSubmitDeviceRecord = async () => {
    const success = await submitDeviceRecord();
    if (success) {
      navigate('/my-devices');
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
              Initializing AI...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
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
                      Add New Device
                    </h1>
                    <p className="text-white/60 text-sm md:text-base">Set up your new device with WiFi and Bluetooth</p>
                  </div>
                </div>
              </div>

              {/* Device Initialization Content */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 m-2 md:m-4 mb-4 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                  <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)] lg:max-h-[calc(100vh-120px)]">
                    {/* Step Progress */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm">Step {currentStep === DeviceInitStep.INIT ? 0 : 
                          currentStep === DeviceInitStep.WIFI_SCAN || currentStep === DeviceInitStep.WIFI_SELECT ? 1 :
                          currentStep === DeviceInitStep.BLUETOOTH_SCAN || currentStep === DeviceInitStep.BLUETOOTH_SELECT ? 2 :
                          currentStep === DeviceInitStep.CONNECTING ? 3 :
                          currentStep === DeviceInitStep.SUCCESS ? 4 : 0} of 4</span>
                        <span className="text-cyan-400 text-sm font-medium">{stepDescription}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${currentStep === DeviceInitStep.INIT ? 0 :
                              currentStep === DeviceInitStep.WIFI_SCAN || currentStep === DeviceInitStep.WIFI_SELECT ? 25 :
                              currentStep === DeviceInitStep.BLUETOOTH_SCAN || currentStep === DeviceInitStep.BLUETOOTH_SELECT ? 50 :
                              currentStep === DeviceInitStep.CONNECTING ? 75 :
                              currentStep === DeviceInitStep.SUCCESS ? 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Device Initialization Steps */}
                    {currentStep === DeviceInitStep.INIT && (
                      <div className="space-y-4 md:space-y-6">
                        <div className="text-center">
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                            <Smartphone className="h-10 w-10 md:h-12 md:w-12 text-white" />
                          </div>
                          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">Device Initialization</h3>
                          <p className="text-white/60 text-base md:text-lg">We will help you set up your new device</p>
                        </div>
                        
                        <div className="space-y-3 md:space-y-4 max-w-md mx-auto">
                          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-cyan-400/20 rounded flex items-center justify-center">
                              <Wifi className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">1. Scan and select WiFi network</div>
                              <div className="text-white/60 text-xs md:text-sm">Choose the WiFi network for your device</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-400/20 rounded flex items-center justify-center">
                              <Bluetooth className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">2. Scan Bluetooth devices</div>
                              <div className="text-white/60 text-xs md:text-sm">Scan nearby Bluetooth devices</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-400/20 rounded flex items-center justify-center">
                              <Check className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm md:text-base">3. Auto-configure connection</div>
                              <div className="text-white/60 text-xs md:text-sm">Configure device via Bluetooth</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Button
                            onClick={handleStartDeviceInit}
                            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 px-6 md:px-8 py-2 md:py-3 text-base md:text-lg"
                          >
                            Start Initialization
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* WiFi Scanning */}
                    {currentStep === DeviceInitStep.WIFI_SCAN && (
                      <div className="space-y-6 text-center">
                        <div className="py-12">
                          <Loader2 className="h-16 w-16 text-cyan-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">Scanning WiFi Networks...</h3>
                          <p className="text-white/60 text-lg">Please wait, searching for nearby WiFi networks</p>
                        </div>
                      </div>
                    )}

                    {/* WiFi Selection */}
                    {currentStep === DeviceInitStep.WIFI_SELECT && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <Wifi className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                          <h3 className="text-2xl font-semibold text-white mb-2">Select WiFi Network</h3>
                          <p className="text-white/60 text-lg">Choose the WiFi network for your device</p>
                        </div>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {deviceInitState.wifiNetworks.map((network) => (
                            <div 
                              key={network.id} 
                              className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                              onClick={() => handleWifiSelected(network)}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-cyan-400/20 rounded flex items-center justify-center">
                                  <Wifi className="h-6 w-6 text-cyan-400" />
                                </div>
                                <div>
                                  <div className="text-white font-medium text-lg">{network.name}</div>
                                  <div className="text-white/60 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    {network.security} • Signal: {network.strength} dBm
                                    {network.frequency && (
                                      <span> • {network.frequency > 5000 ? '5GHz' : '2.4GHz'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
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
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Scanning */}
                    {currentStep === DeviceInitStep.BLUETOOTH_SCAN && (
                      <div className="space-y-6 text-center">
                        <div className="py-12">
                          <Loader2 className="h-16 w-16 text-purple-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">Scanning Bluetooth Devices...</h3>
                          <p className="text-white/60 text-lg">Please wait, searching for nearby Bluetooth devices</p>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Device Selection */}
                    {currentStep === DeviceInitStep.BLUETOOTH_SELECT && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <Bluetooth className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                          <h3 className="text-2xl font-semibold text-white mb-2">Select Bluetooth Device</h3>
                          <p className="text-white/60 text-lg">Choose the device to configure</p>
                        </div>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {deviceInitState.bluetoothDevices.map((device) => (
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
                                    {device.type} • Signal: {device.rssi} dBm
                                  </div>
                                </div>
                              </div>
                              <Bluetooth className="h-6 w-6 text-purple-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Connecting */}
                    {currentStep === DeviceInitStep.CONNECTING && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <Loader2 className="h-16 w-16 text-green-400 animate-spin mx-auto mb-6" />
                          <h3 className="text-2xl font-semibold text-white mb-4">Configuring Device...</h3>
                          <p className="text-white/60 text-lg">Configuring device via Bluetooth</p>
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
                            <span>Establishing Bluetooth connection</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>Transmitting WiFi configuration</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>Device connecting to WiFi</span>
                          </div>
                          <div className="flex items-center gap-3 text-white/80">
                            <Check className="h-5 w-5 text-green-400" />
                            <span>Verifying connection status</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Success */}
                    {currentStep === DeviceInitStep.SUCCESS && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="w-24 h-24 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="h-12 w-12 text-green-400" />
                          </div>
                          <h3 className="text-2xl font-semibold text-white mb-4">Device Connected Successfully!</h3>
                          <p className="text-white/60 text-lg">Device has been successfully connected to WiFi</p>
                        </div>
                        
                        <div className="space-y-4 p-6 bg-white/5 rounded-lg max-w-md mx-auto">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Device Name:</span>
                            <span className="text-white font-medium">{deviceInitState.selectedBluetoothDevice?.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">WiFi Network:</span>
                            <span className="text-white font-medium">{deviceInitState.selectedWifi?.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Connection Status:</span>
                            <span className="text-green-400 font-medium">Connected</span>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Button
                            onClick={handleSubmitDeviceRecord}
                            disabled={deviceLoading}
                            className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white border-0 px-8 py-3 text-lg"
                          >
                            {deviceLoading ? (
                              <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              'Complete Setup'
                            )}
                          </Button>
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
                            Try Again
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

        {/* WiFi Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Wifi className="h-5 w-5 text-cyan-400" />
                Enter WiFi Password
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-white/60 text-sm">
                Network: <span className="text-white font-medium">{selectedWifi?.name}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Enter WiFi password"
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
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWifiPasswordSubmit}
                  disabled={!wifiPassword.trim()}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                >
                  Connect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default AddDevice; 