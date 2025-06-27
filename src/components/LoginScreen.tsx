
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Mail, X } from 'lucide-react';
import { User } from '../lib/auth';

interface LoginScreenProps {
  onWalletLogin: () => Promise<User>;
  onGoogleLogin: () => Promise<User>;
  loading?: boolean;
  onClose?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onWalletLogin,
  onGoogleLogin,
  loading = false,
  onClose
}) => {
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
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <img 
              src="/lovable-uploads/4c0b9cd0-ccd5-4f74-b97b-14d74d4179c0.png" 
              alt="ALAYA Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Welcome to ALAYA
          </CardTitle>
          <CardDescription className="text-gray-300">
            Connect your wallet or sign in with Google to access enhanced features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={onWalletLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Connect with Plug Wallet
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-400"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-300">or</span>
            </div>
          </div>
          
          <Button
            onClick={onGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full bg-white/90 hover:bg-white text-gray-900 border-white/30"
          >
            <Mail className="h-5 w-5 mr-2" />
            Sign in with Google
          </Button>
          
          <p className="text-xs text-gray-400 text-center mt-6">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
