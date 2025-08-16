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

export const useElevenLabs = (agentId: string): [ElevenLabsHookState, ElevenLabsHookActions, boolean] => {
  // State management - removed isTextMode
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const conversationIdRef = useRef<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Agent ID validation
  const isValidAgentId = agentId && agentId.startsWith('agent_');
  
  console.log('🚀 useElevenLabs hook initialized with agentId:', agentId);

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
      
      // Only update session state if we have a valid conversation ID
      if (conversationIdRef.current) {
        console.log('✅ Valid conversation ID found, marking session as active');
        setIsSessionActive(true);
        setError(null);
        
        // Add connection message for voice mode
        addSystemMessage('ElevenLabs connection established - Voice conversation ready');
        
        // Ensure voice recording is ready
        console.log('🎤 Voice mode connected - voice recording should be active');
        addSystemMessage('Voice recording is active - speak naturally to interact with the AI');
        
        console.log('🎉 Session state updated to active on connection');
      } else {
        console.log('⚠️ No conversation ID found, connection might be premature');
        addSystemMessage('Connection established but session not ready - please wait...');
      }
      
      console.log('🔄 Final session state after connection:', { isSessionActive: true, conversationId: conversationIdRef.current });
    }, [addSystemMessage, isSessionActive]),
    
    onDisconnect: useCallback((reason: any) => {
      console.log('🔌 Disconnected from ElevenLabs agent');
      console.log('🔌 Disconnect reason (raw):', reason);
      console.log('🔌 Disconnect reason type:', typeof reason);
      console.log('🔌 Conversation ID was:', conversationIdRef.current);
      console.log('🔌 Session was active:', isSessionActive);
      console.log('🎯 Disconnect occurred in Voice mode');
      
      // Always update session state when disconnected
      setIsSessionActive(false);
      console.log('🔄 Session state updated to inactive on disconnect');
      
      if (reason && typeof reason === 'object') {
        const reasonStr = JSON.stringify(reason, null, 2);
        console.log('🔌 Detailed disconnect reason:', reasonStr);
        
        const disconnectReason = (reason as any)?.reason;
        if (disconnectReason === 'user') {
          console.log('✅ User initiated disconnect - this is normal behavior');
          addSystemMessage('Voice conversation ended by user');
        } else if (disconnectReason === 'timeout') {
          console.log('⏰ Connection timed out');
          addSystemMessage('Voice conversation timed out. Please try again.');
        } else if (disconnectReason === 'error') {
          console.log('💥 Connection error occurred');
          addSystemMessage('Voice conversation error occurred. Please check your network and try again.');
        } else if (disconnectReason === 'agent') {
          console.log('🤖 Agent initiated disconnect');
          addSystemMessage('Agent disconnected from voice conversation');
        } else if (disconnectReason === 'network') {
          console.log('🌐 Network disconnect');
          addSystemMessage('Voice conversation network connection lost. Please check your internet connection.');
        } else {
          console.log('🔌 Unknown disconnect reason:', disconnectReason);
          addSystemMessage(`Voice conversation disconnected: ${reasonStr}`);
        }
      } else if (typeof reason === 'string') {
        console.log('🔌 String disconnect reason:', reason);
        if (reason === 'user') {
          console.log('✅ User initiated disconnect - this is normal behavior');
          addSystemMessage('Voice conversation ended by user');
        } else if (reason === 'timeout') {
          addSystemMessage('Voice conversation timed out. Please try again.');
        } else if (reason === 'error') {
          addSystemMessage('Voice conversation error occurred. Please check your network and try again.');
        } else {
          addSystemMessage(`Voice conversation disconnected: ${reason}`);
        }
      } else {
        console.log('🔌 Unknown disconnect reason type');
        addSystemMessage('Voice conversation disconnected (unknown reason)');
      }
      
      // Clear conversation ID reference
      conversationIdRef.current = null;
      console.log('🧹 Conversation ID reference cleared');
      
      // Offer to reconnect for unexpected disconnects
      if (reason && typeof reason === 'object' && (reason as any)?.reason !== 'user') {
        console.log('🔄 Unexpected disconnect in voice mode, offering reconnection...');
        addSystemMessage('Voice connection lost unexpectedly. Click "Start Recording" to reconnect.');
      }
    }, [addSystemMessage, isSessionActive]),
    
    onMessage: useCallback((message: any) => {
      console.log('📨 Message received from ElevenLabs:', message);
      console.log('📨 Message source:', message.source);
      console.log('📨 Message content:', message.message);
      console.log('📨 Current session state:', { isSessionActive, conversationId: conversationIdRef.current });
      
      // Only process messages if we have an active session
      if (!isSessionActive || !conversationIdRef.current) {
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
    }, [isSessionActive, addMessage, addSystemMessage]),
    
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
        } else if (statusValue === 'disconnected') {
          console.log('🔌 Status: Disconnected - ElevenLabs connection lost');
        } else {
          console.log('❓ Status: Unknown -', statusValue);
        }
      } else {
        console.log('❓ Status: Unknown format -', status);
      }
    }, []),
  });

  const { status, isSpeaking } = conversation;

  console.log('📊 Current conversation status:', status);
  console.log('🎤 Is speaking:', isSpeaking);
  console.log('🔊 Is session active:', isSessionActive);

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
    
    // For public agents, we might not need an API key
    if (!apiKey) {
      console.warn('⚠️ No API key found. This might work for public agents, but private agents require an API key.');
      
      // Try to construct a direct URL for public agents
      // Note: This is a fallback and might not work for all agents
      const publicUrl = `https://api.elevenlabs.io/v1/convai/conversation/start?agent_id=${agentId}`;
      console.log('🌐 Attempting public agent connection with URL:', publicUrl);
      
      // For now, we'll still try to get a signed URL, but with a more informative error
      throw new Error('No API key configured. Public agents might work without an API key, but this requires additional configuration. Please set VITE_ELEVENLABS_API_KEY for reliable agent connections.');
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
      console.log('🚀 Starting voice session');
      console.log('🔄 Session state before start:', { isSessionActive, conversationId: conversationIdRef.current, status });
      
      // Check if session is already active or connecting
      if (isSessionActive || getStatusValue() === 'connecting') {
        console.log('ℹ️ Session already active or connecting, skipping startSession call');
        return;
      }
      
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
        }
      }, 2000); // Wait 2 seconds for connection to establish
      
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
      
      addSystemMessage(errorMsg);
      setError(errorMsg);
    }
  };

  // End conversation session
  const endSession = useCallback(async () => {
    try {
      console.log('🛑 Ending voice session...');
      console.log('🔄 Session state before end:', { isSessionActive, conversationId: conversationIdRef.current });
      
      // Update local state first to avoid duplicate calls
      if (!isSessionActive) {
        console.log('ℹ️ Session already inactive, skipping endSession call');
        return;
      }
      
      // Mark session as ending to prevent onDisconnect from adding duplicate messages
      setIsSessionActive(false);
      console.log('🔄 Session marked as ending, calling ElevenLabs endSession...');
      
      // Call ElevenLabs endSession
      await conversation.endSession();
      
      // Update remaining local state
      conversationIdRef.current = null;
      setCurrentTranscript('');
      setError(null);
      
      console.log('✅ Session ended successfully');
      console.log('🔄 Session state after end:', { isSessionActive: false, conversationId: null });
      
      // Add end message
      addSystemMessage('Voice conversation ended by user');
      
    } catch (error) {
      console.error('❌ Failed to end session:', error);
      
      // Even if ElevenLabs call fails, ensure local state is correct
      setIsSessionActive(false);
      conversationIdRef.current = null;
      setCurrentTranscript('');
      
      console.log('🔄 Session state reset due to error:', { isSessionActive: false, conversationId: null });
      
      // Add error message
      if (error instanceof Error) {
        addSystemMessage(`Session cleanup error: ${error.message}`);
      } else {
        addSystemMessage('Session cleanup error occurred');
      }
    }
  }, [isSessionActive, conversation, addSystemMessage]);

  // Voice recording and sending functions
  const startVoiceRecording = useCallback(async () => {
    if (!isSessionActive) {
      console.log('⚠️ Cannot start voice recording: session not active');
      return;
    }

    try {
      console.log('🎤 Starting voice recording...');
      
      // Check if we have microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted, starting recording...');
      
      // Add system message to indicate recording
      addSystemMessage('Voice recording started - speak your message now');
      
      // Store the stream for later use
      (window as any).currentAudioStream = stream;
      
      // In ElevenLabs, voice recording is typically handled automatically by the conversation hook
      // The user just needs to speak, and the hook will transcribe and send the message
      console.log('🎙️ Voice recording active - speak naturally, ElevenLabs will handle the rest');
      
      // Add a helpful message about how to use voice mode
      addSystemMessage('Speak naturally - ElevenLabs will automatically transcribe your voice and send it to the AI agent');
      
    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      addSystemMessage('Failed to start voice recording. Please check microphone permissions.');
    }
  }, [isSessionActive, addSystemMessage]);

  const stopVoiceRecording = useCallback(async () => {
    if (!isSessionActive) {
      console.log('⚠️ Cannot stop voice recording: session not active');
      return;
    }

    try {
      console.log('🛑 Stopping voice recording...');
      
      // Stop the audio stream if it exists
      if ((window as any).currentAudioStream) {
        const tracks = (window as any).currentAudioStream.getTracks();
        tracks.forEach((track: MediaStreamTrack) => track.stop());
        (window as any).currentAudioStream = null;
        console.log('✅ Audio stream stopped');
      }
      
      // Add system message to indicate recording stopped
      addSystemMessage('Voice recording stopped - waiting for AI response...');
      
      console.log('🎙️ Voice recording stopped - ElevenLabs will process your message');
      
    } catch (error) {
      console.error('❌ Failed to stop voice recording:', error);
      addSystemMessage('Failed to stop voice recording.');
    }
  }, [isSessionActive, addSystemMessage]);

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
        }
      }
    };
  }, [conversation, isSessionActive]);

  // Initialize default session when hook mounts - REMOVED AUTO-INITIALIZATION
  // This was causing infinite reconnection loops
  // Users should manually start sessions instead
  useEffect(() => {
    console.log('🚀 useElevenLabs hook mounted - auto-initialization disabled');
    console.log('🔧 ElevenLabs Configuration Check:');
    console.log('🔧 Agent ID:', agentId);
    console.log('🔧 Valid Agent ID:', isValidAgentId);
    console.log('🔧 API Key available:', !!import.meta.env.VITE_ELEVENLABS_API_KEY);
    console.log('🔧 Conversation hook status:', conversation);
    console.log('ℹ️ Session will not start automatically - user must click Start Voice');
    
    // No automatic session start - let user control when to start
    return () => {
      console.log('🧹 useElevenLabs hook unmounting');
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
    if (statusValue === 'connecting') {
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
