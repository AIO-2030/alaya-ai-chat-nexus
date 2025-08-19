import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { User, Edit, Save, X, Trash2, Eye, RefreshCw } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { 
  getUserInfoByPrincipal,
  upsertNickname,
  deleteUserProfile 
} from '../services/api/userApi';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { UserInfo } from '../types/user';

const UserManagement = () => {
  const { user: currentUser, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load current user info on mount
  useEffect(() => {
    if (currentUser?.principalId) {
      loadCurrentUserInfo();
    }
  }, [currentUser?.principalId]);

  // Update nickname when user changes
  useEffect(() => {
    setNickname(user?.nickname || '');
  }, [user?.nickname]);

  const loadCurrentUserInfo = async () => {
    if (!currentUser?.principalId) return;
    
    setLoading(true);
    try {
      const userInfo = await getUserInfoByPrincipal(currentUser.principalId);
      if (userInfo) {
        setUser(userInfo);
      } else {
        // If not found in canister, use current auth user
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      // Fallback to current auth user
      setUser(currentUser);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNickname = async () => {
    if (!user?.principalId || !nickname.trim()) return;
    
    setIsUpdating(true);
    try {
      const updatedUser = await upsertNickname(user.principalId, nickname.trim());
      if (updatedUser) {
        setUser(updatedUser);
        toast({
          title: t('userManagement.updateNicknameSuccess'),
          description: `${t('userManagement.nickname')}: ${nickname}`,
        });
        setIsEditing(false);
      } else {
        throw new Error('更新失败');
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

  const handleDeleteProfile = async () => {
    if (!user?.principalId) return;
    
    if (!confirm(t('userManagement.deleteProfileConfirm'))) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const success = await deleteUserProfile(user.principalId);
      if (success) {
        toast({
          title: t('userManagement.deleteProfileSuccess'),
          description: t('userManagement.deleteProfileSuccess'),
        });
        // Logout after successful deletion
        await logout();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast({
        title: t('userManagement.deleteProfileFailed'),
        description: t('userManagement.deleteProfileFailed'),
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

  const handleRefresh = async () => {
    await loadCurrentUserInfo();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">{t('userManagement.pleaseLogin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
      </div>

      <div className="relative z-10 p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('userManagement.title')}</h1>
            <p className="text-white/60">{t('userManagement.subtitle')}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-white/60">{t('userManagement.loading')}</p>
          </div>
        ) : user ? (
          <>
            {/* User Profile Header */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
                  {user.picture ? (
                    <img 
                      src={user.picture} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder={t('userManagement.inputNickname')}
                        maxLength={20}
                      />
                      <button
                        onClick={handleUpdateNickname}
                        disabled={isUpdating || !nickname.trim()}
                        className="p-2 bg-cyan-400/20 hover:bg-cyan-400/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 text-cyan-400" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-white">
                        {user.nickname || t('userManagement.nicknameNotSet')}
                      </h2>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                  )}
                  <p className="text-white/60 text-sm">
                    {user.email || t('userManagement.emailNotSet')}
                  </p>
                  {user.walletAddress && (
                    <p className="text-white/40 text-xs font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* User Info Section */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-4">{t('userManagement.accountInfo')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">{t('userManagement.userId')}:</span>
                    <span className="text-white/60 text-sm">{user.userId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">{t('userManagement.principalId')}:</span>
                    <span className="text-white/60 text-sm font-mono">
                      {user.principalId ? `${user.principalId.slice(0, 8)}...${user.principalId.slice(-8)}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">{t('userManagement.loginMethod')}:</span>
                    <span className="text-white/60 text-sm capitalize">
                      {user.loginMethod === 'wallet' ? t('userManagement.wallet') : 
                       user.loginMethod === 'google' ? t('userManagement.google') : t('userManagement.ii')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">{t('userManagement.status')}:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      user.loginStatus === 'authenticated' 
                        ? 'bg-green-400/20 text-green-400' 
                        : 'bg-red-400/20 text-red-400'
                    }`}>
                      {user.loginStatus === 'authenticated' ? t('userManagement.authenticated') : t('userManagement.unauthenticated')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mb-6">
              <div className="bg-red-400/10 border border-red-400/20 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-red-400 mb-4">{t('userManagement.dangerZone')}</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleDeleteProfile}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-3 rounded-lg border border-red-400/30 transition-all duration-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? t('userManagement.deleteProfileInProgress') : t('userManagement.deleteProfile')}
                  </button>
                  <p className="text-red-400/60 text-xs text-center">
                    {t('userManagement.deleteProfileWarning')}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">{t('userManagement.failedToLoad')}</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default UserManagement;
