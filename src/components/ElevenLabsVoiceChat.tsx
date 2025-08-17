import React from 'react';
import { Mic, MicOff, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useElevenLabsStable } from '../hooks/elevenlabhook-stable';

interface ElevenLabsVoiceChatProps {
  agentId?: string;
  className?: string;
  onVoiceModeChange?: (isVoice: boolean) => void;
}

const ElevenLabsVoiceChat: React.FC<ElevenLabsVoiceChatProps> = ({ 
  agentId = "agent_01j8rr062f41tsyt56q8fzbrz",
  className,
  onVoiceModeChange
}) => {
  // Configuration validation
  const isValidAgentId = agentId && agentId.startsWith('agent_');
  
  if (!isValidAgentId) {
    console.error('Invalid agent ID:', agentId);
  }
  
  // Use the stable ElevenLabs hook instead of managing state manually
  const hookResult = useElevenLabsStable(agentId);
  
  // Prevent unnecessary re-renders and log only once
  React.useEffect(() => {
    console.log('🚀 ElevenLabsVoiceChat component mounted with agentId:', agentId);
  }, [agentId]);
  
  // Safe destructuring with fallbacks to prevent undefined errors
  const [state, actions, showChatHistory] = hookResult || [
    {
      messages: [],
      isSessionActive: false,
      currentTranscript: '',
      conversationId: null,
      status: 'disconnected',
      isSpeaking: false,
      error: null
    },
    {
      addMessage: () => {},
      addSystemMessage: () => {},
      clearChatHistory: () => {},
      startSession: async () => {},
      endSession: async () => {},
      startVoiceRecording: async () => {},
      stopVoiceRecording: async () => {},
      returnToHomepage: () => {},
      setShowChatHistory: () => {}
    },
    false
  ];
  
  // Safely extract state from the hook with fallbacks
  const {
    messages = [],
    isSessionActive = false,
    currentTranscript = '',
    conversationId = null,
    status = 'disconnected',
    isSpeaking = false,
    error = null
  } = state || {};
  
  // Safely extract actions from the hook with fallbacks
  const {
    addMessage = () => {},
    addSystemMessage = () => {},
    clearChatHistory = () => {},
    startSession = async () => {},
    endSession = async () => {},
    startVoiceRecording = async () => {},
    stopVoiceRecording = async () => {},
    returnToHomepage = () => {},
    setShowChatHistory = () => {}
  } = actions || {};
  
  // Local state for UI - only voice mode needed

  // The useElevenLabsStable hook handles all ElevenLabs connection logic
  // No need for manual useConversation setup

  // Helper functions are now provided by the useElevenLabsStable hook
  // No need to redefine them here

  // Start conversation session - now handled by the hook
  const handleStartSession = async () => {
    try {
      console.log('🚀 Starting voice session from component...');
      await startSession();
      
      // Notify parent about voice mode change
      if (onVoiceModeChange) {
        onVoiceModeChange(true);
      }
    } catch (error) {
      console.error('❌ Failed to start session:', error);
    }
  };

  // getSignedUrl function is now handled by the useElevenLabsStable hook

  // End conversation session - now handled by the hook
  const handleEndSession = async () => {
    try {
      console.log('🛑 Ending voice session from component...');
      await endSession();
      
      // Notify parent about voice mode change
      if (onVoiceModeChange) {
        onVoiceModeChange(false);
      }
    } catch (error) {
      console.error('❌ Failed to end session:', error);
    }
  };

  // Text message handling removed - voice mode only

  // Clear chat history - now handled by the hook
  const handleClearChatHistory = () => {
    clearChatHistory();
  };

  // Handle voice mode toggle
  const handleVoiceModeToggle = async () => {
    if (isSessionActive) {
      console.log('🛑 Stopping voice session...');
      await handleEndSession();
    } else if (status !== 'connecting') {
      console.log('🚀 Starting voice session...');
      await handleStartSession();
    } else {
      console.log('⏳ Already connecting, please wait...');
    }
  };

  // Ensure messages is always an array to prevent length errors
  const safeMessages = Array.isArray(messages) ? messages : [];
  const hasMessages = safeMessages.length > 0;

  // Show error if there's an error state
  if (error) {
    return (
      <div className={cn("w-full", className)}>
        <Card className="p-6 bg-red-500/10 border-red-500/30">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Connection Error</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={handleStartSession} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Voice Controls */}
      <Card className="mb-4 p-4 bg-white/5 border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isSessionActive ? "bg-green-400 animate-pulse" : "bg-gray-400"
              )} />
              <span className="text-sm text-white/80">
                {isSessionActive ? 'Voice Active' : 'Voice Inactive'}
              </span>
            </div>
            
            {isSessionActive && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isSpeaking ? "bg-blue-400 animate-pulse" : "bg-yellow-400"
                )} />
                <span className="text-xs text-white/60">
                  {isSpeaking ? 'Speaking' : 'Listening'}
                </span>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleVoiceModeToggle}
            disabled={status === 'connecting' || (isSessionActive && status === 'disconnected')}
            variant={isSessionActive ? "destructive" : "default"}
            size="sm"
            className="gap-2"
          >
            {status === 'connecting' ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Connecting...
              </>
            ) : isSessionActive ? (
              <>
                <MicOff className="h-4 w-4" />
                Stop Voice
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start Voice
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Voice Chat Interface */}
      <Card className="bg-white/5 border-white/20">
        <div className="p-6">
          {/* Voice Instructions */}
          <div className="text-center space-y-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mic className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-white">Voice Chat</h3>
            </div>
            <p className="text-sm text-white/60">
              {isSessionActive 
                ? 'Voice session is active. Speak naturally to interact with the AI agent.' 
                : 'Click "Start Voice" to begin voice conversation with the AI agent.'
              }
            </p>
          </div>
          
          {/* Real-time Voice Transcript */}
          {currentTranscript && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/40 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-medium text-primary/80 uppercase tracking-wide">Listening</span>
              </div>
              <p className="text-lg text-white font-medium">
                {currentTranscript}
                <span className="animate-pulse ml-1 text-primary">|</span>
              </p>
            </div>
          )}
          
          {/* Chat Messages Display */}
          {hasMessages && (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              <div className="text-center mb-3">
                <span className="text-xs text-white/40 uppercase tracking-wide">Chat History</span>
              </div>
              {safeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-br from-primary to-blue-500' 
                      : message.type === 'system'
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      : 'bg-gradient-to-br from-green-500 to-emerald-500'
                  }`}>
                    {message.type === 'user' ? (
                      <Mic className="h-4 w-4 text-white" />
                    ) : message.type === 'system' ? (
                      <Sparkles className="h-4 w-4 text-white" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-primary/20 to-blue-500/20 text-white border border-primary/30' 
                      : message.type === 'system'
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-white border border-yellow-500/30'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearChatHistory}
          disabled={!hasMessages}
          className="text-xs"
        >
          Clear History
        </Button>
        
        <div className="text-xs text-white/60">
          Status: {status} | {isSessionActive ? 'Active' : 'Inactive'}
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ElevenLabsVoiceChat); 