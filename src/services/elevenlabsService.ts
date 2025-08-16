// ElevenLabs Service - Configuration and Status Only
// Note: This service only handles configuration. For actual voice/text communication,
// use the @elevenlabs/react useConversation hook in components.

export interface ElevenLabsMessage {
  source: 'user' | 'ai';
  message: string;
  timestamp?: Date;
}

export interface ElevenLabsResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class ElevenLabsService {
  private apiKey: string;
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ No ElevenLabs API key found. Some features may not work.');
    }
  }

  // Check if service is properly configured
  isConfigured(): boolean {
    return !!this.apiKey && !!this.agentId;
  }

  // Get configuration status
  getConfigStatus(): { hasApiKey: boolean; hasAgentId: boolean; isConfigured: boolean } {
    return {
      hasApiKey: !!this.apiKey,
      hasAgentId: !!this.agentId,
      isConfigured: this.isConfigured(),
    };
  }

  // Get agent ID (for use in components)
  getAgentId(): string {
    return this.agentId;
  }

  // Get API key (for use in components if needed)
  getApiKey(): string {
    return this.apiKey;
  }
}

export default ElevenLabsService; 