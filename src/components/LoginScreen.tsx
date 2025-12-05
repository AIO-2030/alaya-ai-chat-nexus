import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Mail, X, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserInfo } from '../types/user';

interface LoginScreenProps {
  onWalletLogin: () => Promise<UserInfo>;
  onGoogleLogin: () => Promise<UserInfo>;
  onEmailLoginClick?: () => void;
  onRegisterClick?: () => void;
  loading?: boolean;
  onClose?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onWalletLogin,
  onGoogleLogin,
  onEmailLoginClick,
  onRegisterClick,
  loading = false,
  onClose
}) => {
  const { t } = useTranslation();
  return (
    <div className={onClose ? "" : "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"}>
      {!onClose && <div className="absolute inset-0 bg-black/20"></div>}
      
      <Card className="relative w-full max-w-md mx-4 bg-white/10 backdrop-blur-lg border-white/20">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-2 top-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-2xl border border-cyan-400/30">
            <img 
              src="/univoicelogo.png"
              alt="ALAYA Logo" 
              className="w-14 h-14 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 mb-2">
            {t('login.welcome') || 'Welcome to Univoice'}
          </CardTitle>
          <CardDescription className="text-gray-300 text-base">
            {t('login.subtitle') || 'Choose your preferred login method'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Login Options Grid - Card Style */}
          <div className="grid grid-cols-1 gap-3">
            {/* Email Login Card - Recommended */}
            {onEmailLoginClick && (
              <div
                onClick={() => !loading && onEmailLoginClick()}
                className="relative group cursor-pointer rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <LogIn className="h-6 w-6 text-cyan-400" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-base">
                        {t('login.emailLoginButton') || 'Sign in with Email'}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-purple-500 rounded-md border border-cyan-400/30">
                        {t('login.recommended') || 'Recommended'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {t('login.emailLoginDesc') || 'Use your email and password'}
                    </p>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Login Card */}
            <div
              onClick={() => !loading && onWalletLogin()}
              className="relative group cursor-pointer rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-400" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-base">
                      {t('login.walletButton') || 'Connect with Plug Wallet'}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {t('login.walletDesc') || 'Connect your Plug wallet'}
                  </p>
                </div>
                
                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-400">{t('login.detected') || 'Detected'}</span>
                </div>
              </div>
            </div>

            {/* Google Login Card */}
            <div
              onClick={() => !loading && onGoogleLogin()}
              className="relative group cursor-pointer rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 hover:border-red-400/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  {/* Google Icon SVG */}
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-base">
                      {t('login.googleButton') || 'Sign in with Google'}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {t('login.googleDesc') || 'Continue with Google account'}
                  </p>
                </div>
                
                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-400">{t('login.available') || 'Available'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Register Section */}
          {onRegisterClick && (
            <>
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-gray-300 font-medium">{t('login.newUser') || 'New to Univoice?'}</span>
                </div>
              </div>
              
              <div
                onClick={() => !loading && onRegisterClick()}
                className="relative group cursor-pointer rounded-xl border-2 border-transparent bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm p-4 hover:from-cyan-500/30 hover:via-purple-500/30 hover:to-pink-500/30 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 10px 40px -10px rgba(6, 182, 212, 0.2), 0 0 20px rgba(168, 85, 247, 0.15)',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-cyan-300" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base mb-1">
                      {t('login.registerButton') || 'Create New Account'}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {t('login.registerDesc') || 'Join Univoice community today'}
                    </p>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            {t('login.terms') || 'By connecting, you agree to our Terms of Service and Privacy Policy'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
