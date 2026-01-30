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
import styles from '../styles/components/AppHeader.module.css';

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
      <header className={styles.header}>
        <div className={styles.header__container}>
          {/* Left Section */}
          <div className={styles.header__left}>
            {showSidebarTrigger && (
              <SidebarTrigger className={styles.sidebar__trigger} />
            )}
            
            
            {/* Brand */}
            <div className={styles.brand}>
              <h1 className={styles.brand__name}>
                Univoice
              </h1>
              <div className={styles.brand__badge}>
                <Sparkles className={styles.brand__badge__icon} />
                <span className={styles.brand__badge__text}>AI</span>
              </div>
            </div>
          </div>
          
          {/* Right Section */}
          <div className={styles.header__right}>
            {/* Language Switcher */}
            <div className={styles.language__switcher}>
              <LanguageSwitcher />
            </div>
            
            {user ? (
              <>
                {/* Desktop User Profile */}
                <div 
                  className={styles.user__profile}
                  onClick={() => navigate('/profile')}
                >
                  <div className={styles.user__avatar}>
                    <User size={16} />
                  </div>
                  <div className={styles.user__info}>
                    <div className={styles.user__name}>{user.name}</div>
                    {user.walletAddress && (
                      <div className={styles.user__wallet}>
                        {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile User Avatar */}
                <div 
                  className={styles['user__avatar--mobile']}
                  onClick={() => navigate('/profile')}
                >
                  <User size={20} />
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={logout}
                  className={`${styles.auth__button} ${styles['auth__button--logout']}`}
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className={styles.auth__button}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className={styles.modal__overlay} 
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className={styles.modal__content}
            onClick={(e) => e.stopPropagation()}
          >
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
        <div 
          className={styles.modal__overlay} 
          onClick={() => setShowEmailLoginModal(false)}
        >
          <div 
            className={styles.modal__content}
            onClick={(e) => e.stopPropagation()}
          >
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
        <div 
          className={styles.modal__overlay} 
          onClick={() => setShowRegisterModal(false)}
        >
          <div 
            className={styles.modal__content}
            onClick={(e) => e.stopPropagation()}
          >
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
