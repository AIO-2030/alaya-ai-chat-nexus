import type { UserInfo } from '../../types/user';

// Canister actor for backend interaction
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { UserProfile } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import type { _SERVICE } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// Import environment configuration from shared module
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

// Canister configuration using shared environment module
const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

// Log environment configuration for this module
logEnvironmentConfig('AIO_BASE_BACKEND');

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
    devices: [], // Initialize with empty devices array
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

// ==== Contact Types and Interfaces ====

// Frontend contact type that matches the UI needs
export interface ContactInfo {
  id: number;
  name: string;
  type: 'friend' | 'system' | 'business' | 'family';
  status: 'Active' | 'Pending' | 'Blocked' | 'Deleted';
  date: string;
  avatar: string;
  devices: string[];
  isOnline: boolean;
  nickname?: string;
  metadata?: string;
  contactPrincipalId?: string; // Add this field for sharing contacts
}

// Convert backend Contact to frontend ContactInfo
const convertFromContact = (contact: any): ContactInfo => {
  let contactType: 'friend' | 'system' | 'business' | 'family' = 'friend';
  if ('System' in contact.contact_type) {
    contactType = 'system';
  } else if ('Business' in contact.contact_type) {
    contactType = 'business';
  } else if ('Family' in contact.contact_type) {
    contactType = 'family';
  }

  let status: 'Active' | 'Pending' | 'Blocked' | 'Deleted' = 'Active';
  if ('Pending' in contact.status) {
    status = 'Pending';
  } else if ('Blocked' in contact.status) {
    status = 'Blocked';
  } else if ('Deleted' in contact.status) {
    status = 'Deleted';
  }

  return {
    id: Number(contact.id),
    name: contact.name,
    type: contactType,
    status,
    date: new Date(Number(contact.created_at) / 1000000).toISOString().split('T')[0],
    avatar: contact.avatar[0] || contact.name.substring(0, 2).toUpperCase(),
    devices: contact.devices,
    isOnline: contact.is_online,
    nickname: contact.nickname[0],
    metadata: contact.metadata[0],
    contactPrincipalId: contact.contact_principal_id, // Add this line
  };
};

// Convert frontend ContactInfo to backend Contact format
const convertToContact = (info: ContactInfo, ownerPrincipalId: string): any => {
  let contactType: any;
  switch (info.type) {
    case 'system':
      contactType = { System: null };
      break;
    case 'business':
      contactType = { Business: null };
      break;
    case 'family':
      contactType = { Family: null };
      break;
    default:
      contactType = { Friend: null };
  }

  let status: any;
  switch (info.status) {
    case 'Pending':
      status = { Pending: null };
      break;
    case 'Blocked':
      status = { Blocked: null };
      break;
    case 'Deleted':
      status = { Deleted: null };
      break;
    default:
      status = { Active: null };
  }

  return {
    id: BigInt(info.id),
    owner_principal_id: ownerPrincipalId,
    contact_principal_id: info.contactPrincipalId || `contact_${info.id}`, // Use provided contactPrincipalId or generate a placeholder
    name: info.name,
    nickname: info.nickname ? [info.nickname] : [],
    contact_type: contactType,
    status,
    avatar: info.avatar ? [info.avatar] : [],
    devices: info.devices,
    is_online: info.isOnline,
    created_at: BigInt(new Date(info.date).getTime() * 1000000),
    updated_at: BigInt(Date.now() * 1000000),
    metadata: info.metadata ? [info.metadata] : [],
  };
};

// Contact API functions
export const getContactsByOwner = async (ownerPrincipalId: string): Promise<ContactInfo[]> => {
  try {
    const actor = getActor();
    const contacts = await actor.get_contacts_by_owner(ownerPrincipalId);
    
    // Convert backend contacts to frontend format
    const convertedContacts = contacts.map(convertFromContact);
    
    // Add Univoice AI contact at the end
    const univoiceContact: ContactInfo = {
      id: 999, // Special ID for Univoice
      name: "Univoice",
      type: "system",
      status: "Active",
      date: new Date().toISOString().split('T')[0],
      avatar: "UV",
      devices: [],
      isOnline: true,
      nickname: "AI Assistant",
      metadata: "AI-powered voice assistant",
      contactPrincipalId: "univoice_ai_principal_id"
    };
    
    return [...convertedContacts, univoiceContact];
  } catch (error) {
    console.error('[UserApi] Error getting contacts by owner:', error);
    // Return default contacts with Univoice AI
    return [
      {
        id: 1,
        name: "Friend1",
        type: "friend",
        status: "Active",
        date: "2024-01-15",
        avatar: "F1",
        devices: ["Device1", "Device2"],
        isOnline: true,
        contactPrincipalId: "friend1_principal_id_example"
      },
      {
        id: 2,
        name: "Friend2",
        type: "friend",
        status: "Pending",
        date: "2024-01-20",
        avatar: "F2",
        devices: ["Device1", "Device3"],
        isOnline: false,
        contactPrincipalId: "friend2_principal_id_example"
      },
      {
        id: 999,
        name: "Univoice",
        type: "system",
        status: "Active",
        date: new Date().toISOString().split('T')[0],
        avatar: "UV",
        devices: [],
        isOnline: true,
        nickname: "AI Assistant",
        metadata: "AI-powered voice assistant",
        contactPrincipalId: "univoice_ai_principal_id"
      }
    ];
  }
};

export const getContactsByOwnerPaginated = async (
  ownerPrincipalId: string, 
  offset: bigint, 
  limit: bigint
): Promise<ContactInfo[]> => {
  try {
    const actor = getActor();
    const contacts = await actor.get_contacts_by_owner_paginated(ownerPrincipalId, offset, limit);
    
    // Convert backend contacts to frontend format
    const convertedContacts = contacts.map(convertFromContact);
    
    // Add Univoice AI contact if it's the first page
    if (offset === BigInt(0)) {
      const univoiceContact: ContactInfo = {
        id: 999,
        name: "Univoice",
        type: "system",
        status: "Active",
        date: new Date().toISOString().split('T')[0],
        avatar: "UV",
        devices: [],
        isOnline: true,
        nickname: "AI Assistant",
        metadata: "AI-powered voice assistant",
        contactPrincipalId: "univoice_ai_principal_id"
      };
      
      return [...convertedContacts, univoiceContact];
    }
    
    return convertedContacts;
  } catch (error) {
    console.error('[UserApi] Error getting paginated contacts:', error);
    return [];
  }
};

export const upsertContact = async (contact: ContactInfo, ownerPrincipalId: string): Promise<ContactInfo | null> => {
  try {
    const actor = getActor();
    const backendContact = convertToContact(contact, ownerPrincipalId);
    const result = await actor.upsert_contact(backendContact);
    
    if ('Ok' in result) {
      console.log('[UserApi] Contact upserted successfully, index:', result.Ok);
      return { ...contact, id: Number(result.Ok) };
    } else {
      throw new Error(`Failed to upsert contact: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error upserting contact:', error);
    return null;
  }
};

export const createContactFromPrincipalId = async (
  ownerPrincipalId: string, 
  contactPrincipalId: string, 
  nickname?: string
): Promise<ContactInfo | null> => {
  try {
    const actor = getActor();
    // Convert nickname to the expected Candid format: [] or [string]
    const nicknameParam: [] | [string] = nickname ? [nickname] : [];
    const result = await actor.create_contact_from_principal_id(ownerPrincipalId, contactPrincipalId, nicknameParam);
    
    if ('Ok' in result) {
      console.log('[UserApi] Contact created from principal ID successfully, index:', result.Ok);
      
      // Get the created contact details
      const contact = await actor.get_contact_by_id(result.Ok);
      if (contact) {
        return convertFromContact(contact);
      }
      
      // Fallback: create a basic contact info
      return {
        id: Number(result.Ok),
        name: contactPrincipalId,
        type: "friend",
        status: "Active",
        date: new Date().toISOString().split('T')[0],
        avatar: contactPrincipalId.substring(0, 2).toUpperCase(),
        devices: [],
        isOnline: false,
        contactPrincipalId,
        nickname
      };
    } else {
      throw new Error(`Failed to create contact from principal ID: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error creating contact from principal ID:', error);
    return null;
  }
};

export const updateContactStatus = async (
  ownerPrincipalId: string, 
  contactPrincipalId: string, 
  newStatus: 'Active' | 'Pending' | 'Blocked' | 'Deleted'
): Promise<ContactInfo | null> => {
  try {
    const actor = getActor();
    
    let status: any;
    switch (newStatus) {
      case 'Pending':
        status = { Pending: null };
        break;
      case 'Blocked':
        status = { Blocked: null };
        break;
      case 'Deleted':
        status = { Deleted: null };
        break;
      default:
        status = { Active: null };
    }
    
    const result = await actor.update_contact_status(ownerPrincipalId, contactPrincipalId, status);
    
    if ('Ok' in result) {
      return convertFromContact(result.Ok);
    } else {
      throw new Error(`Failed to update contact status: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error updating contact status:', error);
    return null;
  }
};

export const updateContactNickname = async (
  ownerPrincipalId: string, 
  contactPrincipalId: string, 
  nickname: string
): Promise<ContactInfo | null> => {
  try {
    const actor = getActor();
    const result = await actor.update_contact_nickname(ownerPrincipalId, contactPrincipalId, nickname);
    
    if ('Ok' in result) {
      return convertFromContact(result.Ok);
    } else {
      throw new Error(`Failed to update contact nickname: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error updating contact nickname:', error);
    return null;
  }
};

export const updateContactDevices = async (
  ownerPrincipalId: string, 
  contactPrincipalId: string, 
  devices: string[]
): Promise<ContactInfo | null> => {
  try {
    const actor = getActor();
    const result = await actor.update_contact_devices(ownerPrincipalId, contactPrincipalId, devices);
    
    if ('Ok' in result) {
      return convertFromContact(result.Ok);
    } else {
      throw new Error(`Failed to update contact devices: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error updating contact devices:', error);
    return null;
  }
};

export const updateContactOnlineStatus = async (
  ownerPrincipalId: string, 
  contactPrincipalId: string, 
  isOnline: boolean
): Promise<ContactInfo | null> => {
  try {
    const actor = getActor();
    const result = await actor.update_contact_online_status(ownerPrincipalId, contactPrincipalId, isOnline);
    
    if ('Ok' in result) {
      return convertFromContact(result.Ok);
    } else {
      throw new Error(`Failed to update contact online status: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error updating contact online status:', error);
    return null;
  }
};

export const deleteContact = async (
  ownerPrincipalId: string, 
  contactPrincipalId: string
): Promise<boolean> => {
  try {
    const actor = getActor();
    const result = await actor.delete_contact(ownerPrincipalId, contactPrincipalId);
    
    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error(`Failed to delete contact: ${result.Err}`);
    }
  } catch (error) {
    console.error('[UserApi] Error deleting contact:', error);
    return false;
  }
};

export const searchContactsByName = async (
  ownerPrincipalId: string, 
  nameQuery: string
): Promise<ContactInfo[]> => {
  try {
    const actor = getActor();
    const contacts = await actor.search_contacts_by_name(ownerPrincipalId, nameQuery);
    
    // Convert backend contacts to frontend format
    const convertedContacts = contacts.map(convertFromContact);
    
    // Add Univoice AI contact if it matches the search
    if (nameQuery.toLowerCase().includes('univoice') || nameQuery.toLowerCase().includes('ai')) {
      const univoiceContact: ContactInfo = {
        id: 999,
        name: "Univoice",
        type: "system",
        status: "Active",
        date: new Date().toISOString().split('T')[0],
        avatar: "UV",
        devices: [],
        isOnline: true,
        nickname: "AI Assistant",
        metadata: "AI-powered voice assistant",
        contactPrincipalId: "univoice_ai_principal_id"
      };
      
      return [...convertedContacts, univoiceContact];
    }
    
    return convertedContacts;
  } catch (error) {
    console.error('[UserApi] Error searching contacts by name:', error);
    return [];
  }
};

export const getTotalContactsByOwner = async (ownerPrincipalId: string): Promise<bigint> => {
  try {
    const actor = getActor();
    const total = await actor.get_total_contacts_by_owner(ownerPrincipalId);
    // Add 1 for Univoice AI contact
    return total + BigInt(1);
  } catch (error) {
    console.error('[UserApi] Error getting total contacts:', error);
    return BigInt(0);
  }
};

