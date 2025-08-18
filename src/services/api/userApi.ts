import type { UserInfo } from '../../types/user';

// Canister actor for backend interaction
import { Actor, HttpAgent } from '@dfinity/agent';

// Canister configuration - using import.meta.env for Vite
const CANISTER_ID = import.meta.env.VITE_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';
const HOST = import.meta.env.VITE_INTERNET_IDENTITY_HOST || 'https://ic0.app';

// Initialize agent and actor
const agent = new HttpAgent({ host: HOST });

// Type definitions for canister responses
interface CanisterResult<T> {
  Ok?: T;
  Err?: string;
}

interface UserProfile {
  user_id: string;
  principal_id: string;
  name?: string;
  nickname: string;
  login_method: { Wallet?: null } | { Google?: null } | { II?: null };
  login_status: { Authenticated?: null } | { Unauthenticated?: null };
  email?: string;
  picture?: string;
  wallet_address?: string;
  created_at: bigint;
  updated_at: bigint;
  metadata?: string;
}

// Mock canister for now - replace with actual actor when declarations are available
const mockCanister = {
  upsert_user_profile: async (profile: UserProfile): Promise<CanisterResult<bigint>> => {
    // Mock implementation
    return { Ok: BigInt(Date.now()) };
  },
  get_user_profile_by_principal: async (principalId: string): Promise<UserProfile | null> => {
    // Mock implementation
    return null;
  },
  update_user_nickname: async (principalId: string, nickname: string): Promise<CanisterResult<UserProfile>> => {
    // Mock implementation
    return { Err: "Not implemented" };
  },
  get_user_profile_by_email: async (email: string): Promise<UserProfile | null> => {
    return null;
  },
  get_user_profile_by_user_id: async (userId: string): Promise<UserProfile | null> => {
    return null;
  },
  get_user_profiles_paginated: async (offset: bigint, limit: bigint): Promise<UserProfile[]> => {
    return [];
  },
  get_total_user_profiles: async (): Promise<bigint> => {
    return BigInt(0);
  },
  delete_user_profile: async (principalId: string): Promise<CanisterResult<boolean>> => {
    return { Ok: true };
  }
};

const canister = mockCanister;

// Convert frontend UserInfo to backend UserProfile format
const convertToUserProfile = (info: UserInfo): UserProfile => {
  return {
    user_id: info.userId,
    principal_id: info.principalId,
    name: info.name,
    nickname: info.nickname,
    login_method: info.loginMethod === 'wallet' ? { Wallet: null } : 
                  info.loginMethod === 'google' ? { Google: null } : { II: null },
    login_status: info.loginStatus === 'authenticated' ? { Authenticated: null } : { Unauthenticated: null },
    email: info.email,
    picture: info.picture,
    wallet_address: info.walletAddress,
    created_at: BigInt(Date.now()),
    updated_at: BigInt(Date.now()),
    metadata: undefined,
  };
};

// Convert backend UserProfile to frontend UserInfo format
const convertFromUserProfile = (profile: UserProfile): UserInfo => {
  let loginMethod: 'wallet' | 'google' | 'ii' = 'ii';
  if ('Wallet' in profile.login_method) {
    loginMethod = 'wallet';
  } else if ('Google' in profile.login_method) {
    loginMethod = 'google';
  }

  let loginStatus: 'authenticated' | 'unauthenticated' = 'unauthenticated';
  if ('Authenticated' in profile.login_status) {
    loginStatus = 'authenticated';
  }

  return {
    userId: profile.user_id,
    principalId: profile.principal_id,
    name: profile.name,
    nickname: profile.nickname,
    loginMethod,
    loginStatus,
    email: profile.email,
    picture: profile.picture,
    walletAddress: profile.wallet_address,
  };
};

export const syncUserInfo = async (info: UserInfo): Promise<UserInfo> => {
  try {
    const profile = convertToUserProfile(info);
    const result = await canister.upsert_user_profile(profile);
    
    if (result.Ok !== undefined) {
      console.log('[UserApi] Synced user info to canister, index:', result.Ok);
      return info;
    } else {
      throw new Error(`Failed to sync user info: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error syncing user info:', error);
    // Fallback to local storage if canister call fails
    localStorage.setItem(`user_profile_${info.principalId}`, JSON.stringify(info));
    return info;
  }
};

export const getUserInfoByPrincipal = async (principalId: string): Promise<UserInfo | null> => {
  try {
    const profile = await canister.get_user_profile_by_principal(principalId);
    
    if (profile) {
      const userInfo = convertFromUserProfile(profile);
      console.log('[UserApi] Retrieved user info from canister:', userInfo);
      return userInfo;
    } else {
      console.log('[UserApi] User profile not found in canister');
      return null;
    }
  } catch (error) {
    console.error('[UserApi] Error getting user info from canister:', error);
    // Fallback to local storage
    try {
      const raw = localStorage.getItem(`user_profile_${principalId}`);
      return raw ? (JSON.parse(raw) as UserInfo) : null;
    } catch {
      return null;
    }
  }
};

export const upsertNickname = async (principalId: string, nickname: string): Promise<UserInfo | null> => {
  try {
    const result = await canister.update_user_nickname(principalId, nickname);
    
    if (result.Ok !== undefined) {
      const userInfo = convertFromUserProfile(result.Ok);
      console.log('[UserApi] Updated nickname in canister:', userInfo);
      return userInfo;
    } else {
      throw new Error(`Failed to update nickname: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error updating nickname in canister:', error);
    // Fallback to local storage
    const existing = await getUserInfoByPrincipal(principalId);
    if (!existing) return null;
    const updated: UserInfo = { ...existing, nickname };
    localStorage.setItem(`user_profile_${principalId}`, JSON.stringify(updated));
    return updated;
  }
};

// Additional utility functions for canister interaction
export const getUserProfileByEmail = async (email: string): Promise<UserInfo | null> => {
  try {
    const profile = await canister.get_user_profile_by_email(email);
    return profile ? convertFromUserProfile(profile) : null;
  } catch (error) {
    console.error('[UserApi] Error getting user profile by email:', error);
    return null;
  }
};

export const getUserProfileByUserId = async (userId: string): Promise<UserInfo | null> => {
  try {
    const profile = await canister.get_user_profile_by_user_id(userId);
    return profile ? convertFromUserProfile(profile) : null;
  } catch (error) {
    console.error('[UserApi] Error getting user profile by user ID:', error);
    return null;
  }
};

export const getUserProfilesPaginated = async (offset: number, limit: number): Promise<UserInfo[]> => {
  try {
    const profiles = await canister.get_user_profiles_paginated(BigInt(offset), BigInt(limit));
    return profiles.map(convertFromUserProfile);
  } catch (error) {
    console.error('[UserApi] Error getting paginated user profiles:', error);
    return [];
  }
};

export const getTotalUserProfiles = async (): Promise<number> => {
  try {
    const total = await canister.get_total_user_profiles();
    return Number(total);
  } catch (error) {
    console.error('[UserApi] Error getting total user profiles:', error);
    return 0;
  }
};

export const deleteUserProfile = async (principalId: string): Promise<boolean> => {
  try {
    const result = await canister.delete_user_profile(principalId);
    
    if (result.Ok !== undefined) {
      console.log('[UserApi] Deleted user profile from canister');
      // Also remove from local storage
      localStorage.removeItem(`user_profile_${principalId}`);
      return result.Ok;
    } else {
      throw new Error(`Failed to delete user profile: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error deleting user profile from canister:', error);
    return false;
  }
};

