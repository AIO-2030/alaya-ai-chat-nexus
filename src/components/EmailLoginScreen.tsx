import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Mail, Lock, ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserInfo } from '../types/user';

interface EmailLoginScreenProps {
  onEmailLogin: (email: string, password: string) => Promise<UserInfo>;
  onBackToLogin: () => void;
  loading?: boolean;
  onClose?: () => void;
}

export const EmailLoginScreen: React.FC<EmailLoginScreenProps> = ({
  onEmailLogin,
  onBackToLogin,
  loading = false,
  onClose
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validateForm = (): boolean => {
    setError('');

    if (!email.trim()) {
      setError(t('emailLogin.error.emailRequired') || 'Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('emailLogin.error.emailInvalid') || 'Invalid email format');
      return false;
    }

    if (!password) {
      setError(t('emailLogin.error.passwordRequired') || 'Password is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onEmailLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('emailLogin.error.loginFailed') || 'Login failed');
    }
  };

  return (
    <div className={onClose ? "" : "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"}>
      {!onClose && <div className="absolute inset-0 bg-black/20"></div>}
      
      <Card className="relative w-full max-w-md mx-4 bg-white/10 backdrop-blur-lg border-white/20">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-2 top-2 text-white/70 hover:text-white hover:bg-white/10 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToLogin}
          className="absolute left-2 top-2 text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('emailLogin.back') || 'Back'}
        </Button>
        
        <CardHeader className="text-center pt-12">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-2xl border border-cyan-400/30">
            <Mail className="h-8 w-8 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {t('emailLogin.title') || 'Email Login'}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {t('emailLogin.subtitle') || 'Sign in with your email and password'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                {t('emailLogin.email') || 'Email'}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailLogin.emailPlaceholder') || 'Enter your email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                {t('emailLogin.password') || 'Password'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('emailLogin.passwordPlaceholder') || 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-md bg-red-500/20 border border-red-500/50">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 active:from-cyan-600 active:via-purple-600 active:to-pink-600 text-white font-bold py-6 shadow-2xl hover:shadow-cyan-500/50 active:shadow-cyan-500/30 border-2 border-transparent hover:border-cyan-300/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 10px 40px -10px rgba(6, 182, 212, 0.4), 0 0 20px rgba(168, 85, 247, 0.3)',
                WebkitTapHighlightColor: 'rgba(6, 182, 212, 0.3)',
              }}
            >
              <LogIn className="h-5 w-5 mr-3 drop-shadow-sm" />
              <span className="drop-shadow-sm">
                {loading ? (t('emailLogin.loggingIn') || 'Signing in...') : (t('emailLogin.submit') || 'Sign In')}
              </span>
            </Button>
          </form>
          
          <p className="text-xs text-gray-400 text-center mt-6">
            {t('emailLogin.terms') || 'By signing in, you agree to our Terms of Service and Privacy Policy'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

