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
import { useLocation, useNavigate } from 'react-router-dom';
import pageBaseStyles from '../styles/pages/PageBase.module.css';
import styles from '../styles/pages/Profile.module.css';

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // PC端检测：如果存在 injected Phantom，不显示 WalletConnect UI
  const hasInjectedPhantom = typeof window !== 'undefined' &&
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
      <div className={pageBaseStyles.page__base}>
        {/* App Header */}
        <AppHeader />
        
        <div className={pageBaseStyles.page__base__container}>
        {/* Header with User Avatar and Nickname */}
        <div className={`${styles.profile__header}`}>
          <div className={`${styles.profile__header__content}`}>
            <div className={styles.profile__avatar__container}>
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  className={styles.profile__avatar__image}
                />
              ) : (
                <User className={styles.profile__avatar__icon} />
              )}
            </div>
            <div className={styles.profile__info}>
              {isEditing ? (
                <div className={styles.profile__nickname__editor}>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className={styles.profile__nickname__input}
                    placeholder={t('userManagement.inputNickname')}
                    maxLength={20}
                  />
                  <button
                    onClick={handleUpdateNickname}
                    disabled={isUpdating || !nickname.trim()}
                    className={styles.profile__nickname__button}
                  >
                    <Save className={styles.profile__nickname__button__icon} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={styles.profile__nickname__cancel__button}
                  >
                    <X className={styles.profile__nickname__cancel__icon} />
                  </button>
                </div>
              ) : (
                <div className={styles.profile__name__container}>
                  <h1 className={styles.profile__name}>
                    {user?.nickname || t('userManagement.nicknameNotSet')}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={styles.profile__edit__button}
                  >
                    <Edit className={styles.profile__edit__icon} />
                  </button>
                </div>
              )}
              <p className={styles.profile__email}>
                {user?.email || t('userManagement.emailNotSet')}
              </p>
              {user?.walletAddress && (
                <p className={styles.profile__wallet__address}>
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className={styles.profile__account__info}>
          <div className={styles.profile__account__card}>
            <h2 className={styles.profile__account__title}>{t('userManagement.accountInfo')}</h2>
            <div className={styles.profile__account__info__list}>     
              <div className={styles.profile__account__info__item}>
                <span className={styles.profile__account__info__label}>{t('userManagement.principalId')}:</span>
                <span className={styles.profile__account__info__value}>
                  {user?.principalId ? `${user.principalId.slice(0, 8)}...${user.principalId.slice(-8)}` : 'N/A'}
                </span>
              </div>
              {/* Solana Wallet Address */}
              {isSolanaConnected && solanaAddress && (
                <div className={styles.profile__account__info__item}>
                  <span className={styles.profile__account__info__label}>{t('common.solanaWallet')}:</span>
                  <span className={styles.profile__account__info__value}>
                    {solanaAddress.slice(0, 6)}...{solanaAddress.slice(-4)}
                  </span>
                </div>
              )}
              {/* Token Balance */}
              {isSolanaConnected && (tokenBalance !== null || isLoadingTokenBalance) && (
                <div className={styles.profile__account__info__item}>
                  <span className={styles.profile__account__info__label}>{t('common.tokenBalance')}:</span>
                  <span className={styles.profile__account__info__value}>
                    {isLoadingTokenBalance ? (
                      <span className={styles.profile__loading}>Loading...</span>
                    ) : tokenBalance ? (
                      <span>
                        {tokenBalance.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{' '}
                        {tokenBalance.symbol}
                      </span>
                    ) : (
                      <span className={styles.profile__loading}>0</span>
                    )}
                  </span>
                </div>
              )}
            </div>
            
            {/* Start to Earn - Wallet Connection Section */}
            <div className={styles.profile__wallet__section}>
              {!isSolanaConnected ? (
                <div className={styles.profile__wallet__connected__container}>
                  {/* Title Section */}
                  <div className={styles.profile__wallet__title__section}>
                    <h3 className={styles.profile__wallet__title}>
                      {t('common.startToEarn') || 'Start to earn'}
                      <Sparkles className={styles.profile__wallet__title__icon} />
                    </h3>
                    <p className={styles.profile__wallet__subtitle}>
                      Connect your wallet to start earning rewards
                    </p>
                  </div>
                  
                  {/* Connection Button */}
                  <button
                    onClick={handleConnectPhantom}
                    disabled={isSolanaConnecting}
                    className={styles.profile__wallet__connect__button}
                  >
                    <div className={styles.profile__wallet__connect__button__content}>
                      <div className={styles.profile__wallet__connect__button__icon__container}>
                        <Coins className={styles.profile__wallet__connect__button__icon} />
                      </div>
                      <span className={styles.profile__wallet__connect__button__text}>
                        {isSolanaConnecting ? (t('common.connecting') || 'Connecting...') : (t('common.linkToPhantomWallet') || 'Link to Phantom Wallet')}
                      </span>
                    </div>
                    <ChevronRight className={styles.profile__wallet__connect__button__chevron} />
                  </button>
                  
                  {/* Connection hint when connecting via Phantom extension (PC) */}
                  {isSolanaConnecting && hasInjectedPhantom && !walletConnectUri && (
                    <div className={styles.profile__wallet__connection__hint}>
                      <p className={styles.profile__wallet__connection__hint__text}>
                        Please open the Phantom extension (top-right) and approve the pending connection request. If Phantom is locked, unlock it first.
                      </p>
                    </div>
                  )}
                  
                  {/* WalletConnect QR Code Display - 只在移动端且没有 injected Phantom 时显示 */}
                  {walletConnectUri && !isSolanaConnected && !hasInjectedPhantom && (
                    <div className={styles.profile__wallet__qr__section}>
                      <p className={styles.profile__wallet__qr__title}>
                        {isMobileDevice ? 'Open your wallet app to approve' : 'Scan QR code with your wallet app'}
                      </p>
                      
                      {/* QR Code - Always display */}
                      <div className={styles.profile__wallet__qr__code__container} id="walletconnect-qr-code">
                        <QRCode
                          value={walletConnectUri}
                          size={200}
                          level="M"
                          className={styles.profile__wallet__qr__code}
                        />
                      </div>
                      
                      {/* Mobile: Open Wallet button */}
                      {isMobileDevice && (
                        <>
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
                            className={styles.profile__wallet__open__button}
                          >
                            Open Wallet
                          </button>
                          
                          {/* Copy WalletConnect URI button for mobile fallback */}
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(walletConnectUri);
                                toast({
                                  title: t('common.copied') || 'Copied',
                                  description: t('common.walletConnectUriCopied') || 'WalletConnect URI copied to clipboard',
                                });
                              } catch (error) {
                                console.error('Failed to copy URI:', error);
                                toast({
                                  title: t('common.copyFailed') || 'Copy Failed',
                                  description: t('common.failedToCopyUri') || 'Failed to copy URI to clipboard',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            className={styles.profile__wallet__copy__button}
                          >
                            Copy WalletConnect URI
                          </button>
                          
                          {/* Mobile fallback hint */}
                          <p className={styles.profile__wallet__mobile__hint}>
                            If the wallet app doesn't open automatically, please manually open your wallet app and paste the URI or connect via WalletConnect.
                          </p>
                        </>
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
                        className={styles.profile__wallet__save__qr__button}
                      >
                        <Download className={styles.profile__wallet__save__qr__icon} />
                        {t('common.saveQRCode') || 'Save QR Code'}
                      </button>
                      
                      <p className={styles.profile__wallet__qr__hint}>
                        {isMobileDevice
                          ? 'Tap "Open Wallet" or save the QR code to scan later.'
                          : 'Scan this QR code with your wallet app to connect.'}
                      </p>
                    </div>
                  )}
                  
                  {solanaError && !isSolanaConnecting && (
                    <div className={styles.profile__wallet__error}>
                      <p className={styles.profile__wallet__error__text}>{solanaError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.profile__wallet__connected__container}>
                  <div className={styles.profile__wallet__connected__card}>
                    <div className={styles.profile__wallet__connected__content}>
                      <div className={styles.profile__wallet__connected__icon__container}>
                        <Smartphone className={styles.profile__wallet__connected__icon} />
                      </div>
                      <div className={styles.profile__wallet__connected__info}>
                        <p className={styles.profile__wallet__connected__text}>{t('common.phantomWalletConnected')}</p>
                        <p className={styles.profile__wallet__connected__address}>
                          {solanaAddress?.slice(0, 8)}...{solanaAddress?.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectPhantom}
                      className={styles.profile__wallet__disconnect__button}
                      title="Disconnect wallet"
                    >
                      <X className={styles.profile__wallet__disconnect__icon} />
                    </button>
                  </div>
                  {/* Start to Earn Button - Navigate to Task Rewards Page */}
                  {isSolanaConnected && solanaAddress && (
                    <button
                      onClick={() => navigate({ pathname: '/task-rewards', search: location.search })}
                      className={styles.profile__wallet__earn__button}
                    >
                      <div className={styles.profile__wallet__earn__button__content}>
                        <div className={styles.profile__wallet__earn__button__icon__container}>
                          <Sparkles className={styles.profile__wallet__earn__button__icon} />
                        </div>
                        <div className={styles.profile__wallet__earn__button__text__container}>
                          <span className={styles.profile__wallet__earn__button__text}>
                            {t('common.startToEarn') || 'Start to Earn'}
                          </span>
                          <span className={styles.profile__wallet__earn__button__subtext}>
                            {t('common.viewTasksAndRewards') || 'View tasks and claim rewards'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={styles.profile__wallet__earn__button__chevron} />
                    </button>
                  )}
                  
                  {/* Token Balance Display (if available) */}
                  {tokenBalance !== null && (
                    <div className={styles.profile__wallet__token__balance}>
                      <div className={styles.profile__wallet__token__balance__row}>
                        <span className={styles.profile__wallet__token__balance__label}>{t('common.tokenBalance')}:</span>
                        <span className={styles.profile__wallet__token__balance__value}>
                          {tokenBalance.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}{' '}
                          {tokenBalance.symbol}
                        </span>
                      </div>
                      {tokenBalance.name && (
                        <p className={styles.profile__wallet__token__balance__name}>{tokenBalance.name}</p>
                      )}
                      <p className={styles.profile__wallet__token__balance__contract}>
                        Contract: V8tLkyqHdtzzYCGdsVf5CZ55BsLuvu7F4TchiDhJgem
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Password Change Section */}
            {user?.loginMethod === 'ii' && user?.email && (
              <div className={styles.profile__password__section}>
                {!showPasswordChange ? (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className={styles.profile__password__toggle__button}
                  >
                    <div className={styles.profile__password__toggle__button__content}>
                      <div className={styles.profile__password__toggle__button__icon__container}>
                        <Lock className={styles.profile__password__toggle__button__icon} />
                      </div>
                      <span className={styles.profile__password__toggle__button__text}>
                        {t('passwordChange.title') || 'Change Password'}
                      </span>
                    </div>
                    <ChevronRight className={styles.profile__password__toggle__button__chevron} />
                  </button>
                ) : (
                  <div className={styles.profile__password__form}>
                    {/* Header with back button */}
                    <div className={styles.profile__password__form__header}>
                      <div className={styles.profile__password__form__header__content}>
                        <div className={styles.profile__password__form__header__icon__container}>
                          <Lock className={styles.profile__password__form__header__icon} />
                        </div>
                        <span className={styles.profile__password__form__header__text}>
                          {t('passwordChange.title') || 'Change Password'}
                        </span>
                      </div>
                      <button
                        onClick={handleCancelPasswordChange}
                        className={styles.profile__password__form__close__button}
                      >
                        <X className={styles.profile__password__form__close__icon} />
                      </button>
                    </div>
                    
                    <div className={styles.profile__password__form__fields}>
                      {/* Old Password */}
                      <div className={styles.profile__password__field}>
                        <label className={styles.profile__password__field__label}>
                          {t('passwordChange.oldPassword') || 'Old Password'}
                        </label>
                        <div className={styles.profile__password__field__input__wrapper}>
                          <Lock className={styles.profile__password__field__icon} />
                          <input
                            type={showOldPassword ? "text" : "password"}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder={t('passwordChange.oldPasswordPlaceholder') || 'Enter your current password'}
                            className={styles.profile__password__field__input}
                            disabled={isChangingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className={styles.profile__password__field__toggle__button}
                          >
                            {showOldPassword ? <EyeOff className={styles.profile__password__field__toggle__icon} /> : <Eye className={styles.profile__password__field__toggle__icon} />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div className={styles.profile__password__field}>
                        <label className={styles.profile__password__field__label}>
                          {t('passwordChange.newPassword') || 'New Password'}
                        </label>
                        <div className={styles.profile__password__field__input__wrapper}>
                          <Lock className={styles.profile__password__field__icon} />
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t('passwordChange.newPasswordPlaceholder') || 'Enter your new password (min 6 characters)'}
                            className={styles.profile__password__field__input}
                            disabled={isChangingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className={styles.profile__password__field__toggle__button}
                          >
                            {showNewPassword ? <EyeOff className={styles.profile__password__field__toggle__icon} /> : <Eye className={styles.profile__password__field__toggle__icon} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className={styles.profile__password__field}>
                        <label className={styles.profile__password__field__label}>
                          {t('passwordChange.confirmPassword') || 'Confirm New Password'}
                        </label>
                        <div className={styles.profile__password__field__input__wrapper}>
                          <Lock className={styles.profile__password__field__icon} />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('passwordChange.confirmPasswordPlaceholder') || 'Re-enter your new password'}
                            className={styles.profile__password__field__input}
                            disabled={isChangingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={styles.profile__password__field__toggle__button}
                          >
                            {showConfirmPassword ? <EyeOff className={styles.profile__password__field__toggle__icon} /> : <Eye className={styles.profile__password__field__toggle__icon} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {passwordError && (
                      <div className={styles.profile__password__error}>
                        <p className={styles.profile__password__error__text}>
                          {passwordError}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.profile__password__actions}>
                      <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                        className={styles.profile__password__save__button}
                      >
                        {isChangingPassword 
                          ? (t('passwordChange.changing') || 'Changing...') 
                          : (t('passwordChange.saveButton') || 'Save Password')}
                      </button>
                      <button
                        onClick={handleCancelPasswordChange}
                        disabled={isChangingPassword}
                        className={styles.profile__password__cancel__button}
                      >
                        <X className={styles.profile__password__cancel__icon} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Devices Section */}
        <div className={styles.profile__devices__section}>
          <div className={styles.profile__devices__header}>
            <div className={styles.profile__devices__header__content}>
              <Smartphone className={styles.profile__devices__icon} />
              <div className={styles.profile__devices__info}>
                <span className={styles.profile__devices__title}>{t('common.myDevices')}</span>
                {isTencentIoTEnabled && (
                  <div className={styles.profile__devices__iot__status}>
                    <div className={styles.profile__devices__iot__status__dot}></div>
                    {t('deviceStatus.iotCloudConnected')}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={refreshDeviceStatus}
              className={styles.profile__devices__refresh__button}
              title="Refresh device status"
            >
              <MoreHorizontal className={styles.profile__devices__refresh__icon} />
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
        <div className={styles.profile__more__button}>
          <button className={styles.profile__more__button__inner}>
            <div className={styles.profile__more__button__content}>
              <MoreHorizontal className={styles.profile__more__button__icon} />
              <span className={styles.profile__more__button__text}>More...</span>
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