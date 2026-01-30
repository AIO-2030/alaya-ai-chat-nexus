
import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { AppHeader } from '../components/AppHeader';
import { MessageSquare, Sparkles, Globe, Heart, Infinity, Mic } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';
import { VoiceRecordingDialog } from '../components/VoiceRecordingDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import styles from '../styles/pages/Index.module.css';

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
      <div className={styles.index__page}>
        <div className={styles.index__loading}>
          <div className={styles.index__loading__spinner}></div>
          <div className={styles.index__loading__text}>Initializing AI...</div>
        </div>
      </div>
    );
  }

  // Configuration error component
  if (!isValidAgentId) {
    return (
      <div className={styles.index__page}>
        <div className={styles.index__error}>
          <div className={styles.index__error__icon}>⚠️</div>
          <h1 className={styles.index__error__title}>Configuration Error</h1>
          <div className={styles.index__error__content}>
            <p className={styles.index__error__subtitle}>ElevenLabs Agent Configuration Issue:</p>
            <ul className={styles.index__error__list}>
              <li>• Current Agent ID: <code>{defaultAgentId}</code></li>
              <li>• Agent ID must start with 'agent_'</li>
              <li>• Please get a valid Agent ID from ElevenLabs console</li>
            </ul>
            <div className={styles.index__error__steps}>
              <p className={styles.index__error__steps__title}>Configuration Steps:</p>
              <ol className={styles.index__error__steps__list}>
                <li>Visit <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer">ElevenLabs Console</a></li>
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
      <div className={styles.index__page}>
        {/* Header */}
        <AppHeader />

        {/* Main Content - Introduction and Guide */}
        <div className={styles.index__container}>
          {/* Profile Avatar */}
          <div className={styles.index__profile__avatar}>
            <img src="agent_logo.png" alt="UNV" className={styles.index__profile__avatar__image} />
          </div>

          {/* Title Section - Two Separate Modules */}
          <div className={styles.index__title__section}>
              <h1 className={styles.index__title}>I am Univoice</h1>
          </div>

          {/* Action Buttons - Vertical Stack */}
          <div className={styles.index__actions}>
            <button
              onClick={handleStartChat}
              className={`${styles.index__action__button} ${styles['index__action__button--primary']}`}
              type="button"
            >
              <MessageSquare className={styles.index__action__button__icon} />
              <span className={styles.index__action__button__text}>Start Chat</span>
            </button>
            
            <button
              onClick={handleCreateMyVoice}
              disabled={isProcessing}
              className={`${styles.index__action__button} ${styles['index__action__button--secondary']}`}
              type="button"
            >
              <Mic className={styles.index__action__button__icon} />
              <span className={styles.index__action__button__text}>
                {isProcessing ? 'Processing...' : 'Create my voice'}
              </span>
            </button>
          </div>

          {/* Feature Items - Horizontal Layout */}
          <div className={styles.index__features__container}>
            <div className={styles.index__feature__item}>
              <Heart className={styles.index__feature__icon} />
              <span className={styles.index__feature__text}>Authentic</span>
            </div>
            <div className={styles.index__feature__item}>
              <Globe className={styles.index__feature__icon} />
              <span className={styles.index__feature__text}>Freedom</span>
            </div>
            <div className={styles.index__feature__item}>
              <Infinity className={styles.index__feature__icon} />
              <span className={styles.index__feature__text}>Infinity</span>
            </div>
          </div>
        </div>

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
