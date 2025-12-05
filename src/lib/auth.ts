
import { useState, useEffect } from 'react';
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth';
import i18n from '../i18n';
import { connectPlugAndGetPrincipal } from './wallet';
import { setPrincipalId, clearPrincipalId } from './principal';
import { logoutII } from './ii';
import { generatePrincipalForNonPlug, deriveStablePseudoPrincipal } from './identity';
import { syncUserInfo, registerUserWithEmail, loginUserWithEmail } from '../services/api/userApi';
import type { UserInfo, LoginStatus } from '../types/user';

export interface User {
  id: string;
  name: string;
  email?: string;
  walletAddress?: string;
  picture?: string;
  loginMethod: 'wallet' | 'google';
}

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use Google OAuth hook
  const {
    user: googleUser,
    loading: googleLoading,
    error: googleError,
    loginWithGoogle: googleLogin,
    logout: googleLogout,
    validateUser: validateGoogleUser,
    isAuthenticated: isGoogleAuthenticated
  } = useGoogleAuth();

  useEffect(() => {
    // Check existing session from sessionStorage (tab-isolated)
    const savedUser = sessionStorage.getItem('alaya_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Developer log for loaded user info from storage
        console.log('[Auth] Loaded user info from session storage:', parsedUser);
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        sessionStorage.removeItem('alaya_user');
      }
    }
    
    // Check if this is a redirect callback from II after Google login
    // Scenario: User clicked Google login → Google OAuth completed → II redirect → back to app
    const urlParams = new URLSearchParams(window.location.search);
    const hasCallbackParams = urlParams.has('code') || window.location.hash.length > 0;
    
    // Check if there's a Google user in sessionStorage (from before II redirect)
    const savedGoogleUser = sessionStorage.getItem('google_user');
    
    // Handle II redirect callback - this happens when user returns from II after authentication
    if (hasCallbackParams || savedGoogleUser) {
      const isAndroidDevice = /Android/.test(navigator.userAgent);
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      console.log('[Auth] Checking for II redirect callback or pending Google login...');
      console.log('[Auth] Platform:', {
        isAndroid: isAndroidDevice,
        isIOS: isIOSDevice,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });
      console.log('[Auth] Has callback params:', hasCallbackParams, 'Has Google user:', !!savedGoogleUser);
      console.log('[Auth] Current user state:', user ? 'has user' : 'no user');
      console.log('[Auth] Callback URL params:', window.location.search);
      console.log('[Auth] Callback hash:', window.location.hash);
      
      // Wait for AuthClient to process redirect callback
      (async () => {
        try {
          // For mobile devices, give AuthClient more time to initialize
          const initialWait = isAndroidDevice ? 800 : isIOSDevice ? 500 : 300;
          console.log(`[Auth] Waiting ${initialWait}ms for AuthClient initialization on ${isAndroidDevice ? 'Android' : isIOSDevice ? 'iOS' : 'Desktop'}...`);
          await new Promise(resolve => setTimeout(resolve, initialWait));
          
          // For redirect mode, we need to call ensureIILogin to process the callback
          // But only if we have callback params (means we just came back from II)
          if (hasCallbackParams) {
            console.log('[Auth] Callback params detected, calling ensureIILogin to process...');
            console.log('[Auth] This is a redirect callback from II after authentication');
            
            const { ensureIILogin } = await import('./ii');
            const iiLoginResult = await ensureIILogin();
            
            console.log('[Auth] ensureIILogin result:', iiLoginResult);
            
            if (!iiLoginResult) {
              console.warn('[Auth] ensureIILogin returned false, II authentication may have failed');
              console.warn('[Auth] This might indicate a callback processing issue on mobile device');
              
              // On mobile, try one more time with a longer wait
              if (isAndroidDevice || isIOSDevice) {
                console.log('[Auth] Mobile device: Retrying ensureIILogin after additional wait...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const retryResult = await ensureIILogin();
                console.log('[Auth] Retry ensureIILogin result:', retryResult);
                
                if (!retryResult) {
                  console.error('[Auth] Retry also failed, giving up');
                  return;
                }
              } else {
                return;
              }
            }
            
            console.log('[Auth] II authentication confirmed after callback');
          } else {
            // No callback params but we have Google user - check if already authenticated
            console.log('[Auth] No callback params, checking if II already authenticated...');
            
            // Wait a bit more for session restoration on mobile
            if (isAndroidDevice || isIOSDevice) {
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            const { getAuthClient } = await import('./ii');
            const client = await getAuthClient();
            const isIITAuthed = await client.isAuthenticated();
            
            console.log('[Auth] II authentication status (no callback):', isIITAuthed);
            
            if (!isIITAuthed) {
              console.log('[Auth] II not authenticated, user needs to complete II login');
              return;
            }
          }
          
          // At this point, II should be authenticated
          // If we have Google user but no alaya_user, complete the login
          if (savedGoogleUser && !savedUser) {
            console.log('[Auth] Detected Google user + II auth, completing login...');
            console.log('[Auth] Platform context:', {
              isAndroid: isAndroidDevice,
              isIOS: isIOSDevice,
              hasCallbackParams
            });
            
            try {
              const googleUserData = JSON.parse(savedGoogleUser);
              console.log('[Auth] Parsed Google user data:', {
                id: googleUserData.id,
                name: googleUserData.name,
                email: googleUserData.email
              });
              
              // Get principal from II (should already be authenticated now)
              const { getAuthClient } = await import('./ii');
              const client = await getAuthClient();
              
              // For mobile devices (especially Android), may need more time for identity to be available
              let identity = client.getIdentity();
              
              if (!identity) {
                console.error('[Auth] No identity found after II redirect, retrying with multiple attempts...');
                
                // Retry with progressively longer waits (especially important for Android)
                const maxRetries = isAndroidDevice ? 8 : 5;
                const baseWait = isAndroidDevice ? 500 : 300;
                
                for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
                  await new Promise(resolve => setTimeout(resolve, baseWait * (retryCount + 1)));
                  
                  const retryClient = await getAuthClient();
                  identity = retryClient.getIdentity();
                  
                  if (identity) {
                    console.log(`[Auth] Identity found after retry ${retryCount + 1}`);
                    break;
                  } else {
                    console.log(`[Auth] Retry ${retryCount + 1}/${maxRetries}: Still no identity, waiting more...`);
                  }
                }
                
                if (!identity) {
                  console.error('[Auth] Still no identity after all retries, II authentication incomplete');
                  console.error('[Auth] This may indicate a callback processing issue on mobile device');
                  console.error('[Auth] Device info:', {
                    isAndroid: isAndroidDevice,
                    isIOS: isIOSDevice,
                    userAgent: navigator.userAgent
                  });
                  return;
                }
              }
              
              const principalId = identity.getPrincipal().toText();
              console.log('[Auth] Got principal after redirect:', principalId);
              
              const userInfo: UserInfo = {
                userId: `google_${googleUserData.id}`,
                principalId,
                name: googleUserData.name,
                nickname: googleUserData.name,
                loginMethod: 'google',
                loginStatus: 'authenticated',
                email: googleUserData.email,
                picture: googleUserData.picture,
              };
              
              console.log('[Auth] Syncing user info...');
              const synced = await syncUserInfo(userInfo);
              console.log('[Auth] Completed login after II redirect:', synced);
              setUser(synced);
              sessionStorage.setItem('alaya_user', JSON.stringify(synced));
              
              // Clean URL
              if (hasCallbackParams) {
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('[Auth] URL cleaned');
              }
              
              console.log('[Auth] Login flow completed successfully!');
            } catch (error) {
              console.error('[Auth] Error completing login after II redirect:', error);
              console.error('[Auth] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
              });
            }
          } else if (savedUser) {
            console.log('[Auth] User already exists, login already completed');
          } else {
            console.log('[Auth] No Google user found, nothing to complete');
          }
        } catch (error) {
          console.error('[Auth] Error checking II redirect callback:', error);
          console.error('[Auth] Full error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
          });
        }
      })();
    }
    
    setLoading(false);
  }, []);

  // NOTE: Removed auto-sync useEffect that was triggering II login on page load
  // Now using browser-based principal generation for non-Plug users
  // (e.g., Google login -> loginWithGoogle -> generatePrincipalForNonPlug -> browser fingerprint-based principal)

  const loginWithWallet = async () => {
    try {
      // Real Plug wallet integration
      const principalText = await connectPlugAndGetPrincipal();
      setPrincipalId(principalText);

      const userInfo: UserInfo = {
        userId: 'plug_' + principalText,
        principalId: principalText,
        name: 'Plug User',
        nickname: 'Plug User',
        loginMethod: 'wallet',
        loginStatus: 'authenticated',
        walletAddress: principalText,
      };
      const synced = await syncUserInfo(userInfo);
      console.log('[Auth] Wallet login synced user info:', synced);
      setUser(synced);
      sessionStorage.setItem('alaya_user', JSON.stringify(synced));

      return synced;
    } catch (error) {
      console.error('Wallet login failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('[Auth] Starting Google login...');
      console.log('[Auth] User agent:', navigator.userAgent);
      console.log('[Auth] Platform:', navigator.platform);
      
      // Use Google OAuth hook login method
      const googleUserData = await googleLogin();
      console.log('[Auth] Google OAuth completed, user data:', {
        id: googleUserData.id,
        name: googleUserData.name,
        email: googleUserData.email
      });
      
      // Convert to unified UserInfo and generate browser-based principal
      console.log('[Auth] Starting browser-based principal generation...');
      console.log('[Auth] About to call generatePrincipalForNonPlug...');
      
      try {
        const principalId = await generatePrincipalForNonPlug(googleUserData.id);
        console.log('[Auth] Browser-based principal obtained:', principalId);
        
        setPrincipalId(principalId);
        const userInfo: UserInfo = {
          userId: `google_${googleUserData.id}`,
          principalId,
          name: googleUserData.name,
          nickname: googleUserData.name,
          loginMethod: 'google',
          loginStatus: 'authenticated',
          email: googleUserData.email,
          picture: googleUserData.picture,
        };
        
        console.log('[Auth] Syncing user info to backend...');
        const synced = await syncUserInfo(userInfo);
        console.log('[Auth] Google login synced user info:', synced);
        
        setUser(synced);
        sessionStorage.setItem('alaya_user', JSON.stringify(synced));
        
        return synced;
      } catch (principalError) {
        console.error('[Auth] Browser-based principal generation failed:', principalError);
        console.error('[Auth] Error details:', {
          message: principalError instanceof Error ? principalError.message : String(principalError),
          stack: principalError instanceof Error ? principalError.stack : undefined,
          name: principalError instanceof Error ? principalError.name : undefined
        });
        
        // Re-throw with more context
        throw new Error(`Browser-based principal generation failed: ${principalError instanceof Error ? principalError.message : String(principalError)}`);
      }
    } catch (error) {
      console.error('[Auth] Google login failed:', error);
      console.error('[Auth] Full error:', error);
      throw error;
    }
  };

  /**
   * Register a new user with email and password
   */
  const registerWithEmail = async (nickname: string, email: string, password: string): Promise<UserInfo> => {
    try {
      console.log('[Auth] Starting email registration...');
      
      // Register user and get principal ID
      const principalId = await registerUserWithEmail(email, password, nickname);
      
      // Create user info object
      const userInfo: UserInfo = {
        userId: `email_${email}`,
        principalId,
        name: nickname,
        nickname,
        loginMethod: 'ii', // Using 'ii' for email registration
        loginStatus: 'authenticated',
        email,
      };

      // Save user info to session
      setUser(userInfo);
      sessionStorage.setItem('alaya_user', JSON.stringify(userInfo));
      setPrincipalId(principalId);

      console.log('[Auth] Email registration successful:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('[Auth] Email registration failed:', error);
      throw error;
    }
  };

  /**
   * Login with email and password
   */
  const loginWithEmailPassword = async (email: string, password: string): Promise<UserInfo> => {
    try {
      console.log('[Auth] Starting email login...');
      
      // Login user and get user info
      const userInfo = await loginUserWithEmail(email, password);
      
      if (!userInfo) {
        throw new Error('User not found');
      }

      // Save user info to session
      setUser(userInfo);
      sessionStorage.setItem('alaya_user', JSON.stringify(userInfo));
      setPrincipalId(userInfo.principalId);

      console.log('[Auth] Email login successful:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('[Auth] Email login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // If it's a Google user, call Google logout (only for Google OAuth cleanup)
      if (user?.loginMethod === 'google') {
        await googleLogout();
      }
      // No need to call II logout - logout is only for local dapp state cleanup
      
      // Clear local state
      setUser(null);
      sessionStorage.removeItem('alaya_user');
      clearPrincipalId();
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if error occurs
      setUser(null);
      sessionStorage.removeItem('alaya_user');
      clearPrincipalId();
    }
  };

  // Validate user status
  const validateUser = async () => {
    if (!user) return false;
    
    if (user.loginMethod === 'google') {
      return await validateGoogleUser();
    }
    
    // For wallet users, you can add other validation logic
    return true;
  };

  // Check if authenticated
  const isAuthenticated = () => {
    if (user?.loginMethod === 'google') {
      return isGoogleAuthenticated();
    }
    return !!user;
  };

  return {
    user,
    loading: loading || googleLoading,
    error: googleError,
    loginWithWallet,
    loginWithGoogle,
    loginWithEmailPassword,
    registerWithEmail,
    logout,
    validateUser,
    isAuthenticated
  };
};
