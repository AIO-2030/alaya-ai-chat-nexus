
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Mail } from 'lucide-react';

interface LoginScreenProps {
  onWalletLogin: () => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  loading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onWalletLogin,
  onGoogleLogin,
  loading = false
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="relative w-full max-w-md mx-4 bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Welcome to ALAYA
          </CardTitle>
          <CardDescription className="text-gray-300">
            Connect your wallet or sign in with Google to access the AI chat platform
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
