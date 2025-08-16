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

export const useElevenLabsStable = (agentId: string): [ElevenLabsHookState, ElevenLabsHookActions, boolean] => {
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
  
  console.log('🚀 useElevenLabsStable hook initialized with agentId:', agentId);

  // Helper function to add messages - use useCallback to prevent recreation
  const addMessage = useCallback((type: 'user' | 'agent' | 'system', content: string) => {
    console.log('💬 Adding message:', { type, content });
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    console.log('🔔 Adding system message:', content);
    const systemMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      content: `✨ ${content}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  // Initialize ElevenLabs conversation hook with stable callbacks
  const conversation = useConversation({
    onConnect: useCallback(() => {
      console.log('✅ Connected to ElevenLabs agent');
      console.log('🔗 Connection established, updating session state');
      console.log('🎯 Current mode: Voice');
      console.log('🔄 Session state before update:', { isSessionActive, conversationId: conversationIdRef.current });
      
      // Always mark session as active when connected, regardless of conversation ID
      // The conversation ID will be set later in startSession
      console.log('✅ Connection established, marking session as active');
      setIsSessionActive(true);
      setError(null);
      isConnectingRef.current = false;
      
      // Add connection message for voice mode
      addSystemMessage('ElevenLabs connection established - Voice conversation ready');
      
      // Ensure voice recording is ready
      console.log('🎤 Voice mode connected - voice recording should be active');
      addSystemMessage('Voice recording is active - speak naturally to interact with the AI');
      
      console.log('🎉 Session state updated to active on connection');
      console.log('🔄 Final session state after connection:', { isSessionActive: true, conversationId: conversationIdRef.current });
    }, [addSystemMessage]),
    
    onDisconnect: useCallback((reason: any) => {
      console.log('🔌 Disconnected from ElevenLabs agent');
      console.log('🔌 Disconnect reason (raw):', reason);
      console.log('🔌 Disconnect reason type:', typeof reason);
      console.log('🔌 Conversation ID was:', conversationIdRef.current);
      console.log('🔌 Session was active:', isSessionActive);
      console.log('🎯 Disconnect occurred in Voice mode');
      
      // Check if this is a real disconnect or just a status change
      if (reason && typeof reason === 'object' && (reason as any)?.reason === 'user') {
        console.log('✅ User initiated disconnect - this is normal behavior');
        addSystemMessage('Voice conversation ended by user');
        
        // Only reset state for user-initiated disconnects
        setIsSessionActive(false);
        isConnectingRef.current = false;
        conversationIdRef.current = null;
        console.log('🔄 Session state reset for user disconnect');
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'timeout') {
        console.log('⏰ Connection timed out');
        addSystemMessage('Voice conversation timed out. Please try again.');
        setIsSessionActive(false);
        isConnectingRef.current = false;
        conversationIdRef.current = null;
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'error') {
        console.log('💥 Connection error occurred');
        addSystemMessage('Voice conversation error occurred. Please check your network and try again.');
        setIsSessionActive(false);
        isConnectingRef.current = false;
        conversationIdRef.current = null;
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'agent') {
        console.log('🤖 Agent initiated disconnect');
        addSystemMessage('Agent disconnected from voice conversation');
        setIsSessionActive(false);
        isConnectingRef.current = false;
        conversationIdRef.current = null;
      } else if (reason && typeof reason === 'object' && (reason as any)?.reason === 'network') {
        console.log('🌐 Network disconnect');
        addSystemMessage('Voice conversation network connection lost. Please check your internet connection.');
        setIsSessionActive(false);
        isConnectingRef.current = false;
        conversationIdRef.current = null;
      } else {
        console.log('🔌 Unknown disconnect reason, not resetting state');
        addSystemMessage('Voice conversation status changed');
        // Don't reset state for unknown reasons to prevent premature disconnection
      }
      
      console.log('🔄 Session state after disconnect handling:', { isSessionActive, conversationId: conversationIdRef.current });
    }, [addSystemMessage, isSessionActive]),
    
    onMessage: useCallback((message: any) => {
      console.log('📨 Message received from ElevenLabs:', message);
      console.log('📨 Message source:', message.source);
      console.log('📨 Message content:', message.message);
      console.log('📨 Current session state:', { isSessionActive, conversationId: conversationIdRef.current });
      
      // Only process messages if we have an active session
      if (!conversationIdRef.current) {
        console.log('⚠️ Ignoring message - no active session');
        return;
      }
      
      if (message.source === 'user') {
        // User's voice input transcribed
        console.log('🎤 User voice input transcribed:', message.message);
        setCurrentTranscript(message.message);
        addMessage('user', message.message);
        setCurrentTranscript('');
        
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
        addMessage('system', `Received message from ${message.source}: ${message.message}`);
      }
    }, [addMessage, addSystemMessage]),
    
    onError: useCallback((error: unknown) => {
      console.error('❌ Conversation error (full object):', error);
      console.error('❌ Error type:', typeof error);
      
      let errorMessage = 'Connection failed';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.error) {
          errorMessage = errorObj.error;
        } else {
          errorMessage = JSON.stringify(error);
        }
        
        if (errorObj.stack) {
          console.error('❌ Error stack:', errorObj.stack);
        }
      }
      
      console.log('❌ Processed error message:', errorMessage);
      addSystemMessage(`Connection disrupted: ${errorMessage}`);
      setError(errorMessage);
      setIsSessionActive(false);
      isConnectingRef.current = false;
    }, [addSystemMessage]),
    
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

  const { status, isSpeaking } = conversation;

  console.log('📊 Current conversation status:', status);
  console.log('🎤 Is speaking:', isSpeaking);
  console.log('🔊 Is session active:', isSessionActive);

  // Prevent component re-mounting issues
  useEffect(() => {
    console.log('🚀 useElevenLabsStable hook mounted - auto-initialization disabled');
    
    // Cleanup function to prevent memory leaks
    return () => {
      console.log('🧹 Hook unmounting, cleaning up session');
      // Don't automatically end session on unmount
      // Let the user control when to end the session
    };
  }, []);

  // Helper function to get status value
  const getStatusValue = () => {
    return status && typeof status === 'object' && 'status' in status ? (status as any).status : 'unknown';
  };

  // Clear chat history function
  const clearChatHistory = useCallback(() => {
    console.log('🧹 Clearing chat history');
    setMessages([]);
    setError(null);
  }, []);

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
      console.log('🔄 Session state before start:', { isSessionActive, conversationId: conversationIdRef.current, status });
      
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
      
      console.log('📞 Conversation status before connection:', status);
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
      setIsSessionActive(true);
      setError(null);
      
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
        } else {
          console.log('❌ ElevenLabs connection failed or timed out');
          const errorMsg = 'Voice connection failed - please try again';
          addSystemMessage(errorMsg);
          setError(errorMsg);
          // Reset session state on connection failure
          setIsSessionActive(false);
          conversationIdRef.current = null;
          isConnectingRef.current = false;
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
      
      // Ensure state is reset on error
      setIsSessionActive(false);
      conversationIdRef.current = null;
      isConnectingRef.current = false;
      
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
      }
      
      addSystemMessage(errorMsg);
      setError(errorMsg);
    }
  };

  // End conversation session
  const endSession = async () => {
    try {
      console.log('🛑 Ending session...');
      
      // Reset connecting flag
      isConnectingRef.current = false;
      
      // End the session through ElevenLabs
      if (conversationIdRef.current) {
        await conversation.endSession();
        console.log('✅ Session ended through ElevenLabs');
      }
      
      // Reset local state
      setIsSessionActive(false);
      conversationIdRef.current = null;
      setCurrentTranscript('');
      setError(null);
      
      addSystemMessage('Voice session ended');
      console.log('✅ Session ended successfully');
      
    } catch (error) {
      console.error('❌ Failed to end session:', error);
      
      // Even if ending fails, reset local state
      setIsSessionActive(false);
      conversationIdRef.current = null;
      isConnectingRef.current = false;
      setError(null);
      
      addSystemMessage('Voice session ended (with errors)');
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
    setMessages([]);
    setCurrentTranscript('');
    setShowChatHistory(false);
    setError(null);
    
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
    return () => {
      if (conversationIdRef.current || isSessionActive) {
        console.log('🧹 Hook unmounting, cleaning up session');
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
      }
    };
  }, [conversation, isSessionActive]);

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
    console.log('🔍 Status check - status:', statusValue, 'isSessionActive:', isSessionActive, 'isSpeaking:', isSpeaking, 'mode: Voice');
    
    // Check if we're in the middle of a mode switch
    if (conversationIdRef.current && !isSessionActive) {
      return { text: 'Switching to voice mode...', color: 'text-yellow-400' };
    }
    
    // Check if ElevenLabs is connected and session is active
    if (statusValue === 'connected' && isSessionActive) {
      if (isSpeaking) {
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
    messages,
    isSessionActive,
    currentTranscript,
    conversationId: conversationIdRef.current,
    status: getStatusValue(),
    isSpeaking,
    error
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
