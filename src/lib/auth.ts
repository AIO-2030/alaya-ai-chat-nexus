
import { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email?: string;
  walletAddress?: string;
  loginMethod: 'wallet' | 'google';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('alaya_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const loginWithWallet = async () => {
    try {
      // Simulated Plug wallet integration
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
      // Simulated Google OAuth - replace with actual implementation
      console.log('Connecting to Google OAuth...');
      
      const mockUser: User = {
        id: 'google_' + Date.now(),
        name: 'Google User',
        email: 'user@example.com',
        loginMethod: 'google'
      };
      
      setUser(mockUser);
      localStorage.setItem('alaya_user', JSON.stringify(mockUser));
      
      return mockUser;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('alaya_user');
  };

  return {
    user,
    loading,
    loginWithWallet,
    loginWithGoogle,
    logout
  };
};
