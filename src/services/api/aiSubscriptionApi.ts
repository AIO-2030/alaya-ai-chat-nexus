/**
 * AI Subscription API - service types and subscription records from aio-base-backend
 */
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { _SERVICE } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import {
  getAioBaseBackendCanisterId,
  getHost,
  isLocalNet,
} from '../../lib/environment';

const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

const agent = new HttpAgent({ host: HOST });
if (isLocalNet()) {
  agent.fetchRootKey().catch(console.error);
}

let actor: ActorSubclass<_SERVICE> | null = null;
const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    actor = Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID });
  }
  return actor;
};

// Frontend types matching backend (in case declarations are not regenerated)
export type PriceLevel = { M: null } | { Y: null } | { E: null };
export interface ServiceType {
  svr_id: string;
  name: string;
  price_level: PriceLevel;
  price: bigint;
}
export type SubscriptionStatus = { Normal: null } | { Resolved: null };
export interface SubscriptionRecord {
  principal_id: string;
  pay_walletid: string;
  svr_id: string;
  pay_date: string;
  status: SubscriptionStatus;
}

export const listAiSubscriptionServices = async (): Promise<ServiceType[]> => {
  const a = getActor() as any;
  if (typeof a.ai_sub_list_services !== 'function') {
    return [];
  }
  const list = await a.ai_sub_list_services();
  return (list || []).map((s: any) => ({
    svr_id: s.svr_id ?? '',
    name: s.name ?? '',
    price_level: s.price_level ?? { M: null },
    price: typeof s.price === 'bigint' ? s.price : BigInt(Number(s.price ?? 0)),
  }));
};

/**
 * 将支付结果提交到 aio-base-backend 的 subscription_record（ai_sub_create_subscription_record）
 */
export const createAiSubscriptionRecord = async (
  record: SubscriptionRecord
): Promise<{ Ok: bigint } | { Err: string }> => {
  const a = getActor() as any;
  if (typeof a.ai_sub_create_subscription_record !== 'function') {
    return { Err: 'Backend ai_sub_create_subscription_record not available' };
  }
  return a.ai_sub_create_subscription_record(record);
};

export const priceLevelLabel = (pl: PriceLevel): string => {
  if (pl && 'M' in pl) return '月付';
  if (pl && 'Y' in pl) return '年付';
  if (pl && 'E' in pl) return '永久';
  return '';
};
