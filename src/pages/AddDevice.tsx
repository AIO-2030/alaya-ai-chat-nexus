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
import styles from '../styles/pages/AddDevice.module.css';

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
      <div className={styles.addDevice__container}>
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
      <div className={styles.addDevice__container}>
        {/* Animated background elements */}
        <div className={styles.addDevice__background}>
          <div className={`${styles.addDevice__background__element} ${styles['addDevice__background__element--top']}`}></div>
          <div className={`${styles.addDevice__background__element} ${styles['addDevice__background__element--bottom']} ${styles['addDevice__background__element--delay-300']}`}></div>
          <div className={`${styles.addDevice__background__element} ${styles['addDevice__background__element--center']} ${styles['addDevice__background__element--delay-700']}`}></div>
        </div>

        {/* Neural network pattern */}
        <div className={styles.addDevice__neural__pattern}>
          <div className={`${styles.addDevice__neural__dot} ${styles['addDevice__neural__dot--cyan']}`}></div>
          <div className={`${styles.addDevice__neural__dot} ${styles['addDevice__neural__dot--purple']}`}></div>
          <div className={`${styles.addDevice__neural__dot} ${styles['addDevice__neural__dot--blue']}`}></div>
          <svg className={styles.addDevice__neural__svg}>
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" className={styles.addDevice__neural__line}/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" className={styles.addDevice__neural__line}/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" className={styles.addDevice__neural__line}/>
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
        <div className={styles.addDevice__header}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className={styles.addDevice__back__button}
          >
            <ArrowLeft className={styles.addDevice__back__icon} />
          </Button>
        </div>

        {/* Main Content with Scroll */}
        <div className={styles.addDevice__content}>
          <div className="h-full flex flex-col">
              {/* Page Header */}
              <div className={styles.addDevice__page__header}>
                <div className={styles.addDevice__page__header__content}>
                  <div className={styles.addDevice__page__header__icon}>
                    <Plus className={styles.addDevice__page__header__icon__svg} />
                  </div>
                  <div>
                    <h1 className={styles.addDevice__page__header__title}>
                      {t('common.addNewDevice')}
                    </h1>
                    <p className={styles.addDevice__page__header__description}>{t('common.setupDeviceDescription')}</p>
                  </div>
                </div>
              </div>

              {/* Device Initialization Content */}
              <div className={styles.addDevice__init__container}>
                <div className={styles.addDevice__init__card}>
                  <div className={styles.addDevice__init__content}>
                    {/* Step Progress */}
                    <div className={styles.addDevice__progress}>
                      <div className={styles.addDevice__progress__header}>
                        <span className={styles.addDevice__progress__step}>Step {currentStep === DeviceInitStep.INIT ? 0 : 
                          currentStep === DeviceInitStep.BLUETOOTH_SCAN || currentStep === DeviceInitStep.BLUETOOTH_SELECT ? 1 :
                          currentStep === DeviceInitStep.BLUETOOTH_CONNECT ? 2 :
                          currentStep === DeviceInitStep.WIFI_SCAN || currentStep === DeviceInitStep.WIFI_SELECT || currentStep === DeviceInitStep.WIFI_MANUAL_INPUT ? 3 :
                          currentStep === DeviceInitStep.WIFI_CONFIG ? 4 :
                          currentStep === DeviceInitStep.SUCCESS ? 5 : 0} of 5</span>
                        <span className={styles.addDevice__progress__description}>{stepDescription}</span>
                      </div>
                      <div className={styles.addDevice__progress__bar}>
                        <div 
                          className={styles.addDevice__progress__bar__fill}
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
                      <div className={styles.addDevice__init__step}>
                        <div className="text-center">
                          <div className={styles.addDevice__init__step__icon}>
                            <Smartphone className={styles.addDevice__init__step__icon__svg} />
                          </div>
                          <h3 className={styles.addDevice__init__step__title}>{t('common.deviceInitialization')}</h3>
                          <p className={styles.addDevice__init__step__description}>{t('common.deviceInitializationDescription')}</p>
                        </div>

                        <div className={styles.addDevice__init__step__list}>
                          <div className={styles.addDevice__init__step__item}>
                            <div className={`${styles.addDevice__init__step__item__icon} ${styles['addDevice__init__step__item__icon--purple']}`}>
                              <Bluetooth className={`${styles.addDevice__init__step__item__icon__svg} ${styles['addDevice__init__step__item__icon__svg--purple']}`} />
                            </div>
                            <div className={styles.addDevice__init__step__item__text}>
                              <div className={styles.addDevice__init__step__item__title}>1. Scan and connect Bluetooth device</div>
                              <div className={styles.addDevice__init__step__item__subtitle}>Find and connect to your device</div>
                            </div>
                          </div>
                          
                          <div className={styles.addDevice__init__step__item}>
                            <div className={`${styles.addDevice__init__step__item__icon} ${styles['addDevice__init__step__item__icon--cyan']}`}>
                              <Wifi className={`${styles.addDevice__init__step__item__icon__svg} ${styles['addDevice__init__step__item__icon__svg--cyan']}`} />
                            </div>
                            <div className={styles.addDevice__init__step__item__text}>
                              <div className={styles.addDevice__init__step__item__title}>2. Request WiFi networks from device</div>
                              <div className={styles.addDevice__init__step__item__subtitle}>Device scans for nearby WiFi networks</div>
                            </div>
                          </div>
                          
                          <div className={styles.addDevice__init__step__item}>
                            <div className={`${styles.addDevice__init__step__item__icon} ${styles['addDevice__init__step__item__icon--green']}`}>
                              <Check className={`${styles.addDevice__init__step__item__icon__svg} ${styles['addDevice__init__step__item__icon__svg--green']}`} />
                            </div>
                            <div className={styles.addDevice__init__step__item__text}>
                              <div className={styles.addDevice__init__step__item__title}>3. Configure WiFi and complete setup</div>
                              <div className={styles.addDevice__init__step__item__subtitle}>Send WiFi credentials to device</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.addDevice__init__step__button}>
                          <Button
                            onClick={handleStartDeviceInit}
                            className={styles.addDevice__init__step__button__inner}
                          >
                            {t('common.startInitialization')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* WiFi Scanning */}
                    {currentStep === DeviceInitStep.WIFI_SCAN && (
                      <div className={styles.addDevice__wifi__scan}>
                        <div className={styles.addDevice__wifi__scan__content}>
                          <Loader2 className={styles.addDevice__wifi__scan__loader} />
                          <h3 className={styles.addDevice__wifi__scan__title}>{t('common.requestingWifiNetworksTitle')}</h3>
                          <p className={styles.addDevice__wifi__scan__description}>{t('common.requestingWifiNetworksDesc')}</p>
                        </div>
                        
                        <div className={styles.addDevice__wifi__scan__manual}>
                          <Button
                            onClick={handleShowManualWifiDialog}
                            variant="outline"
                            className={styles.addDevice__wifi__scan__manual__button}
                          >
                            <Wifi className={styles.addDevice__wifi__scan__manual__icon} />
                            {t('common.enterWifiManually')}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual WiFi Input */}
                    {currentStep === DeviceInitStep.WIFI_MANUAL_INPUT && (
                      <div className={styles.addDevice__wifi__manual}>
                        <div className={styles.addDevice__wifi__manual__header}>
                          <Wifi className={styles.addDevice__wifi__manual__icon} />
                          <h3 className={styles.addDevice__wifi__manual__title}>{t('common.enterWifiNameTitle')}</h3>
                          <p className={styles.addDevice__wifi__manual__description}>{t('common.enterWifiNameDesc')}</p>
                        </div>
                        
                        <div className={styles.addDevice__wifi__manual__form}>
                          <div className={styles.addDevice__wifi__manual__field}>
                            <label className={styles.addDevice__wifi__manual__label}>{t('common.wifiSsidLabel')}</label>
                            <Input
                              type="text"
                              value={manualWifiSSID}
                              onChange={(e) => setManualWifiSSID(e.target.value)}
                              placeholder={t('common.wifiSsidPlaceholder')}
                              className={styles.addDevice__wifi__manual__input}
                              onKeyPress={(e) => e.key === 'Enter' && handleManualWifiSubmit()}
                            />
                          </div>
                          
                          <div className={styles.addDevice__wifi__manual__field}>
                            <label className={styles.addDevice__wifi__manual__label}>{t('common.wifiSecurityType')}</label>
                            <select
                              value={manualWifiSecurity}
                              onChange={(e) => setManualWifiSecurity(e.target.value)}
                              className={styles.addDevice__wifi__manual__select}
                            >
                              <option value="Open">{t('common.wifiSecurity.openNoPassword')}</option>
                              <option value="WEP">WEP</option>
                              <option value="WPA">WPA</option>
                              <option value="WPA2">WPA2</option>
                              <option value="WPA3">WPA3</option>
                            </select>
                          </div>
                          
                          <div className={styles.addDevice__wifi__manual__actions}>
                            <Button
                              onClick={() => setShowManualWifiDialog(false)}
                              variant="outline"
                              className={`${styles.addDevice__wifi__manual__button} ${styles['addDevice__wifi__manual__button--cancel']}`}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              onClick={handleManualWifiSubmit}
                              disabled={!manualWifiSSID.trim()}
                              className={`${styles.addDevice__wifi__manual__button} ${styles['addDevice__wifi__manual__button--continue']}`}
                            >
                              {t('common.continue')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WiFi Selection */}
                    {currentStep === DeviceInitStep.WIFI_SELECT && (
                      <div className={styles.addDevice__wifi__select}>
                        <div className={styles.addDevice__wifi__select__header}>
                          <Wifi className={styles.addDevice__wifi__select__icon} />
                          <h3 className={styles.addDevice__wifi__select__title}>{t('common.selectWifiNetworkTitle')}</h3>
                          <p className={styles.addDevice__wifi__select__description}>{t('common.selectWifiNetworkDesc')}</p>
                          
                          <div className={styles.addDevice__wifi__select__manual}>
                            <Button
                              onClick={handleShowManualWifiDialog}
                              variant="outline"
                              size="sm"
                              className={styles.addDevice__wifi__select__manual__button}
                            >
                              <Wifi className={styles.addDevice__wifi__select__manual__icon} />
                              {t('common.enterWifiManually')}
                            </Button>
                          </div>
                        </div>
                        
                        <div className={styles.addDevice__wifi__list}>
                          <div className={styles.addDevice__wifi__list__content}>
                              {deviceInitState.wifiNetworks && deviceInitState.wifiNetworks.length > 0 ? (
                                deviceInitState.wifiNetworks.map((network) => (
                                  <div 
                                    key={network.id} 
                                    className={styles.addDevice__wifi__item}
                                    onClick={() => { if (editingNetworkId) return; handleWifiSelected(network); }}
                                  >
                                    <div className={styles.addDevice__wifi__item__content}>
                                      <div className={styles.addDevice__wifi__item__icon}>
                                        <Wifi className={styles.addDevice__wifi__item__icon__svg} />
                                      </div>
                                      <div className={styles.addDevice__wifi__item__info}>
                                        {editingNetworkId === network.id ? (
                                          <div className={styles.addDevice__wifi__item__edit}>
                                            <Input
                                              type="text"
                                              value={editingSsid}
                                              onChange={(e) => setEditingSsid(e.target.value)}
                                              placeholder={network.name}
                                              className={styles.addDevice__wifi__item__edit__input}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className={`${styles.addDevice__wifi__item__edit__button} ${styles['addDevice__wifi__item__edit__button--cancel']}`}
                                              onClick={(e) => { e.stopPropagation(); setEditingNetworkId(null); }}
                                            >
                                              {t('common.cancel')}
                                            </Button>
                                            <Button
                                              size="sm"
                                              className={`${styles.addDevice__wifi__item__edit__button} ${styles['addDevice__wifi__item__edit__button--connect']}`}
                                              onClick={(e) => { e.stopPropagation(); handleWifiSelected({ ...network, name: editingSsid || network.name }); setEditingNetworkId(null); }}
                                              disabled={!editingSsid.trim()}
                                            >
                                              {t('common.connect')}
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className={styles.addDevice__wifi__item__name}>
                                            <div className={styles.addDevice__wifi__item__name__text}>{network.name}</div>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              className={styles.addDevice__wifi__item__name__edit}
                                              onClick={(e) => { e.stopPropagation(); setEditingNetworkId(network.id); setEditingSsid(network.name); }}
                                              aria-label={t('common.edit') as string}
                                              title={t('common.edit') as string}
                                            >
                                              <Pencil className={styles.addDevice__wifi__item__name__edit__icon} />
                                            </Button>
                                          </div>
                                        )}
                                        <div className={styles.addDevice__wifi__item__details}>
                                          <Shield className={styles.addDevice__wifi__item__details__icon} />
                                          <span className={styles.addDevice__wifi__item__details__text}>{network.security} • Signal: {network.strength} dBm</span>
                                          {network.frequency && (
                                            <span className={styles.addDevice__wifi__item__details__frequency}> • {network.frequency > 5000 ? '5GHz' : '2.4GHz'}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className={styles.addDevice__wifi__item__signal}>
                                      <div className={styles.addDevice__wifi__item__signal__info}>
                                        <div className={styles.addDevice__wifi__item__signal__quality}>
                                          {network.strength > -50 ? 'Excellent' : 
                                           network.strength > -60 ? 'Good' : 
                                           network.strength > -70 ? 'Fair' : 'Poor'}
                                        </div>
                                        <div className={styles.addDevice__wifi__item__signal__channel}>
                                          {network.channel ? `Ch ${network.channel}` : ''}
                                        </div>
                                      </div>
                                      <Signal className={styles.addDevice__wifi__item__signal__icon} />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className={styles.addDevice__wifi__empty}>
                                  <div>
                                    <Wifi className={styles.addDevice__wifi__empty__icon} />
                                    <p className={styles.addDevice__wifi__empty__title}>{t('common.noWifiNetworksFoundTitle')}</p>
                                    <p className={styles.addDevice__wifi__empty__description}>{t('common.noWifiNetworksFoundDesc')}</p>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Scanning */}
                    {currentStep === DeviceInitStep.BLUETOOTH_SCAN && (
                      <div className={styles.addDevice__bluetooth__scan}>
                        <div className={styles.addDevice__bluetooth__scan__content}>
                          <Loader2 className={styles.addDevice__bluetooth__scan__loader} />
                          <h3 className={styles.addDevice__bluetooth__scan__title}>Scanning Bluetooth Devices...</h3>
                          <p className={styles.addDevice__bluetooth__scan__description}>Please wait, searching for nearby Bluetooth devices</p>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Device Selection */}
                    {currentStep === DeviceInitStep.BLUETOOTH_SELECT && (
                      <div className={styles.addDevice__bluetooth__select}>
                        <div className={styles.addDevice__bluetooth__select__header}>
                          <Bluetooth className={styles.addDevice__bluetooth__select__icon} />
                          <h3 className={styles.addDevice__bluetooth__select__title}>Select Bluetooth Device</h3>
                          <p className={styles.addDevice__bluetooth__select__description}>Choose the device to configure</p>
                        </div>
                        
                        <div className={styles.addDevice__bluetooth__list}>
                          <div className={styles.addDevice__bluetooth__list__content}>
                          {deviceInitState.bluetoothDevices && deviceInitState.bluetoothDevices.length > 0 ? (
                            deviceInitState.bluetoothDevices.map((device) => (
                              <div 
                                key={device.id} 
                                className={styles.addDevice__bluetooth__item}
                                onClick={() => handleBluetoothDeviceSelected(device)}
                              >
                                <div className={styles.addDevice__bluetooth__item__content}>
                                  <div className={styles.addDevice__bluetooth__item__icon}>
                                    <Smartphone className={styles.addDevice__bluetooth__item__icon__svg} />
                                  </div>
                                  <div className={styles.addDevice__bluetooth__item__info}>
                                    <div className={styles.addDevice__bluetooth__item__name}>{device.name}</div>
                                    <div className={styles.addDevice__bluetooth__item__details}>
                                      {device.type || 'Unknown'} • Signal: {device.rssi} dBm
                                    </div>
                                  </div>
                                </div>
                                <Bluetooth className={styles.addDevice__bluetooth__item__signal} />
                              </div>
                            ))
                          ) : (
                            <div className={styles.addDevice__bluetooth__empty}>
                              <div>
                                <Bluetooth className={styles.addDevice__bluetooth__empty__icon} />
                                <p className={styles.addDevice__bluetooth__empty__title}>No Bluetooth devices found</p>
                                <p className={styles.addDevice__bluetooth__empty__description}>Try scanning again or check device visibility</p>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bluetooth Connection */}
                    {currentStep === DeviceInitStep.BLUETOOTH_CONNECT && (
                      <div className={styles.addDevice__bluetooth__connect}>
                        <div className={styles.addDevice__bluetooth__connect__content}>
                          <Loader2 className={styles.addDevice__bluetooth__connect__loader} />
                          <h3 className={styles.addDevice__bluetooth__connect__title}>Connecting to Bluetooth Device...</h3>
                          <p className={styles.addDevice__bluetooth__connect__description}>Establishing connection with {deviceInitState.selectedBluetoothDevice?.name}</p>
                        </div>
                      </div>
                    )}

                    {/* WiFi Configuration */}
                    {currentStep === DeviceInitStep.WIFI_CONFIG && (
                      <div className={styles.addDevice__wifi__config}>
                        <div className={styles.addDevice__wifi__config__header}>
                          <Loader2 className={styles.addDevice__wifi__config__loader} />
                          <h3 className={styles.addDevice__wifi__config__title}>Configuring WiFi on Device...</h3>
                          <p className={styles.addDevice__wifi__config__description}>Sending WiFi credentials and activation code to device via Bluetooth</p>
                        </div>
                        
                        <div className={styles.addDevice__wifi__config__progress}>
                          <div className={styles.addDevice__wifi__config__progress__bar}>
                            <div 
                              className={styles.addDevice__wifi__config__progress__bar__fill}
                              style={{ width: `${deviceInitState.connectionProgress}%` }}
                            ></div>
                          </div>
                          <div className={styles.addDevice__wifi__config__progress__text}>
                            Progress: {deviceInitState.connectionProgress}%
                          </div>
                        </div>
                        
                        <div className={styles.addDevice__wifi__config__steps}>
                          <div className={styles.addDevice__wifi__config__step}>
                            <Check className={styles.addDevice__wifi__config__step__icon} />
                            <span>{t('common.bluetoothConnectionEstablished')}</span>
                          </div>
                          <div className={styles.addDevice__wifi__config__step}>
                            <Check className={styles.addDevice__wifi__config__step__icon} />
                            <span>{t('common.transmittingWifiCredentials')}</span>
                          </div>
                          <div className={styles.addDevice__wifi__config__step}>
                            <Check className={styles.addDevice__wifi__config__step__icon} />
                            <span>{t('common.transmittingActivationCode')}</span>
                          </div>
                          <div className={styles.addDevice__wifi__config__step}>
                            <Check className={styles.addDevice__wifi__config__step__icon} />
                            <span>{t('common.deviceConnectingToWifi')}</span>
                          </div>
                          <div className={styles.addDevice__wifi__config__step}>
                            <Check className={styles.addDevice__wifi__config__step__icon} />
                            <span>{t('common.verifyingWifiConnection')}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Success */}
                    {currentStep === DeviceInitStep.SUCCESS && (
                      <div className={styles.addDevice__success}>
                        <div className={styles.addDevice__success__content}>
                          <div className={styles.addDevice__success__header}>
                            <div className={styles.addDevice__success__icon}>
                              <Check className={styles.addDevice__success__icon__svg} />
                            </div>
                            <h3 className={styles.addDevice__success__title}>{t('common.deviceConnectedSuccessfully')}</h3>
                            <p className={styles.addDevice__success__description}>{t('common.deviceConnectedDescription')}</p>
                          </div>
                          
                          <div className={styles.addDevice__success__info}>
                            <div className={styles.addDevice__success__info__item}>
                              <span className={styles.addDevice__success__info__label}>Device Name:</span>
                              <span className={styles.addDevice__success__info__value}>{deviceInitState.selectedBluetoothDevice?.name}</span>
                            </div>
                            <div className={styles.addDevice__success__info__item}>
                              <span className={styles.addDevice__success__info__label}>WiFi Network:</span>
                              <span className={styles.addDevice__success__info__value}>{deviceInitState.selectedWifi?.name}</span>
                            </div>
                            <div className={styles.addDevice__success__info__item}>
                              <span className={styles.addDevice__success__info__label}>Connection Status:</span>
                              <span className={`${styles.addDevice__success__info__value} ${styles['addDevice__success__info__value--connected']}`}>Connected</span>
                            </div>
                          </div>
                          
                          <div className={styles.addDevice__success__actions}>
                            <Button
                              onClick={handleSubmitDeviceRecord}
                              disabled={deviceLoading}
                              className={styles.addDevice__success__button}
                            >
                              {deviceLoading ? (
                                <>
                                  <Loader2 className={styles.addDevice__success__button__loader} />
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
                      <div className={styles.addDevice__error}>
                        <p className={styles.addDevice__error__message}>{deviceError}</p>
                        <div className={styles.addDevice__error__actions}>
                          <Button
                            onClick={clearError}
                            variant="outline"
                            size="sm"
                            className={styles.addDevice__error__button}
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

        {/* Bottom Navigation - Mobile only */}
        <div className={styles.addDevice__bottom__nav}>
          <BottomNavigation />
        </div>

        {/* Manual WiFi Input Dialog */}
        <Dialog open={showManualWifiDialog} onOpenChange={setShowManualWifiDialog}>
          <DialogContent className={styles.addDevice__dialog}>
            <DialogHeader className={styles.addDevice__dialog__header}>
              <DialogTitle className={styles.addDevice__dialog__title}>
                <Wifi className={styles.addDevice__dialog__title__icon} />
                {t('common.enterWifiNameTitle')}
              </DialogTitle>
              <p className={styles.addDevice__dialog__description}>
                {t('common.enterWifiNameDesc')}
              </p>
            </DialogHeader>
            
            <div className={styles.addDevice__dialog__form}>
              <div className={styles.addDevice__dialog__field}>
                <label className={styles.addDevice__dialog__label}>{t('common.wifiSsidLabel')}</label>
                <Input
                  type="text"
                  value={manualWifiSSID}
                  onChange={(e) => setManualWifiSSID(e.target.value)}
                  placeholder={t('common.wifiSsidPlaceholder')}
                  className={styles.addDevice__dialog__input}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualWifiSubmit()}
                />
              </div>
              
              <div className={styles.addDevice__dialog__field}>
                <label className={styles.addDevice__dialog__label}>{t('common.wifiSecurityType')}</label>
                <select
                  value={manualWifiSecurity}
                  onChange={(e) => setManualWifiSecurity(e.target.value)}
                  className={styles.addDevice__dialog__select}
                >
                  <option value="Open">{t('common.wifiSecurity.openNoPassword')}</option>
                  <option value="WEP">WEP</option>
                  <option value="WPA">WPA</option>
                  <option value="WPA2">WPA2</option>
                  <option value="WPA3">WPA3</option>
                </select>
              </div>
              
              <div className={styles.addDevice__dialog__actions}>
                <Button
                  onClick={() => setShowManualWifiDialog(false)}
                  variant="outline"
                  className={`${styles.addDevice__dialog__button} ${styles['addDevice__dialog__button--cancel']}`}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleManualWifiSubmit}
                  disabled={!manualWifiSSID.trim()}
                  className={`${styles.addDevice__dialog__button} ${styles['addDevice__dialog__button--connect']}`}
                >
                  {t('common.continue')}
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
          <DialogContent className={styles.addDevice__dialog}>
            <DialogHeader className={styles.addDevice__dialog__header}>
              <DialogTitle className={styles.addDevice__dialog__title}>
                <Wifi className={styles.addDevice__dialog__title__icon} />
                {t('common.enterWifiPassword')}
              </DialogTitle>
              <p className={styles.addDevice__dialog__description}>
                {t('common.enterWifiPasswordDesc')}
              </p>
            </DialogHeader>
            
            <div className={styles.addDevice__dialog__form}>
              <div className={styles.addDevice__dialog__field}>
                <label className={styles.addDevice__dialog__label}>{t('common.network')}</label>
                <Input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder={selectedWifi?.name || ''}
                  className={styles.addDevice__dialog__input}
                />
              </div>
              
              <div className={styles.addDevice__dialog__field}>
                <label className={styles.addDevice__dialog__label}>{t('common.password')}</label>
                <div className={styles.addDevice__dialog__input__wrapper}>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder={t('common.enterWifiPasswordPlaceholder')}
                    className={`${styles.addDevice__dialog__input} ${styles['addDevice__dialog__input--password']}`}
                    onKeyPress={(e) => e.key === 'Enter' && handleWifiPasswordSubmit()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.addDevice__dialog__password__toggle}
                  >
                    {showPassword ? <EyeOff className={styles.addDevice__dialog__password__toggle__icon} /> : <Eye className={styles.addDevice__dialog__password__toggle__icon} />}
                  </Button>
                </div>
              </div>
              
              <div className={styles.addDevice__dialog__actions}>
                <Button
                  onClick={() => setShowPasswordDialog(false)}
                  variant="outline"
                  disabled={isSubmittingPassword}
                  className={`${styles.addDevice__dialog__button} ${styles['addDevice__dialog__button--cancel']}`}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleWifiPasswordSubmit}
                  disabled={!wifiPassword.trim() || isSubmittingPassword}
                  className={`${styles.addDevice__dialog__button} ${styles['addDevice__dialog__button--connect']}`}
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className={styles.addDevice__dialog__button__loader} />
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
      </div>
    </PageLayout>
  );
};

export default AddDevice; 