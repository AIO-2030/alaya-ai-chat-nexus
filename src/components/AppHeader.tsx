import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { EmailLoginScreen } from './EmailLoginScreen';
import { Button } from '@/components/ui/button';
import { LogOut, User, Sparkles, Menu } from 'lucide-react';
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import LanguageSwitcher from './LanguageSwitcher';

interface AppHeaderProps {
  showSidebarTrigger?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ showSidebarTrigger = true }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, loginWithGoogle, loginWithEmailPassword, registerWithEmail, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showRegisterModal, setShowRegisterModal] = React.useState(false);
  const [showEmailLoginModal, setShowEmailLoginModal] = React.useState(false);

  // Auto-close login modals when user is authenticated
  React.useEffect(() => {
    if (user) {
      if (showLoginModal) {
        console.log('[AppHeader] User authenticated, auto-closing login modal');
        setShowLoginModal(false);
      }
      if (showEmailLoginModal) {
        console.log('[AppHeader] User authenticated, auto-closing email login modal');
        setShowEmailLoginModal(false);
      }
      if (showRegisterModal) {
        console.log('[AppHeader] User authenticated, auto-closing register modal');
        setShowRegisterModal(false);
      }
    }
  }, [user, showLoginModal, showEmailLoginModal, showRegisterModal]);

  const handleGoogleLogin = async () => {
    try {
      const result = await loginWithGoogle();
      console.log('[AppHeader] Google login successful, closing modal');
      setShowLoginModal(false);
      return result;
    } catch (error) {
      console.error('[AppHeader] Google login failed:', error);
      // Don't close modal on error, let user try again
      throw error;
    }
  };

  const handleRegister = async (nickname: string, email: string, password: string) => {
    try {
      await registerWithEmail(nickname, email, password);
      console.log('[AppHeader] Registration successful, closing modal');
      setShowRegisterModal(false);
    } catch (error) {
      console.error('[AppHeader] Registration failed:', error);
      throw error;
    }
  };

  const handleShowRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleEmailLogin = async (email: string, password: string) => {
    try {
      const userInfo = await loginWithEmailPassword(email, password);
      console.log('[AppHeader] Email login successful, closing modal');
      setShowEmailLoginModal(false);
      return userInfo;
    } catch (error) {
      console.error('[AppHeader] Email login failed:', error);
      throw error;
    }
  };

  const handleShowEmailLogin = () => {
    setShowLoginModal(false);
    setShowEmailLoginModal(true);
  };

  const handleBackToLogin = () => {
    setShowRegisterModal(false);
    setShowEmailLoginModal(false);
    setShowLoginModal(true);
  };

  return (
    <>
      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            {showSidebarTrigger && (
              <SidebarTrigger className="text-white hover:bg-white/10 lg:hidden" />
            )}
            <div className="relative">
              <img 
                src="univoicelogo.png" 
                alt="ALAYA Logo" 
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
                Univoice
              </h1>
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full border border-cyan-400/30">
                <Sparkles className="h-2 w-2 md:h-3 md:w-3 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-400">AI</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* 添加多语言选择控件 */}
            <LanguageSwitcher />
            
            {user ? (
              <>
                <div 
                  className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-200"
                  onClick={() => navigate('/profile')}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-white/90">
                    <div className="text-sm font-medium">{user.name}</div>
                    {user.walletAddress && (
                      <div className="text-xs text-white/60">
                        {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
                <div 
                  className="md:hidden w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all duration-200"
                  onClick={() => navigate('/profile')}
                >
                  <User className="h-4 w-4 text-white" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 border-0 text-white font-semibold hover:from-cyan-600 hover:to-purple-600 backdrop-blur-sm px-3 md:px-6 py-2 shadow-lg transition-all duration-200 hover:shadow-xl text-xs md:text-sm"
              >
                <span className="hidden md:inline">Login</span>
                <span className="md:hidden">Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowLoginModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <LoginScreen
              onEmailLoginClick={handleShowEmailLogin}
              onRegisterClick={handleShowRegister}
              loading={authLoading}
              onClose={() => setShowLoginModal(false)}
            />
          </div>
        </div>
      )}

      {/* Email Login Modal */}
      {showEmailLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEmailLoginModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <EmailLoginScreen
              onEmailLogin={handleEmailLogin}
              onBackToLogin={handleBackToLogin}
              loading={authLoading}
              onClose={() => setShowEmailLoginModal(false)}
            />
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowRegisterModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <RegisterScreen
              onRegister={handleRegister}
              onBackToLogin={handleBackToLogin}
              loading={authLoading}
              onClose={() => setShowRegisterModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}; 