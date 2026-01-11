
import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { AppHeader } from '../components/AppHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Sparkles, Globe, Heart, Infinity, Mic } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';
import { VoiceRecordingDialog } from '../components/VoiceRecordingDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Index = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Agent ID configuration - default master agent
  const defaultAgentId = "agent_01jz8rr062f41tsyt56q8fzbrz";
  
  // State for voice creation flow
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  console.log('🚀 Index component mounted with defaultAgentId:', defaultAgentId);

  // Agent ID validation
  const isValidAgentId = defaultAgentId && defaultAgentId.startsWith('agent_');

  // Handle navigation to ElevenLabs chat page
  const handleStartChat = () => {
    console.log('🚀 Navigating to ElevenLabs chat page');
    navigate('/elevenlabs-chat');
  };

  // Handle Create My Voice button click
  const handleCreateMyVoice = async () => {
    // Check if user is logged in
    console.log('[Index] Checking authentication:', {
      isAuthenticated: isAuthenticated(),
      hasUser: !!user,
      principalId: user?.principalId,
      loginStatus: user?.loginStatus,
    });
    
    if (!isAuthenticated() || !user) {
      alert('Please login first to create your custom voice');
      return;
    }
    
    if (!user.principalId) {
      console.error('[Index] User exists but principalId is missing:', user);
      alert('User authentication incomplete. Please login again.');
      return;
    }

    try {
      // Check if user already has a custom agent
      const { get_user_ai_config, has_user_ai_config } = await import('../services/api/aiApi');
      const hasConfig = await has_user_ai_config(user.principalId);
      
      if (hasConfig) {
        // Show delete confirmation dialog
        setShowDeleteConfirm(true);
      } else {
        // No existing config, proceed directly
        setShowVoiceDialog(true);
      }
    } catch (error) {
      console.error('Error checking user AI config:', error);
      alert('Failed to check your voice configuration. Please try again.');
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!user?.principalId) return;
    
    setIsProcessing(true);
    setShowDeleteConfirm(false);
    
    try {
      const { get_user_ai_config, delete_user_ai_config } = await import('../services/api/aiApi');
      
      // Get current config to get agent_id
      const config = await get_user_ai_config(user.principalId);
      
      if (config) {
        // Delete from ElevenLabs
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        if (apiKey && config.agent_id) {
          try {
            const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${config.agent_id}`, {
              method: 'DELETE',
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              console.warn('Failed to delete agent from ElevenLabs:', response.statusText);
            }
          } catch (error) {
            console.error('Error deleting agent from ElevenLabs:', error);
          }
        }
        
        // Delete from backend
        await delete_user_ai_config(user.principalId);
      }
      
      // Proceed to voice recording
      setShowVoiceDialog(true);
    } catch (error) {
      console.error('Error deleting user AI config:', error);
      alert('Failed to delete existing voice. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle voice recording completion
  const handleVoiceRecorded = async (audioBlob: Blob) => {
    if (!user || !user.principalId || !user.userId) {
      alert('User information is incomplete. Please login again.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const { createCustomVoiceAgent } = await import('../services/api/aiApi');
      const result = await createCustomVoiceAgent(user.principalId, audioBlob, defaultAgentId, user.userId);
      
      if (result.success) {
        alert('Your custom voice has been created successfully!');
        setShowVoiceDialog(false);
      } else {
        alert(`Failed to create custom voice: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating custom voice:', error);
      alert('Failed to create custom voice. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
              <li>• Current Agent ID: <code className="bg-slate-700 px-2 py-1 rounded">{defaultAgentId}</code></li>
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
                onClick={handleCreateMyVoice}
                disabled={isProcessing}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8 py-4 text-lg font-semibold rounded-2xl border-2 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="w-6 h-6 mr-3" />
                {isProcessing ? 'Processing...' : 'Create my voice'}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Existing Voice?</AlertDialogTitle>
              <AlertDialogDescription>
                You already have a custom voice. Creating a new one will delete your existing voice and agent. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete and Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Voice Recording Dialog */}
        {showVoiceDialog && (
          <VoiceRecordingDialog
            open={showVoiceDialog}
            onClose={() => setShowVoiceDialog(false)}
            onRecorded={handleVoiceRecorded}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default Index;
