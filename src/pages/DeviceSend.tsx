import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Smile, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { useToast } from '../hooks/use-toast';
import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { GifInfo, sendGifMessage } from '../services/api/chatApi';
import { deviceSimulator } from '../services/deviceSimulator';
import {
  fontSmoothing,
  hiddenBackface,
  transformOptimization,
  buttonStyles,
  textContainerStyles,
  headingStyles,
  performanceOptimizedContainer,
  imageOptimization,
} from '../styles/deviceSendStyles';

const DeviceSend = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get device information from URL parameters
  const deviceId = searchParams.get('deviceId');
  const deviceName = searchParams.get('deviceName') || 'Unknown Device';
  const deviceType = searchParams.get('deviceType') || 'Unknown';
  const deviceStatus = searchParams.get('deviceStatus') || 'Unknown';

  // Check for immediate restoration needs
  const hasGifData = searchParams.get('gifData');
  const needsImmediateRestoration = !deviceId && !hasGifData;
  const needsGifRestoration = hasGifData && !deviceId;
  

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingGif, setPendingGif] = useState<GifInfo | null>(null);

  // Handle immediate restoration in useEffect to avoid React error #310
  useEffect(() => {
    if (needsImmediateRestoration) {
      console.log('[DeviceSend] Device ID missing, checking sessionStorage immediately');
      const savedDeviceInfo = sessionStorage.getItem('device_send_info');
      console.log('[DeviceSend] SessionStorage content:', {
        hasData: !!savedDeviceInfo,
        rawData: savedDeviceInfo,
        parsedData: savedDeviceInfo ? (() => {
          try { return JSON.parse(savedDeviceInfo); } catch(e) { return 'Parse error: ' + e; }
        })() : null
      });

      // Try immediate restoration if data exists
      if (savedDeviceInfo) {
        try {
          const deviceInfo = JSON.parse(savedDeviceInfo);
          if (deviceInfo.deviceId) {
            console.log('[DeviceSend] Found device info in sessionStorage, attempting immediate restoration');
            
            // Build URL with all available device information
            const restoreParams = new URLSearchParams(searchParams);
            if (deviceInfo.deviceId) restoreParams.set('deviceId', deviceInfo.deviceId);
            if (deviceInfo.deviceName) restoreParams.set('deviceName', deviceInfo.deviceName);
            if (deviceInfo.deviceType) restoreParams.set('deviceType', deviceInfo.deviceType);
            if (deviceInfo.deviceStatus) restoreParams.set('deviceStatus', deviceInfo.deviceStatus);
            
            console.log('[DeviceSend] Restoring device info immediately with params:', Object.fromEntries(restoreParams.entries()));
            
            // Clear sessionStorage and redirect
            sessionStorage.removeItem('device_send_info');
            navigate(`/device-send?${restoreParams.toString()}`, { replace: true });
          }
        } catch (error) {
          console.error('[DeviceSend] Error parsing sessionStorage device info:', error);
        }
      }
    } else if (needsGifRestoration) {
      // We have GIF data but missing device info - try to restore from sessionStorage
      console.log('[DeviceSend] GIF data present but device info missing, attempting restoration');
      const savedDeviceInfo = sessionStorage.getItem('device_send_info');
      if (savedDeviceInfo) {
        try {
          const deviceInfo = JSON.parse(savedDeviceInfo);
          if (deviceInfo.deviceId) {
            console.log('[DeviceSend] Found device info for GIF restoration');
            
            // Build URL with device info and preserve GIF data
            const restoreParams = new URLSearchParams(searchParams);
            if (deviceInfo.deviceId) restoreParams.set('deviceId', deviceInfo.deviceId);
            if (deviceInfo.deviceName) restoreParams.set('deviceName', deviceInfo.deviceName);
            if (deviceInfo.deviceType) restoreParams.set('deviceType', deviceInfo.deviceType);
            if (deviceInfo.deviceStatus) restoreParams.set('deviceStatus', deviceInfo.deviceStatus);
            
            console.log('[DeviceSend] Restoring device info with GIF data:', Object.fromEntries(restoreParams.entries()));
            
            // Clear sessionStorage and redirect
            sessionStorage.removeItem('device_send_info');
            navigate(`/device-send?${restoreParams.toString()}`, { replace: true });
          }
        } catch (error) {
          console.error('[DeviceSend] Error parsing sessionStorage device info for GIF:', error);
        }
      }
    }
  }, [needsImmediateRestoration, needsGifRestoration, searchParams, navigate]);

  // Use device status hook for sending messages only
  const {
    sendMessageToDevices,
    sendGifToDevices,
    sendGifToDevice
  } = useDeviceStatus();

  // Handle GIF data from URL params (when returning from Gallery)
  useEffect(() => {
    const gifDataParam = searchParams.get('gifData');
    if (gifDataParam) {
      try {
        const gifData = JSON.parse(gifDataParam) as GifInfo;
        setPendingGif(gifData);
        
        // Clear the URL parameter
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('gifData');
        navigate(`/device-send?${newSearchParams.toString()}`, { replace: true });
      } catch (error) {
        console.error('[DeviceSend] Error parsing GIF data:', error);
      }
    }
  }, [searchParams, navigate]);

  const handleSendMessage = async () => {
    const hasMessage = newMessage.trim();
    const hasGif = !!pendingGif;

    if (!hasMessage && !hasGif) {
      console.warn('[DeviceSend] Cannot send message: no message content or GIF');
      toast({
        title: t('chat.error.emptyMessage'),
        description: t('chat.error.emptyMessageDesc'),
        variant: "destructive"
      });
      return;
    }


    try {
      setLoading(true);
      
      if (pendingGif) {
        // Send GIF to specific device
        console.log('[DeviceSend] Sending GIF to device:', { deviceId, deviceName, pendingGif });
        
        if (!deviceName) {
          throw new Error('Device name is required to send GIF');
        }
        
        // Use deviceName (bluetooth name) instead of deviceId (system ID) for MCP calls
        const result = await sendGifToDevice(deviceName, pendingGif);
        
        if (result.success) {
          toast({
            title: t('chat.success.gifSent'),
            description: t('chat.success.sentToDevice', { device: deviceName }),
            variant: "success"
          });
          setPendingGif(null);
        } else {
          throw new Error(result.error || 'Failed to send GIF');
        }
      } else if (newMessage.trim()) {
        // Send text message to specific device
        console.log('[DeviceSend] Sending text to device:', { message: newMessage, deviceName });
        
        if (!deviceName) {
          throw new Error('Device name is required to send message');
        }
        
        const result = await sendMessageToDevices(newMessage, deviceName);
        
        if (result.success) {
          toast({
            title: t('chat.success.textSent'),
            description: t('chat.success.sentToDevices', { count: result.sentTo.length, devices: result.sentTo.join(', ') }),
            variant: "success"
          });
          setNewMessage('');
        } else {
          throw new Error(result.errors.join('; '));
        }
      }
    } catch (error) {
      console.error('[DeviceSend] Failed to send to device:', error);
      toast({
        title: t('chat.error.deviceSendFailed'),
        description: error instanceof Error ? error.message : t('chat.error.unknownError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDevices = () => {
    navigate('/my-devices');
  };

  const handleEmojiClick = () => {
    // Save current device info to sessionStorage for restoration when returning from Gallery
    const deviceInfo = {
      deviceId,
      deviceName,
      deviceType,
      deviceStatus,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('device_send_info', JSON.stringify(deviceInfo));
    navigate('/gallery?from=device-send');
  };

  // Restore device info from sessionStorage when returning from Gallery
  useEffect(() => {
    try {
      const savedDeviceInfo = sessionStorage.getItem('device_send_info');
      const hasGifData = searchParams.get('gifData');
      
      // Skip restoration if we already have GIF data (handled by immediate restoration)
      if (savedDeviceInfo && !hasGifData) {
        const deviceInfo = JSON.parse(savedDeviceInfo);
        const timeDiff = Date.now() - deviceInfo.timestamp;
        const isRecent = timeDiff < 5 * 60 * 1000; // Valid within 5 minutes
        
        if (isRecent) {
          console.log('[DeviceSend] Restoring device info from sessionStorage:', deviceInfo);
          
          // Build restored URL parameters
          const restoreParams = new URLSearchParams();
          if (deviceInfo.deviceId) restoreParams.set('deviceId', deviceInfo.deviceId);
          if (deviceInfo.deviceName) restoreParams.set('deviceName', deviceInfo.deviceName);
          if (deviceInfo.deviceType) restoreParams.set('deviceType', deviceInfo.deviceType);
          if (deviceInfo.deviceStatus) restoreParams.set('deviceStatus', deviceInfo.deviceStatus);
          
          // Clear sessionStorage and update URL
          sessionStorage.removeItem('device_send_info');
          navigate(`/device-send?${restoreParams.toString()}`, { replace: true });
        } else {
          // Clear expired data
          console.log('[DeviceSend] Device info too old, clearing sessionStorage');
          sessionStorage.removeItem('device_send_info');
        }
      } else if (hasGifData) {
        console.log('[DeviceSend] GIF data present, skipping device restoration to avoid conflicts');
      }
    } catch (error) {
      console.error('[DeviceSend] Error restoring device info from sessionStorage:', error);
      sessionStorage.removeItem('device_send_info');
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-gray-700 border-r-gray-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
            <div className="text-white text-xl font-semibold">
              {t('common.initializingAI')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Device information check removed - functionality works correctly without this warning
  // The warning was unnecessarily strict and prevented normal operation

  return (
    <PageLayout>
      <div className="min-h-screen w-full bg-black relative overflow-hidden">

        {/* Header */}
        <AppHeader />

        <div className="flex h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="h-full p-2 md:p-4">
              <div 
                className="h-full rounded-2xl bg-gray-900 shadow-2xl border border-gray-800 flex flex-col"
                style={performanceOptimizedContainer}
              >
                {/* Device Header */}
                <div 
                  className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-gray-800 bg-gray-800"
                  style={fontSmoothing}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Back Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500 p-2 sm:p-3"
                      onClick={handleBackToDevices}
                      style={buttonStyles}
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    
                    {/* Device Info */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <h1 
                            className="text-lg sm:text-xl font-bold text-white"
                            style={headingStyles}
                          >
                            {deviceName}
                          </h1>
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700"
                            style={fontSmoothing}
                          >
                            {deviceStatus}
                          </span>
                        </div>
                        <p 
                          className="text-xs sm:text-sm text-white/80"
                          style={textContainerStyles}
                        >
                          {deviceType} • ID: {deviceId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Device Details */}
                <div 
                  className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-800 bg-gray-900"
                  style={fontSmoothing}
                >
                  <div className="p-2 sm:p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div 
                      className="text-xs sm:text-sm text-white/90 space-y-1"
                      style={textContainerStyles}
                    >
                      <p><span className="text-gray-400 font-semibold">Device Type:</span> {deviceType}</p>
                      <p><span className="text-gray-400 font-semibold">Status:</span> {deviceStatus}</p>
                      <p><span className="text-gray-400 font-semibold">Device ID:</span> <code className="text-gray-300 text-xs font-mono">{deviceId}</code></p>
                    </div>
                  </div>
                </div>

                {/* Send Area */}
                <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-4 bg-gray-900">
                  <div className="w-full max-w-2xl">
                    <div className="text-center mb-8">
                      <div className="text-6xl mb-4">📱</div>
                      <h2 
                        className="text-2xl font-bold text-white mb-2"
                        style={headingStyles}
                      >
                        {t('deviceSend.title')}
                      </h2>
                      <p 
                        className="text-white/80"
                        style={textContainerStyles}
                      >
                        {t('deviceSend.subtitle')}
                      </p>
                    </div>

                    {/* Pending GIF Preview */}
                    {pendingGif && (
                      <div 
                        className="bg-gray-800 rounded-lg p-3 border border-gray-700 mb-4"
                        style={fontSmoothing}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span 
                            className="text-white text-sm font-semibold"
                            style={textContainerStyles}
                          >
                            {t('chat.readyToSend')}:
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingGif(null)}
                            className="text-white/80 hover:text-white hover:bg-gray-700 p-1"
                            style={buttonStyles}
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <img 
                            src={pendingGif.thumbnailUrl} 
                            alt="GIF Preview"
                            className="w-12 h-12 rounded border border-gray-700 object-cover"
                            style={imageOptimization}
                          />
                          <div 
                            className="flex-1 text-white/90 text-xs"
                            style={textContainerStyles}
                          >
                            <div className="font-semibold">{pendingGif.title}</div>
                            <div className="text-white/70">GIF • {pendingGif.width}x{pendingGif.height}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message Input Row */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={t('deviceSend.placeholder') as string}
                          className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-gray-600 focus:ring-gray-600 text-xs sm:text-sm"
                          style={textContainerStyles}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !loading) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                      </div>
                      
                      {/* Send Button */}
                      <Button
                        onClick={handleSendMessage}
                        disabled={loading || (!newMessage.trim() && !pendingGif)}
                        className="bg-white text-black hover:bg-gray-100 border-0 p-2 sm:p-3 min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 font-semibold"
                        title="Send message to device"
                        style={{
                          ...buttonStyles,
                          ...hiddenBackface,
                          ...transformOptimization,
                        }}
                      >
                        {loading ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Function Buttons Row */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 text-xs px-3 py-2 flex-1 font-medium"
                        onClick={handleEmojiClick}
                        style={buttonStyles}
                      >
                        <Smile className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        {t('common.emoji')}
                      </Button>
                      

                      {/* Device Simulator Controls (Development Only) */}
                      {import.meta.env.DEV && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 text-xs px-2 py-1"
                          onClick={() => {
                            if (deviceSimulator.isCurrentlySimulating()) {
                              deviceSimulator.stopSimulation();
                              toast({
                                title: "Device Simulator",
                                description: "Simulated device disconnected",
                                variant: "default"
                              });
                            } else {
                              deviceSimulator.startSimulation();
                              toast({
                                title: "Device Simulator",
                                description: "Simulated device connected",
                                variant: "default"
                              });
                            }
                          }}
                          title="Toggle device simulation"
                        >
                          {deviceSimulator.isCurrentlySimulating() ? '🔌' : '🔌'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default DeviceSend;
