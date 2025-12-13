import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserInfo } from '../types/user';

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

  return (
    <div className={onClose || closeBehavior === 'navigateToHome' ? "" : "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"}>
      {!onClose && closeBehavior !== 'navigateToHome' && <div className="absolute inset-0 bg-black/20"></div>}
      
      <div className="w-full max-w-md mx-auto px-3 sm:px-4 flex items-center justify-center">
        <Card 
          className="relative w-full max-w-full bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-purple-900/90 backdrop-blur-xl border-2 border-cyan-400/50 shadow-2xl"
          style={{
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            WebkitTapHighlightColor: 'transparent',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            maxWidth: '100%',
            boxSizing: 'border-box',
            // 跨平台颜色增强
            backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900 with high opacity for better contrast
          }}
        >
        {(onClose || closeBehavior === 'navigateToHome') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute right-2 top-2 text-white/90 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-lg"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <CardHeader className="text-center">
          <div 
            className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-2xl border border-cyan-400/30"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
            }}
          >
            <img 
              src="/univoicelogo.png"
              alt="ALAYA Logo" 
              className="w-14 h-14 object-contain"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle 
            className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 mb-2"
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {t('login.welcome') || 'Welcome to Univoice'}
          </CardTitle>
          <CardDescription 
            className="text-white/90 text-base"
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              // 跨平台文本对比度增强
              color: 'rgba(255, 255, 255, 0.95)',
            }}
          >
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
                className="relative group cursor-pointer rounded-xl border-2 border-cyan-400/60 bg-gradient-to-br from-slate-800/90 to-cyan-900/60 backdrop-blur-sm p-4 hover:from-slate-700/95 hover:to-cyan-800/70 hover:border-cyan-400/80 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  // 跨平台背景对比度增强
                  backgroundColor: 'rgba(30, 41, 59, 0.9)', // slate-800 with high opacity
                  borderColor: 'rgba(34, 211, 238, 0.6)', // cyan-400 with better opacity
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div 
                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 flex items-center justify-center"
                    style={{
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <LogIn className="h-6 w-6 text-cyan-400" style={{ WebkitTransform: 'translateZ(0)' }} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 
                        className="text-white font-semibold text-base leading-tight"
                        style={{
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          textRendering: 'optimizeLegibility',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          fontWeight: 600,
                          // 跨平台文本对比度增强
                          color: 'rgba(255, 255, 255, 1)',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        {t('login.emailLoginButton') || 'Sign in with Email'}
                      </h3>
                      <span 
                        className="px-2 py-0.5 text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-purple-500 rounded-md border border-cyan-400/30 whitespace-nowrap"
                        style={{
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {t('login.recommended') || 'Recommended'}
                      </span>
                    </div>
                    <p 
                      className="text-white/95 text-sm leading-relaxed"
                      style={{
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        // 跨平台文本对比度增强
                        color: 'rgba(255, 255, 255, 0.95)',
                      }}
                    >
                      {t('login.emailLoginDesc') || 'Use your email and password'}
                    </p>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-400" style={{ WebkitTransform: 'translateZ(0)' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Google Login Card - Disabled */}
            <div
              className="relative group rounded-xl border-2 border-gray-500/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-4 opacity-60 cursor-not-allowed"
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
                // 跨平台背景对比度增强
                backgroundColor: 'rgba(30, 41, 59, 0.6)', // slate-800 with reduced opacity
                borderColor: 'rgba(107, 114, 128, 0.4)', // gray-500 with reduced opacity
              }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-700/40 border border-gray-600/40 flex items-center justify-center grayscale"
                  style={{
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                  }}
                >
                  {/* Google Icon SVG */}
                  <svg 
                    className="h-6 w-6 opacity-60" 
                    viewBox="0 0 24 24"
                    style={{
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 
                      className="text-white/70 font-semibold text-base leading-tight"
                      style={{
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontWeight: 600,
                        // 跨平台文本对比度增强
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {t('login.googleButton') || 'Sign in with Google'}
                    </h3>
                  </div>
                  <p 
                    className="text-white/60 text-sm leading-relaxed"
                    style={{
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      textRendering: 'optimizeLegibility',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      // 跨平台文本对比度增强
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    {t('login.googleDesc') || 'Continue with Google account'}
                  </p>
                </div>
                
                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  <span 
                    className="text-xs text-gray-400 font-semibold"
                    style={{
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      // 跨平台颜色增强
                      color: 'rgba(156, 163, 175, 1)', // gray-400 for unavailable status
                    }}
                  >
                    {t('login.unavailable') || 'Unavailable'}
                  </span>
                </div>
            </div>
            </div>
          </div>
          
          {/* Register Section */}
          {onRegisterClick && (
            <>
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-cyan-400/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span 
                    className="px-4 bg-gradient-to-br from-slate-900/95 to-purple-900/90 text-white font-semibold rounded-full border border-cyan-400/40"
                    style={{
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      // 跨平台文本对比度增强
                      color: 'rgba(255, 255, 255, 1)',
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    }}
                  >
                    {t('login.newUser') || 'New to Univoice?'}
                  </span>
                </div>
              </div>
              
              <div
                onClick={() => !loading && onRegisterClick()}
                className="relative group cursor-pointer rounded-xl border-2 border-cyan-400/70 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40 backdrop-blur-sm p-4 hover:from-cyan-500/50 hover:via-purple-500/50 hover:to-pink-500/50 hover:border-cyan-400/90 hover:shadow-2xl hover:shadow-cyan-500/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 10px 40px -10px rgba(6, 182, 212, 0.4), 0 0 25px rgba(168, 85, 247, 0.3)',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  // 跨平台背景对比度增强
                  borderColor: 'rgba(34, 211, 238, 0.7)', // cyan-400 with better opacity
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div 
                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center"
                    style={{
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <UserPlus className="h-6 w-6 text-cyan-300" style={{ WebkitTransform: 'translateZ(0)' }} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-white font-bold text-base mb-1 leading-tight"
                      style={{
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontWeight: 700,
                      }}
                    >
                      {t('login.registerButton') || 'Create New Account'}
                    </h3>
                    <p 
                      className="text-white/95 text-sm leading-relaxed"
                      style={{
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        // 跨平台文本对比度增强
                        color: 'rgba(255, 255, 255, 0.95)',
                      }}
                    >
                      {t('login.registerDesc') || 'Join Univoice community today'}
                    </p>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <svg 
                      className="h-5 w-5 text-cyan-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      style={{
                        WebkitTransform: 'translateZ(0)',
                        transform: 'translateZ(0)',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <p 
            className="text-xs text-white/80 text-center mt-6 leading-relaxed"
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              // 跨平台文本对比度增强
              color: 'rgba(255, 255, 255, 0.85)',
            }}
          >
            {t('login.terms') || 'By connecting, you agree to our Terms of Service and Privacy Policy'}
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
