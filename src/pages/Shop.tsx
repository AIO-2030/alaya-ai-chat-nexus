import React, { useState } from 'react';
import { ShoppingCart, Star, Zap, Shield, Cpu, Check, Plus, CreditCard, Heart, Users, TrendingUp, Crown, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import { useTranslation } from 'react-i18next';

const Shop = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'nft'>('ai');

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

  // NFT数据结构
  const nftCollections = [
    {
      id: 1,
      name: "CyberPunk Genesis",
      description: "Futuristic digital art collection featuring cyberpunk aesthetics",
      image: "🤖",
      floorPrice: 0.8,
      volume: 12.5,
      owners: 2340,
      items: 10000,
      verified: true,
      rarity: "Legendary",
      traits: ["Neon", "Cyber", "Futuristic"],
      creator: "DigitalArtMaster",
      likes: 15420,
      onSale: true,
      lastSale: 1.2,
      priceChange: "+15.3%"
    },
    {
      id: 2,
      name: "Nature's Symphony",
      description: "Organic digital landscapes inspired by natural beauty",
      image: "🌿",
      floorPrice: 0.45,
      volume: 8.2,
      owners: 1890,
      items: 5000,
      verified: true,
      rarity: "Epic",
      traits: ["Nature", "Organic", "Peaceful"],
      creator: "EcoArtist",
      likes: 9870,
      onSale: true,
      lastSale: 0.52,
      priceChange: "+8.7%"
    },
    {
      id: 3,
      name: "Abstract Dreams",
      description: "Surreal abstract art pieces exploring consciousness",
      image: "🎨",
      floorPrice: 0.32,
      volume: 5.8,
      owners: 1456,
      items: 3333,
      verified: false,
      rarity: "Rare",
      traits: ["Abstract", "Surreal", "Dreamy"],
      creator: "MindBender",
      likes: 6540,
      onSale: true,
      lastSale: 0.38,
      priceChange: "-2.1%"
    },
    {
      id: 4,
      name: "Space Odyssey",
      description: "Cosmic exploration through digital art and space themes",
      image: "🚀",
      floorPrice: 1.2,
      volume: 25.6,
      owners: 3200,
      items: 7777,
      verified: true,
      rarity: "Mythic",
      traits: ["Space", "Cosmic", "Exploration"],
      creator: "CosmicCreator",
      likes: 28900,
      onSale: true,
      lastSale: 1.5,
      priceChange: "+22.4%"
    },
    {
      id: 5,
      name: "Pixel Warriors",
      description: "Retro pixel art characters in epic battle scenes",
      image: "⚔️",
      floorPrice: 0.18,
      volume: 3.2,
      owners: 890,
      items: 2500,
      verified: false,
      rarity: "Common",
      traits: ["Pixel", "Retro", "Battle"],
      creator: "PixelMaster",
      likes: 3420,
      onSale: true,
      lastSale: 0.22,
      priceChange: "+12.5%"
    },
    {
      id: 6,
      name: "Digital Portraits",
      description: "AI-generated portrait collection with unique characteristics",
      image: "👤",
      floorPrice: 0.65,
      volume: 15.8,
      owners: 2100,
      items: 8888,
      verified: true,
      rarity: "Epic",
      traits: ["Portrait", "AI", "Unique"],
      creator: "AIPortraitist",
      likes: 18750,
      onSale: true,
      lastSale: 0.78,
      priceChange: "+5.2%"
    }
  ];



  const handleDirectPurchase = async (product: any) => {
    if (!user) {
      // User needs to login - this will be handled by AppHeader
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

  const handleNFTPurchase = async (nft: any) => {
    if (!user) {
      // User needs to login - this will be handled by AppHeader
      return;
    }

    setProcessingPayment(nft.id);
    
    try {
      // 模擬調用錢包插件進行USDT支付
      console.log(`Processing NFT purchase for ${nft.name}: ${nft.floorPrice} USDT`);
      
      // 這裡應該調用實際的NFT購買API
      // await nftMarketplace.buy(nft.id, nft.floorPrice, 'USDT');
      
      // 模擬支付延遲
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`NFT purchase successful for ${nft.name}`);
      alert(`Purchase successful! You now own ${nft.name}`);
      
    } catch (error) {
      console.error('NFT purchase failed:', error);
      alert('NFT purchase failed. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return 'from-yellow-400 to-orange-500';
      case 'Mythic':
        return 'from-purple-400 to-pink-500';
      case 'Epic':
        return 'from-blue-400 to-purple-500';
      case 'Rare':
        return 'from-green-400 to-blue-500';
      case 'Common':
        return 'from-gray-400 to-gray-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getRarityTranslation = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return t('shop.rarity.legendary');
      case 'Mythic':
        return t('shop.rarity.mythic');
      case 'Epic':
        return t('shop.rarity.epic');
      case 'Rare':
        return t('shop.rarity.rare');
      case 'Common':
        return t('shop.rarity.common');
      default:
        return rarity;
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
    <PageLayout>
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
        <AppHeader />

        <div className="flex h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Shop Content */}
            <div className="flex-1 m-1 md:m-2 mb-20 lg:mb-4 rounded-xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10">
              {/* Tab Navigation */}
              <div className="flex-shrink-0 p-2 border-b border-white/10">
                <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeTab === 'ai'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {t('shop.aiMarketplace')}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('nft')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeTab === 'nft'
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {t('shop.nftMarketplace')}
                    </div>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="overflow-y-auto p-2 max-h-[calc(100vh-200px)]">
                {activeTab === 'ai' ? (
                  /* AI Products List */
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
                            <span>{product.sales} {t('shop.sold')}</span>
                            <span>{product.reviews} {t('shop.reviews')}</span>
                            {product.popular && (
                              <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 text-xs px-1 py-0">
                                {t('shop.popular')}
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
                                  {t('shop.processing')}
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-2 w-2 mr-0.5" />
                                  {t('shop.buyNow')}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* NFT Collections List */
                  <div className="space-y-2">
                    {nftCollections.map((nft) => (
                      <div key={nft.id} className="flex gap-2 p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded flex items-center justify-center text-lg relative">
                            {nft.image}
                            {nft.verified && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <h3 className="text-sm font-semibold text-white">{nft.name}</h3>
                                {nft.verified && <Crown className="h-3 w-3 text-blue-400" />}
                              </div>
                              <p className="text-white/70 text-xs line-clamp-1">{nft.description}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-white/50 text-xs">{t('shop.by')} {nft.creator}</span>
                                <Badge className={`bg-gradient-to-r ${getRarityColor(nft.rarity)} text-white border-0 text-xs px-1 py-0`}>
                                  {getRarityTranslation(nft.rarity)}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                                {nft.floorPrice} ETH
                              </div>
                              <div className="text-xs text-white/60">
                                {t('shop.floorPrice')}
                              </div>
                              <div className={`text-xs ${nft.priceChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                {nft.priceChange}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/60 mb-1">
                            <div className="flex items-center gap-0.5">
                              <TrendingUp className="h-2 w-2" />
                              <span>{nft.volume} ETH</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Users className="h-2 w-2" />
                              <span>{nft.owners}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Heart className="h-2 w-2" />
                              <span>{nft.likes}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            {nft.traits.slice(0, 3).map((trait, index) => (
                              <Badge key={index} className="bg-white/10 text-white/80 border-0 text-xs px-1 py-0">
                                {trait}
                              </Badge>
                            ))}
                            {nft.traits.length > 3 && (
                              <span className="text-white/50 text-xs">+{nft.traits.length - 3}</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              onClick={() => handleNFTPurchase(nft)}
                              disabled={processingPayment === nft.id}
                              size="sm"
                              className={`${
                                processingPayment === nft.id
                                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                                  : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600'
                              } text-white border-0 text-xs h-6 px-2`}
                            >
                              {processingPayment === nft.id ? (
                                <>
                                  <div className="w-2 h-2 border border-white/30 border-t-white rounded-full animate-spin mr-1"></div>
                                  {t('shop.processing')}
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-2 w-2 mr-0.5" />
                                  {t('shop.buyNow')}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>


      </div>
    </PageLayout>
  );
};

export default Shop;