import React, { useState } from 'react';
import { ShoppingCart, Star, Zap, Shield, Cpu, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Shop = () => {
  const [cart, setCart] = useState<number[]>([]);

  const products = [
    {
      id: 1,
      name: "Premium AI Assistant",
      price: 0.11,
      rating: 4.8,
      description: "Advanced AI with natural language processing capabilities for seamless interaction.",
      features: ["Natural Language Processing", "24/7 Availability", "Multi-language Support", "Custom Training"],
      image: "🤖",
      popular: true
    },
    {
      id: 2,
      name: "Smart Analytics Pro",
      price: 0.25,
      rating: 4.9,
      description: "Real-time data analytics and insights with advanced visualization tools.",
      features: ["Real-time Analytics", "Custom Dashboards", "API Integration", "Export Tools"],
      image: "📊",
      popular: false
    },
    {
      id: 3,
      name: "Voice Recognition Plus",
      price: 0.08,
      rating: 4.7,
      description: "Advanced voice recognition technology with high accuracy and speed.",
      features: ["Voice Commands", "Speech-to-Text", "Voice Training", "Noise Cancellation"],
      image: "🎤",
      popular: false
    },
    {
      id: 4,
      name: "Neural Network Engine",
      price: 0.35,
      rating: 4.6,
      description: "High-performance neural network processing for complex AI tasks.",
      features: ["Deep Learning", "Model Training", "GPU Acceleration", "Cloud Sync"],
      image: "🧠",
      popular: true
    },
  ];

  const addToCart = (productId: number) => {
    setCart([...cart, productId]);
  };

  const isInCart = (productId: number) => cart.includes(productId);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Shop</h1>
            <p className="text-white/60">Discover and purchase AI services and premium features</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="relative p-6 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
              {product.popular && (
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">
                  Popular
                </Badge>
              )}
              
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{product.image}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-white/30'
                      }`}
                    />
                  ))}
                  <span className="text-white/60 text-sm ml-1">({product.rating})</span>
                </div>
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3">
                  ${product.price.toFixed(2)}
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-4 text-center">{product.description}</p>
              
              <div className="space-y-2 mb-6">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={() => addToCart(product.id)}
                disabled={isInCart(product.id)}
                className={`w-full ${
                  isInCart(product.id) 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600'
                } text-white border-0`}
              >
                {isInCart(product.id) ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Now
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="mt-8 p-4 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded-lg border border-cyan-400/20">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <span className="font-medium">Cart: </span>
                <span className="text-cyan-400">{cart.length} item(s)</span>
              </div>
              <div className="text-white font-bold">
                Total: ${products.filter(p => cart.includes(p.id)).reduce((sum, p) => sum + p.price, 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;