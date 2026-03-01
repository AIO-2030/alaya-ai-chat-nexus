/**
 * Shared wallet connection panel. Used by Profile (full) and Index AI Subscription sheet (compact).
 * Logic is centralized here; do not duplicate connect/QR/manual-address logic elsewhere.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicKey } from '@solana/web3.js';
import { Coins, ChevronRight, X, Smartphone, Sparkles, Download, Clipboard } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useSolanaWallet, solanaWalletManager } from '../lib/solanaWallet';
import { useToast } from '../hooks/use-toast';
import styles from '../styles/components/WalletConnectPanel.module.css';

export type WalletConnectPanelVariant = 'full' | 'compact';

export interface WalletConnectPanelProps {
  variant?: WalletConnectPanelVariant;
  /** When variant is 'full', this is rendered after connected card (e.g. Start to Earn button). */
  renderAfterConnected?: React.ReactNode;
  /** When variant is 'compact' and user connects, optional callback (e.g. parent can switch sheet content). */
  onConnected?: () => void;
  /** Optional: hide title section in compact mode. */
  showTitle?: boolean;
  /** For full variant: navigate to task rewards (passed from Profile). */
  onNavigateToTaskRewards?: () => void;
}

export function WalletConnectPanel({
  variant = 'full',
  renderAfterConnected,
  onConnected,
  showTitle = true,
  onNavigateToTaskRewards,
}: WalletConnectPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    address: solanaAddress,
    isConnected: isSolanaConnected,
    isConnecting: isSolanaConnecting,
    error: solanaError,
    uri: walletConnectUri,
    connect: connectSolanaWallet,
    disconnect: disconnectSolanaWallet,
    getTokenBalance,
    setManualAddress,
  } = useSolanaWallet();

  const [tokenBalance, setTokenBalanceState] = useState<{
    balance: number;
    decimals: number;
    symbol?: string;
    name?: string;
  } | null>(null);
  const [isLoadingTokenBalance, setIsLoadingTokenBalance] = useState(false);
  const [showManualAddressModal, setShowManualAddressModal] = useState(false);
  const [manualAddressValue, setManualAddressValue] = useState('');
  const [manualAddressError, setManualAddressError] = useState('');

  const isMobileDevice =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.matchMedia('(min-width: 1024px)').matches;
  const hasInjectedPhantom =
    typeof window !== 'undefined' &&
    !!((window as any).phantom?.solana?.isPhantom || (window as any).solana?.isPhantom);

  const fetchTokenBalance = async (address?: string) => {
    setIsLoadingTokenBalance(true);
    try {
      const balance = await getTokenBalance(address);
      setTokenBalanceState(balance);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    } finally {
      setIsLoadingTokenBalance(false);
    }
  };

  useEffect(() => {
    if (isSolanaConnected && solanaAddress) {
      fetchTokenBalance(solanaAddress);
      if (variant === 'compact') onConnected?.();
    }
  }, [isSolanaConnected, solanaAddress]);

  const handleOpenWalletApp = () => {
    if (!isMobileDevice || !walletConnectUri) return;
    try {
      const link = document.createElement('a');
      link.href = walletConnectUri;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      const phantomDeepLink = `phantom://v1/connect?uri=${encodeURIComponent(walletConnectUri)}`;
      setTimeout(() => {
        if (document.visibilityState === 'visible') window.location.href = phantomDeepLink;
      }, 500);
    } catch (error) {
      console.error('Failed to open wallet app:', error);
      if (isMobileDevice) window.location.href = walletConnectUri;
    }
  };

  const handleConnectPhantom = async () => {
    try {
      const address = await connectSolanaWallet();
      if (address) {
        toast({
          title: t('common.walletConnected') || 'Wallet Connected',
          description: `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
        await fetchTokenBalance(address);
      } else {
        const currentError = solanaWalletManager.getState().error;
        const isTimeout =
          currentError &&
          (currentError.toLowerCase().includes('timeout') || currentError.includes('Connection timeout'));
        if (isTimeout) setShowManualAddressModal(true);
        if (solanaError) {
          toast({
            title: t('common.walletConnectionFailed') || 'Connection Failed',
            description: solanaError,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      const isTimeout =
        error?.message &&
        (error.message.toLowerCase().includes('timeout') || error.message.includes('Connection timeout'));
      if (isTimeout) setShowManualAddressModal(true);
      toast({
        title: t('common.walletConnectionFailed') || 'Connection Failed',
        description: error?.message || 'Failed to connect. Please ensure Phantom is installed.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectPhantom = async () => {
    try {
      await disconnectSolanaWallet();
      setTokenBalanceState(null);
      toast({
        title: t('common.walletDisconnected') || 'Wallet Disconnected',
        description: 'Phantom wallet disconnected',
      });
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleCloseManualAddressModal = () => {
    setShowManualAddressModal(false);
    setManualAddressValue('');
    setManualAddressError('');
  };

  const handlePasteAddress = async () => {
    setManualAddressError('');
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed) {
        setManualAddressValue(trimmed);
        toast({
          title: t('common.pasted') || 'Pasted',
          description: t('common.addressPasted') || 'Address pasted from clipboard',
        });
      }
    } catch (e) {
      toast({
        title: t('common.pasteFailed') || 'Paste Failed',
        description: t('common.pasteFailedDesc') || 'Could not read clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitManualAddress = () => {
    setManualAddressError('');
    const trimmed = manualAddressValue.trim();
    if (!trimmed) {
      setManualAddressError(t('profile.manualAddress.required') || 'Please enter a Solana wallet address');
      return;
    }
    try {
      new PublicKey(trimmed);
    } catch {
      setManualAddressError(
        t('profile.manualAddress.invalid') || 'Invalid Solana address. Please use a valid SOL chain address.'
      );
      return;
    }
    setManualAddress(trimmed);
    handleCloseManualAddressModal();
    fetchTokenBalance(trimmed);
    toast({
      title: t('common.walletConnected') || 'Wallet Connected',
      description: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
    });
  };

  // Compact + connected: parent shows subscription options; we render nothing or a short message
  if (variant === 'compact' && isSolanaConnected) {
    return (
      <div className={styles.compactConnected}>
        <p className={styles.compactConnectedText}>{t('common.phantomWalletConnected')}</p>
        <p className={styles.compactConnectedAddress}>
          {solanaAddress?.slice(0, 8)}...{solanaAddress?.slice(-6)}
        </p>
      </div>
    );
  }

  // Full variant: connected state with card, disconnect, balance, renderAfterConnected
  if (variant === 'full' && isSolanaConnected && solanaAddress) {
    return (
      <div className={styles.container}>
        <div className={styles.connectedCard}>
          <div className={styles.connectedContent}>
            <div className={styles.connectedIconContainer}>
              <Smartphone className={styles.connectedIcon} />
            </div>
            <div className={styles.connectedInfo}>
              <p className={styles.connectedText}>{t('common.phantomWalletConnected')}</p>
              <p className={styles.connectedAddress}>
                {solanaAddress.slice(0, 8)}...{solanaAddress.slice(-6)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisconnectPhantom}
            className={styles.disconnectButton}
            title="Disconnect wallet"
            aria-label="Disconnect wallet"
          >
            <X className={styles.disconnectIcon} />
          </button>
        </div>
        {onNavigateToTaskRewards && (
          <button type="button" onClick={onNavigateToTaskRewards} className={styles.earnButton}>
            <div className={styles.earnButtonContent}>
              <div className={styles.earnButtonIconContainer}>
                <Sparkles className={styles.earnButtonIcon} />
              </div>
              <div className={styles.earnButtonTextContainer}>
                <span className={styles.earnButtonText}>{t('common.startToEarn') || 'Start to earn'}</span>
                <span className={styles.earnButtonSubtext}>
                  {t('common.viewTasksAndRewards') || 'View tasks and claim rewards'}
                </span>
              </div>
            </div>
            <ChevronRight className={styles.earnButtonChevron} />
          </button>
        )}
        {renderAfterConnected}
        {tokenBalance !== null && (
          <div className={styles.tokenBalance}>
            <div className={styles.tokenBalanceRow}>
              <span className={styles.tokenBalanceLabel}>{t('common.tokenBalance')}:</span>
              <span className={styles.tokenBalanceValue}>
                {isLoadingTokenBalance
                  ? '...'
                  : `${tokenBalance.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })} ${tokenBalance.symbol || ''}`}
              </span>
            </div>
            {tokenBalance.name && (
              <p className={styles.tokenBalanceName}>{tokenBalance.name}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Not connected: show connect UI
  return (
    <div className={styles.container}>
      {showTitle && (
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            {t('common.startToEarn') || 'Start to earn'}
            <Sparkles className={styles.titleIcon} />
          </h3>
          <p className={styles.subtitle}>
            {variant === 'compact'
              ? t('index.aiSubscription.connectWalletSubtitle') || 'Connect your wallet to subscribe to AI services'
              : 'Connect your wallet to start earning rewards'}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={handleConnectPhantom}
        disabled={isSolanaConnecting}
        className={styles.connectButton}
      >
        <div className={styles.connectButtonContent}>
          <div className={styles.connectButtonIconContainer}>
            <Coins className={styles.connectButtonIcon} />
          </div>
          <span className={styles.connectButtonText}>
            {isSolanaConnecting
              ? t('common.connecting') || 'Connecting...'
              : t('common.linkToPhantomWallet') || 'Link to Phantom Wallet'}
          </span>
        </div>
        <ChevronRight className={styles.connectButtonChevron} />
      </button>
      {isSolanaConnecting && hasInjectedPhantom && !walletConnectUri && (
        <div className={styles.connectionHint}>
          <p className={styles.connectionHintText}>
            Please open the Phantom extension and approve the connection. Unlock Phantom if needed.
          </p>
        </div>
      )}
      {walletConnectUri && !isSolanaConnected && !hasInjectedPhantom && (
        <div className={styles.qrSection}>
          <p className={styles.qrTitle}>
            {isMobileDevice ? 'Open your wallet app to approve' : 'Scan QR code with your wallet app'}
          </p>
          <div className={styles.qrCodeContainer} id="walletconnect-qr-code-panel">
            <QRCode value={walletConnectUri} size={200} level="M" className={styles.qrCode} />
          </div>
          {isMobileDevice && (
            <>
              <button type="button" onClick={handleOpenWalletApp} className={styles.openButton}>
                Open Wallet
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(walletConnectUri);
                    toast({
                      title: t('common.copied') || 'Copied',
                      description: t('common.walletConnectUriCopied') || 'URI copied',
                    });
                  } catch {
                    toast({ title: t('common.copyFailed') || 'Copy Failed', variant: 'destructive' });
                  }
                }}
                className={styles.copyButton}
              >
                Copy WalletConnect URI
              </button>
              <p className={styles.mobileHint}>
                If the app does not open, paste the URI in your wallet app or connect via WalletConnect.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={async () => {
              const qrContainer = document.getElementById('walletconnect-qr-code-panel');
              const svg = qrContainer?.querySelector('svg');
              if (!svg) return;
              try {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const size = 200;
                canvas.width = size;
                canvas.height = size;
                const img = new Image();
                const url = URL.createObjectURL(
                  new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                );
                img.onload = () => {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, size, size);
                  ctx.drawImage(img, 0, 0, size, size);
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
                        description: t('common.qrCodeSavedDesc') || 'Saved to device',
                      });
                    }
                  }, 'image/png');
                };
                img.onerror = () => URL.revokeObjectURL(url);
                img.src = url;
              } catch (e) {
                toast({ title: t('common.saveFailed') || 'Save Failed', variant: 'destructive' });
              }
            }}
            className={styles.saveQrButton}
          >
            <Download className={styles.saveQrIcon} />
            {t('common.saveQRCode') || 'Save QR Code'}
          </button>
          <p className={styles.qrHint}>
            {isMobileDevice
              ? 'Tap "Open Wallet" or save the QR code to scan later.'
              : 'Scan this QR code with your wallet app to connect.'}
          </p>
        </div>
      )}
      {solanaError && !isSolanaConnecting && (
        <div className={styles.error}>
          <p className={styles.errorText}>{solanaError}</p>
          {(solanaError.toLowerCase().includes('timeout') || solanaError.includes('Connection timeout')) && (
            <button
              type="button"
              onClick={() => setShowManualAddressModal(true)}
              className={styles.errorManualBtn}
            >
              {t('profile.manualAddress.enterManually') || 'Enter Solana address manually'}
            </button>
          )}
        </div>
      )}
      {showManualAddressModal && (
        <div className={styles.manualOverlay} onClick={handleCloseManualAddressModal}>
          <div className={styles.manualModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.manualHeader}>
              <span className={styles.manualTitle}>{t('profile.manualAddress.title')}</span>
              <button
                type="button"
                onClick={handleCloseManualAddressModal}
                className={styles.manualClose}
                aria-label="Close"
              >
                <X className={styles.manualCloseIcon} />
              </button>
            </div>
            <p className={styles.manualHint}>{t('profile.manualAddress.hint')}</p>
            <div className={styles.manualInputRow}>
              <input
                type="text"
                value={manualAddressValue}
                onChange={(e) => {
                  setManualAddressValue(e.target.value);
                  setManualAddressError('');
                }}
                placeholder={t('profile.manualAddress.placeholder')}
                className={styles.manualInput}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handlePasteAddress}
                className={styles.manualPasteBtn}
                title={t('profile.manualAddress.paste')}
              >
                <Clipboard className={styles.manualPasteIcon} />
                <span>{t('profile.manualAddress.paste')}</span>
              </button>
            </div>
            {manualAddressError && <p className={styles.manualError}>{manualAddressError}</p>}
            <div className={styles.manualActions}>
              <button
                type="button"
                onClick={handleSubmitManualAddress}
                disabled={!manualAddressValue.trim()}
                className={styles.manualSubmit}
              >
                {t('profile.manualAddress.confirm')}
              </button>
              <button type="button" onClick={handleCloseManualAddressModal} className={styles.manualCancel}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
