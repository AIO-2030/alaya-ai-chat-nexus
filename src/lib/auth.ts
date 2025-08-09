
import { useState, useEffect } from 'react';
import { useGoogleAuth, GoogleUser } from '../hooks/useGoogleAuth';

export interface User {
  id: string;
  name: string;
  email?: string;
  walletAddress?: string;
  picture?: string;
  loginMethod: 'wallet' | 'google';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
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
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        localStorage.removeItem('alaya_user');
      }
    }
    setLoading(false);
  }, []);

  // Sync Google user status
  useEffect(() => {
    if (googleUser) {
      const userData: User = {
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        picture: googleUser.picture,
        loginMethod: 'google'
      };
      setUser(userData);
      localStorage.setItem('alaya_user', JSON.stringify(userData));
    }
  }, [googleUser]);

  const loginWithWallet = async () => {
    try {
      // Simulate Plug wallet integration
      console.log('Connecting to Plug wallet...');
      
      // Mock wallet connection - replace with actual Plug integration
      const mockUser: User = {
        id: 'wallet_' + Date.now(),
        name: 'Wallet User',
        walletAddress: '0x' + Math.random().toString(16).substring(2, 10),
        loginMethod: 'wallet'
      };
      
      setUser(mockUser);
      localStorage.setItem('alaya_user', JSON.stringify(mockUser));
      
      return mockUser;
    } catch (error) {
      console.error('Wallet login failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Use Google OAuth hook login method
      const googleUserData = await googleLogin();
      
      // Convert to common user format
      const userData: User = {
        id: googleUserData.id,
        name: googleUserData.name,
        email: googleUserData.email,
        picture: googleUserData.picture,
        loginMethod: 'google'
      };
      
      setUser(userData);
      localStorage.setItem('alaya_user', JSON.stringify(userData));
      
      return userData;
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
      
      // Clear local state
      setUser(null);
      localStorage.removeItem('alaya_user');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if error occurs
      setUser(null);
      localStorage.removeItem('alaya_user');
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
