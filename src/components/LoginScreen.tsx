import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/components/LoginScreen.module.css';

interface LoginScreenProps {
  onEmailLoginClick?: () => void;
  onRegisterClick?: () => void;
  loading?: boolean;
  onClose?: () => void;
  closeBehavior?: 'default' | 'navigateToHome'; // New prop to control close behavior
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onEmailLoginClick,
  onRegisterClick,
  loading = false,
  onClose,
  closeBehavior = 'default'
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Handle close with optional navigation to home
  const handleClose = () => {
    if (closeBehavior === 'navigateToHome') {
      navigate('/');
    }
    onClose?.();
  };

  const hasOverlay = !onClose && closeBehavior !== 'navigateToHome';
  const screenClassName = hasOverlay 
    ? `${styles.login__screen} ${styles['login__screen--with-overlay']}`
    : styles.login__screen;

  return (
    <div className={screenClassName}>
      <div className={styles.login__container}>
        <div className={styles.login__card}>
          {(onClose || closeBehavior === 'navigateToHome') && (
            <button
              onClick={handleClose}
              className={styles.login__close}
              aria-label="Close"
            >
              <X className={styles.login__close__icon} />
            </button>
          )}
          
          <div className={styles.login__header}>
            <div className={styles.login__logo__container}>
              <img 
                src="/univoicelogo.png"
                alt="Univoice Logo" 
                className={styles.login__logo}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <h1 className={styles.login__title}>
              {t('login.welcome') || 'Welcome to Univoice'}
            </h1>
            <p className={styles.login__subtitle}>
              {t('login.subtitle') || 'Choose your preferred login method'}
            </p>
          </div>
          
          <div className={styles.login__content}>
            {/* Login Options Grid */}
            <div className={styles.login__options}>
              {/* Email Login Card - Recommended */}
              {onEmailLoginClick && (
                <div
                  onClick={() => !loading && onEmailLoginClick()}
                  className={`${styles.login__option__card} ${styles['login__option__card--recommended']}`}
                >
                  <div className={styles.login__option__icon}>
                    <LogIn className={styles.login__option__icon__svg} />
                  </div>
                  
                  <div className={styles.login__option__content}>
                    <div className={styles.login__option__header}>
                      <h3 className={styles.login__option__title}>
                        {t('login.emailLoginButton') || 'Sign in with Email'}
                      </h3>
                    </div>
                    <p className={styles.login__option__description}>
                      {t('login.emailLoginDesc') || 'Use your email and password'}
                    </p>
                  </div>
                  
                  <div className={styles.login__option__status}>
                    <CheckCircle2 className={styles.login__option__status__icon} />
                  </div>
                </div>
              )}

              {/* Google Login Card - Disabled */}
              {/* <div className={`${styles.login__option__card} ${styles['login__option__card--disabled']}`}>
                <div className={`${styles.login__option__icon} ${styles['login__option__icon--disabled']}`}>
                  <svg 
                    className={styles.login__google__icon}
                    viewBox="0 0 24 24"
                  >
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                
                <div className={styles.login__option__content}>
                  <div className={styles.login__option__header}>
                    <h3 className={`${styles.login__option__title} ${styles['login__option__title--disabled']}`}>
                      {t('login.googleButton') || 'Sign in with Google'}
                    </h3>
                  </div>
                  <p className={`${styles.login__option__description} ${styles['login__option__description--disabled']}`}>
                    {t('login.googleDesc') || 'Continue with Google account'}
                  </p>
                </div>
                
                <div className={styles.login__option__status}>
                  <span className={styles.login__option__status__text}>
                    {t('login.unavailable') || 'Unavailable'}
                  </span>
                </div>
              </div> */}
            </div>
          </div>
          
          {/* Register Section */}
          {onRegisterClick && (
            <div className={styles.login__register__section}>
              <div className={styles.login__divider}>
                <div className={styles.login__divider__line}></div>
                <div className={styles.login__divider__label}>
                  <span className={styles.login__divider__label__text}>
                    {t('login.newUser') || 'New to Univoice?'}
                  </span>
                </div>
              </div>
              
              <div
                onClick={() => !loading && onRegisterClick()}
                className={styles.login__register__card}
              >
                <div className={styles.login__register__icon}>
                  <UserPlus className={styles.login__register__icon__svg} />
                </div>
                
                <div className={styles.login__register__content}>
                  <h3 className={styles.login__register__title}>
                    {t('login.registerButton') || 'Create New Account'}
                  </h3>
                  <p className={styles.login__register__description}>
                    {t('login.registerDesc') || 'Join Univoice community today'}
                  </p>
                </div>
                
                <div className={styles.login__register__arrow}>
                  <svg 
                    className={styles.login__register__arrow__svg}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.login__footer}>
            <p className={styles.login__footer__text}>
              {t('login.terms') || 'By connecting, you agree to our Terms of Service and Privacy Policy'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
