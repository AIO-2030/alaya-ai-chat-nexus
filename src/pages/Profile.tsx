import React from 'react';
import { useAuth } from '../lib/auth';
import { User, Wallet, Smartphone, MoreHorizontal, ChevronRight } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';

const Profile = () => {
  const { user } = useAuth();

  // Mock device data
  const devices = [
    { id: 1, name: 'iPhone 14 Pro', status: 'active', lastSeen: '2 hours ago' },
    { id: 2, name: 'MacBook Pro', status: 'active', lastSeen: '1 day ago' },
    { id: 3, name: 'iPad Air', status: 'inactive', lastSeen: '3 days ago' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
      </div>

      <div className="relative z-10 p-4 pb-20">
        {/* Header with User Avatar and Nickname */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {user?.name || 'Nick Name'}
              </h1>
              <p className="text-white/60 text-sm">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-4 h-4 bg-cyan-400 rounded"></div>
              <div className="flex-1 mx-4 bg-white/10 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">$127.50</div>
                  <div className="text-sm text-white/60">Available Balance</div>
                </div>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-white/20 rounded"></div>
                <div className="w-3 h-3 bg-white/20 rounded"></div>
                <div className="w-3 h-3 bg-white/20 rounded"></div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">My wallet</h2>
            </div>
          </div>
        </div>

        {/* My Devices Button */}
        <div className="mb-4">
          <button className="w-full bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-cyan-400" />
                <span className="text-white font-medium">My devices</span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </div>
          </button>
        </div>

        {/* Devices List */}
        <div className="space-y-3 mb-6">
          {devices.map((device) => (
            <div key={device.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    device.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <div className="text-white font-medium">{device.name}</div>
                    <div className="text-white/60 text-sm">{device.lastSeen}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/20 rounded"></div>
                  <div className="w-2 h-2 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* More Button */}
        <div className="text-center">
          <button className="bg-white/5 backdrop-blur-xl rounded-xl px-6 py-3 border border-white/10 hover:bg-white/10 transition-all duration-200">
            <div className="flex items-center justify-center gap-2">
              <MoreHorizontal className="h-4 w-4 text-white/60" />
              <span className="text-white font-medium">More ...</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Profile;