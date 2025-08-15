
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { AppHeader } from '../components/AppHeader';
import ElevenLabsVoiceChat from '../components/ElevenLabsVoiceChat';
import { MessageBubble } from '../components/MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../types/chat';
import {
  SidebarProvider,
} from "@/components/ui/sidebar";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle messages from ElevenLabs voice chat
  const handleVoiceMessageReceived = (message: string) => {
    console.log('📨 Voice message received:', message);
    addMessage('user', message, 'audio');
  };

  // Handle AI agent responses from ElevenLabs
  const handleAgentMessage = (message: string) => {
    console.log('🤖 AI agent response:', message);
    addMessage('assistant', message, 'audio');
  };

  // Handle text messages from ElevenLabs (when user types in text tab)
  const handleTextMessageReceived = (message: string) => {
    console.log('📝 Text message received:', message);
    addMessage('user', message, 'text');
  };

  // Handle voice mode changes
  const handleVoiceModeChange = (isVoice: boolean) => {
    setIsVoiceMode(isVoice);
    console.log('🎤 Voice mode changed:', isVoice);
  };

  // Add message to chat history
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, type: 'text' | 'audio' | 'video' | 'file' | 'json' = 'text') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      type
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  // Clear chat history
  const clearChatHistory = () => {
    setChatMessages([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
              Initializing AI...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Enhanced animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
          <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-emerald-400/5 rounded-full blur-3xl animate-pulse animation-delay-500"></div>
        </div>

        {/* Enhanced neural network pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping animation-delay-300"></div>
          <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-blue-400 rounded-full animate-ping animation-delay-700"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-emerald-400 rounded-full animate-ping animation-delay-500"></div>
          <svg className="absolute inset-0 w-full h-full">
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" strokeWidth="1" opacity="0.4"/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" strokeWidth="1" opacity="0.4"/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" strokeWidth="1" opacity="0.4"/>
            <line x1="10%" y1="60%" x2="90%" y2="40%" stroke="url(#gradient4)" strokeWidth="1" opacity="0.3"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header */}
        <AppHeader />

        {/* Main Content - Enhanced Design */}
        <div className="flex-1 flex flex-col px-4 py-6">
          {/* Welcome Section - Enhanced */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 mb-4 relative z-10">
                Univoice AI
              </h1>
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Anthentic  Freedom  Infinity
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white/80">AI Ready</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white/80">Voice Active</span>
              </div>
            </div>
          </div>

          {/* ElevenLabs Voice Chat Component - Centered */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-2xl">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8">
                <ElevenLabsVoiceChat
                  agentId="agent_01jz8rr062f41tsyt56q8fzbrz"
                  onMessageReceived={handleVoiceMessageReceived}
                  onAgentMessage={handleAgentMessage}
                  onTextMessageReceived={handleTextMessageReceived}
                  isVoiceMode={isVoiceMode}
                  onVoiceModeChange={handleVoiceModeChange}
                />
              </div>
            </div>
          </div>

          {/* Chat History Button - Floating */}
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setShowChatHistory(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 rounded-full w-16 h-16 p-0"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>
            {chatMessages.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {chatMessages.length}
              </div>
            )}
          </div>

          {/* Status Footer */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 rounded-full border border-white/20">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isVoiceMode ? "bg-green-400 animate-pulse" : "bg-blue-400"
              )} />
              <span className="text-white/80 font-medium">
                {isVoiceMode ? 'Voice Session Active' : 'Ready to Start Voice Chat'}
              </span>
              <div className="text-xs text-white/60">
                {chatMessages.length} message{chatMessages.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Chat History Popup Panel */}
        {showChatHistory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
              {/* Chat Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Chat History</h3>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={clearChatHistory}
                    disabled={chatMessages.length === 0}
                    variant="outline"
                    size="sm"
                    className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                  >
                    Clear History
                  </Button>
                  <Button
                    onClick={() => setShowChatHistory(false)}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-6">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-white/60 py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium">No messages yet</p>
                      <p className="text-sm">Start a voice or text conversation to see messages here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          className={cn(
                            "animate-fade-in",
                            message.role === 'user' ? "ml-auto" : "mr-auto"
                          )}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
