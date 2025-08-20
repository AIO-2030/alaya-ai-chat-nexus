import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { User, Wallet, Smartphone, MoreHorizontal, ChevronRight, Edit, Save, X } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation } from '../components/BottomNavigation';
import { PageLayout } from '../components/PageLayout';
import { upsertNickname, getUserInfoByPrincipal } from '../services/api/userApi';
import { useToast } from '../hooks/use-toast';

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Mock device data
  const devices = [
    { id: 1, name: 'iPhone 14 Pro', status: 'active', lastSeen: '2 hours ago' },
    { id: 2, name: 'MacBook Pro', status: 'active', lastSeen: '1 day ago' },
    { id: 3, name: 'iPad Air', status: 'inactive', lastSeen: '3 days ago' },
  ];

  // Update nickname when user changes
  useEffect(() => {
    setNickname(user?.nickname || '');
  }, [user?.nickname]);

  const handleUpdateNickname = async () => {
    if (!user?.principalId || !nickname.trim()) return;
    
    setIsUpdating(true);
    try {
      const updatedUser = await upsertNickname(user.principalId, nickname.trim());
      if (updatedUser) {
        toast({
          title: t('userManagement.updateNicknameSuccess'),
          description: `${t('userManagement.nickname')}: ${nickname}`,
        });
        setIsEditing(false);
      } else {
        throw new Error(t('userManagement.updateNicknameFailed'));
      }
    } catch (error) {
      console.error('Failed to update nickname:', error);
      toast({
        title: t('userManagement.updateNicknameFailed'),
        description: t('userManagement.updateNicknameFailed'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };



  const handleCancelEdit = () => {
    setNickname(user?.nickname || '');
    setIsEditing(false);
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* App Header */}
        <AppHeader />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
        </div>

        <div className="relative z-10 p-4 pb-20 pt-24">
        {/* Header with User Avatar and Nickname */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder={t('userManagement.inputNickname')}
                    maxLength={20}
                  />
                  <button
                    onClick={handleUpdateNickname}
                    disabled={isUpdating || !nickname.trim()}
                    className="p-1 bg-cyan-400/20 hover:bg-cyan-400/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 text-cyan-400" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-white/60" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">
                    {user?.nickname || t('userManagement.nicknameNotSet')}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4 text-white/60" />
                  </button>
                </div>
              )}
              <p className="text-white/60 text-sm">
                {user?.email || t('userManagement.emailNotSet')}
              </p>
              {user?.walletAddress && (
                <p className="text-white/40 text-xs">
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white mb-4">{t('userManagement.accountInfo')}</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">{t('userManagement.userId')}:</span>
                <span className="text-white/60 text-sm">{user?.userId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">{t('userManagement.principalId')}:</span>
                <span className="text-white/60 text-sm font-mono">
                  {user?.principalId ? `${user.principalId.slice(0, 8)}...${user.principalId.slice(-8)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">{t('userManagement.loginMethod')}:</span>
                <span className="text-white/60 text-sm capitalize">
                  {user?.loginMethod === 'wallet' ? t('userManagement.wallet') : 
                   user?.loginMethod === 'google' ? t('userManagement.google') : t('userManagement.ii')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">{t('userManagement.status')}:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  user?.loginStatus === 'authenticated' 
                    ? 'bg-green-400/20 text-green-400' 
                    : 'bg-red-400/20 text-red-400'
                }`}>
                  {user?.loginStatus === 'authenticated' ? t('userManagement.authenticated') : t('userManagement.unauthenticated')}
                </span>
              </div>
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
                  <div className="text-sm text-white/60">{t('common.balance')}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-white/20 rounded"></div>
                <div className="w-3 h-3 bg-white/20 rounded"></div>
                <div className="w-3 h-3 bg-white/20 rounded"></div>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">{t('common.myWallet')}</h2>
            </div>
          </div>
        </div>

        {/* My Devices Button */}
        <div className="mb-4">
          <button className="w-full bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-cyan-400" />
                <span className="text-white font-medium">{t('common.myDevices')}</span>
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
              <span className="text-white font-medium">More...</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
    </PageLayout>
  );
};

export default Profile;