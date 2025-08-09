import type { UserInfo } from '../../types/user';

// Mock layer for canister interaction. Replace with actual canister actor later.

const STORAGE_KEY_PREFIX = 'user_profile_';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const syncUserInfo = async (info: UserInfo): Promise<UserInfo> => {
  // Simulate network/canister latency
  await delay(100);
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + info.principalId, JSON.stringify(info));
    // Developer log for stored user info
    console.log('[UserApi] Synced user info:', info);
  } catch {
    // ignore storage errors in mock
  }
  return info;
};

export const getUserInfoByPrincipal = async (principalId: string): Promise<UserInfo | null> => {
  await delay(50);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + principalId);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
};

export const upsertNickname = async (principalId: string, nickname: string): Promise<UserInfo | null> => {
  const existing = await getUserInfoByPrincipal(principalId);
  if (!existing) return null;
  const updated: UserInfo = { ...existing, nickname };
  return syncUserInfo(updated);
};

