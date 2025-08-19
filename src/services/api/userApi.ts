import type { UserInfo } from '../../types/user';

// Canister actor for backend interaction
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { UserProfile } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import type { _SERVICE } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// Environment detection and configuration
const isLocalNet = (): boolean => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('4943');
};

const getCanisterId = (): string => {
  // Try to get from environment variable first
  const envCanisterId = import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND;
  if (envCanisterId) {
    return envCanisterId;
  }
  
  // Fallback to default canister ID
  return 'rrkah-fqaaa-aaaaa-aaaaq-cai';
};

const getHost = (): string => {
  if (isLocalNet()) {
    return 'http://localhost:4943';
  }
  return 'https://ic0.app';
};

// Canister configuration
const CANISTER_ID = getCanisterId();
const HOST = getHost();

console.log('[UserApi] Environment config:', {
  isLocalNet: isLocalNet(),
  canisterId: CANISTER_ID,
  host: HOST
});

// Initialize agent with proper configuration
const agent = new HttpAgent({ 
  host: HOST,
  // Add identity if available (for authenticated calls)
  // identity: await getIdentity()
});

// Configure agent for local development
if (isLocalNet()) {
  agent.fetchRootKey().catch(console.error);
}

// Actor singleton for re-use (similar to actorManager.ts pattern)
let actor: ActorSubclass<_SERVICE> | null = null;

// Get or create actor instance
const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    console.log('[UserApi] Creating new actor instance for canister:', CANISTER_ID);
    actor = Actor.createActor(idlFactory, { 
      agent, 
      canisterId: CANISTER_ID 
    });
  }
  return actor;
};

// Type definitions for canister responses
type CanisterResult<T> = { 'Ok': T } | { 'Err': string };

// Helper function to check if result is Ok
const isOk = <T>(result: CanisterResult<T>): result is { 'Ok': T } => {
  return 'Ok' in result;
};

// Helper function to check if result is Err
const isErr = <T>(result: CanisterResult<T>): result is { 'Err': string } => {
  return 'Err' in result;
};

// Convert frontend UserInfo to backend UserProfile format
const convertToUserProfile = (info: UserInfo): UserProfile => {
  return {
    user_id: info.userId,
    principal_id: info.principalId,
    name: info.name ? [info.name] : [],
    nickname: info.nickname,
    login_method: info.loginMethod === 'wallet' ? { Wallet: null } : 
                  info.loginMethod === 'google' ? { Google: null } : { II: null },
    login_status: info.loginStatus === 'authenticated' ? { Authenticated: null } : { Unauthenticated: null },
    email: info.email ? [info.email] : [],
    picture: info.picture ? [info.picture] : [],
    wallet_address: info.walletAddress ? [info.walletAddress] : [],
    created_at: BigInt(Date.now()),
    updated_at: BigInt(Date.now()),
    metadata: [],
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
    name: profile.name[0] || undefined,
    nickname: profile.nickname,
    loginMethod,
    loginStatus,
    email: profile.email[0] || undefined,
    picture: profile.picture[0] || undefined,
    walletAddress: profile.wallet_address[0] || undefined,
  };
};

// Real canister implementation based on DID interface
const callBackend = {
  upsert_user_profile: async (profile: UserProfile): Promise<CanisterResult<bigint>> => {
    try {
      const actor = getActor();
      const result = await actor.upsert_user_profile(profile);
      return result as CanisterResult<bigint>;
    } catch (error) {
      console.error('[UserApi] Error upserting user profile:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  },
  
  get_user_profile_by_principal: async (principalId: string): Promise<UserProfile | null> => {
    try {
      const actor = getActor();
      const result = await actor.get_user_profile_by_principal(principalId);
      return (result as [] | [UserProfile])[0] || null;
    } catch (error) {
      console.error('[UserApi] Error getting user profile by principal:', error);
      return null;
    }
  },
  
  update_user_nickname: async (principalId: string, nickname: string): Promise<CanisterResult<UserProfile>> => {
    try {
      const actor = getActor();
      const result = await actor.update_user_nickname(principalId, nickname);
      return result as CanisterResult<UserProfile>;
    } catch (error) {
      console.error('[UserApi] Error updating user nickname:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  },
  
  get_user_profile_by_email: async (email: string): Promise<UserProfile | null> => {
    try {
      const actor = getActor();
      const result = await actor.get_user_profile_by_email(email);
      return (result as [] | [UserProfile])[0] || null;
    } catch (error) {
      console.error('[UserApi] Error getting user profile by email:', error);
      return null;
    }
  },
  
  get_user_profile_by_user_id: async (userId: string): Promise<UserProfile | null> => {
    try {
      const actor = getActor();
      const result = await actor.get_user_profile_by_user_id(userId);
      return (result as [] | [UserProfile])[0] || null;
    } catch (error) {
      console.error('[UserApi] Error getting user profile by user ID:', error);
      return null;
    }
  },
  
  get_user_profiles_paginated: async (offset: bigint, limit: bigint): Promise<UserProfile[]> => {
    try {
      const actor = getActor();
      const result = await actor.get_user_profiles_paginated(offset, limit);
      return result as UserProfile[];
    } catch (error) {
      console.error('[UserApi] Error getting paginated user profiles:', error);
      return [];
    }
  },
  
  get_total_user_profiles: async (): Promise<bigint> => {
    try {
      const actor = getActor();
      const result = await actor.get_total_user_profiles();
      return result as bigint;
    } catch (error) {
      console.error('[UserApi] Error getting total user profiles:', error);
      return BigInt(0);
    }
  },
  
  delete_user_profile: async (principalId: string): Promise<CanisterResult<boolean>> => {
    try {
      const actor = getActor();
      const result = await actor.delete_user_profile(principalId);
      return result as CanisterResult<boolean>;
    } catch (error) {
      console.error('[UserApi] Error deleting user profile:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  }
};

const canister = callBackend;

export const syncUserInfo = async (info: UserInfo): Promise<UserInfo> => {
  try {
    const profile = convertToUserProfile(info);
    const result = await canister.upsert_user_profile(profile);
    
    if (isOk(result)) {
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
    
    if (isOk(result)) {
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

export const getUserProfilesPaginated = async (offset: bigint, limit: bigint): Promise<UserInfo[]> => {
  try {
    const profiles = await canister.get_user_profiles_paginated(offset, limit);
    return profiles.map(convertFromUserProfile);
  } catch (error) {
    console.error('[UserApi] Error getting paginated user profiles:', error);
    return [];
  }
};

export const getTotalUserProfiles = async (): Promise<bigint> => {
  try {
    const total = await canister.get_total_user_profiles();
    return total;
  } catch (error) {
    console.error('[UserApi] Error getting total user profiles:', error);
    return BigInt(0);
  }
};

export const deleteUserProfile = async (principalId: string): Promise<boolean> => {
  try {
    const result = await canister.delete_user_profile(principalId);
    
    if (isOk(result)) {
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

// Export actor management functions for external use
export const getCanisterActor = (): ActorSubclass<_SERVICE> => {
  return getActor();
};

export const resetActor = (): void => {
  actor = null;
  console.log('[UserApi] Actor instance reset');
};

export const getEnvironmentInfo = () => ({
  isLocalNet: isLocalNet(),
  canisterId: CANISTER_ID,
  host: HOST
});

