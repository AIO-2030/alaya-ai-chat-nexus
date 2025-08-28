import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { _SERVICE, ChatMessage, MessageMode, NotificationItem } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

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
logEnvironmentConfig('CHAT_API');

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

// Actor singleton for re-use
let actor: ActorSubclass<_SERVICE> | null = null;

// Get or create actor instance
const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    console.log('[ChatApi] Creating new actor instance for canister:', CANISTER_ID);
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

// Frontend types for chat functionality
export interface ChatMessageInfo {
  sendBy: string;           // Sender's principal ID
  content: string;          // Message content (base64 for non-text modes)
  mode: 'Text' | 'Voice' | 'Image' | 'Emoji';  // Content type
  timestamp: number;        // Message timestamp (in milliseconds)
}

export interface NotificationInfo {
  socialPairKey: string;    // Social pair this notification belongs to
  toWho: string;           // Receiver's principal ID
  messageId: number;       // Index of the message in chat history
  timestamp: number;       // Notification timestamp (in milliseconds)
}

// Convert backend ChatMessage to frontend ChatMessageInfo
const convertFromChatMessage = (message: ChatMessage): ChatMessageInfo => {
  let mode: 'Text' | 'Voice' | 'Image' | 'Emoji' = 'Text';
  
  if (message.mode && typeof message.mode === 'object') {
    if ('Voice' in message.mode) {
      mode = 'Voice';
    } else if ('Image' in message.mode) {
      mode = 'Image';
    } else if ('Emoji' in message.mode) {
      mode = 'Emoji';
    }
  }

  return {
    sendBy: message.send_by,
    content: message.content,
    mode,
    timestamp: Number(message.timestamp) / 1000000, // Convert nanoseconds to milliseconds
  };
};

// Convert frontend ChatMessageInfo to backend MessageMode
const convertToMessageMode = (mode: 'Text' | 'Voice' | 'Image' | 'Emoji'): MessageMode => {
  switch (mode) {
    case 'Voice':
      return { Voice: null };
    case 'Image':
      return { Image: null };
    case 'Emoji':
      return { Emoji: null };
    default:
      return { Text: null };
  }
};

// Convert backend NotificationItem to frontend NotificationInfo
const convertFromNotification = (notification: NotificationItem): NotificationInfo => {
  return {
    socialPairKey: notification.social_pair_key,
    toWho: notification.to_who,
    messageId: Number(notification.message_id),
    timestamp: Number(notification.timestamp) / 1000000, // Convert nanoseconds to milliseconds
  };
};

// Real canister implementation based on DID interface
const callBackend = {
  generate_social_pair_key: async (principal1: string, principal2: string): Promise<string> => {
    try {
      const actor = getActor();
      const result = await actor.generate_social_pair_key(principal1, principal2);
      return result;
    } catch (error) {
      console.error('[ChatApi] Error generating social pair key:', error);
      throw error;
    }
  },

  send_chat_message: async (
    senderPrincipal: string,
    receiverPrincipal: string,
    content: string,
    mode: MessageMode
  ): Promise<CanisterResult<bigint>> => {
    try {
      const actor = getActor();
      const result = await actor.send_chat_message(senderPrincipal, receiverPrincipal, content, mode);
      return result as CanisterResult<bigint>;
    } catch (error) {
      console.error('[ChatApi] Error sending chat message:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  },

  get_recent_chat_messages: async (principal1: string, principal2: string): Promise<ChatMessage[]> => {
    try {
      const actor = getActor();
      const result = await actor.get_recent_chat_messages(principal1, principal2);
      return result as ChatMessage[];
    } catch (error) {
      console.error('[ChatApi] Error getting recent chat messages:', error);
      return [];
    }
  },

  get_chat_messages_paginated: async (
    principal1: string,
    principal2: string,
    offset: bigint,
    limit: bigint
  ): Promise<ChatMessage[]> => {
    try {
      const actor = getActor();
      const result = await actor.get_chat_messages_paginated(principal1, principal2, offset, limit);
      return result as ChatMessage[];
    } catch (error) {
      console.error('[ChatApi] Error getting paginated chat messages:', error);
      return [];
    }
  },

  get_chat_message_count: async (principal1: string, principal2: string): Promise<bigint> => {
    try {
      const actor = getActor();
      const result = await actor.get_chat_message_count(principal1, principal2);
      return result as bigint;
    } catch (error) {
      console.error('[ChatApi] Error getting chat message count:', error);
      return BigInt(0);
    }
  },

  pop_notification: async (receiverPrincipal: string): Promise<NotificationItem | null> => {
    try {
      const actor = getActor();
      const result = await actor.pop_notification(receiverPrincipal);
      return (result as [] | [NotificationItem])[0] || null;
    } catch (error) {
      console.error('[ChatApi] Error popping notification:', error);
      return null;
    }
  },

  get_notifications_for_receiver: async (receiverPrincipal: string): Promise<NotificationItem[]> => {
    try {
      const actor = getActor();
      const result = await actor.get_notifications_for_receiver(receiverPrincipal);
      return result as NotificationItem[];
    } catch (error) {
      console.error('[ChatApi] Error getting notifications for receiver:', error);
      return [];
    }
  },

  clear_notifications_for_pair: async (
    socialPairKey: string,
    receiverPrincipal: string
  ): Promise<CanisterResult<bigint>> => {
    try {
      const actor = getActor();
      const result = await actor.clear_notifications_for_pair(socialPairKey, receiverPrincipal);
      return result as CanisterResult<bigint>;
    } catch (error) {
      console.error('[ChatApi] Error clearing notifications for pair:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  }
};

const canister = callBackend;

// Public API functions

/**
 * Generate deterministic social pair key from two principal IDs
 * @param principal1 First user's principal ID
 * @param principal2 Second user's principal ID
 * @returns Social pair key string
 */
export const generateSocialPairKey = async (principal1: string, principal2: string): Promise<string> => {
  try {
    console.log('[ChatApi] Generating social pair key for:', principal1, principal2);
    const result = await canister.generate_social_pair_key(principal1, principal2);
    console.log('[ChatApi] Generated social pair key:', result);
    return result;
  } catch (error) {
    console.error('[ChatApi] Error generating social pair key:', error);
    throw error;
  }
};

/**
 * Send a chat message between two users
 * @param senderPrincipal Sender's principal ID
 * @param receiverPrincipal Receiver's principal ID
 * @param content Message content (base64 for non-text modes)
 * @param mode Message mode: 'Text', 'Voice', 'Image', or 'Emoji'
 * @returns Message index if successful
 */
export const sendChatMessage = async (
  senderPrincipal: string,
  receiverPrincipal: string,
  content: string,
  mode: 'Text' | 'Voice' | 'Image' | 'Emoji' = 'Text'
): Promise<number> => {
  try {
    console.log('[ChatApi] Sending chat message:', { senderPrincipal, receiverPrincipal, mode });
    const messageMode = convertToMessageMode(mode);
    const result = await canister.send_chat_message(senderPrincipal, receiverPrincipal, content, messageMode);
    
    if (isOk(result)) {
      console.log('[ChatApi] Chat message sent successfully, index:', result.Ok);
      return Number(result.Ok);
    } else {
      throw new Error(`Failed to send chat message: ${result.Err}`);
    }
  } catch (error) {
    console.error('[ChatApi] Error sending chat message:', error);
    throw error;
  }
};

/**
 * Get recent chat messages (last 5 messages) between two users
 * @param principal1 First user's principal ID
 * @param principal2 Second user's principal ID
 * @returns Array of recent chat messages
 */
export const getRecentChatMessages = async (principal1: string, principal2: string): Promise<ChatMessageInfo[]> => {
  try {
    console.log('[ChatApi] Getting recent chat messages for:', principal1, principal2);
    const messages = await canister.get_recent_chat_messages(principal1, principal2);
    const convertedMessages = messages.map(convertFromChatMessage);
    console.log('[ChatApi] Retrieved recent chat messages:', convertedMessages.length);
    return convertedMessages;
  } catch (error) {
    console.error('[ChatApi] Error getting recent chat messages:', error);
    return [];
  }
};

/**
 * Get paginated chat messages between two users
 * @param principal1 First user's principal ID
 * @param principal2 Second user's principal ID
 * @param offset Starting position
 * @param limit Number of messages to retrieve
 * @returns Array of chat messages
 */
export const getChatMessagesPaginated = async (
  principal1: string,
  principal2: string,
  offset: number,
  limit: number
): Promise<ChatMessageInfo[]> => {
  try {
    console.log('[ChatApi] Getting paginated chat messages:', { principal1, principal2, offset, limit });
    const messages = await canister.get_chat_messages_paginated(
      principal1, 
      principal2, 
      BigInt(offset), 
      BigInt(limit)
    );
    const convertedMessages = messages.map(convertFromChatMessage);
    console.log('[ChatApi] Retrieved paginated chat messages:', convertedMessages.length);
    return convertedMessages;
  } catch (error) {
    console.error('[ChatApi] Error getting paginated chat messages:', error);
    return [];
  }
};

/**
 * Get total message count between two users
 * @param principal1 First user's principal ID
 * @param principal2 Second user's principal ID
 * @returns Total number of messages
 */
export const getChatMessageCount = async (principal1: string, principal2: string): Promise<number> => {
  try {
    console.log('[ChatApi] Getting chat message count for:', principal1, principal2);
    const count = await canister.get_chat_message_count(principal1, principal2);
    const result = Number(count);
    console.log('[ChatApi] Chat message count:', result);
    return result;
  } catch (error) {
    console.error('[ChatApi] Error getting chat message count:', error);
    return 0;
  }
};

/**
 * Pop notification from queue for specific receiver
 * Used for polling new messages
 * @param receiverPrincipal Receiver's principal ID
 * @returns Notification info if available, null otherwise
 */
export const popNotification = async (receiverPrincipal: string): Promise<NotificationInfo | null> => {
  try {
    console.log('[ChatApi] Popping notification for receiver:', receiverPrincipal);
    const notification = await canister.pop_notification(receiverPrincipal);
    
    if (notification) {
      const convertedNotification = convertFromNotification(notification);
      console.log('[ChatApi] Popped notification:', convertedNotification);
      return convertedNotification;
    } else {
      console.log('[ChatApi] No notifications available');
      return null;
    }
  } catch (error) {
    console.error('[ChatApi] Error popping notification:', error);
    return null;
  }
};

/**
 * Get all notifications for a receiver without removing them
 * @param receiverPrincipal Receiver's principal ID
 * @returns Array of notifications
 */
export const getNotificationsForReceiver = async (receiverPrincipal: string): Promise<NotificationInfo[]> => {
  try {
    console.log('[ChatApi] Getting notifications for receiver:', receiverPrincipal);
    const notifications = await canister.get_notifications_for_receiver(receiverPrincipal);
    const convertedNotifications = notifications.map(convertFromNotification);
    console.log('[ChatApi] Retrieved notifications:', convertedNotifications.length);
    return convertedNotifications;
  } catch (error) {
    console.error('[ChatApi] Error getting notifications for receiver:', error);
    return [];
  }
};

/**
 * Clear all notifications for a specific social pair and receiver
 * Useful for marking conversations as read
 * @param socialPairKey Social pair identifier
 * @param receiverPrincipal Receiver's principal ID
 * @returns Number of notifications removed
 */
export const clearNotificationsForPair = async (
  socialPairKey: string,
  receiverPrincipal: string
): Promise<number> => {
  try {
    console.log('[ChatApi] Clearing notifications for pair:', { socialPairKey, receiverPrincipal });
    const result = await canister.clear_notifications_for_pair(socialPairKey, receiverPrincipal);
    
    if (isOk(result)) {
      const removedCount = Number(result.Ok);
      console.log('[ChatApi] Cleared notifications, count:', removedCount);
      return removedCount;
    } else {
      throw new Error(`Failed to clear notifications: ${result.Err}`);
    }
  } catch (error) {
    console.error('[ChatApi] Error clearing notifications for pair:', error);
    return 0;
  }
};

// Utility functions for chat management

/**
 * Start chat with a contact
 * @param currentUserPrincipal Current user's principal ID
 * @param contactPrincipal Contact's principal ID
 * @returns Social pair key for the chat
 */
export const startChatWithContact = async (
  currentUserPrincipal: string,
  contactPrincipal: string
): Promise<string> => {
  try {
    const socialPairKey = await generateSocialPairKey(currentUserPrincipal, contactPrincipal);
    
    // Clear any existing notifications for this pair to mark as read
    await clearNotificationsForPair(socialPairKey, currentUserPrincipal);
    
    return socialPairKey;
  } catch (error) {
    console.error('[ChatApi] Error starting chat with contact:', error);
    throw error;
  }
};

/**
 * Check for new messages (polling function)
 * @param receiverPrincipal Receiver's principal ID
 * @returns Array of new notifications
 */
export const checkForNewMessages = async (receiverPrincipal: string): Promise<NotificationInfo[]> => {
  try {
    return await getNotificationsForReceiver(receiverPrincipal);
  } catch (error) {
    console.error('[ChatApi] Error checking for new messages:', error);
    return [];
  }
};

/**
 * Get chat history with pagination support
 * @param principal1 First user's principal ID
 * @param principal2 Second user's principal ID
 * @param page Page number (0-based)
 * @param pageSize Number of messages per page
 * @returns Object with messages and pagination info
 */
export const getChatHistory = async (
  principal1: string,
  principal2: string,
  page: number = 0,
  pageSize: number = 20
): Promise<{
  messages: ChatMessageInfo[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}> => {
  try {
    const offset = page * pageSize;
    const [messages, totalCount] = await Promise.all([
      getChatMessagesPaginated(principal1, principal2, offset, pageSize),
      getChatMessageCount(principal1, principal2)
    ]);

    return {
      messages,
      totalCount,
      hasMore: offset + pageSize < totalCount,
      currentPage: page
    };
  } catch (error) {
    console.error('[ChatApi] Error getting chat history:', error);
    return {
      messages: [],
      totalCount: 0,
      hasMore: false,
      currentPage: page
    };
  }
};

// Export actor management functions for external use
export const getChatCanisterActor = (): ActorSubclass<_SERVICE> => {
  return getActor();
};

export const resetChatActor = (): void => {
  actor = null;
  console.log('[ChatApi] Chat actor instance reset');
};

export const getChatEnvironmentInfo = () => ({
  isLocalNet: isLocalNet(),
  canisterId: CANISTER_ID,
  host: HOST
});
