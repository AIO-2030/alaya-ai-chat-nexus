import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ElevenLabsVoiceChat from '../components/ElevenLabsVoiceChat';
import { useAuth } from '../lib/auth';
import { get_user_ai_config } from '../services/api/aiApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ElevenLabsChat = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Default master agent ID
  const defaultAgentId = "agent_01jz8rr062f41tsyt56q8fzbrz";
  const [agentId, setAgentId] = useState<string>(defaultAgentId);
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Check for user's custom agent
  useEffect(() => {
    const loadAgentId = async () => {
      try {
        if (user?.principalId) {
          console.log('🚀 Checking for user custom agent:', user.principalId);
          const config = await get_user_ai_config(user.principalId);
          
          if (config && config.agent_id) {
            console.log('✅ Using user custom agent:', config.agent_id);
            setAgentId(config.agent_id);
          } else {
            console.log('ℹ️ No custom agent found, using default:', defaultAgentId);
            setAgentId(defaultAgentId);
          }
        } else {
          console.log('ℹ️ User not logged in, using default agent:', defaultAgentId);
          setAgentId(defaultAgentId);
        }
      } catch (error) {
        console.error('❌ Error loading user agent config:', error);
        setAgentId(defaultAgentId);
      } finally {
        setLoading(false);
      }
    };

    loadAgentId();
  }, [user?.principalId]);
  
  console.log('🚀 ElevenLabsChat page mounted with agentId:', agentId);

  // Use ElevenLabsVoiceChat component directly to avoid duplicate hook instances
  // This prevents the state management conflicts we were experiencing

  // Agent ID validation
  const isValidAgentId = agentId && agentId.startsWith('agent_');

  // Auto-scroll functionality is now handled by the ElevenLabsVoiceChat component

  // Handle return to index page
  const handleReturnToIndex = () => {
    console.log('🏠 Returning to Index page');
    navigate('/');
  };

  // Handle voice mode change with login check
  const handleVoiceModeChange = useCallback((isVoice: boolean) => {
    console.log('Voice mode changed:', isVoice);
    // If user tries to start voice mode but not logged in, show prompt
    if (isVoice && !isAuthenticated()) {
      setShowLoginPrompt(true);
    }
  }, [isAuthenticated]);

  // Show loading state while checking for user agent
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="mt-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
            Loading AI Agent...
          </div>
        </div>
      </div>
    );
  }

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
          <Button
            onClick={handleReturnToIndex}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8 py-3 rounded-lg font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Index
          </Button>
        </div>
      </div>
    );
  }

  // Simple status display - the ElevenLabsVoiceChat component handles all the complex logic

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
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

      {/* Header with Return Button */}
      <div className="relative z-10 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
              Listening...
          </h1>
          <Button
            onClick={handleReturnToIndex}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Index
          </Button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="relative z-10 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl h-[75vh] flex flex-col">
          {/* ElevenLabs Voice Chat Component */}
          <div className="flex-1 p-8">
            <ElevenLabsVoiceChat 
              agentId={agentId}
              className="h-full"
              onVoiceModeChange={handleVoiceModeChange}
            />
          </div>
        </div>
      </div>

      {/* Login Prompt Dialog */}
      <AlertDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please login to use voice chat features. You can continue with text chat or login to access all features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue with Text</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowLoginPrompt(false);
              navigate('/');
            }}>
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ElevenLabsChat;
