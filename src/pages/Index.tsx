import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useSolanaWallet } from '../lib/solanaWallet';
import { AppHeader } from '../components/AppHeader';
import { MessageSquare, Sparkles, Globe, Heart, Infinity, Mic, Bot, Mic2, Loader2 } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';
import { VoiceRecordingDialog } from '../components/VoiceRecordingDialog';
import { WalletConnectPanel } from '../components/WalletConnectPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import styles from '../styles/pages/Index.module.css';
import type { ServiceType } from '../services/api/aiSubscriptionApi';
import {
  listAiSubscriptionServices,
  createAiSubscriptionRecord,
} from '../services/api/aiSubscriptionApi';
import type { PriceLevel } from '../services/api/aiSubscriptionApi';
import { buildUsdtTransferTransaction } from '../lib/solanaUsdt';
import { recordPayment } from '../services/api/taskRewardsApi';

const Index = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    address: solanaAddress,
    isConnected: isSolanaConnected,
    signAndSendTransaction,
  } = useSolanaWallet();
  const [showAISubscriptionSheet, setShowAISubscriptionSheet] = useState(false);
  const [subscriptionServices, setSubscriptionServices] = useState<ServiceType[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [payingSvrId, setPayingSvrId] = useState<string | null>(null);

  // Agent ID configuration - default master agent
  const defaultAgentId = "agent_01jz8rr062f41tsyt56q8fzbrz";
  
  // State for voice creation flow
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  console.log('🚀 Index component mounted with defaultAgentId:', defaultAgentId);

  // Agent ID validation
  const isValidAgentId = defaultAgentId && defaultAgentId.startsWith('agent_');

  // Handle navigation to ElevenLabs chat page
  const handleStartChat = () => {
    console.log('🚀 Navigating to ElevenLabs chat page');
    navigate('/elevenlabs-chat');
  };

  // Handle Create My Voice button click
  const handleCreateMyVoice = async () => {
    // Check if user is logged in
    console.log('[Index] Checking authentication:', {
      isAuthenticated: isAuthenticated(),
      hasUser: !!user,
      principalId: user?.principalId,
      loginStatus: user?.loginStatus,
    });
    
    if (!isAuthenticated() || !user) {
      alert(t('index.loginRequiredForVoice'));
      return;
    }
    
    if (!user.principalId) {
      console.error('[Index] User exists but principalId is missing:', user);
      alert(t('index.authIncomplete'));
      return;
    }

    try {
      // Check if user already has a custom agent
      const { get_user_ai_config, has_user_ai_config } = await import('../services/api/aiApi');
      const hasConfig = await has_user_ai_config(user.principalId);
      
      if (hasConfig) {
        // Show delete confirmation dialog
        setShowDeleteConfirm(true);
      } else {
        // No existing config, proceed directly
        setShowVoiceDialog(true);
      }
    } catch (error) {
      console.error('Error checking user AI config:', error);
      alert(t('index.voiceConfigCheckFailed'));
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!user?.principalId) return;
    
    setIsProcessing(true);
    setShowDeleteConfirm(false);
    
    try {
      const { get_user_ai_config, delete_user_ai_config } = await import('../services/api/aiApi');
      
      // Get current config to get agent_id
      const config = await get_user_ai_config(user.principalId);
      
      if (config) {
        // Delete from ElevenLabs
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        if (apiKey && config.agent_id) {
          try {
            const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${config.agent_id}`, {
              method: 'DELETE',
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              console.warn('Failed to delete agent from ElevenLabs:', response.statusText);
            }
          } catch (error) {
            console.error('Error deleting agent from ElevenLabs:', error);
          }
        }
        
        // Delete from backend
        await delete_user_ai_config(user.principalId);
      }
      
      // Proceed to voice recording
      setShowVoiceDialog(true);
    } catch (error) {
      console.error('Error deleting user AI config:', error);
      alert(t('index.deleteVoiceFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch AI subscription service types when sheet opens
  useEffect(() => {
    if (!showAISubscriptionSheet || !isSolanaConnected) return;
    setSubscriptionLoading(true);
    listAiSubscriptionServices()
      .then(setSubscriptionServices)
      .catch((e) => {
        console.error('[Index] Failed to load subscription services:', e);
        setSubscriptionServices([]);
      })
      .finally(() => setSubscriptionLoading(false));
  }, [showAISubscriptionSheet, isSolanaConnected]);

  // Pay with USDT (Solana) for a subscription and record on backend
  const handlePayWithUsdt = async (service: ServiceType) => {
    if (!solanaAddress || !signAndSendTransaction) {
      alert(t('index.subscriptionWalletRequired'));
      return;
    }
    const priceNum = Number(service.price);
    if (priceNum <= 0 || !Number.isFinite(priceNum)) {
      alert(t('index.invalidPrice'));
      return;
    }
    setPayingSvrId(service.svr_id);
    try {
      const tx = await buildUsdtTransferTransaction(solanaAddress, priceNum);
      const txSig = await signAndSendTransaction(tx);
      const ts = BigInt(Math.floor(Date.now() * 1000));
      const payDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const principalId = user?.principalId ?? solanaAddress;
      const payfor = 'ai_subscription';
      const amountSmallest = BigInt(Math.round(priceNum * 1_000_000));

      await recordPayment(solanaAddress, amountSmallest, txSig, ts, payfor);

      // 支付成功后，将支付结果提交到 aio-base-backend 的 subscription_record
      const createResult = await createAiSubscriptionRecord({
        principal_id: principalId,
        pay_walletid: solanaAddress,
        svr_id: service.svr_id,
        pay_date: payDate,
        status: { Normal: null },
      });

      if ('Err' in createResult) {
        console.error('[Index] subscription_record 提交失败:', createResult.Err);
        alert(t('index.subscriptionRecordFailed', { error: createResult.Err, txSig: txSig.slice(0, 16) }));
        return;
      }

      setShowAISubscriptionSheet(false);
      alert(t('index.paymentSuccessWithSubscription', { txSig: txSig.slice(0, 8) }));
    } catch (e: any) {
      console.error('[Index] USDT payment failed:', e);
      alert(e?.message || t('index.paymentFailed'));
    } finally {
      setPayingSvrId(null);
    }
  };

  // Handle voice recording completion
  const handleVoiceRecorded = async (audioBlob: Blob) => {
    if (!user || !user.principalId || !user.userId) {
      alert(t('index.userInfoIncomplete'));
      return;
    }

    setIsProcessing(true);
    
    try {
      const { createCustomVoiceAgent } = await import('../services/api/aiApi');
      const result = await createCustomVoiceAgent(user.principalId, audioBlob, defaultAgentId, user.userId);
      
      if (result.success) {
        // 更新代币奖励任务：语音克隆完成
        if (solanaAddress) {
          try {
            const { completeTask } = await import('../services/api/taskRewardsApi');
            const taskResult = await completeTask(
              solanaAddress,
              'voice_clone',
              result.agentId ?? result.voiceId,
              BigInt(Date.now() * 1_000_000)
            );
            if ('Err' in taskResult) {
              console.warn('[Index] Failed to complete voice_clone task:', taskResult.Err);
            }
          } catch (taskErr) {
            console.warn('[Index] Error completing voice_clone task:', taskErr);
          }
        }
        alert(t('index.voiceCreatedSuccess'));
        setShowVoiceDialog(false);
      } else {
        alert(t('index.voiceCreatedFailed', { error: result.error || 'Unknown error' }));
      }
    } catch (error) {
      console.error('Error creating custom voice:', error);
      alert(t('index.voiceCreatedTryAgain'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriceLevelLabel = (pl: PriceLevel): string => {
    if (pl && 'M' in pl) return t('index.priceLevelMonth');
    if (pl && 'Y' in pl) return t('index.priceLevelYear');
    if (pl && 'E' in pl) return t('index.priceLevelPermanent');
    return '';
  };

  // Auto-scroll to bottom when new messages arrive
  // REMOVED: Auto-start session when chat interface opens
  
  if (authLoading) {
    return (
      <div className={styles.index__page}>
        <div className={styles.index__loading}>
          <div className={styles.index__loading__spinner}></div>
          <div className={styles.index__loading__text}>Initializing AI...</div>
        </div>
      </div>
    );
  }

  // Configuration error component
  if (!isValidAgentId) {
    return (
      <div className={styles.index__page}>
        <div className={styles.index__error}>
          <div className={styles.index__error__icon}>⚠️</div>
          <h1 className={styles.index__error__title}>Configuration Error</h1>
          <div className={styles.index__error__content}>
            <p className={styles.index__error__subtitle}>ElevenLabs Agent Configuration Issue:</p>
            <ul className={styles.index__error__list}>
              <li>• Current Agent ID: <code>{defaultAgentId}</code></li>
              <li>• Agent ID must start with 'agent_'</li>
              <li>• Please get a valid Agent ID from ElevenLabs console</li>
            </ul>
            <div className={styles.index__error__steps}>
              <p className={styles.index__error__steps__title}>Configuration Steps:</p>
              <ol className={styles.index__error__steps__list}>
                <li>Visit <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer">ElevenLabs Console</a></li>
                <li>Create or select a Conversational AI Agent</li>
                <li>Ensure the Agent is public (or configure API key)</li>
                <li>Copy the Agent ID and update configuration</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className={styles.index__page}>
        {/* Header */}
        <AppHeader />

        {/* Main Content - Introduction and Guide */}
        <div className={styles.index__container}>
          {/* Profile Avatar + Floating AI Subscription button (avatar top-right) */}
          <div className={styles.index__avatar__wrap}>
            <div className={styles.index__profile__avatar}>
              <img src="agent_logo.png" alt="UNV" className={styles.index__profile__avatar__image} />
            </div>
            <button
              type="button"
              onClick={() => setShowAISubscriptionSheet(true)}
              className={styles.index__float__btn}
              aria-label={t('index.aiSubscription') || 'AI Subscription'}
            >
              <Sparkles className={styles.index__float__btn__icon} aria-hidden />
              <span className={styles.index__float__btn__text}>{t('index.aiSubscription') || 'AI Subscription'}</span>
            </button>
          </div>

          {/* Title Section - Two Separate Modules */}
          <div className={styles.index__title__section}>
              <h1 className={styles.index__title}>I am Univoice</h1>
          </div>

          {/* Action Buttons - Vertical Stack */}
          <div className={styles.index__actions}>
            <button
              onClick={handleStartChat}
              className={`${styles.index__action__button} ${styles['index__action__button--primary']}`}
              type="button"
            >
              <MessageSquare className={styles.index__action__button__icon} />
              <span className={styles.index__action__button__text}>Start Chat</span>
            </button>
            
            <button
              onClick={handleCreateMyVoice}
              disabled={isProcessing}
              className={`${styles.index__action__button} ${styles['index__action__button--secondary']}`}
              type="button"
            >
              <Mic className={styles.index__action__button__icon} />
              <span className={styles.index__action__button__text}>
                {isProcessing ? 'Processing...' : 'Create my voice'}
              </span>
            </button>
          </div>

          {/* Feature Banner - Slogan strip (visually distinct from Bottom Bar) */}
          <section className={styles.index__features__container} aria-label="Why Univoice">
            <div className={`${styles.index__feature__item} ${styles['index__feature__item--authentic']}`}>
              <Heart className={styles.index__feature__icon} aria-hidden />
              <span className={styles.index__feature__text}>Authentic</span>
            </div>
            <div className={`${styles.index__feature__item} ${styles['index__feature__item--freedom']}`}>
              <Globe className={styles.index__feature__icon} aria-hidden />
              <span className={styles.index__feature__text}>Freedom</span>
            </div>
            <div className={`${styles.index__feature__item} ${styles['index__feature__item--infinity']}`}>
              <Infinity className={styles.index__feature__icon} aria-hidden />
              <span className={styles.index__feature__text}>Infinity</span>
            </div>
          </section>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>

        {/* AI Subscription Sheet (drawer): connect wallet or choose subscription */}
        <Sheet open={showAISubscriptionSheet} onOpenChange={setShowAISubscriptionSheet}>
          <SheetContent
            side="right"
            className={styles.index__subscription__sheet}
          >
            <SheetHeader>
              <SheetTitle className={styles.index__subscription__sheet__title}>
                {t('index.aiSubscriptionSheetTitle') || 'AI Subscription'}
              </SheetTitle>
            </SheetHeader>
            <div className={styles.index__subscription__sheet__body}>
              {!isSolanaConnected ? (
                <WalletConnectPanel
                  variant="compact"
                  showTitle={true}
                  onConnected={() => {}}
                />
              ) : (
                <div className={styles.index__subscription__sheet__body__content}>
                  {subscriptionLoading ? (
                    <div className={styles.index__subscription__loading}>
                      <Loader2 className={styles.index__subscription__loading__icon} aria-hidden />
                      <span>{t('common.loading') || 'Loading...'}</span>
                    </div>
                  ) : subscriptionServices.length === 0 ? (
                    <p className={styles.index__subscription__empty}>
                      {t('index.noSubscriptionServices') || 'No subscription plans available.'}
                    </p>
                  ) : (
                    <div className={styles.index__subscription__options}>
                      {subscriptionServices.map((svc) => {
                        const priceNum = Number(svc.price);
                        const isPaying = payingSvrId === svc.svr_id;
                        return (
                          <div key={svc.svr_id} className={styles.index__subscription__option__card}>
                            <div className={styles.index__subscription__option}>
                              <div className={styles.index__subscription__option__content}>
                                <span className={styles.index__subscription__option__title}>
                                  {svc.name}
                                </span>
                                <span className={styles.index__subscription__option__desc}>
                                  {getPriceLevelLabel(svc.price_level)} · {priceNum} {t('common.currencyUsdt')}
                                </span>
                              </div>
                              <button
                                type="button"
                                className={styles.index__subscription__pay__btn}
                                disabled={isPaying}
                                onClick={() => handlePayWithUsdt(svc)}
                              >
                                {isPaying ? (
                                  <>
                                    <Loader2 className={styles.index__subscription__pay__btn__spinner} aria-hidden />
                                    {t('index.paying') || 'Paying...'}
                                  </>
                                ) : (
                                  `${t('index.payUsdt')} ${priceNum} ${t('common.currencyUsdt')}`
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('index.deleteVoiceConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('index.deleteVoiceConfirmDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('index.deleteVoiceConfirmCancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>{t('index.deleteVoiceConfirmAction')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Voice Recording Dialog */}
        {showVoiceDialog && (
          <VoiceRecordingDialog
            open={showVoiceDialog}
            onClose={() => setShowVoiceDialog(false)}
            onRecorded={handleVoiceRecorded}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default Index;
