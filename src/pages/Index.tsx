
import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { ChatBox } from '../components/ChatBox';
import { useChatSession } from '../hooks/useChatSession';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppHeader } from '../components/AppHeader';
import ElevenLabsVoiceChat from '../components/ElevenLabsVoiceChat';
import {
  SidebarProvider,
} from "@/components/ui/sidebar";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { session } = useChatSession();
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  // Debug: Check if component is rendering
  console.log('🚀 Index component rendering');
  console.log('🚀 ElevenLabsVoiceChat import check:', typeof ElevenLabsVoiceChat);

  // Handle messages from ElevenLabs voice chat
  const handleVoiceMessageReceived = (message: string) => {
    console.log('📨 Voice message received:', message);
    // Here you can integrate voice messages into the existing chat system
    // Or trigger other processing logic
  };

  // Handle AI agent responses from ElevenLabs
  const handleAgentMessage = (message: string) => {
    console.log('🤖 AI agent response:', message);
    // Here you can handle AI agent responses
    // For example, display them in the chat interface or trigger other operations
  };

  // Handle voice mode changes
  const handleVoiceModeChange = (isVoice: boolean) => {
    setIsVoiceMode(isVoice);
    console.log('🎤 Voice mode changed:', isVoice);
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
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-blue-400 rounded-full"></div>
          <svg className="absolute inset-0 w-full h-full">
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" strokeWidth="1" opacity="0.3"/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" strokeWidth="1" opacity="0.3"/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" strokeWidth="1" opacity="0.3"/>
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
            </defs>
          </svg>
        </div>

        {/* Header */}
        <AppHeader />

        <div className="flex h-[calc(100vh-65px-80px)] lg:h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* ElevenLabs Voice Chat Integration - Outside overflow container */}
              <div className="m-2 md:m-4 mb-4" style={{ 
                backgroundColor: 'rgba(255, 0, 0, 0.1)', 
                border: '2px solid red',
                minHeight: '200px',
                position: 'relative',
                zIndex: 1000,
                borderRadius: '16px',
                padding: '16px'
              }}>
                {/* Debug: Component rendering check */}
                <div className="bg-red-500 text-white p-2 mb-4 text-center font-bold text-lg">
                  🧪 DEBUG: About to render ElevenLabsVoiceChat component
                </div>
                
                {/* Debug: Layout test */}
                <div className="bg-yellow-500 text-black p-4 mb-4 text-center font-bold text-xl border-4 border-black">
                  🚨 LAYOUT TEST: This should be VERY visible!
                </div>
                
                <ElevenLabsVoiceChat
                  agentId="agent_01jz8rr062f41tsyt56q8fzbrz"
                  onMessageReceived={handleVoiceMessageReceived}
                  onAgentMessage={handleAgentMessage}
                  isVoiceMode={isVoiceMode}
                  onVoiceModeChange={handleVoiceModeChange}
                />
              </div>
              
              {/* Chat Area */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 m-2 md:m-4 mb-4 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                  {/* Existing ChatBox */}
                  <ChatBox />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
