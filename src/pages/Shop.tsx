import React, { useState } from 'react';
import { ShoppingCart, Star, Zap, Shield, Cpu, Check, Plus, LogOut, Wallet, Sparkles, Menu, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const Shop = () => {
  const { user, loading: authLoading, loginWithWallet, loginWithGoogle, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);

  const products = [
    {
      id: 1,
      name: "Smart Analytics Pro",
      description: "Real-time data analytics and insights for business intelligence",
      price: 0.25,
      image: "📊",
      rating: 4.9,
      sales: 1200,
      reviews: 93,
      popular: true
    },
    {
      id: 2,
      name: "Voice Assistant",
      description: "Advanced voice recognition and natural language processing",
      price: 0.08,
      image: "🎤",
      rating: 4.7,
      sales: 890,
      reviews: 156,
      popular: false
    },
    {
      id: 3,
      name: "Image Generator",
      description: "AI-powered image creation and editing tools",
      price: 0.15,
      image: "🎨",
      rating: 4.8,
      sales: 2100,
      reviews: 234,
      popular: true
    },
    {
      id: 4,
      name: "Code Assistant",
      description: "Intelligent code completion and debugging support",
      price: 0.12,
      image: "💻",
      rating: 4.6,
      sales: 750,
      reviews: 89,
      popular: false
    },
    {
      id: 5,
      name: "Translation Pro",
      description: "Multi-language translation with context awareness",
      price: 0.05,
      image: "🌐",
      rating: 4.9,
      sales: 3200,
      reviews: 445,
      popular: true
    },
    {
      id: 6,
      name: "Content Writer",
      description: "AI-powered content creation and copywriting",
      price: 0.18,
      image: "✍️",
      rating: 4.5,
      sales: 680,
      reviews: 123,
      popular: false
    },
    {
      id: 7,
      name: "Video Editor",
      description: "Automated video editing and enhancement tools",
      price: 0.22,
      image: "🎬",
      rating: 4.7,
      sales: 950,
      reviews: 167,
      popular: false
    },
    {
      id: 8,
      name: "Chat Bot",
      description: "Intelligent conversational AI for customer service",
      price: 0.10,
      image: "🤖",
      rating: 4.8,
      sales: 1800,
      reviews: 298,
      popular: true
    },
    {
      id: 9,
      name: "Data Processor",
      description: "Advanced data cleaning and preprocessing tools",
      price: 0.14,
      image: "📈",
      rating: 4.6,
      sales: 520,
      reviews: 78,
      popular: false
    },
    {
      id: 10,
      name: "Security Scanner",
      description: "AI-powered security analysis and threat detection",
      price: 0.30,
      image: "🔒",
      rating: 4.9,
      sales: 450,
      reviews: 92,
      popular: false
    },
    {
      id: 11,
      name: "Music Composer",
      description: "AI-generated music composition and arrangement",
      price: 0.20,
      image: "🎵",
      rating: 4.4,
      sales: 380,
      reviews: 67,
      popular: false
    },
    {
      id: 12,
      name: "Document Analyzer",
      description: "Intelligent document processing and analysis",
      price: 0.16,
      image: "📄",
      rating: 4.7,
      sales: 720,
      reviews: 134,
      popular: false
    },
    {
      id: 13,
      name: "Predictive Model",
      description: "Machine learning models for forecasting and prediction",
      price: 0.35,
      image: "🔮",
      rating: 4.8,
      sales: 290,
      reviews: 56,
      popular: false
    },
    {
      id: 14,
      name: "Social Media Manager",
      description: "Automated social media content and engagement",
      price: 0.13,
      image: "📱",
      rating: 4.5,
      sales: 890,
      reviews: 145,
      popular: false
    },
    {
      id: 15,
      name: "Email Optimizer",
      description: "AI-powered email marketing and optimization",
      price: 0.09,
      image: "📧",
      rating: 4.6,
      sales: 650,
      reviews: 98,
      popular: false
    },
    {
      id: 16,
      name: "Research Assistant",
      description: "Intelligent research and information gathering",
      price: 0.17,
      image: "🔍",
      rating: 4.7,
      sales: 420,
      reviews: 73,
      popular: false
    }
  ];

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

  const handleDirectPurchase = async (product: any) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setProcessingPayment(product.id);
    
    try {
      // 模擬調用錢包插件進行USDT支付
      console.log(`Processing payment for ${product.name}: ${product.price} USDT`);
      
      // 這裡應該調用實際的錢包支付API
      // await walletProvider.pay(product.price, 'USDT');
      
      // 模擬支付延遲
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Payment successful for ${product.name}`);
      alert(`Payment successful! You have purchased ${product.name}`);
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
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
          <div className="flex-1 min-w-0 flex flex-col">
            {/* My Wallet Section */}
            {user && (
              <div className="flex-shrink-0 m-1 md:m-2 mb-1 p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-medium text-white">My Wallet</h2>
                  <div className="text-xs text-white/60">
                    {user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : 'Not Connected'}
                  </div>
                </div>
                <div className="mt-1 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded p-2 border border-cyan-400/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-sm font-bold text-white">$127.50</div>
                      <div className="text-xs text-white/60">Balance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-cyan-400">3</div>
                      <div className="text-xs text-white/60">Devices</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shop Content */}
            <div className="flex-1 m-1 md:m-2 mb-20 lg:mb-4 rounded-xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10">
              {/* Shop Header */}
              <div className="flex-shrink-0 p-2 border-b border-white/10">
                <h1 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400">
                  AI Marketplace
                </h1>
              </div>

              {/* Products List */}
              <div className="overflow-y-auto p-2 max-h-[calc(100vh-200px)]">
                <div className="space-y-2">
                  {products.map((product) => (
                    <div key={product.id} className="flex gap-2 p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded flex items-center justify-center text-lg">
                          {product.image}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="text-sm font-semibold text-white mb-0.5">{product.name}</h3>
                            <p className="text-white/70 text-xs line-clamp-1">{product.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                              ${product.price.toFixed(2)} USDT
                            </div>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-2 w-2 ${
                                    i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-white/30'
                                  }`}
                                />
                              ))}
                              <span className="text-white/60 text-xs ml-0.5">({product.rating})</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                          <span>{product.sales} sold</span>
                          <span>{product.reviews} reviews</span>
                          {product.popular && (
                            <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 text-xs px-1 py-0">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            onClick={() => handleDirectPurchase(product)}
                            disabled={processingPayment === product.id}
                            size="sm"
                            className={`${
                              processingPayment === product.id
                                ? 'bg-yellow-500 hover:bg-yellow-600' 
                                : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600'
                            } text-white border-0 text-xs h-6 px-2`}
                          >
                            {processingPayment === product.id ? (
                              <>
                                <div className="w-2 h-2 border border-white/30 border-t-white rounded-full animate-spin mr-1"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-2 w-2 mr-0.5" />
                                Buy Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

export default Shop;