import React, { useState } from 'react';
import { ShoppingCart, Star, Shield, Cpu, Check, Heart, Sparkles, Package, Award, BarChart3, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { BottomNavigation } from '../components/BottomNavigation';
import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { bitPayApiService } from '@/services/api/bitpayApi';

const Shop = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [showPlatformDialog, setShowPlatformDialog] = useState(false);

  const products = [
    {
      id: 1,
      name: "PixelMug",
      description: "PixelMug is the native token issued by Univoice AI Agent, representing the world's first AI-created mug with an LED pixel display.",
      fullDescription: "Experience the future of smart drinkware with PixelMug - the world's first AI-designed mug featuring an innovative LED pixel display. This revolutionary product combines cutting-edge technology with elegant design, allowing you to customize your drinking experience with dynamic pixel art displays. Perfect for tech enthusiasts, coffee lovers, and anyone who appreciates innovative design.",
      price: 0.25,
      originalPrice: 0.35,
      image: "/lovable-uploads/pixelmug.png",
      rating: 4.9,
      sales: 1200,
      reviews: 93,
      popular: true,
      features: [
        "LED Pixel Display Technology",
        "AI-Designed Aesthetics",
        "Temperature Control",
        "Wireless Charging",
        "App Integration"
      ],
      specifications: {
        capacity: "350ml",
        material: "Premium Ceramic + LED Display",
        power: "USB-C Wireless Charging",
        display: "64x64 RGB LED Matrix",
        compatibility: "iOS & Android App"
      },
      stock: 156,
      category: "Smart Drinkware",
      brand: "Univoice AI",
      warranty: "1 Year Limited Warranty",
      shipping: "Free Shipping Worldwide"
    }
  ];

  const ecommercePlatforms = [
    {
      id: 'amazon',
      name: 'Amazon',
      icon: '🛒',
      description: 'Sell on the world\'s largest online marketplace',
      color: 'from-orange-500 to-yellow-500',
      available: true
    },
    {
      id: 'tiktok',
      name: 'TikTok Shop',
      icon: '🎵',
      description: 'Reach millions of TikTok users',
      color: 'from-black to-gray-800',
      available: true
    },
    {
      id: 'timue',
      name: 'Timue',
      icon: '🛍️',
      description: 'Connect with Timue marketplace',
      color: 'from-blue-500 to-cyan-500',
      available: true
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🛒',
      description: 'Create your own online store',
      color: 'from-green-500 to-emerald-500',
      available: true
    }
  ];




  const handleBuyNow = (product: any) => {
    if (!user) {
      // User needs to login - this will be handled by AppHeader
      return;
    }
    setSelectedProduct(product);
    setShowPlatformDialog(true);
  };

  const handlePlatformSelect = async (platform: any) => {
    if (!selectedProduct) return;

    setShowPlatformDialog(false);
    setProcessingPayment(selectedProduct.id);

    try {
      // Simulate platform connection
      console.log(`Connecting to ${platform.name} for product: ${selectedProduct.name}`);
      
      // Here you would implement the actual platform integration
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: t('shop.platformConnected', { platform: platform.name }),
        description: t('shop.platformConnectedDesc', { product: selectedProduct.name }),
        variant: 'default'
      });

      // After platform connection, proceed with purchase
      const orderId =
          (globalThis.crypto as any)?.randomUUID?.() ??
          `pm-${Date.now()}-${Math.floor(Math.random()*1e6)}`;

      const buyerEmail = (user as any)?.email ?? null;
      const shippingAddress = 'TODO: collect from user form';
      const sku = 'PIXELMUG-CLASSIC';
      const currency = 'USD';

      const response = await bitPayApiService.createOrderAndGetInvoiceUrl({
        orderId,
        amount: Number(selectedProduct.price),
        currency,
        buyerEmail,
        shippingAddress,
        sku,
        redirectBase: window.location.origin,
      });

      if (response.success && response.data) {
        window.location.href = response.data.invoiceUrl;
      } else {
        throw new Error(response.error || 'Failed to create order');
      }

    } catch (err) {
      console.error('Platform connection or purchase failed:', err);
      toast({
        title: t('shop.purchaseFailed'),
        description: t('shop.purchaseFailedDesc'),
        variant: 'destructive'
      });
    } finally {
      setProcessingPayment(null);
      setSelectedProduct(null);
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
            <div className="flex-1 m-1 md:m-2 mb-20 lg:mb-4 rounded-xl bg-slate-800/90 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 p-3 md:p-4 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 md:h-5 md:w-5 text-cyan-400 flex-shrink-0" />
                  <h2 className="text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 truncate">
                    {t('shop.aiMarketplace')}
                  </h2>
                </div>
              </div>

              {/* Content Area */}
              <div className="overflow-y-auto p-2 md:p-4 max-h-[calc(100vh-200px)]">
                <div className="space-y-3 md:space-y-4">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className="rounded-xl border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 shadow-2xl overflow-hidden bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl w-full"
                    >
                      {/* Product Card */}
                      <div className="p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0 mx-auto sm:mx-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-gradient-to-br from-cyan-400/20 via-purple-400/20 to-pink-400/20 rounded-xl flex items-center justify-center overflow-hidden border border-cyan-400/30 shadow-lg">
                              {product.image.startsWith('/') ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center text-3xl sm:text-4xl ${product.image.startsWith('/') ? 'hidden' : ''}`}>
                                {product.image}
                              </div>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0 w-full">
                            {/* Title and Rating */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white break-words">{product.name}</h3>
                                  {product.popular && (
                                    <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 text-xs flex-shrink-0">
                                      <Sparkles className="h-2 w-2 mr-1" />
                                      {t('shop.popular')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-white/80 text-xs sm:text-sm mb-2 line-clamp-2 break-words">{product.description}</p>
                                
                                {/* Rating and Stats */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 flex-shrink-0 ${
                                          i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-white/30'
                                        }`}
                                      />
                                    ))}
                                    <span className="text-white/70 text-xs ml-1 whitespace-nowrap">({product.rating})</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/60">
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <BarChart3 className="h-3 w-3 flex-shrink-0" />
                                      <span className="whitespace-nowrap">{product.sales} {t('shop.sold')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Heart className="h-3 w-3 flex-shrink-0" />
                                      <span className="whitespace-nowrap">{product.reviews} {t('shop.reviews')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="text-left sm:text-right flex-shrink-0 sm:ml-4">
                                <div className="flex flex-col sm:items-end gap-1 mb-1">
                                  {product.originalPrice && (
                                    <span className="text-xs sm:text-sm text-white/50 line-through">
                                      ${product.originalPrice.toFixed(2)}
                                    </span>
                                  )}
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 whitespace-nowrap">
                                    ${product.price.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-xs text-white/60">USDT</div>
                                {product.originalPrice && (
                                  <Badge className="mt-1 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Features */}
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1">
                                {product.features?.slice(0, 3).map((feature: string, index: number) => (
                                  <Badge 
                                    key={index} 
                                    className="bg-slate-700/80 text-white/90 border border-cyan-400/30 text-xs px-1.5 sm:px-2 py-0.5 break-words"
                                  >
                                    <Check className="h-2 w-2 mr-1 flex-shrink-0" />
                                    <span className="break-words">{feature}</span>
                                  </Badge>
                                ))}
                                {product.features && product.features.length > 3 && (
                                  <Badge className="bg-slate-700/80 text-white/90 border border-cyan-400/30 text-xs px-1.5 sm:px-2 py-0.5 whitespace-nowrap">
                                    +{product.features.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Specifications */}
                            {product.specifications && (
                              <div className="mb-3 p-2 bg-slate-700/50 rounded-lg border border-white/10 overflow-hidden">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  {Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                                    <div key={key} className="text-white/70 break-words min-w-0">
                                      <span className="text-white/50 capitalize">{key}:</span>{' '}
                                      <span className="text-white/90 break-words">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Additional Info */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-white/60 mb-3">
                              {product.stock && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Package className="h-3 w-3 flex-shrink-0" />
                                  <span className="whitespace-nowrap">{product.stock} {t('shop.inStock')}</span>
                                </div>
                              )}
                              {product.brand && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Award className="h-3 w-3 flex-shrink-0" />
                                  <span className="break-words">{product.brand}</span>
                                </div>
                              )}
                              {product.warranty && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Shield className="h-3 w-3 flex-shrink-0" />
                                  <span className="break-words">{product.warranty}</span>
                                </div>
                              )}
                              {product.shipping && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <ShoppingBag className="h-3 w-3 flex-shrink-0" />
                                  <span className="break-words">{product.shipping}</span>
                                </div>
                              )}
                            </div>

                            {/* Buy Now Button */}
                            <Button 
                              onClick={() => handleBuyNow(product)}
                              disabled={processingPayment === product.id}
                              className={`w-full ${
                                processingPayment === product.id
                                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                                  : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600'
                              } text-white border-0 shadow-lg hover:shadow-cyan-500/50 transition-all duration-300`}
                            >
                              {processingPayment === product.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                  {t('shop.processing')}
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  {t('shop.buyNow')}
                                </>
                              )}
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

        {/* Bottom Navigation - Mobile only */}
        <div className="lg:hidden">
          <BottomNavigation />
        </div>

        {/* E-commerce Platform Selection Dialog */}
        <Dialog open={showPlatformDialog} onOpenChange={setShowPlatformDialog}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[500px] bg-slate-800 border-cyan-400/30 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {t('shop.selectPlatform')}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm break-words">
                {t('shop.selectPlatformDesc', { product: selectedProduct?.name })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4">
              {ecommercePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformSelect(platform)}
                  disabled={!platform.available}
                  className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 w-full ${
                    platform.available
                      ? `border-cyan-400/30 hover:border-cyan-400/60 bg-gradient-to-br from-slate-700/80 to-slate-800/80 hover:from-slate-700 hover:to-slate-800 cursor-pointer transform hover:scale-105`
                      : 'border-gray-600/30 bg-slate-900/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className={`text-3xl sm:text-4xl mb-1 ${!platform.available ? 'grayscale' : ''}`}>
                      {platform.icon}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-white text-center break-words">{platform.name}</div>
                    <div className="text-[10px] sm:text-xs text-white/60 text-center break-words">{platform.description}</div>
                  </div>
                  {!platform.available && (
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                      <Badge className="bg-gray-600 text-[10px] sm:text-xs">Coming Soon</Badge>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default Shop;