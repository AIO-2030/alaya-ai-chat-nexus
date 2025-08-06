
import React from 'react';
import { useAuth } from '../lib/auth';
import { LoginScreen } from '../components/LoginScreen';
import { ChatBox } from '../components/ChatBox';
import { AlignmentPanel } from '../components/AlignmentPanel';
import { useChatSession } from '../hooks/useChatSession';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet, Sparkles, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const Index = () => {
  const { user, loading: authLoading, loginWithWallet, loginWithGoogle, logout } = useAuth();
  const { session } = useChatSession();
  const [showLoginModal, setShowLoginModal] = React.useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
              Initializing AI...
            </div>
          </div>
        </div>
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
    <SidebarProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-blue-400 rounded-full"></div>
          <svg className="absolute inset-0 w-full h-full">
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" strokeWidth="1" opacity="0.3"/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" strokeWidth="1" opacity="0.3"/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" strokeWidth="1" opacity="0.3"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header */}
        <header className="relative z-10 backdrop-blur-xl bg-black/20 border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-white hover:bg-white/10 lg:hidden" />
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
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
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
                  <div className="md:hidden w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 border-0 text-white font-semibold hover:from-cyan-600 hover:to-purple-600 backdrop-blur-sm px-3 md:px-6 py-2 shadow-lg transition-all duration-200 hover:shadow-xl text-xs md:text-sm"
                    >
                      <Wallet className="h-4 w-4 mr-1 md:mr-2" />
                      <span className="hidden md:inline">Login & Connect Wallet</span>
                      <span className="md:hidden">Login</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 backdrop-blur-xl border-white/10">
                    <DropdownMenuItem onClick={() => setShowLoginModal(true)} className="text-white hover:bg-white/10 py-3">
                      <Wallet className="h-4 w-4 mr-3" />
                      Connect with Plug Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowLoginModal(true)} className="text-white hover:bg-white/10 py-3">
                      <User className="h-4 w-4 mr-3" />
                      Sign in with Google
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden">
            {/* Chat Area */}
            <div className="flex-1 min-w-0 flex">
              <div className="flex-1 m-2 md:m-4 mb-20 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                <ChatBox />
              </div>
            </div>

            {/* Alignment Panel - Hide on mobile, show on larger screens */}
            <div className="hidden xl:block w-80 flex-shrink-0">
              <AlignmentPanel 
                session={session} 
                className="m-4 mr-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 h-full overflow-hidden" 
              />
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowLoginModal(false)}>
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
    </SidebarProvider>
  );
};

export default Index;
