import { useState, useRef, useCallback, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

// Types for our conversation
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface ElevenLabsHookState {
  messages: ChatMessage[];
  isSessionActive: boolean;
  currentTranscript: string;
  conversationId: string | null;
  status: string;
  isSpeaking: boolean;
  error: string | null;
}

export interface ElevenLabsHookActions {
  addMessage: (type: 'user' | 'agent' | 'system', content: string) => void;
  addSystemMessage: (content: string) => void;
  clearChatHistory: () => void;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  startVoiceRecording: () => Promise<void>;
  stopVoiceRecording: () => Promise<void>;
  returnToHomepage: () => void;
  setShowChatHistory: (show: boolean) => void;
}

// Global state management - independent of React component lifecycle
class ElevenLabsGlobalState {
  private static instance: ElevenLabsGlobalState;
  private state: Map<string, any> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();
  private conversationInstances: Map<string, any> = new Map();
  
  private constructor() {}
  
  static getInstance(): ElevenLabsGlobalState {
    if (!ElevenLabsGlobalState.instance) {
      ElevenLabsGlobalState.instance = new ElevenLabsGlobalState();
    }
    return ElevenLabsGlobalState.instance;
  }
  
  // Get state for a specific agent
  getState(agentId: string): any {
    if (!this.state.has(agentId)) {
      // Initialize default state for this agent
      this.state.set(agentId, {
        messages: [],
        isSessionActive: false,
        currentTranscript: '',
        conversationId: null,
        status: 'disconnected',
        isSpeaking: false,
        error: null,
        lastUpdated: new Date()
      });
    }
    
    const state = this.state.get(agentId);
    
    // Ensure messages have correct timestamp types
    if (state.messages && Array.isArray(state.messages)) {
      state.messages = state.messages.map((message: any) => {
        if (message && typeof message === 'object') {
          return {
            ...message,
            timestamp: message.timestamp instanceof Date ? message.timestamp : 
                      message.timestamp ? new Date(message.timestamp) : new Date()
          };
        }
        return message;
      });
    }
    
    // No automatic state consistency fixes - preserve user's state as-is
    // Only user actions should modify the state
    
    return state;
  }
  
  // Clear stale state for a specific agent
  clearStaleState(agentId: string): void {
    console.log('🧹 Clearing stale state for agent:', agentId);
    
    // Reset to default state
    const defaultState = {
      messages: [],
      isSessionActive: false,
      currentTranscript: '',
      conversationId: null,
      status: 'disconnected',
      isSpeaking: false,
      error: null,
      lastUpdated: new Date()
    };
    
    this.state.set(agentId, defaultState);
    
    // Clear from localStorage
    try {
      const key = `elevenlabs_state_${agentId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
    
    // Notify listeners
    this.notifyListeners(agentId);
  }
  
  // Update state for a specific agent
  updateState(agentId: string, updates: Partial<any>): void {
    const currentState = this.getState(agentId);
    const newState = { ...currentState, ...updates, lastUpdated: Date.now() };
    
    // No automatic state validation or fixes
    // Trust the user's actions and preserve the state as intended
    
    this.state.set(agentId, newState);
    
    // Notify listeners
    this.notifyListeners(agentId);
    
    // Persist to localStorage
    this.persistState(agentId, newState);
  }
  
  // Subscribe to state changes
  subscribe(agentId: string, callback: () => void): () => void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, new Set());
    }
    
    const agentListeners = this.listeners.get(agentId)!;
    agentListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      agentListeners.delete(callback);
    };
  }
  
  // Notify all listeners for an agent
  private notifyListeners(agentId: string): void {
    if (this.listeners.has(agentId)) {
      this.listeners.get(agentId)!.forEach(callback => callback());
    }
  }
  
  // Persist state to localStorage
  private persistState(agentId: string, state: any): void {
    try {
      const key = `elevenlabs_state_${agentId}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist state to localStorage:', error);
    }
  }
  
  // Load state from localStorage
  loadPersistedState(agentId: string): any {
    try {
      const key = `elevenlabs_state_${agentId}`;
      const persisted = localStorage.getItem(key);
      if (persisted) {
        const state = JSON.parse(persisted);
        
        // Fix timestamp fields - convert string timestamps back to Date objects
        if (state.messages && Array.isArray(state.messages)) {
          state.messages = state.messages.map((message: any) => ({
            ...message,
            timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
          }));
        }
        
        // Fix lastUpdated field
        if (state.lastUpdated) {
          state.lastUpdated = new Date(state.lastUpdated);
        }
        
        // Clean up stale error states when loading persisted state
        // This prevents showing old error messages on page load
        if (state.error && !state.isSessionActive) {
          console.log('🧹 Cleaning up stale error state on page load');
          state.error = null;
        }
        
        // Clean up stale connecting status when loading persisted state
        // This prevents showing "connecting" when there's no active session
        if (state.status === 'connecting' && !state.isSessionActive) {
          console.log('🧹 Cleaning up stale connecting status on page load');
          state.status = 'disconnected';
        }
        
        // Always load persisted state with cleanup
        // This ensures a clean state on page load
        console.log('✅ Loading persisted state from localStorage with cleanup');
        
        this.state.set(agentId, state);
        return state;
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
    return null;
  }
  
  // Store conversation instance
  setConversationInstance(agentId: string, instance: any): void {
    this.conversationInstances.set(agentId, instance);
  }
  
  // Get conversation instance
  getConversationInstance(agentId: string): any {
    return this.conversationInstances.get(agentId);
  }
  
  // Clear conversation instance
  clearConversationInstance(agentId: string): void {
    this.conversationInstances.delete(agentId);
  }
}

// Global state instance
const globalState = ElevenLabsGlobalState.getInstance();

export const useElevenLabsStable = (agentId: string): [ElevenLabsHookState, ElevenLabsHookActions, boolean] => {
  // Use a stable ref to track if this hook instance has been initialized
  const isInitializedRef = useRef(false);
  
  // Get initial state from global state
  const [localState, setLocalState] = useState(() => {
    // Try to load from global state first
    const globalStateData = globalState.getState(agentId);
    const persistedState = globalState.loadPersistedState(agentId);
    
    // Merge global state with persisted state
    return { ...globalStateData, ...persistedState };
  });
  
  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = globalState.subscribe(agentId, () => {
      const newGlobalState = globalState.getState(agentId);
      setLocalState((prev: any) => ({ ...prev, ...newGlobalState }));
    });
    
    return unsubscribe;
  }, [agentId]);
  
  // Initialize hook - no automatic state cleanup
  useEffect(() => {
    console.log('🚀 useElevenLabsStable hook mounted - preserving user state');
    
    // No automatic state cleanup - only user actions should trigger cleanup
    // This ensures that user's session state is preserved across component re-renders
    
    return () => {
      console.log('🧹 useElevenLabsStable hook unmounting');
    };
  }, [agentId]);
  
  // Only log initialization once per hook instance
  if (!isInitializedRef.current) {
    console.log('🚀 useElevenLabsStable hook initialized with agentId:', agentId);
    isInitializedRef.current = true;
  }

  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for stable references
  const conversationIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Agent ID validation
  const isValidAgentId = agentId && agentId.startsWith('agent_');
  
  // Helper function to add messages - use useCallback to prevent recreation
  const addMessage = useCallback((type: 'user' | 'agent' | 'system', content: string) => {
    console.log('💬 Adding message:', { type, content });
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date()
    };
    
    // Update global state instead of local state
    const currentMessages = globalState.getState(agentId).messages || [];
    const updatedMessages = [...currentMessages, newMessage];
    globalState.updateState(agentId, { messages: updatedMessages });
  }, [agentId]);

  const addSystemMessage = useCallback((content: string) => {
    console.log('🔔 Adding system message:', content);
    const systemMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      content: `✨ ${content}`,
      timestamp: new Date()
    };
    
    // Update global state instead of local state
    const currentMessages = globalState.getState(agentId).messages || [];
    const updatedMessages = [...currentMessages, systemMessage];
    globalState.updateState(agentId, { messages: updatedMessages });
  }, [agentId]);

  // Stable state update functions
  const updateSessionState = useCallback((updates: Partial<{
    isSessionActive: boolean;
    conversationId: string | null;
    error: string | null;
    status?: string;
  }>) => {
    // Update global state instead of local state
    globalState.updateState(agentId, updates);
    
    // Also update local refs for immediate access
    if (updates.conversationId !== undefined) {
      conversationIdRef.current = updates.conversationId;
    }
    if (updates.isSessionActive !== undefined) {
      isConnectingRef.current = false; // Reset connecting flag when session state changes
    }
  }, [agentId]);

  const resetSessionState = useCallback(() => {
    console.log('🔄 Resetting session state');
    
    // Update global state
    globalState.updateState(agentId, {
      isSessionActive: false,
      conversationId: null,
      error: null,
      currentTranscript: '',
      status: 'disconnected',
      isSpeaking: false
    });
    
    // Reset local refs
    conversationIdRef.current = null;
    isConnectingRef.current = false;
  }, [agentId]);

  // Initialize ElevenLabs conversation hook with stable callbacks
  const conversation = useConversation({
    onConnect: useCallback(() => {
      console.log('✅ Connected to ElevenLabs agent');
      console.log('🔗 Connection established, updating session state');
      console.log('🎯 Current mode: Voice');
      
      // Always mark session as active when connected, regardless of conversation ID
      // The conversation ID will be set later in startSession
      console.log('✅ Connection established, marking session as active');
      updateSessionState({ isSessionActive: true });
      globalState.updateState(agentId, { error: null });
      isConnectingRef.current = false;
      
      // Add connection message for voice mode
      addSystemMessage('ElevenLabs connection established - Voice conversation ready');
      
      // Ensure voice recording is ready
      console.log('🎤 Voice mode connected - voice recording should be active');
      addSystemMessage('Voice recording is active - speak naturally to interact with the AI');
      
      console.log('🎉 Session state updated to active on connection');
      console.log('🔄 Final session state after connection:', { isSessionActive: true, conversationId: conversationIdRef.current });
    }, [addSystemMessage, updateSessionState, agentId]),
    
    onDisconnect: useCallback((reason: any) => {
      console.log('🔌 Disconnected from ElevenLabs agent');
      console.log('🔌 Disconnect reason (raw):', reason);
      console.log('🔌 Disconnect reason type:', typeof reason);
      console.log('🔌 Conversation ID was:', conversationIdRef.current);
      console.log('🎯 Disconnect occurred in Voice mode');
      
      // Check if this is a real disconnect or just a status change
      if (reason && typeof reason === 'object' && (reason as any)?.reason === 'user') {
        console.log('✅ User initiated disconnect - this is normal behavior');
        addSystemMessage('Voice conversation ended by user');
        
        // Only reset state for user-initiated disconnects
        updateSessionState({ isSessionActive: false });
        isConnectingRef.current = false;
        conversationIdRef.current = null;
        console.log('🔄 Session state reset for user disconnect');
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'timeout') {
        console.log('⏰ Connection timed out');
        addSystemMessage('Voice conversation timed out. Please try again.');
        updateSessionState({ isSessionActive: false });
        isConnectingRef.current = false;
        conversationIdRef.current = null;
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'error') {
        console.log('💥 Connection error occurred');
        addSystemMessage('Voice conversation error occurred. Please check your network and try again.');
        updateSessionState({ isSessionActive: false });
        isConnectingRef.current = false;
        conversationIdRef.current = null;
        globalState.updateState(agentId, { error: 'Connection error occurred. Please check your network and try again.' });
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'agent') {
        console.log('🤖 Agent initiated disconnect');
        addSystemMessage('Agent disconnected from voice conversation');
        updateSessionState({ isSessionActive: false });
        isConnectingRef.current = false;
        conversationIdRef.current = null;
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'network') {
        console.log('🌐 Network disconnect');
        addSystemMessage('Voice conversation network connection lost. Please check your internet connection.');
        updateSessionState({ isSessionActive: false });
        isConnectingRef.current = false;
        conversationIdRef.current = null;
        globalState.updateState(agentId, { error: 'Network connection lost. Please check your internet connection.' });
      } else {
        console.log('🔌 Unknown disconnect reason, not resetting state');
        addSystemMessage('Voice conversation status changed');
        // Don't reset state for unknown reasons to prevent premature disconnection
      }
      
      console.log('🔄 Session state after disconnect handling');
    }, [addSystemMessage, updateSessionState, agentId]),
    
    onMessage: useCallback((message: any) => {
      console.log('📨 Message received from ElevenLabs:', message);
      console.log('📨 Message source:', message.source);
      console.log('📨 Message content:', message.message);
      
      // Only process messages if we have an active session
      if (!conversationIdRef.current) {
        console.log('⚠️ Ignoring message - no active session');
        return;
      }
      
      if (message.source === 'user') {
        // User's voice input transcribed
        console.log('🎤 User voice input transcribed:', message.message);
        globalState.updateState(agentId, { currentTranscript: message.message });
        addMessage('user', message.message);
        globalState.updateState(agentId, { currentTranscript: '' });
        
        // Add system message to indicate voice input received
        addSystemMessage('Voice input received - AI agent is processing your message...');
      } else if (message.source === 'ai') {
        // AI agent response
        console.log('🤖 AI agent response received:', message.message);
        addMessage('agent', message.message);
        
        // Clear any pending voice recording status
        addSystemMessage('AI response received - voice recording ready for next input');
      } else {
        // Unknown message source
        console.log('❓ Unknown message source:', message.source);
      }
    }, [addMessage, addSystemMessage]),
    
    onError: useCallback((error: any) => {
      console.error('💥 ElevenLabs error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      console.error('💥 Error details:', errorMessage);
      addSystemMessage(`Connection disrupted: ${errorMessage}`);
      globalState.updateState(agentId, { error: errorMessage });
      updateSessionState({ isSessionActive: false });
      isConnectingRef.current = false;
    }, [addSystemMessage, updateSessionState, agentId]),
    
    onStatusChange: useCallback((status: any) => {
      console.log('📊 Status changed to:', status);
      console.log('🔄 Current session state:', { isSessionActive, conversationId: conversationIdRef.current });
      
      // Add status change messages for debugging
      // Note: status is an object with a status property, not a string
      if (status && typeof status === 'object' && 'status' in status) {
        const statusValue = (status as any).status;
        if (statusValue === 'connected') {
          console.log('🔗 Status: Connected - ElevenLabs connection established');
        } else if (statusValue === 'connecting') {
          console.log('⏳ Status: Connecting - Establishing ElevenLabs connection...');
          isConnectingRef.current = true;
        } else if (statusValue === 'disconnected') {
          console.log('🔌 Status: Disconnected - ElevenLabs connection lost');
          isConnectingRef.current = false;
        } else {
          console.log('❓ Status: Unknown -', statusValue);
        }
      } else {
        console.log('❓ Status: Unknown format -', status);
      }
    }, [isSessionActive]),
  });

  // Safely extract status and isSpeaking from conversation object
  const conversationStatus = conversation?.status;
  const conversationIsSpeaking = conversation?.isSpeaking;

  console.log('📊 Current conversation status:', conversationStatus);
  console.log('🎤 Is speaking:', conversationIsSpeaking);
  console.log('🔊 Is session active:', isSessionActive);

  // Prevent component re-mounting issues
  useEffect(() => {
    console.log('🚀 useElevenLabsStable hook mounted - auto-initialization disabled');
    
    // Cleanup function to prevent memory leaks
    return () => {
      console.log('🧹 Hook unmounting, cleaning up session');
      // Reset the hook instance flag
      // This global ref is no longer needed as state manages the hook instance
      // isConnectingRef.current = false; // This line is removed
      // conversationIdRef.current = null; // This line is removed
    };
  }, []);
  
  // Debug effect to track state changes
  useEffect(() => {
    // Get current state from global state to check for inconsistencies
    const currentState = globalState.getState(agentId);
    
    // Check if there's an inconsistent state that needs fixing
    if (!currentState.isSessionActive && currentState.status === 'connecting') {
      console.log('⚠️ Detected inconsistent state: isSessionActive=false but status=connecting');
      console.log('🔄 Fixing inconsistent state by resetting status to disconnected');
      
      // Fix the inconsistent state
      globalState.updateState(agentId, { status: 'disconnected' });
      
      // Log the corrected state
      console.log('🔍 State corrected:', { 
        isSessionActive: currentState.isSessionActive, 
        conversationId: currentState.conversationId, 
        status: 'disconnected' 
      });
    } else {
      // Log the current state if it's consistent
      console.log('🔍 State change detected:', { 
        isSessionActive: currentState.isSessionActive, 
        conversationId: currentState.conversationId, 
        status: currentState.status 
      });
    }
  }, [isSessionActive, conversationStatus]);

  // Helper function to get status value
  const getStatusValue = () => {
    try {
      // Get current state from global state
      const currentState = globalState.getState(agentId);
      
      // First, check if we have an active session with conversation ID
      if (currentState.isSessionActive && currentState.conversationId) {
        // If we have an active session, check the actual connection status
        if (conversationStatus && typeof conversationStatus === 'object' && 'status' in conversationStatus) {
          const status = (conversationStatus as any).status;
          // Only trust the status if it's connected or connecting
          if (status === 'connected' || status === 'connecting') {
            return status;
          }
        }
        // If we have an active session but status is not reliable, assume connected
        return 'connected';
      }
      
      // Check if we're in the middle of connecting (only if we're actually trying to connect)
      if (isConnectingRef.current) {
        return 'connecting';
      }
      
      // Don't trust stored status if session is not active
      // This prevents showing "connecting" when there's no active connection attempt
      if (!currentState.isSessionActive && currentState.status === 'connecting') {
        console.log('⚠️ Found stale connecting status in getStatusValue, resetting to disconnected');
        // Reset stale connecting status
        globalState.updateState(agentId, { status: 'disconnected' });
        return 'disconnected';
      }
      
      // Check if we have a conversation ID but session not active (transition state)
      if (currentState.conversationId && !currentState.isSessionActive) {
        // This is a transition state, but we should be conservative
        // Only show connecting if we're actually in the process of connecting
        if (isConnectingRef.current) {
          return 'connecting';
        } else {
          // If we have a conversation ID but no active session and not connecting, assume disconnected
          return 'disconnected';
        }
      }
      
      // Check if we have a conversation ID but status is disconnected (error state)
      if (currentState.conversationId && conversationStatus && typeof conversationStatus === 'object' && 'status' in conversationStatus) {
        const status = (conversationStatus as any).status;
        if (status === 'disconnected' || status === 'disconnecting') {
          return status;
        }
      }
      
      // Default fallback - only trust disconnected status
      if (currentState.status === 'disconnected') {
        return 'disconnected';
      }
      
      // For any other status, assume disconnected if session is not active
      return 'disconnected';
    } catch (error) {
      console.warn('⚠️ Error in getStatusValue, using fallback:', error);
      return 'disconnected';
    }
  };

  // Clear chat history function
  const clearChatHistory = useCallback(() => {
    console.log('🧹 Clearing chat history');
    // Update global state instead of local state
    globalState.updateState(agentId, { messages: [] });
    setError(null);
  }, [agentId]);

  // Function to get signed URL for private agents
  const getSignedUrl = async (agentId: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    
    console.log('🔑 API Key available:', !!apiKey);
    console.log('🤖 Agent ID:', agentId);
    
    if (!apiKey) {
      throw new Error('No API key configured. Please set VITE_ELEVENLABS_API_KEY for private agents.');
    }

    const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`;
    console.log('🌐 Requesting signed URL from:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('API key is invalid or expired. Please check your ElevenLabs API key.');
        } else if (response.status === 404) {
          throw new Error('Agent not found. Please check your agent ID and ensure the agent exists in your ElevenLabs account.');
        } else if (response.status === 403) {
          throw new Error('Access denied. This agent might be private or you might not have permission to access it.');
        } else {
          throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Signed URL response:', { ...data, signed_url: data.signed_url ? '[URL_RECEIVED]' : 'MISSING' });
      
      if (!data.signed_url) {
        throw new Error('No signed_url in response. The API response format might have changed.');
      }

      return data.signed_url;
    } catch (fetchError) {
      console.error('🚨 Fetch error:', fetchError);
      
      // Provide more specific error information
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach ElevenLabs API. Please check your internet connection.');
      }
      
      throw fetchError;
    }
  };

  // Start conversation session (voice only)
  const startSession = async () => {
    try {
      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current || isSessionActive) {
        console.log('ℹ️ Already connecting or session active, skipping startSession call');
        return;
      }
      
      console.log('🚀 Starting voice session');
      console.log('🔄 Session state before start:', { isSessionActive, conversationId: conversationIdRef.current, status: getStatusValue() });
      
      // Reset any stale status before starting
      const currentState = globalState.getState(agentId);
      if (currentState.status === 'connecting' && !currentState.isSessionActive) {
        console.log('⚠️ Resetting stale connecting status before starting new session');
        globalState.updateState(agentId, { status: 'disconnected' });
      }
      
      // Set connecting flag to prevent multiple calls
      isConnectingRef.current = true;
      
      // Check if we're in the middle of a mode switch
      if (conversationIdRef.current) {
        console.log('⚠️ Previous session ID still exists, cleaning up...');
        conversationIdRef.current = null;
      }
      
      // Validate agent ID
      if (!isValidAgentId) {
        const errorMsg = 'Invalid agent ID configuration';
        console.error('❌', errorMsg);
        addSystemMessage(errorMsg);
        setError(errorMsg);
        isConnectingRef.current = false;
        return;
      }
      
      console.log('🔑 Checking API key availability...');
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      console.log('🔑 API Key available:', !!apiKey);
      
      if (!apiKey) {
        console.warn('⚠️ No API key found. Attempting public agent connection...');
        // For public agents, we might not need an API key
        // But let's still try to proceed
      }
      
      // Request microphone permission for voice mode
      console.log('🎤 Requesting microphone permission for voice mode...');
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');
      } catch (micError) {
        console.error('❌ Microphone permission denied:', micError);
        const errorMsg = 'Microphone access denied. Please allow microphone access and try again.';
        addSystemMessage(errorMsg);
        setError(errorMsg);
        isConnectingRef.current = false;
        return;
      }
      
      console.log('🔗 Getting signed URL for connection...');
      let signedUrl: string;
      try {
        signedUrl = await getSignedUrl(agentId);
        console.log('✅ Got signed URL, attempting connection...');
        console.log('🔗 Signed URL length:', signedUrl.length);
        console.log('🔗 Signed URL starts with:', signedUrl.substring(0, 50) + '...');
      } catch (urlError) {
        console.error('❌ Failed to get signed URL:', urlError);
        const errorMsg = 'Failed to get connection URL. Please check your agent configuration and API key.';
        addSystemMessage(errorMsg);
        setError(errorMsg);
        isConnectingRef.current = false;
        return;
      }
      
      console.log('📞 Conversation status before connection:', getStatusValue());
      console.log('🔗 Attempting to start ElevenLabs session...');
      
      // Start the session
      console.log('🔗 Starting ElevenLabs session with signed URL...');
      console.log('🔗 Session configuration:', { 
        signedUrl: signedUrl.substring(0, 50) + '...', 
        connectionType: 'websocket',
        mode: 'Voice',
        agentId 
      });
      
      const conversationId = await conversation.startSession({ 
        signedUrl,
        // Add additional configuration for better voice support
        connectionType: 'websocket', // Ensure WebSocket connection for real-time voice
      });
      console.log('✅ Session started with ID:', conversationId);
      
      // Update local state after successful session start
      conversationIdRef.current = conversationId;
      updateSessionState({
        isSessionActive: true,
        conversationId: conversationId,
        error: null
      });
      
      // Add success message
      addSystemMessage('Voice session started successfully - Waiting for ElevenLabs connection...');
      
      // Wait for ElevenLabs connection to be established
      console.log('⏳ Waiting for ElevenLabs connection to be established...');
      
      // Check connection status after a short delay
      setTimeout(() => {
        const currentStatus = getStatusValue();
        console.log('🔍 Connection status check after session start:', currentStatus);
        
        if (currentStatus === 'connected') {
          console.log('✅ ElevenLabs connection established successfully');
          addSystemMessage('Voice connection established - Ready for conversation');
          
          // Don't auto-start voice recording - let user control it
          console.log('🎤 Voice mode connected - user can start voice recording when ready');
          addSystemMessage('Voice connection ready - click "Start Voice" to begin recording');
        } else if (currentStatus === 'connecting') {
          console.log('⏳ ElevenLabs still connecting, waiting...');
          addSystemMessage('Voice connection in progress - please wait...');
          
          // Wait a bit longer for connection to establish
          setTimeout(() => {
            const finalStatus = getStatusValue();
            console.log('🔍 Final connection status check:', finalStatus);
            
            if (finalStatus === 'connected') {
              console.log('✅ ElevenLabs connection established on second check');
              addSystemMessage('Voice connection established - Ready for conversation');
            } else if (finalStatus === 'connecting') {
              console.log('⏳ Still connecting, but this is normal for some connections');
              addSystemMessage('Voice connection in progress - this may take a moment');
            } else {
              // Only mark as failed if we're sure it's not working
              console.log('❌ Connection appears to have failed');
              const errorMsg = 'Voice connection failed - please try again';
              addSystemMessage(errorMsg);
              updateSessionState({
                error: errorMsg,
                isSessionActive: false,
                conversationId: null
              });
              isConnectingRef.current = false;
            }
          }, 3000); // Wait another 3 seconds
          
        } else if (currentStatus === 'unknown') {
          // Status is unknown, but we have a conversation ID, so connection might be working
          console.log('❓ Status is unknown, but checking if connection is actually working...');
          
          // If we have a conversation ID and no error, assume connection is working
          if (conversationIdRef.current && !error) {
            console.log('✅ Connection appears to be working despite unknown status');
            addSystemMessage('Voice connection established - Ready for conversation');
            addSystemMessage('Voice connection ready - click "Start Voice" to begin recording');
          } else if (conversationIdRef.current) {
            // We have a conversation ID, so the connection is likely working
            console.log('✅ Connection appears to be working with conversation ID:', conversationIdRef.current);
            addSystemMessage('Voice connection established - Ready for conversation');
            addSystemMessage('Voice connection ready - click "Start Voice" to begin recording');
          } else {
            console.log('❌ ElevenLabs connection failed or timed out');
            const errorMsg = 'Voice connection failed - please try again';
            addSystemMessage(errorMsg);
            updateSessionState({
              error: errorMsg,
              isSessionActive: false,
              conversationId: null
            });
            isConnectingRef.current = false;
          }
        } else if (currentStatus === 'disconnected' || currentStatus === 'disconnecting') {
          // Only mark as failed if we're sure the connection is actually broken
          if (!conversationIdRef.current) {
            console.log('❌ Connection failed - no conversation ID');
            const errorMsg = 'Voice connection failed - please try again';
            addSystemMessage(errorMsg);
            updateSessionState({
              error: errorMsg,
              isSessionActive: false,
              conversationId: null
            });
            isConnectingRef.current = false;
          } else {
            console.log('⚠️ Status shows disconnected but we have conversation ID - connection may still be working');
            addSystemMessage('Voice connection status unclear - checking connection...');
          }
        } else {
          // For any other status, be conservative and assume it's working if we have a conversation ID
          if (conversationIdRef.current) {
            console.log('✅ Assuming connection is working based on conversation ID');
            addSystemMessage('Voice connection established - Ready for conversation');
            addSystemMessage('Voice connection ready - click "Start Voice" to begin recording');
          } else {
            console.log('❌ Connection failed - no conversation ID and unclear status');
            const errorMsg = 'Voice connection failed - please try again';
            addSystemMessage(errorMsg);
            updateSessionState({
              error: errorMsg,
              isSessionActive: false,
              conversationId: null
            });
            isConnectingRef.current = false;
          }
        }
      }, 5000); // Wait 5 seconds for connection to establish
      
      console.log('🎉 Session state updated, isSessionActive:', true);
      console.log('🎯 Session started in Voice mode');
      console.log('🔄 Final session state:', { isSessionActive: true, conversationId, status: getStatusValue() });
      
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('❌ Error stack:', error.stack);
      }
      
      // Use the new state management function
      resetSessionState();
      
      // Provide different messages based on error type
      let errorMsg = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('microphone')) {
          errorMsg = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (error.message.includes('API key')) {
          errorMsg = 'API key configuration issue. Please check your ElevenLabs API key.';
        } else if (error.message.includes('signed URL')) {
          errorMsg = 'Failed to get connection URL. Please check your agent configuration.';
        } else if (error.message.includes('permission')) {
          errorMsg = 'Permission denied. Please check your browser settings and try again.';
        } else if (error.message.includes('network')) {
          errorMsg = 'Network error occurred. Please check your internet connection and try again.';
        } else {
          errorMsg = `Failed to start voice session: ${error.message}`;
        }
      } else {
        errorMsg = `Failed to start voice session: ${String(error)}`;
      }
      
      // Set error state and add system message
      updateSessionState({ error: errorMsg });
      addSystemMessage(errorMsg);
      
      console.error('❌ Session start failed with error:', errorMsg);
    }
  };

  // End conversation session - only called when user explicitly clicks Stop Voice
  const endSession = async () => {
    try {
      console.log('🛑 User requested to end session - cleaning up state');
      
      // Reset connecting flag
      isConnectingRef.current = false;
      
      // End the session through ElevenLabs
      if (conversationIdRef.current) {
        try {
          await conversation.endSession();
          console.log('✅ Session ended through ElevenLabs');
        } catch (endSessionError) {
          // This is not a critical error - user requested to stop, so we continue
          console.log('⚠️ ElevenLabs endSession failed, but continuing with cleanup as user requested stop:', endSessionError);
        }
      }
      
      // Clear all session state as user explicitly requested to stop
      // This is the only place where we actively clean up session state
      globalState.updateState(agentId, {
        isSessionActive: false,
        conversationId: null,
        status: 'disconnected',
        isSpeaking: false,
        error: null, // Clear any previous errors
        currentTranscript: ''
      });
      
      // Reset local refs
      conversationIdRef.current = null;
      
      // Always show success message for user-initiated stop
      addSystemMessage('Voice session ended by user request');
      console.log('✅ Session ended successfully by user request');
      
    } catch (error) {
      console.error('❌ Unexpected error during session end:', error);
      
      // Even if there's an unexpected error, still clear the state as user requested
      // This ensures the user's intent (to stop) is always respected
      globalState.updateState(agentId, {
        isSessionActive: false,
        conversationId: null,
        status: 'disconnected',
        isSpeaking: false,
        error: null, // Clear any errors
        currentTranscript: ''
      });
      
      // Reset local refs
      conversationIdRef.current = null;
      
      // Still show success message since user wanted to stop
      addSystemMessage('Voice session ended by user request');
      console.log('✅ Session ended by user request (despite unexpected error)');
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      console.log('🎤 Starting voice recording...');
      
      if (!isSessionActive || !conversationIdRef.current) {
        console.log('⚠️ No active session, cannot start voice recording');
        addSystemMessage('Cannot start voice recording - no active session');
        return;
      }
      
      // The useConversation hook handles voice recording automatically
      // We just need to ensure the session is active
      console.log('✅ Voice recording should be active now');
      addSystemMessage('Voice recording started - speak your message now');
      
    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      addSystemMessage(`Failed to start voice recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Stop voice recording
  const stopVoiceRecording = async () => {
    try {
      console.log('🛑 Stopping voice recording...');
      
      if (!isSessionActive || !conversationIdRef.current) {
        console.log('⚠️ No active session, cannot stop voice recording');
        return;
      }
      
      // The useConversation hook handles voice recording automatically
      console.log('✅ Voice recording stopped');
      addSystemMessage('Voice recording stopped');
      
    } catch (error) {
      console.error('❌ Failed to stop voice recording:', error);
      addSystemMessage(`Failed to stop voice recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Add function to return to homepage
  const returnToHomepage = useCallback(() => {
    console.log('🏠 Returning to homepage');
    console.log('🔄 Current state before cleanup:', { isSessionActive, conversationId: conversationIdRef.current });
    
    // If there's an active session, end it first
    if (isSessionActive) {
      console.log('🛑 Ending active session before returning to homepage');
      endSession().then(() => {
        console.log('✅ Session ended, proceeding with cleanup');
        performHomepageCleanup();
      }).catch((error) => {
        console.error('❌ Error ending session during homepage return:', error);
        // Even if ending fails, still perform cleanup
        performHomepageCleanup();
      });
    } else {
      // No active session, just perform cleanup
      performHomepageCleanup();
    }
  }, [isSessionActive, endSession]);

  // Helper function to perform homepage cleanup
  const performHomepageCleanup = () => {
    console.log('🧹 Performing homepage cleanup...');
    
    // Reset all states
    // Update global state instead of local state
    globalState.updateState(agentId, {
      messages: [],
      currentTranscript: '',
      showChatHistory: false,
      error: null,
      isSessionActive: false,
      conversationId: null,
      status: 'disconnected',
      isSpeaking: false
    });
    
    // Ensure conversation state is clean
    if (conversationIdRef.current) {
      console.log('🧹 Cleaning up conversation ID reference');
      conversationIdRef.current = null;
    }
    
    // Reset connecting flag
    isConnectingRef.current = false;
    
    console.log('✅ Successfully returned to homepage');
    console.log('🔄 Final state after cleanup:', { isSessionActive: false, conversationId: null });
  };

  // Cleanup on unmount
  useEffect(() => {
    let cleanupTimeout: number | null = null;
    
    return () => {
      // Only cleanup if we're actually unmounting the component, not just re-rendering
      if (conversationIdRef.current || isSessionActive) {
        console.log('🧹 Hook unmounting, checking if real unmount...');
        
        // Check if this is a real unmount or just a re-render
        // We'll use a timeout to distinguish between the two
        cleanupTimeout = window.setTimeout(() => {
          // If we still have the same conversation ID after a short delay,
          // this was likely just a re-render, not a real unmount
          if (conversationIdRef.current) {
            console.log('🔄 This appears to be a re-render, not a real unmount - preserving session');
            return;
          }
          
          console.log('🧹 Real unmount detected, cleaning up session');
          try {
            // Try to gracefully end the session
            if (isSessionActive) {
              conversation.endSession();
            }
          } catch (error) {
            console.log('🧹 Cleanup endSession error (safe to ignore):', error);
          } finally {
            // Ensure state is reset
            conversationIdRef.current = null;
            isConnectingRef.current = false;
          }
        }, 100); // 100ms delay to distinguish re-render from unmount
      }
    };
  }, [conversation, isSessionActive]);

  // Additional cleanup effect for timeout
  useEffect(() => {
    let cleanupTimeout: number | null = null;
    
    return () => {
      // Clear any pending cleanup timeout
      if (cleanupTimeout) {
        window.clearTimeout(cleanupTimeout);
      }
    };
  }, []);

  // Initialize hook - NO AUTO-INITIALIZATION
  useEffect(() => {
    console.log('🚀 useElevenLabsStable hook mounted - auto-initialization disabled');
    console.log('🔧 ElevenLabs Configuration Check:');
    console.log('🔧 Agent ID:', agentId);
    console.log('🔧 Valid Agent ID:', isValidAgentId);
    console.log('🔧 API Key available:', !!import.meta.env.VITE_ELEVENLABS_API_KEY);
    console.log('🔧 Conversation hook status:', conversation);
    console.log('ℹ️ Session will not start automatically - user must click Start Voice');
    
    // No automatic session start - let user control when to start
    return () => {
      console.log('🧹 useElevenLabsStable hook unmounting');
    };
  }, []); // Only run once on mount

  // Get status display info
  const getStatusInfo = () => {
    const statusValue = getStatusValue();
    console.log('🔍 Status check - status:', statusValue, 'isSessionActive:', isSessionActive, 'isSpeaking:', conversationIsSpeaking, 'mode: Voice');
    
    // Check if we're in the middle of a mode switch
    if (conversationIdRef.current && !isSessionActive) {
      return { text: 'Switching to voice mode...', color: 'text-yellow-400' };
    }
    
    // Check if ElevenLabs is connected and session is active
    if (statusValue === 'connected' && isSessionActive) {
      if (conversationIsSpeaking) {
        return { text: 'Agent is speaking...', color: 'text-green-400' };
      }
      return { text: 'Agent is listening', color: 'text-blue-400' };
    }
    
    // Check if ElevenLabs is connecting
    if (statusValue === 'connecting' || isConnectingRef.current) {
      return { text: 'Connecting to voice chat...', color: 'text-yellow-400' };
    }
    
    // Check if ElevenLabs is connected but session not active
    if (statusValue === 'connected' && !isSessionActive) {
      return { text: 'Connected but voice session inactive', color: 'text-orange-400' };
    }
    
    // Check if we're initializing
    if (!isSessionActive && !conversationIdRef.current) {
      return { text: 'Initializing voice chat...', color: 'text-blue-400' };
    }
    
    // Check if we have an active session but ElevenLabs is disconnected
    if (isSessionActive && statusValue === 'disconnected') {
      return { text: 'Session active but connection lost - attempting to reconnect...', color: 'text-red-400' };
    }
    
    return { text: 'Click Start Chat to begin voice conversation', color: 'text-gray-400' };
  };

  // Return state, actions, and loading state
  const state: ElevenLabsHookState = {
    messages: globalState.getState(agentId).messages || [],
    isSessionActive: globalState.getState(agentId).isSessionActive,
    currentTranscript: globalState.getState(agentId).currentTranscript,
    conversationId: conversationIdRef.current,
    status: getStatusValue(),
    isSpeaking: conversationIsSpeaking,
    error: globalState.getState(agentId).error
  };

  const actions: ElevenLabsHookActions = {
    addMessage,
    addSystemMessage,
    clearChatHistory,
    startSession,
    endSession,
    startVoiceRecording,
    stopVoiceRecording,
    returnToHomepage,
    setShowChatHistory
  };

  return [state, actions, showChatHistory];
};
