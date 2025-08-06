import React from 'react';
import { ShoppingBag, Star, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Shop = () => {
  const products = [
    { 
      id: 1, 
      name: "AI Premium Plan", 
      price: "$29.99/month", 
      rating: 4.8, 
      description: "Enhanced AI capabilities with unlimited requests",
      features: ["Unlimited AI requests", "Priority support", "Advanced features"]
    },
    { 
      id: 2, 
      name: "Voice Pro Package", 
      price: "$19.99/month", 
      rating: 4.6, 
      description: "Professional voice processing and analytics",
      features: ["High-quality voice processing", "Voice analytics", "API access"]
    },
    { 
      id: 3, 
      name: "Enterprise Solution", 
      price: "$99.99/month", 
      rating: 5.0, 
      description: "Complete enterprise-grade AI solution",
      features: ["Custom integrations", "24/7 support", "Dedicated resources"]
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Shop</h1>
            <p className="text-white/60">Discover and purchase AI services and packages</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="p-6 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-white/80">{product.rating}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {product.price}
                </p>
              </div>

              <p className="text-white/80 mb-4">{product.description}</p>

              <div className="space-y-2 mb-6">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span className="text-sm text-white/70">{feature}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0">
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Shop;