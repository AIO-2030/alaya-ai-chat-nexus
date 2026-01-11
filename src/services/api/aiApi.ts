// AI API Service - Handle backend communication for user AI configuration
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { 
  _SERVICE,
  UserAiConfig
} from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

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
    console.log('[AiApi] Creating new actor instance for canister:', CANISTER_ID);
    actor = Actor.createActor(idlFactory, { 
      agent, 
      canisterId: CANISTER_ID 
    });
  }
  return actor;
};

// Type definitions for canister responses
type CanisterResult<T> = { 'Ok': T } | { 'Err': string };

// Real canister implementation
const callBackend = {
  get_user_ai_config: async (principalId: string): Promise<UserAiConfig | null> => {
    try {
      const actor = getActor();
      const result = await actor.get_user_ai_config(principalId);
      return (result as [] | [UserAiConfig])[0] || null;
    } catch (error) {
      console.error('[AiApi] Error getting user AI config:', error);
      return null;
    }
  },

  set_user_ai_config: async (config: UserAiConfig): Promise<CanisterResult<null>> => {
    try {
      const actor = getActor();
      const result = await actor.set_user_ai_config(config);
      return result as CanisterResult<null>;
    } catch (error) {
      console.error('[AiApi] Error setting user AI config:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  },

  delete_user_ai_config: async (principalId: string): Promise<CanisterResult<null>> => {
    try {
      const actor = getActor();
      const result = await actor.delete_user_ai_config(principalId);
      return result as CanisterResult<null>;
    } catch (error) {
      console.error('[AiApi] Error deleting user AI config:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  },

  has_user_ai_config: async (principalId: string): Promise<boolean> => {
    try {
      const actor = getActor();
      const result = await actor.has_user_ai_config(principalId);
      return result as boolean;
    } catch (error) {
      console.error('[AiApi] Error checking user AI config:', error);
      return false;
    }
  },
};

// ElevenLabs API functions
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Create IVC voice from audio file
 */
export const createIVCVoice = async (audioBlob: Blob): Promise<string> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const formData = new FormData();
  formData.append('files', audioBlob, 'recording.wav');
  formData.append('name', `User Voice ${Date.now()}`);

  const response = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create IVC voice: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.voice_id;
};

/**
 * Duplicate an agent
 */
export const duplicateAgent = async (masterAgentId: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${masterAgentId}/duplicate`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to duplicate agent: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.agent_id;
};

/**
 * Generate unique agent name from userId and principalId (16 bytes)
 */
const generateUniqueAgentName = async (userId: string, principalId: string): Promise<string> => {
  // Combine userId and principalId
  const combined = `${userId}:${principalId}`;
  
  // Use Web Crypto API to generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Take first 16 bytes (32 hex characters) and convert to hex string
  const uniqueId = hashArray.slice(0, 16)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `Univoice-${uniqueId}`;
};

/**
 * Update agent TTS configuration with voice_id
 */
export const updateAgentVoice = async (
  agentId: string, 
  voiceId: string, 
  userId: string, 
  principalId: string
): Promise<void> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  // Generate unique agent name
  const agentName = await generateUniqueAgentName(userId, principalId);

  const response = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: agentName,
      conversation_config: {
        tts: {
          voice_id: voiceId,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update agent voice: ${response.status} ${errorText}`);
  }
};

/**
 * Delete agent from ElevenLabs
 */
export const deleteElevenLabsAgent = async (agentId: string): Promise<void> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${agentId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete agent: ${response.status} ${errorText}`);
  }
};

/**
 * Create custom voice agent - complete flow
 */
export const createCustomVoiceAgent = async (
  principalId: string,
  audioBlob: Blob,
  masterAgentId: string,
  userId: string
): Promise<{ success: boolean; error?: string; agentId?: string; voiceId?: string }> => {
  try {
    // Step 1: Create IVC voice
    console.log('[AiApi] Creating IVC voice...');
    const voiceId = await createIVCVoice(audioBlob);
    console.log('[AiApi] IVC voice created:', voiceId);

    // Step 2: Duplicate master agent
    console.log('[AiApi] Duplicating master agent...');
    const newAgentId = await duplicateAgent(masterAgentId);
    console.log('[AiApi] Agent duplicated:', newAgentId);

    // Step 3: Update agent with voice_id (using unique name from userId and principalId)
    console.log('[AiApi] Updating agent voice...');
    await updateAgentVoice(newAgentId, voiceId, userId, principalId);
    console.log('[AiApi] Agent voice updated');

    // Step 4: Save to backend
    console.log('[AiApi] Saving to backend...');
    const config: UserAiConfig = {
      principal_id: principalId,
      agent_id: newAgentId,
      voice_id: voiceId,
    };

    const result = await callBackend.set_user_ai_config(config);
    if ('Err' in result) {
      // If backend save fails, try to clean up ElevenLabs resources
      try {
        await deleteElevenLabsAgent(newAgentId);
      } catch (cleanupError) {
        console.error('[AiApi] Failed to cleanup agent after backend error:', cleanupError);
      }
      throw new Error(result.Err);
    }

    console.log('[AiApi] Custom voice agent created successfully');
    return {
      success: true,
      agentId: newAgentId,
      voiceId: voiceId,
    };
  } catch (error) {
    console.error('[AiApi] Error creating custom voice agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export backend API functions
export const get_user_ai_config = callBackend.get_user_ai_config;
export const set_user_ai_config = callBackend.set_user_ai_config;
export const delete_user_ai_config = callBackend.delete_user_ai_config;
export const has_user_ai_config = callBackend.has_user_ai_config;
