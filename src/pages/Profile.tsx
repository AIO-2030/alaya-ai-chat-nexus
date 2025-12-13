import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { User, Smartphone, MoreHorizontal, ChevronRight, Edit, Save, X, Lock, Eye, EyeOff } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation } from '../components/BottomNavigation';
import { PageLayout } from '../components/PageLayout';
import { upsertNickname, getUserInfoByPrincipal, changeUserPassword } from '../services/api/userApi';
import { useToast } from '../hooks/use-toast';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import DeviceStatusIndicator from '../components/DeviceStatusIndicator';

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Use device status hook for real-time device management
  const {
    deviceStatus,
    hasConnectedDevices,
    isTencentIoTEnabled,
    isLoading: deviceLoading,
    error: deviceError,
    refreshDeviceStatus
  } = useDeviceStatus();

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

  // Password change handlers
  const validatePasswordForm = (): boolean => {
    setPasswordError('');

    if (!oldPassword) {
      setPasswordError(t('passwordChange.error.oldPasswordRequired') || 'Old password is required');
      return false;
    }

    if (!newPassword) {
      setPasswordError(t('passwordChange.error.newPasswordRequired') || 'New password is required');
      return false;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('passwordChange.error.passwordTooShort') || 'Password must be at least 6 characters');
      return false;
    }

    if (newPassword.length > 128) {
      setPasswordError(t('passwordChange.error.passwordTooLong') || 'Password is too long (max 128 characters)');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordChange.error.passwordMismatch') || 'New passwords do not match');
      return false;
    }

    if (oldPassword === newPassword) {
      setPasswordError(t('passwordChange.error.samePassword') || 'New password must be different from old password');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!user?.principalId) return;

    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');

    try {
      const updatedUser = await changeUserPassword(user.principalId, oldPassword, newPassword);
      if (updatedUser) {
        toast({
          title: t('passwordChange.success') || 'Password Changed',
          description: t('passwordChange.successDescription') || 'Your password has been changed successfully',
        });
        // Reset form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      } else {
        throw new Error(t('passwordChange.error.changeFailed') || 'Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : t('passwordChange.error.changeFailed') || 'Failed to change password. Please check your old password.';
      setPasswordError(errorMessage);
      toast({
        title: t('passwordChange.error.changeFailed') || 'Password Change Failed',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordChange(false);
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
            
            {/* Password Change Section */}
            {user?.loginMethod === 'ii' && user?.email && (
              <div className="mt-6 pt-6 border-t border-white/10">
                {!showPasswordChange ? (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="w-full p-4 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 hover:from-cyan-400/20 hover:to-purple-400/20 border border-white/10 rounded-xl transition-all duration-200 flex items-center justify-between group"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-400/20 rounded-lg group-hover:bg-cyan-400/30 transition-colors">
                        <Lock className="h-5 w-5 text-cyan-400" />
                      </div>
                      <span className="text-white font-medium">
                        {t('passwordChange.title') || 'Change Password'}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white/60 transition-colors" />
                  </button>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Header with back button */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-400/20 rounded-lg">
                          <Lock className="h-5 w-5 text-cyan-400" />
                        </div>
                        <span className="text-white font-medium">
                          {t('passwordChange.title') || 'Change Password'}
                        </span>
                      </div>
                      <button
                        onClick={handleCancelPasswordChange}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                    
                    {/* Old Password */}
                    <div className="space-y-2">
                      <label className="text-sm text-white/80">
                        {t('passwordChange.oldPassword') || 'Old Password'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder={t('passwordChange.oldPasswordPlaceholder') || 'Enter your current password'}
                          className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                          disabled={isChangingPassword}
                          style={{
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <label className="text-sm text-white/80">
                        {t('passwordChange.newPassword') || 'New Password'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('passwordChange.newPasswordPlaceholder') || 'Enter your new password (min 6 characters)'}
                          className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                          disabled={isChangingPassword}
                          style={{
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="text-sm text-white/80">
                        {t('passwordChange.confirmPassword') || 'Confirm New Password'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('passwordChange.confirmPasswordPlaceholder') || 'Re-enter your new password'}
                          className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                          disabled={isChangingPassword}
                          style={{
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {passwordError && (
                      <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                        <p className="text-sm text-red-200" style={{
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}>
                          {passwordError}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {isChangingPassword 
                          ? (t('passwordChange.changing') || 'Changing...') 
                          : (t('passwordChange.saveButton') || 'Save Password')}
                      </button>
                      <button
                        onClick={handleCancelPasswordChange}
                        disabled={isChangingPassword}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Devices Section */}
        <div className="mb-6 bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-cyan-400" />
              <div>
                <span className="text-white font-medium">{t('common.myDevices')}</span>
                {isTencentIoTEnabled && (
                  <div className="text-xs text-blue-400 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    {t('deviceStatus.iotCloudConnected')}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={refreshDeviceStatus}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh device status"
            >
              <MoreHorizontal className="h-4 w-4 text-white/40" />
            </button>
          </div>

          {/* Device Status Summary and List */}
          <DeviceStatusIndicator 
            showDetails={true}
            onDeviceClick={(deviceId) => {
              console.log('Device clicked:', deviceId);
              // Navigate to device details or show device info
            }}
          />
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