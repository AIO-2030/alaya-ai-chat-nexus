
import { useState, useEffect } from 'react';
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth';
import i18n from '../i18n';
import { connectPlugAndGetPrincipal } from './wallet';
import { setPrincipalId, clearPrincipalId } from './principal';
import { logoutII } from './ii';
import { generatePrincipalForNonPlug, deriveStablePseudoPrincipal } from './identity';
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
    setLoading(false);
  }, []);

  // Sync Google user status - 只在自动登录时调用，手动登录时不调用
  useEffect(() => {
    if (!googleUser) return;
    
    // 避免在手动登录时重复同步
    // 如果用户已经登录且是 Google 登录，可能是手动登录完成的
    if (user && user.loginMethod === 'google' && user.userId === `google_${googleUser.id}`) {
      console.log('[Auth] Skipping auto-sync, user already logged in via manual login');
      return;
    }
    
    // 只在页面加载时自动登录时才触发 II
    (async () => {
      try {
        console.log('[Auth] Auto-syncing Google user with II...');
        
        // Use II to get real principal for Google users (correct logic)
        const principalId = await generatePrincipalForNonPlug(googleUser.id);
        console.log('[Auth] Auto-sync obtained principal:', principalId);
        
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
        console.log('[Auth] Auto-sync completed:', synced);
        setUser(synced);
        sessionStorage.setItem('alaya_user', JSON.stringify(synced));
      } catch (error) {
        console.error('[Auth] Auto-sync failed:', error);
        // 不抛出错误，避免阻止页面加载
      }
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
      
      // Use Google OAuth hook login method
      const googleUserData = await googleLogin();
      console.log('[Auth] Google OAuth completed');
      
      // Convert to unified UserInfo and generate II principal (correct logic)
      console.log('[Auth] Starting II principal generation...');
      const principalId = await generatePrincipalForNonPlug(googleUserData.id);
      console.log('[Auth] II principal obtained:', principalId);
      
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
    } catch (error) {
      console.error('[Auth] Google login failed:', error);
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
    logout,
    validateUser,
    isAuthenticated
  };
};
