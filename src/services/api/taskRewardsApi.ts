// Task Rewards API - 任务奖励系统前端 API
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { _SERVICE } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

// Re-export types from generated declarations
export type {
  TaskStatus as CandidTaskStatus,
  ClaimResultStatus as CandidClaimResultStatus,
  TaskContractItem,
  UserTaskDetail,
  UserTaskState,
  MerkleSnapshotMeta,
  ClaimTicket,
} from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

import type { TaskStatus as CandidTaskStatusType } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// String enum for easier handling in UI
export type TaskStatus = 
  | 'NotStarted'
  | 'InProgress'
  | 'Completed'
  | 'RewardPrepared'
  | 'TicketIssued'
  | 'Claimed';

export type ClaimResultStatus = 'Success' | 'Failed';

// Helper to convert Candid variant to string
export function taskStatusToString(status: CandidTaskStatusType): TaskStatus {
  if ('NotStarted' in status) return 'NotStarted';
  if ('InProgress' in status) return 'InProgress';
  if ('Completed' in status) return 'Completed';
  if ('RewardPrepared' in status) return 'RewardPrepared';
  if ('TicketIssued' in status) return 'TicketIssued';
  if ('Claimed' in status) return 'Claimed';
  return 'NotStarted';
}

// Canister configuration
const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

logEnvironmentConfig('AIO_BASE_BACKEND');

// Initialize agent
const agent = new HttpAgent({ 
  host: HOST,
});

if (isLocalNet()) {
  agent.fetchRootKey().catch(console.error);
}

// Actor singleton
let actor: ActorSubclass<_SERVICE> | null = null;

const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    console.log('[TaskRewardsApi] Creating new actor instance for canister:', CANISTER_ID);
    actor = Actor.createActor(idlFactory, { 
      agent, 
      canisterId: CANISTER_ID 
    });
  }
  return actor;
};

// API Functions
export const getTaskContract = async () => {
  try {
    const actor = getActor();
    const result = await actor.get_task_contract();
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error getting task contract:', error);
    return [];
  }
};

export const getOrInitUserTasks = async (wallet: string) => {
  try {
    const actor = getActor();
    const result = await actor.get_or_init_user_tasks(wallet);
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error getting user tasks:', error);
    return null;
  }
};

export const completeTask = async (
  wallet: string,
  taskid: string,
  evidence: string | undefined,
  ts: bigint
) => {
  try {
    const actor = getActor();
    const evidenceOpt: [] | [string] = evidence ? [evidence] : [];
    const result = await actor.complete_task(wallet, taskid, evidenceOpt, ts);
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error completing task:', error);
    return { 'Err': `Canister call failed: ${error}` };
  }
};

export const recordPayment = async (
  wallet: string,
  amount_paid: bigint,
  tx_ref: string,
  ts: bigint,
  payfor?: string
) => {
  try {
    const actor = getActor();
    const payforOpt: [] | [string] = payfor ? [payfor] : [];
    const result = await actor.record_payment(wallet, amount_paid, tx_ref, ts, payforOpt);
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error recording payment:', error);
    return { 'Err': `Canister call failed: ${error}` };
  }
};

export const getClaimTicket = async (wallet: string) => {
  try {
    const actor = getActor();
    const result = await actor.get_claim_ticket(wallet);
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error getting claim ticket:', error);
    return { 'Err': `Canister call failed: ${error}` };
  }
};

export const markClaimResult = async (
  wallet: string,
  epoch: bigint,
  status: 'Success' | 'Failed',
  tx_sig?: string
) => {
  try {
    const actor = getActor();
    const txSigOpt: [] | [string] = tx_sig ? [tx_sig] : [];
    
    // Convert status string to Candid variant
    const statusVariant = status === 'Success' 
      ? { 'Success': null } 
      : { 'Failed': null };
    
    const result = await actor.mark_claim_result(wallet, epoch, statusVariant, txSigOpt);
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error marking claim result:', error);
    return { 'Err': `Canister call failed: ${error}` };
  }
};

export const getEpochMeta = async (epoch: bigint) => {
  try {
    const actor = getActor();
    const result = await actor.get_epoch_meta(epoch);
    
    // Handle Candid Option type: [] | [MerkleSnapshotMeta]
    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    return null;
  } catch (error) {
    console.error('[TaskRewardsApi] Error getting epoch meta:', error);
    return null;
  }
};

export const listAllEpochs = async () => {
  try {
    const actor = getActor();
    const result = await actor.list_all_epochs();
    return result;
  } catch (error) {
    console.error('[TaskRewardsApi] Error listing epochs:', error);
    return [];
  }
};
