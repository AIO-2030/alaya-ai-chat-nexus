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
  ChevronRight,
  X
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

// Task ID to display name mapping
const TASK_NAMES: Record<string, string> = {
  'register_device': 'Register Device',
  'ai_subscription': 'AI Subscription',
  'voice_clone': 'Voice Clone',
};

// Task ID to icon mapping (function to avoid JSX execution at module level)
const getTaskIcon = (taskId: string): React.ReactNode => {
  switch (taskId) {
    case 'register_device':
      return <Smartphone className="h-4 w-4" />;
    case 'ai_subscription':
      return <CreditCard className="h-4 w-4" />;
    case 'voice_clone':
      return <Mic className="h-4 w-4" />;
    default:
      return <Gift className="h-4 w-4" />;
  }
};

// Task status to display mapping
const getStatusDisplay = (status: TaskStatus): { label: string; color: string; icon: React.ReactNode } => {
  switch (status) {
    case 'NotStarted':
      return { label: 'Not Started', color: 'text-gray-400', icon: <Clock className="h-4 w-4" /> };
    case 'InProgress':
      return { label: 'In Progress', color: 'text-blue-400', icon: <Loader2 className="h-4 w-4 animate-spin" /> };
    case 'Completed':
      return { label: 'Completed', color: 'text-green-400', icon: <CheckCircle2 className="h-4 w-4" /> };
    case 'RewardPrepared':
      return { label: 'Reward Ready', color: 'text-yellow-400', icon: <Gift className="h-4 w-4" /> };
    case 'TicketIssued':
      return { label: 'Ticket Issued', color: 'text-orange-400', icon: <Gift className="h-4 w-4" /> };
    case 'Claimed':
      return { label: 'Claimed', color: 'text-purple-400', icon: <CheckCircle2 className="h-4 w-4" /> };
    default:
      return { label: status, color: 'text-white/60', icon: <Clock className="h-4 w-4" /> };
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          <AppHeader />
          
          <div className="relative z-10 p-4 pb-20 pt-24">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate({ pathname: '/profile', search: location.search })}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white">Task Rewards</h1>
            </div>
            
            <div className="bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
              <div className="text-center">
                <Coins className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-white/60 mb-6">
                  Please connect your Phantom wallet to view and claim rewards.
                </p>
                <button
                  onClick={connectSolanaWallet}
                  disabled={isSolanaConnecting}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg font-medium transition-all disabled:opacity-50"
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
      <style>{`
        .task-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .task-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <AppHeader />
        
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        <div className="relative z-10 p-4 pb-20 pt-24">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
                onClick={() => navigate({ pathname: '/profile', search: location.search })}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Task Rewards</h1>
              <p className="text-white/60 text-sm">
                {solanaAddress?.slice(0, 6)}...{solanaAddress?.slice(-4)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-200">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Tasks List */}
              <div className="mb-6">
                <h2 className="text-base font-semibold text-white/90 mb-3">Your Tasks</h2>
                <div 
                  className="task-scroll-container flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-2 scroll-smooth"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {taskState?.tasks.map((task) => {
                    const contract = taskContract.find(t => t.taskid === task.taskid);
                    const status = taskStatusToString(task.status);
                    const statusDisplay = getStatusDisplay(status);
                    const taskName = TASK_NAMES[task.taskid] || task.taskid;
                    const taskIcon = getTaskIcon(task.taskid);
                    const showCompleted = !!(task.completed_at && task.completed_at !== 0n);
                    const evidenceText = task.evidence && task.evidence.length > 0 ? task.evidence[0] : null;
                    
                    return (
                      <div
                        key={task.taskid}
                        className="w-full bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded-xl p-3 border border-white/10 backdrop-blur-xl shadow-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-cyan-400/20 rounded-lg flex-shrink-0">
                            <div className="text-cyan-400 w-5 h-5">{taskIcon}</div>
                          </div>
                          <h3 className="text-white font-semibold text-sm leading-tight flex-1">{taskName}</h3>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className={`flex items-center gap-1.5 text-xs ${statusDisplay.color}`}>
                            <span className="flex-shrink-0">{statusDisplay.icon}</span>
                            <span>{statusDisplay.label}</span>
                          </div>
                          <span className="text-xs text-white/70 whitespace-nowrap font-medium">
                            {formatAmount(task.reward_amount)} PMUG
                          </span>
                        </div>
                        {showCompleted && (
                          <div className="mt-1.5 text-[10px] text-white/50">
                            Completed: {formatDate(task.completed_at)}
                          </div>
                        )}
                        {evidenceText && (
                          <p className="mt-1 text-[10px] text-white/40 break-words">Evidence: {evidenceText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Claim Section */}
              {(claimStatus === 'ready' || claimStatus === 'fetching-ticket' || claimStatus === 'ticket-ready' || claimStatus === 'submitting-tx' || claimStatus === 'confirming' || claimStatus === 'updating-backend') && (
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-purple-500/20 rounded-xl p-6 border border-yellow-400/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="h-6 w-6 text-yellow-400" />
                      <h2 className="text-lg font-semibold text-white">Claim Your Rewards</h2>
                    </div>
                    <p className="text-white/80 mb-4">
                      You have rewards ready to claim! Click the button below to claim your PMUG tokens.
                    </p>
                    <button
                      onClick={handleClaim}
                      disabled={claimStatus !== 'ready' && claimStatus !== 'ticket-ready'}
                      className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {(claimStatus === 'fetching-ticket' || claimStatus === 'submitting-tx' || claimStatus === 'confirming' || claimStatus === 'updating-backend') && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {claimStatus === 'ticket-ready' ? 'Confirm Claim' : claimStatus === 'ready' ? 'Claim Rewards' : 'Processing...'}
                    </button>
                  </div>
                </div>
              )}

              {claimStatus === 'success' && (
                <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Successfully claimed your rewards!</span>
                  </div>
                </div>
              )}

              {claimStatus === 'failed' && (
                <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-200">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error || 'Claim failed. Please try again.'}</span>
                  </div>
                </div>
              )}

              {claimStatus === 'no-rewards' && (
                <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  <Gift className="h-12 w-12 text-white/40 mx-auto mb-3" />
                  <p className="text-white/60">No rewards available to claim at this time.</p>
                  <p className="text-white/40 text-sm mt-2">Complete tasks to earn rewards!</p>
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
