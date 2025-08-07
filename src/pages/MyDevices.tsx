import React, { useState } from 'react';
import { Smartphone, Wifi, Battery, Settings, Bluetooth, Monitor, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MyDevices = () => {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showWifiDialog, setShowWifiDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [bluetoothDevices] = useState([
    { id: 1, name: "iPhone 15 Pro", rssi: -45, type: "phone" },
    { id: 2, name: "AirPods Pro", rssi: -55, type: "audio" },
    { id: 3, name: "Smart Watch", rssi: -60, type: "wearable" },
  ]);
  const [wifiNetworks] = useState([
    { id: 1, name: "MyHome_WiFi", security: "WPA2", strength: -30 },
    { id: 2, name: "Guest_Network", security: "Open", strength: -50 },
    { id: 3, name: "Office_5G", security: "WPA3", strength: -65 },
  ]);

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
    setShowAddDevice(true);
  };

  const handleConnectBluetooth = (device: any) => {
    console.log('Connecting to Bluetooth device:', device.name);
    setShowAddDevice(false);
  };

  const handleLinkToWifi = (device: any) => {
    setSelectedDevice(device);
    setShowWifiDialog(true);
  };

  const handleWifiConnect = (network: any) => {
    console.log('Connecting device to WiFi:', network.name);
    setShowWifiDialog(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Devices</h1>
              <p className="text-white/60">Manage your connected devices and their status</p>
            </div>
          </div>
          <Button 
            onClick={handleAddDevice}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="p-6 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-8 w-8 text-cyan-400" />
                  <div>
                    <h3 className="text-white font-medium">{device.name}</h3>
                    <p className="text-sm text-white/60">{device.type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                  {device.status}
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
                <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleLinkToWifi(device)}
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <Wifi className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Device Dialog */}
        <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Plus className="h-5 w-5 text-cyan-400" />
                Add Device
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Bluetooth className="h-4 w-4 text-cyan-400" />
                  Select by Bluetooth
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {bluetoothDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-400/20 rounded flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{device.name}</div>
                          <div className="text-white/60 text-xs">Signal: {device.rssi} dBm</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleConnectBluetooth(device)}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 text-xs"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setShowAddDevice(false)}
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* WiFi Link Dialog */}
        <Dialog open={showWifiDialog} onOpenChange={setShowWifiDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Wifi className="h-5 w-5 text-cyan-400" />
                Link to WiFi
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-white/60 text-sm">
                Select WiFi network for: <span className="text-white font-medium">{selectedDevice?.name}</span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {wifiNetworks.map((network) => (
                  <div key={network.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors">
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
                      Connect
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowWifiDialog(false)}
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyDevices;