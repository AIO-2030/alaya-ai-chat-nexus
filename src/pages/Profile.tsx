import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { User, Wallet, Smartphone, MoreHorizontal, ChevronRight, Edit, Save, X, Trash2 } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { upsertNickname, deleteUserProfile, getUserInfoByPrincipal } from '../services/api/userApi';
import { useToast } from '../hooks/use-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          title: "昵称更新成功",
          description: `您的昵称已更新为: ${nickname}`,
        });
        setIsEditing(false);
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('Failed to update nickname:', error);
      toast({
        title: "更新失败",
        description: "昵称更新失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user?.principalId) return;
    
    if (!confirm('确定要删除您的用户档案吗？此操作不可撤销。')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const success = await deleteUserProfile(user.principalId);
      if (success) {
        toast({
          title: "档案删除成功",
          description: "您的用户档案已被删除",
        });
        // Logout after successful deletion
        await logout();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast({
        title: "删除失败",
        description: "档案删除失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setNickname(user?.nickname || '');
    setIsEditing(false);
  };

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
                    placeholder="输入昵称"
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
                    {user?.nickname || 'Nick Name'}
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
                {user?.email || 'user@example.com'}
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
            <h2 className="text-lg font-semibold text-white mb-4">用户信息</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">用户ID:</span>
                <span className="text-white/60 text-sm">{user?.userId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Principal ID:</span>
                <span className="text-white/60 text-sm font-mono">
                  {user?.principalId ? `${user.principalId.slice(0, 8)}...${user.principalId.slice(-8)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">登录方式:</span>
                <span className="text-white/60 text-sm capitalize">
                  {user?.loginMethod === 'wallet' ? '钱包' : 
                   user?.loginMethod === 'google' ? 'Google' : 'II'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">状态:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  user?.loginStatus === 'authenticated' 
                    ? 'bg-green-400/20 text-green-400' 
                    : 'bg-red-400/20 text-red-400'
                }`}>
                  {user?.loginStatus === 'authenticated' ? '已认证' : '未认证'}
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

        {/* Danger Zone */}
        <div className="mb-6">
          <div className="bg-red-400/10 border border-red-400/20 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-red-400 mb-4">危险操作</h3>
            <div className="space-y-3">
              <button
                onClick={handleDeleteProfile}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-3 rounded-lg border border-red-400/30 transition-all duration-200 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? '删除中...' : '删除用户档案'}
              </button>
              <p className="text-red-400/60 text-xs text-center">
                删除后无法恢复，请谨慎操作
              </p>
            </div>
          </div>
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