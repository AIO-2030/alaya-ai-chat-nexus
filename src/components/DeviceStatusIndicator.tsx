// Device Status Indicator Component
import React from 'react';
import { Smartphone, Wifi, WifiOff, Battery, Signal } from 'lucide-react';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { useTranslation } from 'react-i18next';

interface DeviceStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
  onDeviceClick?: (deviceId: string) => void;
}

export const DeviceStatusIndicator: React.FC<DeviceStatusIndicatorProps> = ({
  showDetails = false,
  className = '',
  onDeviceClick
}) => {
  const { t } = useTranslation();
  const { 
    deviceStatus, 
    hasConnectedDevices, 
    isTencentIoTEnabled, 
    isLoading, 
    error 
  } = useDeviceStatus();

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-400">{t('deviceStatus.loadingDevices')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <WifiOff className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">{t('deviceStatus.deviceError')}</span>
      </div>
    );
  }

  if (!hasConnectedDevices) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <WifiOff className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">
          {t('deviceStatus.noDevices')}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Status Header */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <Smartphone className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">
            {deviceStatus.connectedDevices} {t('deviceStatus.devicesConnected')}
          </span>
        </div>
        
        {isTencentIoTEnabled && (
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400">{t('deviceStatus.iotCloudConnected')}</span>
          </div>
        )}
      </div>

      {/* Device Details */}
      {showDetails && deviceStatus.deviceList.length > 0 && (
        <div className="space-y-1">
          {deviceStatus.deviceList.map((device) => (
            <div
              key={device.id}
              className={`flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer hover:bg-white/10 transition-colors ${
                device.isConnected ? 'border-green-400/30' : 'border-gray-400/30'
              }`}
              onClick={() => onDeviceClick?.(device.id)}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  device.isConnected ? 'bg-green-400' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-white font-medium">
                  {device.name}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Signal Strength */}
                {device.signalStrength !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Signal className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {device.signalStrength}dBm
                    </span>
                  </div>
                )}
                
                {/* Battery Level */}
                {device.batteryLevel !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Battery className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {device.batteryLevel}%
                    </span>
                  </div>
                )}
                
                {/* Last Seen */}
                {device.lastSeen && (
                  <span className="text-xs text-gray-400">
                    {new Date(device.lastSeen).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceStatusIndicator;
