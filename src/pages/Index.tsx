
import React from 'react';
import { useAuth } from '../lib/auth';
import { LoginScreen } from '../components/LoginScreen';
import { ChatBox } from '../components/ChatBox';
import { AlignmentPanel } from '../components/AlignmentPanel';
import { useChatSession } from '../hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { LogOut, User, LogIn } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Index = () => {
  const { user, loading: authLoading, loginWithWallet, loginWithGoogle, logout } = useAuth();
  const { session } = useChatSession();
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const handleWalletLogin = async () => {
    const result = await loginWithWallet();
    setShowLoginModal(false);
    return result;
  };

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle();
    setShowLoginModal(false);
    return result;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/b0d23229-5043-46b5-a029-b56932ceb4cf.png" 
              alt="ALAYA Logo" 
              className="w-10 h-10"
            />
            <h1 className="text-xl font-bold text-white">ALAYA AI Platform</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
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
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowLoginModal(true)}>
                    Connect with Plug Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowLoginModal(true)}>
                    Sign in with Google
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLoginModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <LoginScreen
              onWalletLogin={handleWalletLogin}
              onGoogleLogin={handleGoogleLogin}
              loading={authLoading}
              onClose={() => setShowLoginModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
