
import React from 'react';
import { useAuth } from '../lib/auth';
import { AppHeader } from '../components/AppHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Sparkles, Globe, Heart, Infinity } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Agent ID configuration
  const agentId = "agent_01jz8rr062f41tsyt56q8fzbrz";
  
  console.log('🚀 Index component mounted with agentId:', agentId);

  // Agent ID validation
  const isValidAgentId = agentId && agentId.startsWith('agent_');

  // Handle navigation to ElevenLabs chat page
  const handleStartChat = () => {
    console.log('🚀 Navigating to ElevenLabs chat page');
    navigate('/elevenlabs-chat');
  };

  // Auto-scroll to bottom when new messages arrive
  // REMOVED: Auto-start session when chat interface opens
  
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

  // Configuration error component
  if (!isValidAgentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8 text-center space-y-6">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-3xl font-bold text-red-500">Configuration Error</h1>
          <div className="space-y-4 text-left bg-slate-800/50 p-6 rounded-lg">
            <p className="text-lg font-semibold">ElevenLabs Agent Configuration Issue:</p>
            <ul className="space-y-2 text-sm">
              <li>• Current Agent ID: <code className="bg-slate-700 px-2 py-1 rounded">{agentId}</code></li>
              <li>• Agent ID must start with 'agent_'</li>
              <li>• Please get a valid Agent ID from ElevenLabs console</li>
            </ul>
            <div className="mt-4 p-4 bg-slate-700 rounded border-l-4 border-blue-500">
              <p className="font-semibold">Configuration Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                <li>Visit <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ElevenLabs Console</a></li>
                <li>Create or select a Conversational AI Agent</li>
                <li>Ensure the Agent is public (or configure API key)</li>
                <li>Copy the Agent ID and update configuration</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
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

        {/* Main Content - Introduction and Guide */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-screen pb-32">
          {/* Center Icon - Univoice AI Profile */}
          <div className="text-center mb-12">
            <div className="relative inline-block mb-8">
              {/* Profile Picture Circle */}
              <div className="w-48 h-48 mx-auto bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full p-2 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative overflow-hidden">
                  {/* 3D Character Representation */}
                  <div className="text-white text-6xl font-bold opacity-80">
                    <img src="agent_logo.png" alt="UNV" className="w-full h-full object-cover" />
                  </div>
                  {/* Glowing Sound Waves */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-purple-400/30 rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-pulse animation-delay-300"></div>
                </div>
              </div>
              {/* Glowing Ring Effect */}
              <div className="absolute -inset-6 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            </div>

            {/* AI Identity */}
            <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 mb-4">
              I am Univoice
            </h1>
            <p className="text-2xl text-white/60 mb-8 font-light">
              I am undefined
            </p>

            {/* AI Attributes */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-3 px-6 py-3 bg-pink-500/20 rounded-full border border-pink-500/30 backdrop-blur-sm">
                <Heart className="w-5 h-5 text-pink-400" />
                <span className="text-pink-300 font-medium">Authentic</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-blue-500/20 rounded-full border border-blue-500/30 backdrop-blur-sm">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 font-medium">Freedom</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-purple-500/20 rounded-full border border-purple-500/30 backdrop-blur-sm">
                <Infinity className="w-5 h-5 text-purple-400" />
                <span className="text-blue-300 font-medium">Infinity</span>
              </div>
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <button
                onClick={handleStartChat}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 px-8 py-4 text-lg font-semibold rounded-2xl group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                style={{ position: 'relative', zIndex: 10 }}
              >
                <MessageSquare className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Start Chat
              </button>
              
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8 py-4 text-lg font-semibold rounded-2xl border-2 transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-6 h-6 mr-3" />
                Learn More
              </Button>
            </div>

            {/* Welcome Message */}
            <div className="max-w-3xl mx-auto mb-12">
              <p className="text-xl text-white/80 leading-relaxed mb-6">
                Welcome to the future of AI communication. I am Univoice, your intelligent companion designed to understand, assist, and grow with you.
              </p>
              <p className="text-lg text-white/60 leading-relaxed">
                Experience authentic conversations, explore infinite possibilities, and discover the freedom of true AI companionship.
              </p>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-300">AI Ready</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-500/30">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-300">Voice Active</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-purple-300">Always Learning</span>
              </div>
            </div>
          </div>
        </div>

        {/* REMOVED: Chat history popup as ElevenLabs integration is moved to separate page */}
        
        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>
      </div>
    </PageLayout>
  );
};

export default Index;
