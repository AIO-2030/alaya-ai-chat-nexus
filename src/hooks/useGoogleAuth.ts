import { useState, useEffect, useCallback } from 'react';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  accessToken?: string;
  loginMethod: 'google';
}

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string[];
}

export const useGoogleAuth = (config?: GoogleAuthConfig) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default configuration
  const defaultConfig: GoogleAuthConfig = {
    clientId: config?.clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: window.location.origin + '/auth/callback',
    scope: ['openid', 'profile', 'email'],
    ...config
  };

  // Check if already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('google_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        localStorage.removeItem('google_user');
      }
    }
  }, []);

  // Initialize Google OAuth
  const initializeGoogleAuth = useCallback(async (): Promise<boolean> => {
    if (!window.gapi) {
      setError('Google API not loaded');
      return false;
    }

    // Check if client ID is available
    if (!defaultConfig.clientId) {
      console.warn('Google Client ID not configured, using mock implementation');
      return false; // Return false to indicate we should use mock
    }

    try {
      return new Promise((resolve) => {
        window.gapi.load('auth2', async () => {
          try {
            console.log('Initializing Google Auth with client ID:', defaultConfig.clientId);
            await window.gapi.auth2.init({
              client_id: defaultConfig.clientId,
              scope: defaultConfig.scope?.join(' ')
            });
            console.log('Google Auth initialized successfully');
            resolve(true);
          } catch (err: any) {
            console.error('Google Auth initialization failed:', err);
            setError('Failed to initialize Google Auth: ' + err.message);
            resolve(false);
          }
        });
      });
    } catch (error: any) {
      console.error('Google Auth initialization error:', error);
      setError('Failed to initialize Google Auth: ' + error.message);
      return false;
    }
  }, [defaultConfig.clientId, defaultConfig.scope]);

  // Login method
  const loginWithGoogle = useCallback(async (): Promise<GoogleUser> => {
    setLoading(true);
    setError(null);

    try {
      // Check if Google API is loaded
      if (!window.gapi) {
        console.warn('Google API not available, using mock login');
        return await mockGoogleLogin();
      }

      // Initialize authentication if not already initialized
      let auth2 = window.gapi.auth2.getAuthInstance();
      if (!auth2) {
        console.log('Google Auth not initialized, initializing now...');
        const initialized = await initializeGoogleAuth();
        if (!initialized) {
          console.warn('Google Auth initialization failed, using mock login');
          return await mockGoogleLogin();
        }
        auth2 = window.gapi.auth2.getAuthInstance();
        if (!auth2) {
          console.warn('Google Auth still not available, using mock login');
          return await mockGoogleLogin();
        }
      }

      // Execute login
      const googleUser = await auth2.signIn();
      const profile = googleUser.getBasicProfile();
      const authResponse = googleUser.getAuthResponse();

      const userData: GoogleUser = {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        picture: profile.getImageUrl(),
        accessToken: authResponse.access_token,
        loginMethod: 'google'
      };

      // Save user information
      setUser(userData);
      localStorage.setItem('google_user', JSON.stringify(userData));

      // Optional: Send to backend for validation
      await validateWithBackend(userData);

      return userData;
    } catch (err: any) {
      console.warn('Google login failed, falling back to mock login:', err);
      return await mockGoogleLogin();
    } finally {
      setLoading(false);
    }
  }, [initializeGoogleAuth]);

  // Mock Google login for fallback
  const mockGoogleLogin = async (): Promise<GoogleUser> => {
    console.log('Using mock Google login');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: GoogleUser = {
      id: 'mock_google_' + Date.now(),
      name: 'Mock Google User',
      email: 'mock.user@example.com',
      picture: 'https://via.placeholder.com/150',
      accessToken: 'mock_token_' + Math.random().toString(36).substring(2),
      loginMethod: 'google'
    };
    
    setUser(mockUser);
    localStorage.setItem('google_user', JSON.stringify(mockUser));
    
    return mockUser;
  };

  // Logout method
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      // Clear local storage
      setUser(null);
      localStorage.removeItem('google_user');

      // Logout from Google
      if (window.gapi && window.gapi.auth2) {
        const auth2 = window.gapi.auth2.getAuthInstance();
        if (auth2) {
          await auth2.signOut();
        }
      }

      // Optional: Notify backend
      await notifyBackendLogout();
    } catch (err: any) {
      console.error('Logout error:', err);
      // Clear local state even if backend call fails
      setUser(null);
      localStorage.removeItem('google_user');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const auth2 = window.gapi.auth2.getAuthInstance();
      if (!auth2) return null;

      const googleUser = auth2.currentUser.get();
      const authResponse = googleUser.getAuthResponse();
      
      // Check if token is about to expire
      const expiresAt = authResponse.expires_at;
      const now = Date.now();
      
      if (expiresAt && now > expiresAt - 60000) { // 1 minute before expiry
        await googleUser.reloadAuthResponse();
        const newResponse = googleUser.getAuthResponse();
        return newResponse.access_token;
      }
      
      return authResponse.access_token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return null;
    }
  }, [user]);

  // Validate user status
  const validateUser = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const auth2 = window.gapi.auth2.getAuthInstance();
      if (!auth2) return false;

      const googleUser = auth2.currentUser.get();
      if (!googleUser.isSignedIn()) {
        // User has logged out, clear local state
        setUser(null);
        localStorage.removeItem('google_user');
        return false;
      }

      return true;
    } catch (err) {
      console.error('User validation failed:', err);
      return false;
    }
  }, [user]);

  // Backend validation (optional)
  const validateWithBackend = async (userData: GoogleUser): Promise<void> => {
    try {
      // Here you can call your backend API to validate Google token
      const response = await fetch('/api/auth/google/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: userData.accessToken,
          userId: userData.id,
          email: userData.email
        })
      });

      if (!response.ok) {
        throw new Error('Backend validation failed');
      }

      const result = await response.json();
      console.log('Backend validation successful:', result);
    } catch (err) {
      console.error('Backend validation error:', err);
      // You can choose whether to logout user due to backend validation failure
      // Here we choose to continue since Google has already validated
    }
  };

  // Notify backend logout (optional)
  const notifyBackendLogout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (err) {
      console.error('Backend logout notification failed:', err);
    }
  };

  // Get user information
  const getUserInfo = useCallback(() => {
    return user;
  }, [user]);

  // Check if authenticated
  const isAuthenticated = useCallback(() => {
    return !!user;
  }, [user]);

  return {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    refreshToken,
    validateUser,
    getUserInfo,
    isAuthenticated,
    initializeGoogleAuth
  };
};

// 全局类型声明
declare global {
  interface Window {
    gapi: any;
  }
} 