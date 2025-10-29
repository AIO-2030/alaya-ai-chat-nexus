import { AuthClient } from '@dfinity/auth-client';
import i18n from '../i18n';

let singletonClient: AuthClient | null = null;

export const getAuthClient = async (): Promise<AuthClient> => {
  if (singletonClient) {
    console.log('[II] Reusing existing AuthClient');
    return singletonClient;
  }
  
  try {
    console.log('[II] Creating new AuthClient...');
    singletonClient = await AuthClient.create();
    console.log('[II] AuthClient created successfully');
    return singletonClient;
  } catch (error) {
    console.error('[II] Failed to create AuthClient:', error);
    throw error;
  }
};

export const getIIUrl = (): string => {
  const fromEnv = (import.meta as any).env?.VITE_II_URL as string | undefined;
  const url = fromEnv && fromEnv.length > 0 ? fromEnv : 'https://identity.ic0.app';
  console.log('[II] Using II URL:', url);
  return url;
};

export const ensureIILogin = async (): Promise<boolean> => {
  console.log('[II] ensureIILogin called');
  console.log('[II] Current URL:', window.location.href);
  
  const client = await getAuthClient();
  console.log('[II] AuthClient obtained');
  
  // Check for redirect callback FIRST (before checking authentication)
  const urlParams = new URLSearchParams(window.location.search);
  const hasHash = window.location.hash && window.location.hash.length > 0;
  
  console.log('[II] URL params:', {
    search: window.location.search,
    hash: window.location.hash,
    hasCode: urlParams.has('code'),
    hasHash
  });
  
  // Check if this is an II redirect callback
  if (urlParams.has('code') || hasHash) {
    console.log('[II] Detected redirect callback, handling...');
    try {
      // Wait a moment for AuthClient to process the redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now check if authenticated
      const redirectAuthed = await client.isAuthenticated();
      console.log('[II] Redirect handled, authenticated:', redirectAuthed);
      
      if (redirectAuthed) {
        // Clean callback parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('[II] Callback parameters cleaned, URL reset');
      }
      
      return redirectAuthed;
    } catch (error) {
      console.error('[II] Error handling redirect:', error);
      return false;
    }
  }
  
  const authed = await client.isAuthenticated();
  console.log('[II] Already authenticated:', authed);
  
  if (authed) {
    console.log('[II] User already authenticated, skipping login');
    return true;
  }
  
  const iiUrl = getIIUrl();
  console.log('[II] II URL:', iiUrl);
  
  // Detect if device is mobile (iOS/Android)
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroidDevice = /Android/.test(navigator.userAgent);
  const isMobile = isIOSDevice || isAndroidDevice;
  
  console.log('[II] Device info:', {
    userAgent: navigator.userAgent,
    isIOS: isIOSDevice,
    isAndroid: isAndroidDevice,
    isMobile
  });
  
  // Mobile devices should use redirect mode to avoid popup issues
  const useRedirect = isMobile;
  
  if (useRedirect) {
    console.log('[II] Using redirect mode for mobile device');
    
    // For mobile devices, trigger redirect directly
    // The page will redirect to II, user authenticates, then redirects back
    // The callback will be handled when the page loads again with the code parameter
    client.login({
      identityProvider: iiUrl,
      // No callbacks needed for redirect mode - the page will reload
    });
    
    // For redirect mode, the Promise will never resolve as the page redirects
    // The callback will be handled in the next page load via the handleRedirect call above
    return new Promise<boolean>(() => {
      // This never resolves because we're redirecting to II
      console.log('[II] Redirecting to II...');
    });
  } else {
    console.log('[II] Using popup mode for desktop');
    // Desktop uses popup mode
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      
      // Set timeout (5 minutes)
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[II] Login timeout after 5 minutes');
          resolve(false);
        }
      }, 5 * 60 * 1000);
      
      try {
        console.log('[II] Calling client.login() with popup...');
        
        const loginOptions: any = {
          identityProvider: iiUrl,
          onSuccess: () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              console.log('[II] Login successful - onSuccess callback fired');
              resolve(true);
            }
          },
          onError: (error: Error | string) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              console.error('[II] Login error - onError callback fired:', error);
              resolve(false);
            }
          },
        };
        
        console.log('[II] Login options:', loginOptions);
        
        client.login(loginOptions);
        
        console.log('[II] client.login() called, waiting for callback...');
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.error('[II] Login exception caught:', error);
          resolve(false);
        }
      }
    });
  }
};

export const getPrincipalFromII = async (): Promise<string> => {
  try {
    console.log('[II] Starting II login process...');
    const ok = await ensureIILogin();
    
    if (!ok) {
      console.error('[II] II login failed');
      throw new Error(i18n.t('common.iiAuthFailed'));
    }
    
    console.log('[II] II login successful, getting principal...');
    const client = await getAuthClient();
    const identity = client.getIdentity();
    
    if (!identity) {
      console.error('[II] No identity found after login');
      throw new Error(i18n.t('common.iiPrincipalFailed'));
    }
    
    const principal = identity.getPrincipal();
    if (!principal) {
      console.error('[II] No principal found after login');
      throw new Error(i18n.t('common.iiPrincipalFailed'));
    }
    
    const text = principal.toText();
    if (!text) {
      console.error('[II] Principal is empty');
      throw new Error(i18n.t('common.iiPrincipalFailed'));
    }
    
    console.log('[II] Successfully obtained principal:', text);
    return text;
  } catch (error) {
    console.error('[II] Error in getPrincipalFromII:', error);
    throw error;
  }
};

export const logoutII = async (): Promise<void> => {
  const client = await getAuthClient();
  await client.logout();
};

