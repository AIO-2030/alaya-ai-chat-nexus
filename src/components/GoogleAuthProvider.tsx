import React, { useEffect, useState } from 'react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

interface GoogleAuthProviderProps {
  children: React.ReactNode;
  clientId?: string;
  onAuthReady?: () => void;
  onAuthError?: (error: string) => void;
}

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({
  children,
  clientId,
  onAuthReady,
  onAuthError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { initializeGoogleAuth } = useGoogleAuth(clientId ? { clientId } : undefined);

  useEffect(() => {
    const loadGoogleAPI = () => {
      // Check if already loaded
      if (window.gapi) {
        setIsLoaded(true);
        onAuthReady?.();
        return;
      }

      // Create script tag to load Google API
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Load Google API client library
        window.gapi.load('client:auth2', async () => {
          try {
            // Initialize Google API client
            await window.gapi.client.init({
              clientId: clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID,
              scope: 'openid profile email'
            });

            // Initialize authentication
            const success = await initializeGoogleAuth();
            if (success) {
              setIsLoaded(true);
              onAuthReady?.();
            } else {
              // Don't treat this as a fatal error, just log it
              console.warn('Google Auth initialization failed, but app will continue with mock implementation');
              setIsLoaded(true); // Mark as loaded so app can continue
              onAuthReady?.();
            }
          } catch (error: any) {
            console.warn('Google API initialization failed, but app will continue:', error);
            setIsLoaded(true); // Mark as loaded so app can continue
            onAuthReady?.();
          }
        });
      };

      script.onerror = () => {
        const error = 'Failed to load Google API script';
        setLoadError(error);
        onAuthError?.(error);
      };

      document.head.appendChild(script);
    };

    // Add timeout handling
    const timeoutId = setTimeout(() => {
      if (!isLoaded && !loadError) {
        const error = 'Google API loading timeout';
        setLoadError(error);
        onAuthError?.(error);
      }
    }, 10000); // 10 second timeout

    loadGoogleAPI();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [clientId, initializeGoogleAuth, onAuthReady, onAuthError, isLoaded, loadError]);

  // Show loading state
  if (!isLoaded && !loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="mt-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-lg font-semibold">
            Loading Google Authentication...
          </div>
          <div className="mt-2 text-white/60 text-sm">
            This may take a few seconds
          </div>
        </div>
      </div>
    );
  }

  // Show error state - but allow app to continue running
  if (loadError) {
    console.warn('Google Auth failed to load, but app will continue:', loadError);
    // Don't block app execution, just continue without showing warning
    return <>{children}</>;
  }

  return <>{children}</>;
};

// 全局类型声明
declare global {
  interface Window {
    gapi: any;
  }
} 