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
    
    // For mobile security: Use explicit configuration options
    // This ensures proper redirect handling and security
    const authClientOptions: any = {
      // Ensure we use the current origin for redirect URI (security best practice)
      // AuthClient will use this as the base for redirect validation
      keyType: 'Ed25519', // Standard key type for II
      // Configure idle timeout (optional, default is 30 minutes)
      idleOptions: {
        idleTimeout: 1000 * 60 * 60 * 24, // 24 hours
        disableIdle: false,
        disableDefaultIdleCallback: false
      }
    };
    
    singletonClient = await AuthClient.create(authClientOptions);
    console.log('[II] AuthClient created successfully');
    console.log('[II] AuthClient configuration:', {
      keyType: authClientOptions.keyType,
      hasIdleOptions: !!authClientOptions.idleOptions
    });
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
  
  // Check for redirect callback parameters FIRST (before checking auth status)
  // This handles the case where user comes back from II after authentication
  const urlParams = new URLSearchParams(window.location.search);
  const hasHash = window.location.hash && window.location.hash.length > 0;
  const hasCode = urlParams.has('code');
  
  // Security: Additional validation - check for known II callback patterns
  const isPotentialIICallback = hasCode || hasHash || 
    urlParams.has('state') || 
    urlParams.has('error') ||
    urlParams.has('delegation') ||
    window.location.search.includes('identity.ic0.app') ||
    window.location.search.includes('ic0.app');
  
  console.log('[II] URL params:', {
    search: window.location.search,
    hash: window.location.hash,
    hasCode,
    hasHash,
    isPotentialIICallback,
    hasState: urlParams.has('state'),
    hasError: urlParams.has('error'),
    hasDelegation: urlParams.has('delegation'),
    fullUrl: window.location.href,
    origin: window.location.origin
  });
  
  // Security check: Verify we're on a secure context (HTTPS)
  if (!window.isSecureContext) {
    console.error('[II] Security: Not in secure context (HTTPS required)');
    throw new Error('II authentication requires secure context (HTTPS)');
  }
  
  // Security: Log origin for debugging (helps detect phishing attempts)
  console.log('[II] Security: Callback origin verified:', window.location.origin);
  
  // If we have callback params, wait for AuthClient to process them
  if (isPotentialIICallback) {
    console.log('[II] Detected redirect callback params, waiting for AuthClient to process...');
    console.log('[II] This is a redirect callback from II after authentication');
    
    // Detect device type for platform-specific handling
    const isAndroidDevice = /Android/.test(navigator.userAgent);
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    console.log('[II] Callback processing - Device info:', {
      isAndroid: isAndroidDevice,
      isIOS: isIOSDevice,
      userAgent: navigator.userAgent
    });
    
    try {
      // Different wait strategies for different platforms
      // Android may need more time to process callbacks
      const maxRetries = isAndroidDevice ? 8 : 5;
      const baseWaitTime = isAndroidDevice ? 500 : 300;
      
      console.log(`[II] Using ${maxRetries} retries with ${baseWaitTime}ms base wait time for ${isAndroidDevice ? 'Android' : isIOSDevice ? 'iOS' : 'other'} device`);
      
      // Wait longer for AuthClient to process the callback (may take time on mobile)
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, baseWaitTime));
        
        // Check authentication status
        const redirectAuthed = await client.isAuthenticated();
        console.log(`[II] After wait ${i + 1}/${maxRetries} (${(i + 1) * baseWaitTime}ms), authenticated:`, redirectAuthed);
        
        if (redirectAuthed) {
          // Security: Verify identity exists before cleaning URL
          const identity = client.getIdentity();
          if (!identity) {
            console.warn(`[II] Authenticated but no identity yet, waiting more... (attempt ${i + 1}/${maxRetries})`);
            continue;
          }
          
          const principal = identity.getPrincipal();
          console.log('[II] Successfully got principal after redirect:', principal.toText());
          
          // Clean callback parameters from URL (security: prevent info leakage)
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, document.title, cleanPath);
          console.log('[II] Callback parameters cleaned, URL reset to:', cleanPath);
          console.log('[II] Redirect callback handled successfully!');
          return true;
        }
      }
      
      // After all retries, still not authenticated
      console.warn('[II] Redirect callback detected but not authenticated after multiple retries');
      console.warn('[II] Security warning: Callback params present but not authenticated');
      
      // Try one more time with longer wait (especially for Android)
      const finalWaitTime = isAndroidDevice ? 2000 : 1000;
      console.log(`[II] Final retry with ${finalWaitTime}ms wait...`);
      await new Promise(resolve => setTimeout(resolve, finalWaitTime));
      const finalAuthed = await client.isAuthenticated();
      
      if (finalAuthed) {
        const identity = client.getIdentity();
        if (identity) {
          const principal = identity.getPrincipal();
          console.log('[II] Final retry successful! Got principal:', principal.toText());
          
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, document.title, cleanPath);
          console.log('[II] Callback handled on final retry');
          return true;
        }
      }
      
      console.error('[II] All retries failed. Authentication may have failed or callback processing incomplete.');
      console.error('[II] This may indicate:', {
        possibleCauses: [
          'II authentication was cancelled by user',
          'Network issue during callback processing',
          'Browser security settings blocking callback',
          'Platform-specific redirect handling issue'
        ],
        platform: isAndroidDevice ? 'Android' : isIOSDevice ? 'iOS' : 'Desktop/Other',
        urlParams: window.location.search,
        hash: window.location.hash
      });
    } catch (error) {
      console.error('[II] Error handling redirect:', error);
      throw error;
    }
  }
  
  // Check if we already have authentication (from previous session or already processed)
  let authed = await client.isAuthenticated();
  console.log('[II] Initial authentication check (no callback detected):', authed);
  
  if (authed) {
    console.log('[II] User already authenticated! Getting identity...');
    
    // Verify we can get the identity
    try {
      const identity = client.getIdentity();
      if (identity) {
        const principal = identity.getPrincipal();
        console.log('[II] Successfully got principal:', principal.toText());
        
        // Security: Clean URL if there are any callback parameters (prevent info leakage)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') || window.location.hash) {
          console.log('[II] Cleaning callback parameters from URL for security...');
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, document.title, cleanPath);
          console.log('[II] URL cleaned to:', cleanPath);
        }
        
        return true;
      }
    } catch (error) {
      console.error('[II] Error getting identity after authentication:', error);
    }
  }
  
  // If we reach here, user is not authenticated and no callback detected
  // This means we need to initiate II login
  // NOTE: This should only happen when explicitly called (e.g., after Google login)
  const iiUrl = getIIUrl();
  console.log('[II] II URL:', iiUrl);
  
  // Detect iOS for special handling
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroidDevice = /Android/.test(navigator.userAgent);
  const isMobile = isIOSDevice || isAndroidDevice;
  
  console.log('[II] Device info:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isIOS: isIOSDevice,
    isAndroid: isAndroidDevice,
    isMobile,
    maxTouchPoints: navigator.maxTouchPoints
  });
  
  // iOS and mobile devices should use redirect mode to avoid popup blocking
  // Use AuthClient.login() with onSuccess callback for proper redirect handling
  if (isMobile) {
    console.log('[II] Mobile device detected, using redirect mode with AuthClient');
    console.log('[II] Device type:', isIOSDevice ? 'iOS' : isAndroidDevice ? 'Android' : 'Other mobile');
    console.log('[II] Redirect mode: page will navigate to II, user authenticates, then returns');
    
    try {
      const derivationOrigin = window.location.origin;
      
      console.log('[II] Current origin:', derivationOrigin);
      console.log('[II] Using derivationOrigin:', derivationOrigin);
      
      // maxTimeToLive: 7 days in nanoseconds (recommended for II)
      const maxTimeToLive = BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000);
      
      // Use AuthClient.login() with proper configuration for redirect mode
      // This ensures AuthClient properly handles the OAuth callback when user returns
      const loginOptions: any = {
        identityProvider: iiUrl,
        // CRITICAL: onSuccess callback for redirect mode
        // When user returns from II, AuthClient will call this callback
        onSuccess: async () => {
          console.log('[II] Mobile redirect: onSuccess callback fired');
          console.log('[II] Authentication completed successfully');
          
          // Verify we have identity
          const identity = client.getIdentity();
          if (identity) {
            const principal = identity.getPrincipal();
            console.log('[II] Got principal after mobile redirect:', principal.toText());
          } else {
            console.warn('[II] onSuccess fired but no identity found');
          }
        },
        onError: (error: Error | string) => {
          console.error('[II] Mobile redirect error:', error);
          console.error('[II] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        },
        // IMPORTANT: Specify derivationOrigin for multi-domain support
        derivationOrigin: derivationOrigin,
        // Set maximum session duration (7 days)
        maxTimeToLive: maxTimeToLive,
        // Mobile devices should use window mode (redirect) not popup
        windowOpenerFeatures: undefined, // Let browser handle redirect naturally
      };
      
      console.log('[II] Calling client.login() for mobile redirect...');
      console.log('[II] Login options:', {
        identityProvider: loginOptions.identityProvider,
        derivationOrigin: loginOptions.derivationOrigin,
        maxTimeToLive: loginOptions.maxTimeToLive?.toString(),
        hasOnSuccess: !!loginOptions.onSuccess,
        hasOnError: !!loginOptions.onError
      });
      
      // Call client.login() - this will trigger redirect to II
      // When user completes authentication, II redirects back with callback params
      // AuthClient processes these params and calls onSuccess
      await client.login(loginOptions);
      
      console.log('[II] client.login() called, redirect should happen now');
      
      // If we reach here without redirect, wait a bit for redirect to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we're authenticated (might have processed immediately)
      const isAuth = await client.isAuthenticated();
      console.log('[II] After login call, authenticated:', isAuth);
      
      return isAuth;
    } catch (error) {
      console.error('[II] Failed to start mobile redirect login:', error);
      console.error('[II] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }
  
  // Desktop: Use popup mode
  console.log('[II] Desktop device detected, using popup mode');
  
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
      console.log('[II] About to open popup window...');
      
      const derivationOrigin = window.location.origin;
      console.log('[II] Using derivationOrigin for desktop:', derivationOrigin);
      
      // maxTimeToLive: 7 days in nanoseconds (recommended for II)
      const maxTimeToLive = BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000);
      
      const loginOptions: any = {
        identityProvider: iiUrl,
        // IMPORTANT: Add derivationOrigin for proper principal derivation
        derivationOrigin: derivationOrigin,
        // Set maximum session duration (7 days)
        maxTimeToLive: maxTimeToLive,
        // Specify popup window features to ensure popup opens correctly
        windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=500,height=600,left=100,top=100',
        onSuccess: async () => {
          if (!resolved) {
            console.log('[II] onSuccess callback fired');
            
            // Wait a bit for identity to be fully available
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Verify we can get the identity and principal
            try {
              const identity = client.getIdentity();
              if (!identity) {
                console.error('[II] onSuccess but no identity found, retrying...');
                // Retry a few times
                for (let i = 0; i < 3; i++) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  const retryIdentity = client.getIdentity();
                  if (retryIdentity) {
                    const principal = retryIdentity.getPrincipal();
                    console.log('[II] Identity found on retry', i + 1, ':', principal.toText());
                    resolved = true;
                    clearTimeout(timeoutId);
                    resolve(true);
                    return;
                  }
                }
                console.error('[II] Still no identity after retries');
                resolved = true;
                clearTimeout(timeoutId);
                resolve(false);
                return;
              }
              
              const principal = identity.getPrincipal();
              console.log('[II] Desktop login successful, principal:', principal.toText());
              resolved = true;
              clearTimeout(timeoutId);
              resolve(true);
            } catch (error) {
              console.error('[II] Error verifying identity after onSuccess:', error);
              resolved = true;
              clearTimeout(timeoutId);
              resolve(false);
            }
          }
        },
        onError: (error: Error | string) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            console.error('[II] Login error - onError callback fired:', error);
            console.error('[II] Error details:', {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            });
            resolve(false);
          }
        },
      };
      
      console.log('[II] Login options:', {
        identityProvider: loginOptions.identityProvider,
        derivationOrigin: loginOptions.derivationOrigin,
        maxTimeToLive: loginOptions.maxTimeToLive?.toString(),
        windowOpenerFeatures: loginOptions.windowOpenerFeatures,
        hasOnSuccess: !!loginOptions.onSuccess,
        hasOnError: !!loginOptions.onError
      });
      
      // Log before calling login (in case it throws immediately)
      console.log('[II] Calling client.login() now...');
      
      client.login(loginOptions);
      
      console.log('[II] client.login() called successfully, waiting for callback...');
      console.log('[II] Popup should be opening now. Please complete authentication in the popup window.');
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.error('[II] Login exception caught:', error);
        console.error('[II] Exception details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        });
        resolve(false);
      }
    }
  });
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
    
    // Wait a bit to ensure identity is fully ready
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const client = await getAuthClient();
    let identity = client.getIdentity();
    
    // If no identity immediately, retry a few times
    if (!identity) {
      console.warn('[II] No identity found immediately after login, retrying...');
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryClient = await getAuthClient();
        identity = retryClient.getIdentity();
        if (identity) {
          console.log(`[II] Identity found on retry ${i + 1}`);
          break;
        }
        console.log(`[II] Retry ${i + 1}/5: Still no identity...`);
      }
    }
    
    if (!identity) {
      console.error('[II] No identity found after login and retries');
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

