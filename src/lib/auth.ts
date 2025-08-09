
import { useState, useEffect } from 'react';
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth';
import i18n from '../i18n';
import { connectPlugAndGetPrincipal } from './wallet';
import { setPrincipalId, clearPrincipalId } from './principal';
import { logoutII } from './ii';
import { generatePrincipalForNonPlug } from './identity';
import { syncUserInfo } from '../services/api/userApi';
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
    // Check existing session
    const savedUser = localStorage.getItem('alaya_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Developer log for loaded user info from storage
        console.log('[Auth] Loaded user info from storage:', parsedUser);
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        localStorage.removeItem('alaya_user');
      }
    }
    setLoading(false);
  }, []);

  // Sync Google user status
  useEffect(() => {
    if (!googleUser) return;
    // Avoid duplicate sync if already set from explicit login
    if (user && user.loginMethod === 'google' && user.userId === `google_${googleUser.id}`) return;
    (async () => {
      const principalId = await generatePrincipalForNonPlug(googleUser.id);
      setPrincipalId(principalId);
      const userInfo: UserInfo = {
        userId: `google_${googleUser.id}`,
        principalId,
        name: googleUser.name,
        nickname: googleUser.name,
        loginMethod: 'google',
        loginStatus: 'authenticated',
        email: googleUser.email,
        picture: googleUser.picture,
      };
      const synced = await syncUserInfo(userInfo);
      setUser(synced);
      localStorage.setItem('alaya_user', JSON.stringify(synced));
    })();
  }, [googleUser, user]);

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
      localStorage.setItem('alaya_user', JSON.stringify(synced));

      return synced;
    } catch (error) {
      console.error('Wallet login failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Use Google OAuth hook login method
      const googleUserData = await googleLogin();
      
      // Convert to unified UserInfo and generate II principal (mock)
      const principalId = await generatePrincipalForNonPlug(googleUserData.id);
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
      const synced = await syncUserInfo(userInfo);
      console.log('[Auth] Google login synced user info:', synced);
      setUser(synced);
      localStorage.setItem('alaya_user', JSON.stringify(synced));
      
      return synced;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // If it's a Google user, call Google logout
      if (user?.loginMethod === 'google') {
        await googleLogout();
      }
      // Also logout from II when applicable
      try { await logoutII(); } catch {}
      
      // Clear local state
      setUser(null);
      localStorage.removeItem('alaya_user');
      clearPrincipalId();
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if error occurs
      setUser(null);
      localStorage.removeItem('alaya_user');
      clearPrincipalId();
      try { await logoutII(); } catch {}
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
    logout,
    validateUser,
    isAuthenticated
  };
};
