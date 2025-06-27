
import React from 'react';
import { useAuth } from '../lib/auth';
import { LoginScreen } from '../components/LoginScreen';
import { ChatBox } from '../components/ChatBox';
import { AlignmentPanel } from '../components/AlignmentPanel';
import { useChatSession } from '../hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading, loginWithWallet, loginWithGoogle, logout } = useAuth();
  const { session } = useChatSession();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onWalletLogin={loginWithWallet}
        onGoogleLogin={loginWithGoogle}
        loading={authLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <h1 className="text-xl font-bold text-white">ALAYA AI Platform</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/80">
              <User className="h-4 w-4" />
              <span className="text-sm">
                {user.name}
                {user.walletAddress && (
                  <span className="ml-2 text-xs text-white/60">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </span>
                )}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Chat Area */}
        <div className="flex-1 flex">
          <div className="flex-1 m-4 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border border-white/20">
            <ChatBox />
          </div>
        </div>

        {/* Alignment Panel */}
        <AlignmentPanel session={session} className="m-4 mr-4 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border border-white/20" />
      </div>
    </div>
  );
};

export default Index;
