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
import styles from '../styles/pages/ElevenLabsChat.module.css';

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
      <div className={styles.elevenlabs__loading}>
        <div className={styles.elevenlabs__loading__content}>
          <div className={styles.elevenlabs__loading__spinner}></div>
          <div className={styles.elevenlabs__loading__text}>
            Loading AI Agent...
          </div>
        </div>
      </div>
    );
  }

  if (!isValidAgentId) {
    return (
      <div className={styles.elevenlabs__error}>
        <div className={styles.elevenlabs__error__container}>
          <div className={styles.elevenlabs__error__icon}>⚠️</div>
          <h1 className={styles.elevenlabs__error__title}>Configuration Error</h1>
          <div className={`${styles.elevenlabs__error__content} ${styles.elevenlabs__space__y__4}`}>
            <p className={styles.elevenlabs__error__content__title}>ElevenLabs Agent Configuration Issue:</p>
            <ul className={`${styles.elevenlabs__error__content__list} ${styles.elevenlabs__space__y__2}`}>
              <li>• Current Agent ID: <code className={styles.elevenlabs__error__content__code}>{agentId}</code></li>
              <li>• Agent ID must start with 'agent_'</li>
              <li>• Please get a valid Agent ID from ElevenLabs console</li>
            </ul>
            <div className={styles.elevenlabs__error__steps}>
              <p className={styles.elevenlabs__error__steps__title}>Configuration Steps:</p>
              <ol className={`${styles.elevenlabs__error__steps__list} ${styles.elevenlabs__space__y__1}`}>
                <li>Visit <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer" className={styles.elevenlabs__error__steps__link}>ElevenLabs Console</a></li>
                <li>Create or select a Conversational AI Agent</li>
                <li>Ensure the Agent is public (or configure API key)</li>
                <li>Copy the Agent ID and update configuration</li>
              </ol>
            </div>
          </div>
          <div className={styles.elevenlabs__error__button}>
            <Button
              onClick={handleReturnToIndex}
              className={styles.elevenlabs__header__button}
            >
              <ArrowLeft className={styles.elevenlabs__header__button__icon} />
              Return to Index
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Simple status display - the ElevenLabsVoiceChat component handles all the complex logic

  return (
    <div className={styles.elevenlabs__page}>
      {/* Enhanced animated background elements */}
      <div className={styles.elevenlabs__background}>
        <div className={`${styles.elevenlabs__background__blob} ${styles.elevenlabs__background__blob__1}`}></div>
        <div className={`${styles.elevenlabs__background__blob} ${styles.elevenlabs__background__blob__2} ${styles.animation__delay__300}`}></div>
        <div className={`${styles.elevenlabs__background__blob} ${styles.elevenlabs__background__blob__3} ${styles.animation__delay__700}`}></div>
        <div className={`${styles.elevenlabs__background__blob} ${styles.elevenlabs__background__blob__4} ${styles.animation__delay__500}`}></div>
      </div>

      {/* Enhanced neural network pattern */}
      <div className={styles.elevenlabs__neural}>
        <div className={`${styles.elevenlabs__neural__dot} ${styles.elevenlabs__neural__dot__1}`}></div>
        <div className={`${styles.elevenlabs__neural__dot} ${styles.elevenlabs__neural__dot__2} ${styles.animation__delay__300}`}></div>
        <div className={`${styles.elevenlabs__neural__dot} ${styles.elevenlabs__neural__dot__3} ${styles.animation__delay__700}`}></div>
        <div className={`${styles.elevenlabs__neural__dot} ${styles.elevenlabs__neural__dot__4} ${styles.animation__delay__500}`}></div>
        <svg className={styles.elevenlabs__neural__svg}>
          <line x1="25%" y1="25%" x2="75%" y2="50%" className={`${styles.elevenlabs__neural__line} ${styles.elevenlabs__neural__line__1}`} strokeWidth="1" />
          <line x1="75%" y1="50%" x2="75%" y2="75%" className={`${styles.elevenlabs__neural__line} ${styles.elevenlabs__neural__line__2}`} strokeWidth="1" />
          <line x1="25%" y1="25%" x2="75%" y2="75%" className={`${styles.elevenlabs__neural__line} ${styles.elevenlabs__neural__line__3}`} strokeWidth="1" />
          <line x1="10%" y1="60%" x2="90%" y2="40%" className={`${styles.elevenlabs__neural__line} ${styles.elevenlabs__neural__line__4}`} strokeWidth="1" />
        </svg>
      </div>

      {/* Header with Return Button */}
      <div className={styles.elevenlabs__header}>
        <div className={styles.elevenlabs__header__content}>
          <h1 className={styles.elevenlabs__header__title}>
              Listening...
          </h1>
          <Button
            onClick={handleReturnToIndex}
            className={styles.elevenlabs__header__button}
          >
            <ArrowLeft className={styles.elevenlabs__header__button__icon} />
            Return to Index
          </Button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className={styles.elevenlabs__chat}>
        <div className={styles.elevenlabs__chat__container}>
          {/* ElevenLabs Voice Chat Component */}
          <div className={styles.elevenlabs__chat__content}>
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
