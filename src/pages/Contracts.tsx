import React, { useState } from 'react';
import { FileText, Plus, Eye, Download, MessageCircle, User, Send, Smile, Smartphone, X, LogOut, Wallet, Sparkles, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../lib/auth';
import { LoginScreen } from '../components/LoginScreen';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
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

const Contracts = () => {
  const { user, loading: authLoading, loginWithWallet, loginWithGoogle, logout } = useAuth();
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'user', content: 'Hello, how are you today?', timestamp: '10:30 AM' },
    { id: 2, sender: 'friend', content: 'Hi! I\'m doing great, thanks for asking!', timestamp: '10:32 AM' },
  ]);

  const contracts = [
    { 
      id: 1, 
      name: "Friend1", 
      type: "friend",
      status: "Active", 
      date: "2024-01-15",
      avatar: "F1",
      devices: ["Device1", "Device2"],
      isOnline: true
    },
    { 
      id: 2, 
      name: "Friend2", 
      type: "friend",
      status: "Pending", 
      date: "2024-01-20",
      avatar: "F2",
      devices: ["Device1", "Device3"],
      isOnline: false
    },
    { 
      id: 3, 
      name: "Univoice", 
      type: "system",
      status: "Active", 
      date: "2024-01-10",
      avatar: "UV",
      devices: [],
      isOnline: true
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400 bg-green-400/20';
      case 'Pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'Completed': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        sender: 'user',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  const handleContractClick = (contract: any) => {
    setSelectedContract(contract);
    setShowDialog(true);
  };

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
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* My Wallet Section */}
              {user && (
                <div className="m-2 md:m-4 mb-2 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">My Wallet</h2>
                    <div className="text-sm text-white/60">
                      {user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : 'Not Connected'}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded-xl p-4 border border-cyan-400/20">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">$127.50</div>
                        <div className="text-sm text-white/60">Balance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">3</div>
                        <div className="text-sm text-white/60">Devices</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contracts Content */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 m-2 md:m-4 mb-20 lg:mb-4 rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                  <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
                          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
                            Contracts
                          </h1>
              <p className="text-white/60">Manage your smart contracts and agreements</p>
            </div>
          </div>
                      <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>

        <div className="space-y-4">
          {contracts.map((contract) => (
            <div 
              key={contract.id} 
                          className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer backdrop-blur-sm hover:shadow-lg"
              onClick={() => handleContractClick(contract)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold">
                        {contract.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {contract.isOnline && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{contract.name}</h3>
                      {contract.type === 'friend' && <User className="h-4 w-4 text-cyan-400" />}
                    </div>
                    <p className="text-sm text-white/60">
                      {contract.devices.length > 0 ? `${contract.devices.join(', ')}` : 'System Contract'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)} backdrop-blur-sm`}>
                    {contract.status}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContractClick(contract);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                                <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>

        {/* Dialog Box */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md mx-auto shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-white flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white text-sm">
                    {selectedContract?.avatar}
                  </AvatarFallback>
                </Avatar>
                {selectedContract?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-64 overflow-y-auto space-y-3 p-3 bg-white/5 rounded-lg backdrop-blur-sm">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                        : 'bg-white/10 text-white backdrop-blur-sm'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    <Smile className="h-4 w-4 mr-2" />
                    Emoji
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    To Device
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

export default Contracts;