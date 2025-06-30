
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatSession } from '../types/chat';
import { ExternalLink, Globe, Database, Brain, Zap } from 'lucide-react';

interface AlignmentPanelProps {
  session: ChatSession;
  className?: string;
}

interface ProductCard {
  logo: React.ReactNode;
  title: string;
  subtitle: string;
  link: string;
  gradient: string;
  iconColor: string;
}

export const AlignmentPanel: React.FC<AlignmentPanelProps> = ({
  session,
  className = ""
}) => {
  const productCards: ProductCard[] = [
    {
      logo: <Brain className="h-7 w-7" />,
      title: "AIO Core",
      subtitle: "Advanced AI orchestration platform providing unified access to multiple AI models with intelligent routing and optimization capabilities.",
      link: "https://aio-core.com",
      gradient: "from-blue-500/30 to-cyan-500/30 border-blue-400/50",
      iconColor: "text-blue-300"
    },
    {
      logo: <Database className="h-7 w-7" />,
      title: "AIO Index",
      subtitle: "Powerful vector database and semantic search engine designed for AI applications with real-time indexing and retrieval.",
      link: "https://aio-index.com",
      gradient: "from-purple-500/30 to-pink-500/30 border-purple-400/50",
      iconColor: "text-purple-300"
    },
    {
      logo: <Zap className="h-7 w-7" />,
      title: "AIO MCP",
      subtitle: "Model Context Protocol implementation enabling seamless communication between AI models and external systems.",
      link: "https://aio-mcp.com",
      gradient: "from-green-500/30 to-emerald-500/30 border-green-400/50",
      iconColor: "text-green-300"
    },
    {
      logo: <Globe className="h-7 w-7" />,
      title: "AIO Gateway",
      subtitle: "High-performance API gateway for AI services with load balancing, caching, and comprehensive monitoring tools.",
      link: "https://aio-gateway.com",
      gradient: "from-orange-500/30 to-red-500/30 border-orange-400/50",
      iconColor: "text-orange-300"
    }
  ];

  return (
    <div className={`w-80 backdrop-blur-xl border border-white/20 ${className}`}>
      <div className="p-6 border-b border-white/20 bg-gradient-to-r from-white/10 to-white/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">
            AIO-MCP Products
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {productCards.map((product, index) => (
          <Card 
            key={index}
            className={`bg-gradient-to-br ${product.gradient} backdrop-blur-md border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10 group relative overflow-hidden`}
          >
            {/* Subtle animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:animate-pulse"></div>
            
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-lg flex items-center gap-4 text-white font-bold">
                <div className={`${product.iconColor} p-2 bg-white/20 rounded-lg backdrop-blur-sm`}>
                  {product.logo}
                </div>
                <span className="text-xl">{product.title}</span>
                <div className="ml-auto">
                  <div className="w-3 h-3 bg-white/80 rounded-full animate-pulse shadow-sm"></div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 relative z-10">
              <p className="text-base text-white/95 leading-relaxed font-medium bg-black/20 p-4 rounded-lg backdrop-blur-sm">
                {product.subtitle}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 backdrop-blur-sm transition-all duration-300 hover:scale-105 font-semibold text-base py-3 shadow-lg hover:shadow-xl"
                onClick={() => window.open(product.link, '_blank')}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                Visit Project
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
