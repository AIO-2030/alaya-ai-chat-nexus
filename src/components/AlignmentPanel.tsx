
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
      logo: <Brain className="h-6 w-6" />,
      title: "AIO Core",
      subtitle: "Advanced AI orchestration platform providing unified access to multiple AI models with intelligent routing and optimization capabilities.",
      link: "https://aio-core.com",
      gradient: "from-blue-400/20 to-cyan-400/20 border-blue-400/30",
      iconColor: "text-blue-400"
    },
    {
      logo: <Database className="h-6 w-6" />,
      title: "AIO Index",
      subtitle: "Powerful vector database and semantic search engine designed for AI applications with real-time indexing and retrieval.",
      link: "https://aio-index.com",
      gradient: "from-purple-400/20 to-pink-400/20 border-purple-400/30",
      iconColor: "text-purple-400"
    },
    {
      logo: <Zap className="h-6 w-6" />,
      title: "AIO MCP",
      subtitle: "Model Context Protocol implementation enabling seamless communication between AI models and external systems.",
      link: "https://aio-mcp.com",
      gradient: "from-green-400/20 to-emerald-400/20 border-green-400/30",
      iconColor: "text-green-400"
    },
    {
      logo: <Globe className="h-6 w-6" />,
      title: "AIO Gateway",
      subtitle: "High-performance API gateway for AI services with load balancing, caching, and comprehensive monitoring tools.",
      link: "https://aio-gateway.com",
      gradient: "from-orange-400/20 to-red-400/20 border-orange-400/30",
      iconColor: "text-orange-400"
    }
  ];

  return (
    <div className={`w-80 backdrop-blur-xl border border-white/10 ${className}`}>
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            AIO-MCP Products
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {productCards.map((product, index) => (
          <Card 
            key={index}
            className={`bg-gradient-to-br ${product.gradient} backdrop-blur-sm border transition-all duration-300 hover:scale-105 hover:shadow-lg`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-3 text-white font-semibold">
                <div className={`${product.iconColor}`}>
                  {product.logo}
                </div>
                <span className="text-base">{product.title}</span>
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                {product.subtitle}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
                onClick={() => window.open(product.link, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Project
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
