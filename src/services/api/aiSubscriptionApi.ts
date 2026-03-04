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

/**
 * 获取用户当前有效的 AI 订阅列表（status 为 Normal）
 */
export const getActiveAiSubscriptions = async (
  principalId: string
): Promise<SubscriptionRecord[]> => {
  const a = getActor() as any;
  if (typeof a.ai_sub_get_active_subscriptions !== 'function') {
    return [];
  }
  const list = await a.ai_sub_get_active_subscriptions(principalId);
  return (list || []).map((r: any) => ({
    principal_id: r.principal_id ?? '',
    pay_walletid: r.pay_walletid ?? '',
    svr_id: r.svr_id ?? '',
    pay_date: r.pay_date ?? '',
    status: r.status ?? { Normal: null },
  }));
};

/**
 * 检查用户是否已订阅 personal AI（任意有效 AI 订阅即视为已订阅）
 */
export const isSubscribedToPersonalAi = async (
  principalId: string
): Promise<boolean> => {
  const active = await getActiveAiSubscriptions(principalId);
  return active.length > 0;
};

/** 后端服务 ID：个人 AI 对话（Start Chat） */
export const SVR_ID_PERSONAL_AI = 'ai_subscription';
/** 后端服务 ID：语音克隆（Create My Voice） */
export const SVR_ID_VOICE_CLONE = 'voice_clone';

/**
 * 检查用户是否已订阅指定服务（按 svr_id）
 */
export const isSubscribedToService = async (
  principalId: string,
  svrId: string
): Promise<boolean> => {
  const a = getActor() as any;
  if (typeof a.ai_sub_is_subscribed !== 'function') return false;
  return a.ai_sub_is_subscribed(principalId, svrId);
};
