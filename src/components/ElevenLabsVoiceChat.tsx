import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Sparkles, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Types for our conversation
interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

interface ElevenLabsVoiceChatProps {
  agentId?: string;
  className?: string;
  onMessageReceived?: (message: string) => void;
  onAgentMessage?: (message: string) => void;
  isVoiceMode?: boolean;
  onVoiceModeChange?: (isVoice: boolean) => void;
}

const ElevenLabsVoiceChat: React.FC<ElevenLabsVoiceChatProps> = ({ 
  agentId = "agent_01jz8rr062f41tsyt56q8fzbrz",
  className,
  onMessageReceived,
  onAgentMessage,
  isVoiceMode = false,
  onVoiceModeChange
}) => {
  // Configuration validation
  const isValidAgentId = agentId && agentId.startsWith('agent_');
  
  if (!isValidAgentId) {
    console.error('Invalid agent ID:', agentId);
  }
  
  console.log('🚀 ElevenLabsVoiceChat component mounted with agentId:', agentId);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [activeTab, setActiveTab] = useState('voice');
  const [textMessage, setTextMessage] = useState('');
  const conversationIdRef = useRef<string | null>(null);

  // Initialize ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs agent');
      addSystemMessage('Connected to ElevenLabs AI Agent');
    },
    onDisconnect: (reason) => {
      console.log('🔌 Disconnected from ElevenLabs agent');
      console.log('🔌 Disconnect reason:', reason);
      setIsSessionActive(false);
      
      if (reason && typeof reason === 'object') {
        const disconnectReason = (reason as any)?.reason;
        if (disconnectReason === 'user') {
          addSystemMessage('⚠️ Agent configuration issue detected. Check console for details.');
        } else if (disconnectReason === 'timeout') {
          addSystemMessage('Connection timed out. Please try again.');
        } else if (disconnectReason === 'error') {
          addSystemMessage('Connection error occurred. Please check your network and try again.');
        } else {
          addSystemMessage(`Voice agent disconnected: ${JSON.stringify(reason)}`);
        }
      } else if (typeof reason === 'string') {
        addSystemMessage(`Voice agent disconnected: ${reason}`);
      } else {
        addSystemMessage('Voice agent disconnected (unknown reason)');
      }
    },
    onMessage: (message) => {
      console.log('📨 Message received:', message);
      
      if (message.source === 'user') {
        setCurrentTranscript(message.message);
        addMessage('user', message.message);
        setCurrentTranscript('');
        
        // Notify parent component
        if (onMessageReceived) {
          onMessageReceived(message.message);
        }
      } else if (message.source === 'ai') {
        addMessage('agent', message.message);
        
        // Notify parent component about AI response
        if (onAgentMessage) {
          onAgentMessage(message.message);
        }
      }
    },
    onError: (error: unknown) => {
      console.error('❌ Conversation error:', error);
      
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
      }
      
      addSystemMessage(`Connection disrupted: ${errorMessage}`);
      setIsSessionActive(false);
    },
    onStatusChange: (status) => {
      console.log('📊 Status changed to:', status);
    },
  });

  const { status, isSpeaking } = conversation;

  // Helper function to add messages
  const addMessage = (type: 'user' | 'agent' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addSystemMessage = (content: string) => {
    addMessage('system', content);
  };

  // Start conversation session
  const startSession = async () => {
    try {
      console.log('🚀 Starting session with agentId:', agentId);
      console.log('🔑 Checking API key availability...');
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      console.log('🔑 API Key available:', !!apiKey);
      
      if (!apiKey) {
        console.warn('⚠️ No API key found. Attempting public agent connection...');
      }
      
      console.log('🎤 Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      console.log('🔗 Getting signed URL for connection...');
      const signedUrl = await getSignedUrl(agentId);
      console.log('✅ Got signed URL, attempting connection...');
      
      console.log('📞 Conversation status before connection:', status);
      
      const conversationId = await conversation.startSession({ signedUrl });
      console.log('✅ Session started with ID:', conversationId);
      
      conversationIdRef.current = conversationId;
      setIsSessionActive(true);
      addSystemMessage('Voice session started');
      
      // Notify parent about voice mode change
      if (onVoiceModeChange) {
        onVoiceModeChange(true);
      }
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      addSystemMessage(`Failed to start voice session: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Signed URL response received');
      
      if (!data.signed_url) {
        throw new Error('No signed_url in response');
      }

      return data.signed_url;
    } catch (fetchError) {
      console.error('🚨 Fetch error:', fetchError);
      throw fetchError;
    }
  };

  // End conversation session
  const endSession = async () => {
    try {
      console.log('🛑 Ending session...');
      await conversation.endSession();
      setIsSessionActive(false);
      conversationIdRef.current = null;
      setCurrentTranscript('');
      addSystemMessage('Voice session ended');
      console.log('✅ Session ended successfully');
      
      // Notify parent about voice mode change
      if (onVoiceModeChange) {
        onVoiceModeChange(false);
      }
    } catch (error) {
      console.error('❌ Failed to end session:', error);
    }
  };

  // Handle text message sending
  const handleSendText = () => {
    if (textMessage.trim()) {
      addMessage('user', textMessage);
      setTextMessage('');
      
      // Notify parent component
      if (onMessageReceived) {
        onMessageReceived(textMessage.trim());
      }
    }
  };

  // Clear chat history
  const clearChatHistory = () => {
    setMessages([]);
    addSystemMessage('Chat history cleared');
  };

  // Handle voice mode toggle
  const handleVoiceModeToggle = () => {
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Test Marker - Remove after debugging */}
      <div className="bg-red-500 text-white p-2 mb-4 text-center font-bold">
        🧪 ElevenLabsVoiceChat Component is RENDERING! 🧪
      </div>
      
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
            disabled={status === 'connecting'}
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

      {/* Chat Interface */}
      <Card className="bg-white/5 border-white/20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
            <TabsTrigger value="voice" className="space-x-2">
              <Mic className="h-4 w-4" />
              <span>Voice Chat</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Text Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice" className="px-4 pb-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-white/60">
                {isSessionActive 
                  ? 'Voice session is active. Speak naturally to interact with the AI agent.' 
                  : 'Click "Start Voice" to begin voice conversation with the AI agent.'
                }
              </p>
              
              {currentTranscript && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-sm text-primary">
                    <span className="font-medium">Listening:</span> {currentTranscript}
                    <span className="animate-pulse ml-1">|</span>
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="text" className="px-4 pb-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Type your message..."
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                className="min-h-[80px] resize-none bg-background/50 border-border/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
              />
              <Button 
                onClick={handleSendText}
                disabled={!textMessage.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={clearChatHistory}
          disabled={messages.length === 0}
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

export default ElevenLabsVoiceChat; 