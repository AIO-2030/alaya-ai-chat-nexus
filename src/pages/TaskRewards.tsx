import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Gift, 
  ArrowLeft, 
  Loader2,
  AlertCircle,
  Coins,
  Smartphone,
  Mic,
  CreditCard,
} from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { BottomNavigation } from '../components/BottomNavigation';
import { PageLayout } from '../components/PageLayout';
import { useToast } from '../hooks/use-toast';
import { useSolanaWallet } from '../lib/solanaWallet';
import {
  getOrInitUserTasks,
  getTaskContract,
  getClaimTicket,
  markClaimResult,
  taskStatusToString,
  type UserTaskState,
  type TaskContractItem,
  type ClaimTicket,
  type TaskStatus,
} from '../services/api/taskRewardsApi';
import styles from '../styles/pages/TaskRewards.module.css';

// Task ID to display name mapping
const TASK_NAMES: Record<string, string> = {
  'register_device': 'Register Device',
  'ai_subscription': 'AI Subscription',
  'voice_clone': 'Voice Clone',
};

// Task ID to icon mapping (size from parent .taskCard__icon svg in CSS)
const getTaskIcon = (taskId: string): React.ReactNode => {
  switch (taskId) {
    case 'register_device':
      return <Smartphone />;
    case 'ai_subscription':
      return <CreditCard />;
    case 'voice_clone':
      return <Mic />;
    default:
      return <Gift />;
  }
};

// Task status to display mapping (color is CSS module class name)
const getStatusDisplay = (status: TaskStatus, statusIconClass: string): { label: string; colorClass: string; icon: React.ReactNode } => {
  switch (status) {
    case 'NotStarted':
      return { label: 'Not Started', colorClass: styles.statusGray, icon: <Clock className={statusIconClass} /> };
    case 'InProgress':
      return { label: 'In Progress', colorClass: styles.statusBlue, icon: <Loader2 className={`${statusIconClass} ${styles.statusIconSpin}`} /> };
    case 'Completed':
      return { label: 'Completed', colorClass: styles.statusGreen, icon: <CheckCircle2 className={statusIconClass} /> };
    case 'RewardPrepared':
      return { label: 'Reward Ready', colorClass: styles.statusYellow, icon: <Gift className={statusIconClass} /> };
    case 'TicketIssued':
      return { label: 'Ticket Issued', colorClass: styles.statusOrange, icon: <Gift className={statusIconClass} /> };
    case 'Claimed':
      return { label: 'Claimed', colorClass: styles.statusPurple, icon: <CheckCircle2 className={statusIconClass} /> };
    default:
      return { label: status, colorClass: styles.statusMuted, icon: <Clock className={statusIconClass} /> };
  }
};

type ClaimStatus = 
  | 'idle'
  | 'checking'
  | 'ready'
  | 'no-rewards'
  | 'fetching-ticket'
  | 'ticket-ready'
  | 'submitting-tx'
  | 'confirming'
  | 'updating-backend'
  | 'success'
  | 'failed';

const TaskRewards = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    address: solanaAddress,
    isConnected: isSolanaConnected,
    isConnecting: isSolanaConnecting,
    connect: connectSolanaWallet,
  } = useSolanaWallet();

  const [taskState, setTaskState] = useState<UserTaskState | null>(null);
  const [taskContract, setTaskContract] = useState<TaskContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle');
  const [claimTicket, setClaimTicket] = useState<ClaimTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load task data
  const loadTaskData = useCallback(async () => {
    if (!solanaAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load task contract
      const contract = await getTaskContract();
      setTaskContract(contract);
      
      // Load user tasks
      const state = await getOrInitUserTasks(solanaAddress);
      if (state) {
        setTaskState(state);
        
        // Check if there are claimable rewards
        const hasClaimable = state.tasks.some(t => 'RewardPrepared' in t.status);
        if (hasClaimable) {
          setClaimStatus('ready');
        } else {
          setClaimStatus('no-rewards');
        }
      }
    } catch (err) {
      console.error('Failed to load task data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load task data');
      toast({
        title: 'Error',
        description: 'Failed to load task data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [solanaAddress, toast]);

  useEffect(() => {
    if (isSolanaConnected && solanaAddress) {
      loadTaskData();
    } else {
      setIsLoading(false);
    }
  }, [isSolanaConnected, solanaAddress, loadTaskData]);

  const handleClaim = async () => {
    if (!solanaAddress || !isSolanaConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your Phantom wallet first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Step 1: Check if there are claimable rewards
      setClaimStatus('checking');
      if (!taskState || !taskState.tasks.some(t => 'RewardPrepared' in t.status)) {
        setClaimStatus('no-rewards');
        toast({
          title: 'No Claimable Rewards',
          description: 'You don\'t have any rewards ready to claim.',
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Get claim ticket
      setClaimStatus('fetching-ticket');
      const ticketResult = await getClaimTicket(solanaAddress);
      
      if ('Err' in ticketResult) {
        throw new Error(ticketResult.Err);
      }

      const ticket = ticketResult.Ok;
      setClaimTicket(ticket);
      setClaimStatus('ticket-ready');

      // Step 3: Submit to Solana (placeholder - needs actual Solana contract integration)
      setClaimStatus('submitting-tx');
      
      // TODO: Implement actual Solana claim transaction
      // This requires:
      // 1. Solana Program IDL
      // 2. Distributor contract address
      // 3. Anchor program setup
      
      // For now, simulate the transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulated transaction signature
      const txSignature = 'simulated_tx_' + Date.now();
      
      // Step 4: Wait for confirmation
      setClaimStatus('confirming');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 5: Mark claim result
      setClaimStatus('updating-backend');
      const markResult = await markClaimResult(solanaAddress, ticket.epoch, 'Success', txSignature);
      
      if ('Err' in markResult) {
        throw new Error(markResult.Err);
      }
      
      // Step 6: Success
      setClaimStatus('success');
      toast({
        title: 'Claim Successful!',
        description: `Successfully claimed ${Number(ticket.amount) / 1_000_000} PMUG tokens!`,
      });
      
      // Reload task data
      await loadTaskData();
      
    } catch (err) {
      console.error('Claim failed:', err);
      setClaimStatus('failed');
      const errorMessage = err instanceof Error ? err.message : 'Claim failed. Please try again.';
      setError(errorMessage);
      
      // Mark claim as failed if we have a ticket
      if (claimTicket) {
        try {
          await markClaimResult(solanaAddress!, claimTicket.epoch, 'Failed', undefined);
        } catch (markErr) {
          console.error('Failed to mark claim as failed:', markErr);
        }
      }
      
      toast({
        title: 'Claim Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const formatAmount = (amount: bigint): string => {
    return (Number(amount) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatDate = (timestamp: bigint | undefined): string => {
    if (!timestamp || timestamp === 0n) return 'N/A';
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isSolanaConnected) {
    return (
      <PageLayout>
        <div className={styles.page}>
          <AppHeader />
          <div className={styles.content}>
            <div className={styles.header}>
              <button
                onClick={() => navigate({ pathname: '/profile', search: location.search })}
                className={styles.backButton}
              >
                <ArrowLeft className={styles.backIcon} />
              </button>
              <h1 className={styles.title}>Task Rewards</h1>
            </div>
            <div className={styles.connectCard}>
              <div className={styles.connectCard__inner}>
                <Coins className={styles.connectCard__icon} />
                <h2 className={styles.connectCard__title}>Connect Your Wallet</h2>
                <p className={styles.connectCard__text}>
                  Please connect your Phantom wallet to view and claim rewards.
                </p>
                <button
                  onClick={connectSolanaWallet}
                  disabled={isSolanaConnecting}
                  className={styles.connectButton}
                >
                  {isSolanaConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            </div>
          </div>
          <BottomNavigation />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className={styles.page}>
        <AppHeader />
        <div className={styles.bgBlur}>
          <div className={styles.bgBlur__orb1} />
          <div className={styles.bgBlur__orb2} />
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <button
              onClick={() => navigate({ pathname: '/profile', search: location.search })}
              className={styles.backButton}
            >
              <ArrowLeft className={styles.backIcon} />
            </button>
            <div className={styles.headerMeta}>
              <h1 className={styles.title}>Task Rewards</h1>
              <p className={styles.subtitle}>
                {solanaAddress?.slice(0, 6)}...{solanaAddress?.slice(-4)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <Loader2 className={styles.loadingSpinner} />
            </div>
          ) : error ? (
            <div className={styles.errorBox}>
              <div className={styles.errorBox__content}>
                <AlertCircle className={styles.errorBox__icon} />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Tasks List */}
              <div className={styles.tasksSection}>
                <h2 className={styles.tasksTitle}>Your Tasks</h2>
                <div className={styles.scrollContainer}>
                  {taskState?.tasks.map((task) => {
                    const status = taskStatusToString(task.status);
                    const statusDisplay = getStatusDisplay(status, styles.taskCard__statusIcon);
                    const taskName = TASK_NAMES[task.taskid] || task.taskid;
                    const taskIcon = getTaskIcon(task.taskid);
                    const showCompleted = !!(task.completed_at && task.completed_at !== 0n);
                    const evidenceText = task.evidence && task.evidence.length > 0 ? task.evidence[0] : null;
                    return (
                      <div key={task.taskid} className={styles.taskCard}>
                        <div className={styles.taskCard__row1}>
                          <div className={styles.taskCard__iconWrap}>
                            <div className={styles.taskCard__icon}>{taskIcon}</div>
                          </div>
                          <h3 className={styles.taskCard__name}>{taskName}</h3>
                        </div>
                        <div className={styles.taskCard__row2}>
                          <div className={`${styles.taskCard__status} ${statusDisplay.colorClass}`}>
                            <span className={styles.taskCard__statusIcon}>{statusDisplay.icon}</span>
                            <span>{statusDisplay.label}</span>
                          </div>
                          <span className={styles.taskCard__reward}>
                            {formatAmount(task.reward_amount)} PMUG
                          </span>
                        </div>
                        {showCompleted && (
                          <div className={styles.taskCard__completed}>
                            Completed: {formatDate(task.completed_at)}
                          </div>
                        )}
                        {evidenceText && (
                          <p className={styles.taskCard__evidence}>Evidence: {evidenceText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Claim Section */}
              {(claimStatus === 'ready' || claimStatus === 'fetching-ticket' || claimStatus === 'ticket-ready' || claimStatus === 'submitting-tx' || claimStatus === 'confirming' || claimStatus === 'updating-backend') && (
                <div className={styles.claimSection}>
                  <div className={styles.claimCard}>
                    <div className={styles.claimCard__header}>
                      <Sparkles className={styles.claimCard__icon} />
                      <h2 className={styles.claimCard__title}>Claim Your Rewards</h2>
                    </div>
                    <p className={styles.claimCard__text}>
                      You have rewards ready to claim! Click the button below to claim your PMUG tokens.
                    </p>
                    <button
                      onClick={handleClaim}
                      disabled={claimStatus !== 'ready' && claimStatus !== 'ticket-ready'}
                      className={styles.claimButton}
                    >
                      {(claimStatus === 'fetching-ticket' || claimStatus === 'submitting-tx' || claimStatus === 'confirming' || claimStatus === 'updating-backend') && (
                        <Loader2 className={styles.claimButtonSpinner} />
                      )}
                      {claimStatus === 'ticket-ready' ? 'Confirm Claim' : claimStatus === 'ready' ? 'Claim Rewards' : 'Processing...'}
                    </button>
                  </div>
                </div>
              )}

              {claimStatus === 'success' && (
                <div className={styles.successBox}>
                  <div className={styles.successBox__content}>
                    <CheckCircle2 className={styles.successBox__icon} />
                    <span>Successfully claimed your rewards!</span>
                  </div>
                </div>
              )}

              {claimStatus === 'failed' && (
                <div className={styles.failedBox}>
                  <div className={styles.failedBox__content}>
                    <AlertCircle className={styles.failedBox__icon} />
                    <span>{error || 'Claim failed. Please try again.'}</span>
                  </div>
                </div>
              )}

              {claimStatus === 'no-rewards' && (
                <div className={styles.noRewardsBox}>
                  <Gift className={styles.noRewardsBox__icon} />
                  <p className={styles.noRewardsBox__text}>No rewards available to claim at this time.</p>
                  <p className={styles.noRewardsBox__hint}>Complete tasks to earn rewards!</p>
                </div>
              )}
            </>
          )}
        </div>
        <BottomNavigation />
      </div>
    </PageLayout>
  );
};

export default TaskRewards;
