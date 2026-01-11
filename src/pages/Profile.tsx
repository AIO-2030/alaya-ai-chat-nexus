import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { User, Smartphone, MoreHorizontal, ChevronRight, Edit, Save, X, Lock, Eye, EyeOff, Coins, Sparkles, Download } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation } from '../components/BottomNavigation';
import { PageLayout } from '../components/PageLayout';
import { upsertNickname, getUserInfoByPrincipal, changeUserPassword } from '../services/api/userApi';
import { useToast } from '../hooks/use-toast';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import DeviceStatusIndicator from '../components/DeviceStatusIndicator';
import { useSolanaWallet } from '../lib/solanaWallet';
import QRCode from 'react-qr-code';

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

  // Solana wallet state
  const {
    address: solanaAddress,
    isConnected: isSolanaConnected,
    isConnecting: isSolanaConnecting,
    error: solanaError,
    uri: walletConnectUri,
    connect: connectSolanaWallet,
    disconnect: disconnectSolanaWallet,
    getTokenBalance,
  } = useSolanaWallet();
  const [tokenBalance, setTokenBalance] = useState<{
    balance: number;
    decimals: number;
    symbol?: string;
    name?: string;
  } | null>(null);
  const [isLoadingTokenBalance, setIsLoadingTokenBalance] = useState(false);

  // Debug: Log wallet state changes
  useEffect(() => {
    console.log('[Profile] Solana wallet state changed:', {
      address: solanaAddress,
      isConnected: isSolanaConnected,
      isConnecting: isSolanaConnecting,
      error: solanaError,
      uri: walletConnectUri ? walletConnectUri.substring(0, 50) + '...' : null,
    });
  }, [solanaAddress, isSolanaConnected, isSolanaConnecting, solanaError, walletConnectUri]);

  // Mobile device detection
  const isMobileDevice = typeof navigator !== 'undefined' && 
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.matchMedia('(min-width: 1024px)').matches; // Exclude tablets in desktop mode
  
  // Check if Phantom extension is installed (PC) - use same logic as solanaWallet
  const isPhantomInstalled = typeof window !== 'undefined' && 
    !!((window as any).phantom?.solana?.isPhantom || (window as any).solana?.isPhantom);

  const handleOpenWalletApp = () => {
    // Double check: only proceed on mobile devices
    if (!isMobileDevice) {
      console.warn('handleOpenWalletApp called on non-mobile device, ignoring');
      return;
    }
    
    if (!walletConnectUri) return;
    
    // On mobile, try multiple deep link strategies for better compatibility
    try {
      // Strategy 1: Direct wc:// URI (works for most wallets that support WalletConnect)
      // This will trigger the system to open registered wallet apps
      const wcUri = walletConnectUri;
      
      // Strategy 2: Try common wallet deep links as fallback
      // Phantom wallet
      const phantomDeepLink = `phantom://v1/connect?uri=${encodeURIComponent(wcUri)}`;
      
      // Try direct wc:// first (most compatible)
      const link = document.createElement('a');
      link.href = wcUri;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // If direct link doesn't work, try Phantom deep link after a short delay
      setTimeout(() => {
        // Check if we're still on the same page (link didn't work)
        if (document.visibilityState === 'visible') {
          // Try Phantom deep link
          window.location.href = phantomDeepLink;
        }
      }, 500);
    } catch (error) {
      console.error('Failed to open wallet app:', error);
      // Final fallback: direct URI (only on mobile)
      if (isMobileDevice) {
        window.location.href = walletConnectUri;
      }
    }
  };

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

  // Solana wallet handlers
  const handleConnectPhantom = async () => {
    console.log('[Profile] handleConnectPhantom called');
    console.log('[Profile] Current wallet state:', {
      isConnecting: isSolanaConnecting,
      isConnected: isSolanaConnected,
      address: solanaAddress,
      error: solanaError,
      uri: walletConnectUri,
    });
    
    try {
      console.log('[Profile] Calling connectSolanaWallet()...');
      const address = await connectSolanaWallet();
      console.log('[Profile] connectSolanaWallet() returned:', address);
      
      if (address) {
        console.log('[Profile] Connection successful, address:', address);
        toast({
          title: t('common.walletConnected') || 'Wallet Connected',
          description: `Connected to Phantom: ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
        // Fetch token balance after connection
        console.log('[Profile] Fetching token balance...');
        await fetchTokenBalance(address);
      } else {
        console.log('[Profile] Connection returned null, checking error state...');
        // Connection was cancelled or failed, check error state
        if (solanaError) {
          console.error('[Profile] Connection failed with error:', solanaError);
          toast({
            title: t('common.walletConnectionFailed') || 'Connection Failed',
            description: solanaError,
            variant: 'destructive',
          });
        } else {
          console.log('[Profile] Connection cancelled by user (no error)');
        }
      }
    } catch (error: any) {
      console.error('[Profile] Exception in handleConnectPhantom:', error);
      console.error('[Profile] Exception details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      toast({
        title: t('common.walletConnectionFailed') || 'Connection Failed',
        description: error.message || 'Failed to connect to Phantom wallet. Please make sure Phantom wallet is installed.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectPhantom = async () => {
    try {
      await disconnectSolanaWallet();
      setTokenBalance(null);
      toast({
        title: t('common.walletDisconnected') || 'Wallet Disconnected',
        description: 'Phantom wallet disconnected',
      });
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const fetchTokenBalance = async (address?: string) => {
    setIsLoadingTokenBalance(true);
    try {
      const balance = await getTokenBalance(address);
      setTokenBalance(balance);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    } finally {
      setIsLoadingTokenBalance(false);
    }
  };

  // Fetch token balance when wallet is connected
  useEffect(() => {
    if (isSolanaConnected && solanaAddress) {
      fetchTokenBalance(solanaAddress);
    }
  }, [isSolanaConnected, solanaAddress]);

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
                <span className="text-white/80">{t('userManagement.principalId')}:</span>
                <span className="text-white/60 text-sm font-mono">
                  {user?.principalId ? `${user.principalId.slice(0, 8)}...${user.principalId.slice(-8)}` : 'N/A'}
                </span>
              </div>
              {/* Solana Wallet Address */}
              {isSolanaConnected && solanaAddress && (
                <div className="flex justify-between items-center">
                  <span className="text-white/80">{t('common.solanaWallet')}:</span>
                  <span className="text-white/60 text-sm font-mono">
                    {solanaAddress.slice(0, 6)}...{solanaAddress.slice(-4)}
                  </span>
                </div>
              )}
              {/* Token Balance */}
              {isSolanaConnected && (tokenBalance !== null || isLoadingTokenBalance) && (
                <div className="flex justify-between items-center">
                  <span className="text-white/80">{t('common.tokenBalance')}:</span>
                  <span className="text-white/60 text-sm">
                    {isLoadingTokenBalance ? (
                      <span className="text-white/40">Loading...</span>
                    ) : tokenBalance ? (
                      <span>
                        {tokenBalance.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{' '}
                        {tokenBalance.symbol}
                      </span>
                    ) : (
                      <span className="text-white/40">0</span>
                    )}
                  </span>
                </div>
              )}
            </div>
            
            {/* Start to Earn - Wallet Connection Section */}
            <div className="mt-6 pt-6 border-t border-white/10">
              {!isSolanaConnected ? (
                <div className="space-y-4">
                  {/* Title Section */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {t('common.startToEarn') || 'Start to earn'}
                      <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                    </h3>
                    <p className="text-white/60 text-sm mt-0.5">
                      Connect your wallet to start earning rewards
                    </p>
                  </div>
                  
                  {/* Connection Button */}
                  <button
                    onClick={handleConnectPhantom}
                    disabled={isSolanaConnecting}
                    className="w-full p-4 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-purple-500/20 hover:from-yellow-500/30 hover:via-orange-500/30 hover:to-purple-500/30 border border-yellow-400/30 rounded-xl transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/20"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-lg group-hover:from-yellow-400/40 group-hover:to-orange-400/40 transition-colors">
                        <Coins className="h-5 w-5 text-yellow-400" />
                      </div>
                      <span className="text-white font-semibold">
                        {isSolanaConnecting ? (t('common.connecting') || 'Connecting...') : (t('common.linkToPhantomWallet') || 'Link to Phantom Wallet')}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/60 group-hover:text-yellow-400 transition-colors" />
                  </button>
                  
                  {/* Connection hint when connecting via Phantom extension */}
                  {isSolanaConnecting && isPhantomInstalled && !walletConnectUri && (
                    <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                      <p className="text-sm text-blue-200 text-center">
                        Please check your browser for a Phantom extension popup. If no popup appears, check if popups are blocked for this site.
                      </p>
                    </div>
                  )}
                  
                  {/* WalletConnect QR Code Display - Show if WalletConnect URI is available and not connected */}
                  {walletConnectUri && !isSolanaConnected && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-white text-sm font-medium mb-3 text-center">
                        {isMobileDevice ? 'Open your wallet app to approve' : 'Scan QR code with your wallet app'}
                      </p>
                      
                      {/* QR Code - Always display */}
                      <div className="flex justify-center p-4 bg-white rounded-lg mb-3" id="walletconnect-qr-code">
                        <QRCode
                          value={walletConnectUri}
                          size={200}
                          level="M"
                          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        />
                      </div>
                      
                      {/* Mobile: Open Wallet button */}
                      {isMobileDevice && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const isMobile = typeof navigator !== 'undefined' && 
                              /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
                              !window.matchMedia('(min-width: 1024px)').matches;
                            if (isMobile) {
                              handleOpenWalletApp();
                            }
                          }}
                          className="w-full mb-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-lg font-medium transition-all duration-200"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          Open Wallet
                        </button>
                      )}
                      
                      {/* Save QR Code to Gallery */}
                      <button
                        onClick={async () => {
                          try {
                            const qrContainer = document.getElementById('walletconnect-qr-code');
                            if (!qrContainer) return;
                            
                            const svgElement = qrContainer.querySelector('svg');
                            if (!svgElement) return;
                            
                            // Convert SVG to canvas
                            const svgData = new XMLSerializer().serializeToString(svgElement);
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            
                            // Set canvas size
                            const size = 200;
                            canvas.width = size;
                            canvas.height = size;
                            
                            // Create image from SVG
                            const img = new Image();
                            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(svgBlob);
                            
                            img.onload = () => {
                              // Draw white background
                              ctx.fillStyle = '#FFFFFF';
                              ctx.fillRect(0, 0, size, size);
                              
                              // Draw QR code
                              ctx.drawImage(img, 0, 0, size, size);
                              
                              // Convert to blob and download
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  const link = document.createElement('a');
                                  link.href = URL.createObjectURL(blob);
                                  link.download = `walletconnect-qr-${Date.now()}.png`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                  
                                  toast({
                                    title: t('common.qrCodeSaved') || 'QR Code Saved',
                                    description: t('common.qrCodeSavedDesc') || 'QR code has been saved to your device',
                                  });
                                }
                              }, 'image/png');
                            };
                            
                            img.onerror = () => {
                              console.error('Failed to load SVG image');
                              URL.revokeObjectURL(url);
                            };
                            
                            img.src = url;
                          } catch (error) {
                            console.error('Failed to save QR code:', error);
                            toast({
                              title: t('common.saveFailed') || 'Save Failed',
                              description: t('common.qrCodeSaveFailed') || 'Failed to save QR code',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {t('common.saveQRCode') || 'Save QR Code'}
                      </button>
                      
                      <p className="text-white/60 text-xs mt-3 text-center">
                        {isMobileDevice
                          ? 'Tap "Open Wallet" or save the QR code to scan later.'
                          : 'Scan this QR code with your wallet app to connect.'}
                      </p>
                    </div>
                  )}
                  
                  {solanaError && !isSolanaConnecting && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                      <p className="text-sm text-red-200">{solanaError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-400/20 rounded-lg">
                        <Smartphone className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{t('common.phantomWalletConnected')}</p>
                        <p className="text-white/60 text-xs font-mono">
                          {solanaAddress?.slice(0, 8)}...{solanaAddress?.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectPhantom}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Disconnect wallet"
                    >
                      <X className="h-4 w-4 text-white/60" />
                    </button>
                  </div>
                  {tokenBalance !== null && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">{t('common.tokenBalance')}:</span>
                        <span className="text-white text-sm font-medium">
                          {tokenBalance.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}{' '}
                          {tokenBalance.symbol}
                        </span>
                      </div>
                      {tokenBalance.name && (
                        <p className="text-white/60 text-xs mt-1">{tokenBalance.name}</p>
                      )}
                      <p className="text-white/40 text-xs mt-1 font-mono">
                        Contract: V8tLkyqHdtzzYCGdsVf5CZ55BsLuvu7F4TchiDhJgem
                      </p>
                    </div>
                  )}
                </div>
              )}
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