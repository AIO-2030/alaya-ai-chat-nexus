import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Palette, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { PageLayout } from '../components/PageLayout';
import { pixelizeEmoji, PixelFormat, PixelProcessingResult } from '../lib/pixelProcessor';

interface GalleryItem {
  id: number;
  title: string;
  creator?: string;
  status?: string;
  likes: number;
  emoji: string;
  pixelResult?: PixelProcessingResult;
}

const Gallery = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('public');
  const [pixelFormat, setPixelFormat] = useState<PixelFormat>('32x32');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const handleBackToChat = () => {
    navigate('/chat');
  };

  const handleCreateClick = () => {
    navigate('/creation');
  };

  // Mock data for demonstration with emoji
  const [publicGalleryItems, setPublicGalleryItems] = useState<GalleryItem[]>([
    { id: 1, title: 'Happy Face', creator: 'User1', likes: 42, emoji: '😊' },
    { id: 2, title: 'Heart Eyes', creator: 'User2', likes: 38, emoji: '😍' },
    { id: 3, title: 'Thinking', creator: 'User3', likes: 55, emoji: '🤔' },
    { id: 4, title: 'Party', creator: 'User4', likes: 33, emoji: '🎉' },
    { id: 5, title: 'Fire', creator: 'User5', likes: 67, emoji: '🔥' },
    { id: 6, title: 'Star', creator: 'User6', likes: 28, emoji: '⭐' },
  ]);

  const [myCreatorItems, setMyCreatorItems] = useState<GalleryItem[]>([
    { id: 1, title: 'My Happy Face', status: 'Published', likes: 15, emoji: '😊' },
    { id: 2, title: 'My Custom Emoji', status: 'Draft', likes: 0, emoji: '🎨' },
  ]);

  // Process emoji into pixel art
  const processItemEmoji = async (item: GalleryItem) => {
    try {
      setIsProcessing(true);
      const pixelResult = await pixelizeEmoji(item.emoji, pixelFormat, {
        colorReduction: 16,
        dithering: false,
        smoothing: true
      });
      
      return { ...item, pixelResult };
    } catch (error) {
      console.error('Failed to process emoji:', error);
      return item;
    } finally {
      setIsProcessing(false);
    }
  };

  // Process all items when format changes
  useEffect(() => {
    const processAllItems = async () => {
      const processedPublicItems = await Promise.all(
        publicGalleryItems.map(item => processItemEmoji(item))
      );
      const processedCreatorItems = await Promise.all(
        myCreatorItems.map(item => processItemEmoji(item))
      );
      
      setPublicGalleryItems(processedPublicItems);
      setMyCreatorItems(processedCreatorItems);
    };

    processAllItems();
  }, [pixelFormat]);

  // Render pixel art canvas
  const renderPixelCanvas = (item: GalleryItem) => {
    if (!item.pixelResult) {
      return (
        <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg flex items-center justify-center">
          <div className="text-8xl md:text-9xl">{item.emoji}</div>
        </div>
      );
    }

    return (
      <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg p-2 flex items-center justify-center">
        <canvas
          ref={(canvas) => {
            if (canvas && item.pixelResult) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Set canvas to maximum size within container
                const containerElement = canvas.parentElement;
                if (containerElement) {
                  const rect = containerElement.getBoundingClientRect();
                  const maxSize = Math.min(rect.width - 16, rect.height - 16); // Account for padding
                  const pixelRatio = pixelFormat === '32x32' ? 1 : 0.5;
                  
                  canvas.width = maxSize;
                  canvas.height = maxSize * pixelRatio;
                  canvas.style.width = `${maxSize}px`;
                  canvas.style.height = `${maxSize * pixelRatio}px`;
                  
                  ctx.imageSmoothingEnabled = false;
                  
                  // Draw the pixel art scaled to fill the canvas
                  ctx.drawImage(
                    item.pixelResult.canvas,
                    0, 0,
                    canvas.width, canvas.height
                  );
                }
              }
            }
          }}
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    );
  };

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
          <div className="flex-1 min-w-0">
            <div className="h-full p-2 md:p-4">
              <div className="h-full rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col">
                
                {/* Gallery Header */}
                <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Back Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-2 sm:p-3"
                      onClick={handleBackToChat}
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    
                    {/* Title */}
                    <div className="flex-1">
                      <h1 className="text-lg sm:text-xl font-bold text-white">{t('gallery.title')}</h1>
                    </div>

                    {/* Pixel Format Selector */}
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-cyan-400" />
                      <Select value={pixelFormat} onValueChange={(value: PixelFormat) => setPixelFormat(value)}>
                        <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/20">
                          <SelectItem value="32x32" className="text-white hover:bg-white/10">
                            {t('pixel.format32x32')}
                          </SelectItem>
                          <SelectItem value="32x16" className="text-white hover:bg-white/10">
                            {t('pixel.format32x16')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/10 bg-white/3">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm">
                      <TabsTrigger 
                        value="public" 
                        className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                      >
                        {t('gallery.public')}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="mycreator"
                        className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                      >
                        {t('gallery.myCreator')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Gallery Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-slate-900/20">
                  <Tabs value={activeTab} className="w-full h-full">
                    {/* Public Gallery */}
                    <TabsContent value="public" className="h-full">
                      <div className="grid grid-cols-2 gap-4">
                        {isProcessing && (
                          <div className="col-span-full text-center py-8">
                            <div className="text-white/60 text-sm flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                              {t('pixel.processing')}
                            </div>
                          </div>
                        )}
                        {publicGalleryItems.map((item) => (
                          <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/20 transition-all duration-200 flex flex-col">
                            <div className="flex-1">
                              {renderPixelCanvas(item)}
                            </div>
                            <div className="mt-3 space-y-2">
                              <h3 className="text-white font-semibold text-sm truncate">{item.title}</h3>
                              <p className="text-white/60 text-xs truncate">by {item.creator}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-400 text-xs">❤️ {item.likes}</span>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-xs px-2 py-1">
                                    Use
                                  </Button>
                                  <div className="text-xs text-white/40 px-1 py-1 bg-white/5 rounded border border-white/10">
                                    {pixelFormat}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* My Creator Gallery */}
                    <TabsContent value="mycreator" className="h-full">
                      <div className="grid grid-cols-2 gap-4">
                        {myCreatorItems.map((item) => (
                          <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/20 transition-all duration-200 flex flex-col">
                            <div className="flex-1">
                              {renderPixelCanvas(item)}
                            </div>
                            <div className="mt-3 space-y-2">
                              <h3 className="text-white font-semibold text-sm truncate">{item.title}</h3>
                              <p className="text-white/60 text-xs truncate">{item.status}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-400 text-xs">❤️ {item.likes}</span>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-xs px-2 py-1">
                                    Edit
                                  </Button>
                                  <div className="text-xs text-white/40 px-1 py-1 bg-white/5 rounded border border-white/10">
                                    {pixelFormat}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Create Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleCreateClick}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-xl rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('gallery.createNew')}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Gallery;
