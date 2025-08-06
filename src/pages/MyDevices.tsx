import React from 'react';
import { Smartphone, Wifi, Battery, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MyDevices = () => {
  const devices = [
    { id: 1, name: "iPhone 15 Pro", type: "Mobile", status: "Connected", battery: 85 },
    { id: 2, name: "MacBook Pro", type: "Desktop", status: "Connected", battery: 92 },
    { id: 3, name: "iPad Air", type: "Tablet", status: "Offline", battery: 34 },
  ];

  const getStatusColor = (status: string) => {
    return status === 'Connected' 
      ? 'text-green-400 bg-green-400/20' 
      : 'text-red-400 bg-red-400/20';
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-400';
    if (battery > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Devices</h1>
            <p className="text-white/60">Manage your connected devices and their status</p>
          </div>
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
                  <span className="text-sm text-white/80">Network Connected</span>
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

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyDevices;