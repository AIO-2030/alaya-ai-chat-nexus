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
import styles from '../styles/pages/Shop.module.css';

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
      shipping: "Free Shipping Worldwide",
      sku: "PIXELMUG-CLASSIC",
      type: "physical"
    },
    {
      id: 2,
      name: "Univoice AI Subscription",
      description: "Unlock the full power of Univoice AI with our premium subscription. Get unlimited access to advanced AI features, voice cloning, and exclusive content.",
      fullDescription: "Transform your digital experience with Univoice AI Subscription - the ultimate AI companion for your daily needs. Enjoy unlimited access to advanced AI features including voice cloning, intelligent conversations, creative content generation, and much more. Perfect for professionals, creators, and anyone who wants to leverage cutting-edge AI technology.",
      price: 9.99,
      originalPrice: 14.99,
      image: "🤖",
      rating: 4.8,
      sales: 3500,
      reviews: 287,
      popular: true,
      features: [
        "Unlimited AI Conversations",
        "Advanced Voice Cloning",
        "Priority Support",
        "Exclusive Content Access",
        "Monthly Updates"
      ],
      specifications: {
        plan: "Monthly Subscription",
        billing: "Recurring Monthly",
        cancellation: "Cancel Anytime",
        access: "Full Platform Access"
      },
      stock: null,
      category: "Digital Subscription",
      brand: "Univoice AI",
      warranty: "30-Day Money Back Guarantee",
      shipping: "Instant Digital Access",
      sku: "UNIVOICE-AI-SUBSCRIPTION",
      type: "subscription"
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
          `${selectedProduct.type || 'product'}-${Date.now()}-${Math.floor(Math.random()*1e6)}`;

      const buyerEmail = (user as any)?.email ?? null;
      const shippingAddress = selectedProduct.type === 'subscription' ? 'N/A - Digital Product' : 'TODO: collect from user form';
      const sku = selectedProduct.sku || `PRODUCT-${selectedProduct.id}`;
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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.loadingSpinner__outer}></div>
          <div className={styles.loadingSpinner__inner}></div>
          <div className={styles.loadingText}>
            <div className={styles.loadingText__content}>
              Initializing AI...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className={styles.pageContainer}>
        {/* Animated background elements */}
        <div className={styles.backgroundElements}>
          <div className={styles.backgroundBlob1}></div>
          <div className={styles.backgroundBlob2}></div>
          <div className={styles.backgroundBlob3}></div>
        </div>

        {/* Neural network pattern */}
        <div className={styles.neuralPattern}>
          <div className={styles.neuralDot1}></div>
          <div className={styles.neuralDot2}></div>
          <div className={styles.neuralDot3}></div>
          <svg className={styles.neuralSvg}>
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

        <div className={styles.layoutContainer}>
          {/* Sidebar for desktop only */}
          <div className={styles.sidebarContainer}>
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {/* Shop Content */}
            <div className={styles.shopContent}>
              {/* Header */}
              <div className={styles.shopHeader}>
                <div className={styles.shopHeader__content}>
                  <Cpu className={styles.shopHeader__icon} />
                  <h2 className={styles.shopHeader__title}>
                    {t('shop.aiMarketplace')}
                  </h2>
                </div>
              </div>

              {/* Content Area */}
              <div className={styles.contentArea}>
                <div className={styles.productsList}>
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className={styles.productCard}
                    >
                      {/* Product Card */}
                      <div className={styles.productCard__inner}>
                        <div className={styles.productCard__layout}>
                          {/* Product Image */}
                          <div className={styles.productImageContainer}>
                            <div className={styles.productImageWrapper}>
                              {product.image.startsWith('/') ? (
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className={styles.productImage}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`${styles.productImageFallback} ${product.image.startsWith('/') ? styles.hidden : ''}`}>
                                {product.image}
                              </div>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className={styles.productInfo}>
                            {/* Title and Rating */}
                            <div className={styles.productTitleRow}>
                              <div className={styles.productTitleSection}>
                                <div className={styles.productTitleWrapper}>
                                  <h3 className={styles.productTitle}>{product.name}</h3>
                                  {product.popular && (
                                    <Badge className={styles.popularBadge}>
                                      <Sparkles className={styles.popularBadgeIcon} />
                                      {t('shop.popular')}
                                    </Badge>
                                  )}
                                </div>
                                <p className={styles.productDescription}>{product.description}</p>
                                
                                {/* Rating and Stats */}
                                <div className={styles.ratingStats}>
                                  <div className={styles.ratingContainer}>
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`${styles.ratingStars} ${
                                          i < Math.floor(product.rating) ? styles.filled : styles.empty
                                        }`}
                                      />
                                    ))}
                                    <span className={styles.ratingText}>({product.rating})</span>
                                  </div>
                                  <div className={styles.statsContainer}>
                                    <div className={styles.statItem}>
                                      <BarChart3 className={styles.statIcon} />
                                      <span className={styles.statText}>{product.sales} {t('shop.sold')}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                      <Heart className={styles.statIcon} />
                                      <span className={styles.statText}>{product.reviews} {t('shop.reviews')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className={styles.priceSection}>
                                <div className={styles.priceContainer}>
                                  {product.originalPrice && (
                                    <span className={styles.originalPrice}>
                                      ${product.originalPrice.toFixed(2)}
                                    </span>
                                  )}
                                  <div className={styles.currentPrice}>
                                    ${product.price.toFixed(2)}
                                  </div>
                                </div>
                                <div className={styles.priceLabel}>USDT</div>
                                {product.originalPrice && (
                                  <Badge className={styles.discountBadge}>
                                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Features */}
                            <div className={styles.featuresContainer}>
                              <div className={styles.featuresList}>
                                {product.features?.slice(0, 3).map((feature: string, index: number) => (
                                  <Badge 
                                    key={index} 
                                    className={styles.featureBadge}
                                  >
                                    <Check className={styles.featureBadge__icon} />
                                    <span className={styles.featureBadge__text}>{feature}</span>
                                  </Badge>
                                ))}
                                {product.features && product.features.length > 3 && (
                                  <Badge className={styles.featureBadgeMore}>
                                    +{product.features.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Specifications */}
                            {product.specifications && (
                              <div className={styles.specificationsContainer}>
                                <div className={styles.specificationsGrid}>
                                  {Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                                    <div key={key} className={styles.specificationItem}>
                                      <span className={styles.specificationKey}>{key}:</span>{' '}
                                      <span className={styles.specificationValue}>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Additional Info */}
                            <div className={styles.additionalInfo}>
                              {product.stock && (
                                <div className={styles.additionalInfoItem}>
                                  <Package className={styles.additionalInfoIcon} />
                                  <span className={styles.additionalInfoText}>{product.stock} {t('shop.inStock')}</span>
                                </div>
                              )}
                              {product.brand && (
                                <div className={styles.additionalInfoItem}>
                                  <Award className={styles.additionalInfoIcon} />
                                  <span className={styles.additionalInfoTextBreak}>{product.brand}</span>
                                </div>
                              )}
                              {product.warranty && (
                                <div className={styles.additionalInfoItem}>
                                  <Shield className={styles.additionalInfoIcon} />
                                  <span className={styles.additionalInfoTextBreak}>{product.warranty}</span>
                                </div>
                              )}
                              {product.shipping && (
                                <div className={styles.additionalInfoItem}>
                                  <ShoppingBag className={styles.additionalInfoIcon} />
                                  <span className={styles.additionalInfoTextBreak}>{product.shipping}</span>
                                </div>
                              )}
                            </div>

                            {/* Buy Now Button */}
                            <Button 
                              onClick={() => handleBuyNow(product)}
                              disabled={processingPayment === product.id}
                              className={`${styles.buyNowButton} ${
                                processingPayment === product.id
                                  ? styles.processing 
                                  : styles.normal
                              }`}
                            >
                              {processingPayment === product.id ? (
                                <>
                                  <div className={styles.buyNowButton__spinner}></div>
                                  {t('shop.processing')}
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className={styles.buyNowButton__icon} />
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
        <div className={styles.bottomNavContainer}>
          <BottomNavigation />
        </div>

        {/* E-commerce Platform Selection Dialog */}
        <Dialog open={showPlatformDialog} onOpenChange={setShowPlatformDialog}>
          <DialogContent className={styles.dialogContent}>
            <DialogHeader>
              <DialogTitle className={styles.dialogTitle}>
                {t('shop.selectPlatform')}
              </DialogTitle>
              <DialogDescription className={styles.dialogDescription}>
                {t('shop.selectPlatformDesc', { product: selectedProduct?.name })}
              </DialogDescription>
            </DialogHeader>
            
            <div className={styles.platformsGrid}>
              {ecommercePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformSelect(platform)}
                  disabled={!platform.available}
                  className={`${styles.platformButton} ${
                    platform.available
                      ? styles.available
                      : styles.disabled
                  }`}
                >
                  <div className={styles.platformButtonContent}>
                    <div className={`${styles.platformIcon} ${!platform.available ? styles.grayscale : ''}`}>
                      {platform.icon}
                    </div>
                    <div className={styles.platformName}>{platform.name}</div>
                    <div className={styles.platformDescription}>{platform.description}</div>
                  </div>
                  {!platform.available && (
                    <div className={styles.platformBadgeContainer}>
                      <Badge className={styles.platformBadge}>Coming Soon</Badge>
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