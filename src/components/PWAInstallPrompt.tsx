import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check if running on iOS and added to home screen
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
      
      // Check if running on Android and added to home screen
      if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Listen for display mode changes
    const handleDisplayModeChange = () => {
      checkIfInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Store dismissal in localStorage to avoid showing again immediately
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or if user recently dismissed
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  // Check if user recently dismissed (within 24 hours)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime) {
    const timeDiff = Date.now() - parseInt(dismissedTime);
    if (timeDiff < 24 * 60 * 60 * 1000) { // 24 hours
      return null;
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-xl border border-white/20 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">
                {t('pwa.installTitle', 'Install Univoice')}
              </h3>
              <p className="text-white/80 text-xs mb-3">
                {t('pwa.installDescription', 'Add to your home screen for quick access and better experience')}
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3 py-1"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {t('pwa.installButton', 'Install')}
                </Button>
                
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 text-xs px-2 py-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// iOS Install Instructions Component
export const IOSInstallInstructions: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if running on iOS and not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      setShowInstructions(true);
    }
  }, []);

  if (!showInstructions) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-xl border border-white/20 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1">
                {t('pwa.iosInstallTitle', 'Install on iOS')}
              </h3>
              <p className="text-white/80 text-xs mb-2">
                {t('pwa.iosInstallDescription', 'Tap the Share button and select "Add to Home Screen"')}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span>1.</span>
                <span>{t('pwa.iosStep1', 'Tap the Share button')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span>2.</span>
                <span>{t('pwa.iosStep2', 'Scroll down and tap "Add to Home Screen"')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span>3.</span>
                <span>{t('pwa.iosStep3', 'Tap "Add" to confirm')}</span>
              </div>
              
              <Button
                onClick={() => setShowInstructions(false)}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 text-xs px-2 py-1 mt-2"
              >
                <X className="w-3 h-3 mr-1" />
                {t('common.dismiss', 'Dismiss')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
