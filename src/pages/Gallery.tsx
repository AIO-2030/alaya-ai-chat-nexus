import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Palette, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { PageLayout } from '../components/PageLayout';
import { LoginScreen } from '../components/LoginScreen';
import { RegisterScreen } from '../components/RegisterScreen';
import { EmailLoginScreen } from '../components/EmailLoginScreen';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { pixelizeEmoji, PixelFormat, PixelProcessingResult } from '../lib/pixelProcessor';
import { PixelCreationApi, ProjectListItem } from '../services/api/pixelCreationApi';
import { useAuth } from '../lib/auth';
import { PixelArtInfo, GifInfo } from '../services/api/chatApi';
import { convertPixelResultToGif, convertUserCreationToGif, GifResult } from '../lib/pixelToGifConverter';

interface GalleryItem {
  id: number;
  title: string;
  creator?: string;
  status?: string;
  likes: number;
  emoji: string;
  pixelResult?: PixelProcessingResult;
  gifResult?: GifResult; // 新增GIF结果
}

interface UserCreationItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: {
    versionId: string;
    message?: string;
  };
  pixelArt?: {
    width: number;
    height: number;
    palette: string[];
    pixels: number[][];
  };
  gifResult?: GifResult; // 新增GIF结果
}

interface GifItem {
  id: number;
  title: string;
  creator?: string;
  likes: number;
  gifUrl: string;
  thumbnailUrl: string;
  duration: number; // in milliseconds
  width: number;
  height: number;
}

const Gallery = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading, loginWithEmailPassword, registerWithEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('public');
  const [publicSubTab, setPublicSubTab] = useState('pixel'); // 'pixel' or 'gif'
  const [pixelFormat, setPixelFormat] = useState<PixelFormat>('32x32');
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEmailLoginModal, setShowEmailLoginModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingUserCreations, setIsLoadingUserCreations] = useState(false);
  const [userCreations, setUserCreations] = useState<UserCreationItem[]>([]);
  const [hasMoreCreations, setHasMoreCreations] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUsingItem, setIsUsingItem] = useState(false);

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  // 获取来源页面信息
  const sourcePage = searchParams.get('from') || 'chat'; // 默认为chat页面
  console.log('[Gallery] Source page:', sourcePage);

  // Helper function to add device info to URL parameters
  const addDeviceInfoToParams = (params: URLSearchParams) => {
    const savedDeviceInfo = sessionStorage.getItem('device_send_info');
    if (savedDeviceInfo) {
      try {
        const deviceInfo = JSON.parse(savedDeviceInfo);
        if (deviceInfo.deviceId) {
          params.set('deviceId', deviceInfo.deviceId);
          if (deviceInfo.deviceName) params.set('deviceName', deviceInfo.deviceName);
          if (deviceInfo.deviceType) params.set('deviceType', deviceInfo.deviceType);
          if (deviceInfo.deviceStatus) params.set('deviceStatus', deviceInfo.deviceStatus);
          console.log('[Gallery] Added device info to URL parameters:', Object.fromEntries(params.entries()));
        }
      } catch (error) {
        console.error('[Gallery] Error parsing device info from sessionStorage:', error);
      }
    }
  };

  // Auto-open login modal when switching to "My Creator" tab and user is not authenticated
  useEffect(() => {
    if (activeTab === 'mycreator' && !isAuthenticated() && !authLoading) {
      setShowLoginModal(true);
    }
  }, [activeTab, isAuthenticated, authLoading]);

  const handleBackToSource = () => {
    // Set sessionStorage flag and use URL parameter as backup
    sessionStorage.setItem('returning_from_gallery', 'true');
    console.log('[Gallery] Returning to source page:', sourcePage);
    
    if (sourcePage === 'device-send') {
      // 从DeviceSend页面来的，返回到DeviceSend页面
      // 检查是否有保存的设备信息
      const deviceInfo = sessionStorage.getItem('device_send_info');
      if (deviceInfo) {
        try {
          const device = JSON.parse(deviceInfo);
          const params = new URLSearchParams();
          if (device.deviceId) params.set('deviceId', device.deviceId);
          if (device.deviceName) params.set('deviceName', device.deviceName);
          if (device.deviceType) params.set('deviceType', device.deviceType);
          if (device.deviceStatus) params.set('deviceStatus', device.deviceStatus);
          navigate(`/device-send?${params.toString()}`);
        } catch (error) {
          console.error('[Gallery] Error parsing device info:', error);
          navigate('/my-devices');
        }
      } else {
        navigate('/my-devices');
      }
    } else {
      // 默认返回到Chat页面
      // 检查是否有保存的联系人信息
      const contactInfo = sessionStorage.getItem('chat_contact_info');
      if (contactInfo) {
        console.log('[Gallery] Found contact info, navigating to chat');
        navigate('/chat?from=gallery');
      } else {
        console.log('[Gallery] No contact info found, navigating to contracts to select contact');
        // 如果没有联系人信息，返回到联系人页面让用户选择联系人
        navigate('/contracts?from=gallery');
      }
    }
  };

  const handleCreateClick = () => {
    navigate('/creation');
  };

  // Helper function: build Chat URL parameters with pixel art data
  const buildChatUrlWithPixelArt = (pixelArtData: PixelArtInfo): string => {
    // Set sessionStorage flag and include in URL parameters
    sessionStorage.setItem('returning_from_gallery', 'true');
    
    const params = new URLSearchParams();
    params.set('pixelArt', JSON.stringify(pixelArtData));
    params.set('from', 'gallery'); // Add source parameter
    console.log('[Gallery] Sending pixel art to chat with sessionStorage flag set, contact info will be restored automatically');
    return `/chat?${params.toString()}`;
  };

  // Convert canvas to base64 image for chat display
  const canvasToBase64 = (canvas: HTMLCanvasElement): string => {
    return canvas.toDataURL('image/png');
  };

  // Extract pixel data from pixel result for restoration
  const extractPixelDataFromPixelResult = (pixelResult?: PixelProcessingResult): { palette: string[]; pixels: number[][] } => {
    if (!pixelResult) {
      return { palette: [], pixels: [] };
    }

    const canvas = pixelResult.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { palette: pixelResult.palette || [], pixels: [] };
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels: number[][] = [];
    
    // Convert RGBA data to color indices
    for (let y = 0; y < canvas.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        
        // Convert to hex color
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Find color index in palette
        let colorIndex = 0;
        if (pixelResult.palette) {
          colorIndex = pixelResult.palette.findIndex(color => color === hex);
          if (colorIndex === -1) colorIndex = 0;
        }
        
        row.push(a === 0 ? -1 : colorIndex); // -1 for transparent pixels
      }
      pixels.push(row);
    }

    return {
      palette: pixelResult.palette || [],
      pixels
    };
  };

  // Generate device format JSON from pixel result
  const generateDeviceFormat = (pixelResult: PixelProcessingResult, title: string): string => {
    // Extract pixel data from canvas
    const canvas = pixelResult.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '{}';

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels: number[][] = [];
    
    // Convert RGBA data to color indices
    for (let y = 0; y < canvas.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        
        // Convert to hex color
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Find color index in palette (simplified)
        let colorIndex = 0;
        if (pixelResult.palette) {
          colorIndex = pixelResult.palette.findIndex(color => color === hex);
          if (colorIndex === -1) colorIndex = 0;
        }
        
        row.push(a === 0 ? -1 : colorIndex); // -1 for transparent pixels
      }
      pixels.push(row);
    }

    return JSON.stringify({
      title,
      width: canvas.width,
      height: canvas.height,
      palette: pixelResult.palette || ['#000000'],
      pixels,
      format: 'device',
      timestamp: Date.now()
    });
  };

  // Generate device format for user creation
  const generateCreationDeviceFormat = (item: UserCreationItem): string => {
    if (!item.pixelArt) return '{}';

    return JSON.stringify({
      title: item.title,
      projectId: item.id,
      width: item.pixelArt.width,
      height: item.pixelArt.height,
      palette: item.pixelArt.palette,
      pixels: item.pixelArt.pixels,
      format: 'device',
      timestamp: Date.now()
    });
  };

  // Handle Use button click for public gallery items
  const handleUsePublicItem = async (item: GalleryItem) => {
    if (isUsingItem) return; // Prevent multiple clicks
    
    try {
      setIsUsingItem(true);
      console.log('[Gallery] Using public item:', item.title, 'gifResult:', !!item.gifResult);
      
      // If no GIF result, try to process the emoji first
      if (!item.gifResult) {
        console.log('[Gallery] No GIF result, processing emoji first...');
        try {
          const processedItem = await processItemEmoji(item);
          if (!processedItem.gifResult) {
            console.error('[Gallery] Failed to process emoji into GIF:', item.title);
            // Show user-friendly error message
            alert(`Failed to process "${item.title}" emoji. Please try again.`);
            return;
          }
          
          // Update the item with processed result
          item.gifResult = processedItem.gifResult;
        } catch (processError) {
          console.error('[Gallery] Error processing emoji:', processError);
          alert(`Error processing "${item.title}" emoji. Please try again.`);
          return;
        }
      }

      // 使用GIF数据，包含像素数据以便恢复
      const gifData: GifInfo = {
        gifUrl: item.gifResult.gifUrl,
        thumbnailUrl: item.gifResult.thumbnailUrl,
        title: item.gifResult.title,
        duration: item.gifResult.duration,
        width: item.gifResult.width,
        height: item.gifResult.height,
        sourceType: 'gif',
        sourceId: item.id.toString(),
        palette: item.gifResult.palette,  // Use palette from gifResult
        pixels: item.gifResult.pixels     // Use pixels from gifResult
      };

      console.log('[Gallery] Created GIF data:', gifData);
      console.log('[Gallery] Public GIF data includes:', {
        hasPalette: !!gifData.palette,
        hasPixels: !!gifData.pixels,
        paletteLength: gifData.palette?.length,
        pixelsLength: gifData.pixels?.length
      });

      // Set sessionStorage flag and include in URL parameters
      sessionStorage.setItem('returning_from_gallery', 'true');
      
      const params = new URLSearchParams();
      params.set('gifData', JSON.stringify(gifData));
      params.set('from', 'gallery');
      
      if (sourcePage === 'device-send') {
        // 从DeviceSend页面来的，返回到DeviceSend页面
        console.log('[Gallery] Sending GIF to device-send page');
        console.log('[Gallery] Device info in sessionStorage:', sessionStorage.getItem('device_send_info'));
        // Add device info to URL parameters
        addDeviceInfoToParams(params);
        
        const deviceUrl = `/device-send?${params.toString()}`;
        navigate(deviceUrl);
      } else {
        // 默认返回到Chat页面
        // 检查是否有保存的联系人信息
        const contactInfo = sessionStorage.getItem('chat_contact_info');
        if (contactInfo) {
          console.log('[Gallery] Found contact info, sending GIF to chat page');
          const chatUrl = `/chat?${params.toString()}`;
          navigate(chatUrl);
        } else {
          console.log('[Gallery] No contact info found, redirecting to contracts to select contact');
          // 如果没有联系人信息，返回到联系人页面让用户选择联系人
          navigate('/contracts?from=gallery');
        }
      }
    } catch (error) {
      console.error('[Gallery] Error using public gallery item:', error);
      alert(`Error using "${item.title}". Please try again.`);
    } finally {
      setIsUsingItem(false);
    }
  };

  // Handle Use button click for user creation items
  const handleUseCreationItem = async (item: UserCreationItem) => {
    if (isUsingItem) return; // Prevent multiple clicks
    
    try {
      setIsUsingItem(true);
      console.log('[Gallery] Using creation item:', item.title, 'gifResult:', !!item.gifResult);
      
      if (!item.gifResult) {
        console.error('[Gallery] No GIF result available for creation item:', item.title);
        alert(`No preview available for "${item.title}". Please try again.`);
        return;
      }

      // 使用GIF数据而不是像素图数据
      const gifData: GifInfo = {
        gifUrl: item.gifResult.gifUrl,
        thumbnailUrl: item.gifResult.thumbnailUrl,
        title: item.gifResult.title,
        duration: item.gifResult.duration,
        width: item.gifResult.width,
        height: item.gifResult.height,
        sourceType: 'creation',
        sourceId: item.id,
        palette: item.gifResult.palette,  // Include palette for restoration
        pixels: item.gifResult.pixels     // Include pixels for restoration
      };

      console.log('[Gallery] Created GIF data for creation:', gifData);
      console.log('[Gallery] Creation GIF data includes:', {
        hasPalette: !!gifData.palette,
        hasPixels: !!gifData.pixels,
        paletteLength: gifData.palette?.length,
        pixelsLength: gifData.pixels?.length
      });

      // Set sessionStorage flag and include in URL parameters
      sessionStorage.setItem('returning_from_gallery', 'true');
      
      const params = new URLSearchParams();
      params.set('gifData', JSON.stringify(gifData));
      params.set('from', 'gallery');
      
      if (sourcePage === 'device-send') {
        // 从DeviceSend页面来的，返回到DeviceSend页面
        console.log('[Gallery] Sending GIF to device-send page');
        console.log('[Gallery] Device info in sessionStorage:', sessionStorage.getItem('device_send_info'));
        // Add device info to URL parameters
        addDeviceInfoToParams(params);
        
        const deviceUrl = `/device-send?${params.toString()}`;
        navigate(deviceUrl);
      } else {
        // 默认返回到Chat页面
        // 检查是否有保存的联系人信息
        const contactInfo = sessionStorage.getItem('chat_contact_info');
        if (contactInfo) {
          console.log('[Gallery] Found contact info, sending GIF to chat page');
          const chatUrl = `/chat?${params.toString()}`;
          navigate(chatUrl);
        } else {
          console.log('[Gallery] No contact info found, redirecting to contracts to select contact');
          // 如果没有联系人信息，返回到联系人页面让用户选择联系人
          navigate('/contracts?from=gallery');
        }
      }
    } catch (error) {
      console.error('[Gallery] Error using creation item:', error);
      alert(`Error using "${item.title}". Please try again.`);
    } finally {
      setIsUsingItem(false);
    }
  };

  // Handle Use button click for GIF items
  const handleUseGifItem = async (item: GifItem) => {
    if (isUsingItem) return; // Prevent multiple clicks
    
    try {
      setIsUsingItem(true);
      console.log('[Gallery] Using GIF item:', item.title);
      
      // Create GIF info object for chat
      const gifData = {
        gifUrl: item.gifUrl,
        thumbnailUrl: item.thumbnailUrl,
        title: item.title,
        duration: item.duration,
        width: item.width,
        height: item.height,
        sourceType: 'gif',
        sourceId: item.id.toString()
      };

      console.log('[Gallery] Created GIF data for GIF item:', gifData);

      // Set sessionStorage flag and include in URL parameters
      sessionStorage.setItem('returning_from_gallery', 'true');
      
      const params = new URLSearchParams();
      params.set('gifData', JSON.stringify(gifData));
      params.set('from', 'gallery');
      
      if (sourcePage === 'device-send') {
        // 从DeviceSend页面来的，返回到DeviceSend页面
        console.log('[Gallery] Sending GIF to device-send page');
        console.log('[Gallery] Device info in sessionStorage:', sessionStorage.getItem('device_send_info'));
        // Add device info to URL parameters
        addDeviceInfoToParams(params);
        
        const deviceUrl = `/device-send?${params.toString()}`;
        navigate(deviceUrl);
      } else {
        // 默认返回到Chat页面
        // 检查是否有保存的联系人信息
        const contactInfo = sessionStorage.getItem('chat_contact_info');
        if (contactInfo) {
          console.log('[Gallery] Found contact info, sending GIF to chat page');
          const chatUrl = `/chat?${params.toString()}`;
          navigate(chatUrl);
        } else {
          console.log('[Gallery] No contact info found, redirecting to contracts to select contact');
          // 如果没有联系人信息，返回到联系人页面让用户选择联系人
          navigate('/contracts?from=gallery');
        }
      }
    } catch (error) {
      console.error('[Gallery] Error using GIF item:', error);
      alert(`Error using "${item.title}". Please try again.`);
    } finally {
      setIsUsingItem(false);
    }
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

  // Mock data for GIF emojis
  const [gifGalleryItems, setGifGalleryItems] = useState<GifItem[]>([
    { 
      id: 1, 
      title: 'Dancing Cat', 
      creator: 'User1', 
      likes: 89, 
      gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif',
      thumbnailUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif',
      duration: 2000,
      width: 480,
      height: 480
    },
    { 
      id: 2, 
      title: 'Happy Dance', 
      creator: 'User2', 
      likes: 156, 
      gifUrl: 'https://media.giphy.com/media/26BRrSvJUa28UAZSU/giphy.gif',
      thumbnailUrl: 'https://media.giphy.com/media/26BRrSvJUa28UAZSU/giphy.gif',
      duration: 3000,
      width: 480,
      height: 270
    },
    { 
      id: 3, 
      title: 'Celebration', 
      creator: 'User3', 
      likes: 203, 
      gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif',
      thumbnailUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif',
      duration: 2500,
      width: 480,
      height: 480
    },
    { 
      id: 4, 
      title: 'Thumbs Up', 
      creator: 'User4', 
      likes: 78, 
      gifUrl: 'https://media.giphy.com/media/26BRrSvJUa28UAZSU/giphy.gif',
      thumbnailUrl: 'https://media.giphy.com/media/26BRrSvJUa28UAZSU/giphy.gif',
      duration: 1800,
      width: 480,
      height: 270
    },
    { 
      id: 5, 
      title: 'Wave Hello', 
      creator: 'User5', 
      likes: 134, 
      gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif',
      thumbnailUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif',
      duration: 2200,
      width: 480,
      height: 480
    },
    { 
      id: 6, 
      title: 'Love Heart', 
      creator: 'User6', 
      likes: 167, 
      gifUrl: 'https://media.giphy.com/media/26BRrSvJUa28UAZSU/giphy.gif',
      thumbnailUrl: 'https://media.giphy.com/media/26BRrSvJUa28UAZSU/giphy.gif',
      duration: 2800,
      width: 480,
      height: 270
    },
  ]);

  // Load user's pixel art creations with pagination
  const loadUserCreations = async (page: number = 0, append: boolean = false) => {
    if (page === 0) {
      setIsLoadingUserCreations(true);
      setUserCreations([]);
      setCurrentPage(0);
      setHasMoreCreations(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Check if user is authenticated through the unified auth system
      const userAuthenticated = isAuthenticated();
      
      if (!userAuthenticated) {
        setUserCreations([]);
        setHasMoreCreations(false);
        return;
      }

      const pageSize = 10; // Load 10 projects per page
      const offset = page * pageSize;
      const result = await PixelCreationApi.getUserProjects(offset, pageSize);         
      if (result.success && result.projects) {
        const creationsWithPixelArt = await Promise.all(
          result.projects.map(async (project) => {
            try {
              // Get pixel art data for each project
              const sourceResult = await PixelCreationApi.getCurrentSource(project.projectId);
              
              const userItem: UserCreationItem = {
                id: project.projectId,
                title: project.title,
                description: project.description,
                status: 'Published', // Default status
                likes: 0, // Mock likes for now
                createdAt: new Date(Number(project.createdAt) * 1000),
                updatedAt: new Date(Number(project.updatedAt) * 1000),
                currentVersion: {
                  versionId: project.currentVersion.versionId,
                  message: project.currentVersion.message
                },
                pixelArt: sourceResult.success ? sourceResult.pixelArt : undefined
              };
              
              // 如果有像素图数据，生成GIF
              if (userItem.pixelArt) {
                try {
                  userItem.gifResult = await convertUserCreationToGif(userItem);
                } catch (gifError) {
                  console.error('Failed to convert pixel art to GIF for project:', project.projectId, gifError);
                }
              }
              
              return userItem;
            } catch (error) {
              console.error('Failed to load pixel art for project:', project.projectId, error);
              return {
                id: project.projectId,
                title: project.title,
                description: project.description,
                status: 'Published',
                likes: 0,
                createdAt: new Date(Number(project.createdAt) * 1000),
                updatedAt: new Date(Number(project.updatedAt) * 1000),
                currentVersion: {
                  versionId: project.currentVersion.versionId,
                  message: project.currentVersion.message
                }
              };
            }
          })
        );
        
        if (append) {
          setUserCreations(prev => [...prev, ...creationsWithPixelArt]);
        } else {
          setUserCreations(creationsWithPixelArt);
        }

        // Check if there are more items to load
        if (result.projects.length < pageSize) {
          setHasMoreCreations(false);
        } else {
          setCurrentPage(page);
        }
      } else {
        console.error('Failed to load user projects:', result.error);
        if (!append) {
          setUserCreations([]);
        }
        setHasMoreCreations(false);
      }
    } catch (error) {
      console.error('Error loading user creations:', error);
      if (!append) {
        setUserCreations([]);
      }
      setHasMoreCreations(false);
    } finally {
      setIsLoadingUserCreations(false);
      setIsLoadingMore(false);
    }
  };

  // Load more creations when scrolling
  const loadMoreCreations = async () => {
    if (!isLoadingMore && hasMoreCreations && isAuthenticated()) {
      await loadUserCreations(currentPage + 1, true);
    }
  };

  // Process emoji into pixel art and GIF
  const processItemEmoji = async (item: GalleryItem) => {
    try {
      setIsProcessing(true);
      const pixelResult = await pixelizeEmoji(item.emoji, pixelFormat, {
        colorReduction: 16,
        dithering: false,
        smoothing: true
      });
      
      // 将像素图转换为GIF
      const gifResult = await convertPixelResultToGif(pixelResult, item.title);
      
      return { ...item, pixelResult, gifResult };
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
      
      setPublicGalleryItems(processedPublicItems);
    };

    processAllItems();
  }, [pixelFormat]);

  // Load user creations when switching to "My Creator" tab
  useEffect(() => {
    if (activeTab === 'mycreator') {
      loadUserCreations();
    }
  }, [activeTab]);

  // Authentication is now handled by useAuth hook

  // Add scroll listener for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      const scrollElement = galleryScrollRef.current;
      if (!scrollElement || !hasMoreCreations || isLoadingMore) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const threshold = 200; // Load more when 200px from bottom

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        loadMoreCreations();
      }
    };

    const scrollElement = galleryScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [hasMoreCreations, isLoadingMore, currentPage, isAuthenticated]);

  // Render user creation canvas (now shows GIF)
  const renderUserCreationCanvas = (item: UserCreationItem) => {
    if (!item.gifResult) {
      return (
        <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg flex items-center justify-center">
          <div className="text-white/60 text-sm text-center p-4">
            <Palette className="h-8 w-8 mx-auto mb-2" />
            No Preview
          </div>
        </div>
      );
    }

    return (
      <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg p-1 flex items-center justify-center overflow-hidden">
        <img
          src={item.gifResult.thumbnailUrl}
          alt={item.gifResult.title}
          className="w-full h-full object-cover rounded"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            // Fallback to placeholder if GIF fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="text-white/60 text-sm text-center p-4">
                  <div class="text-4xl mb-2">🎨</div>
                  <div>Pixel Art Preview</div>
                </div>
              `;
            }
          }}
        />
      </div>
    );
  };

  // Render pixel art canvas (now shows GIF)
  const renderPixelCanvas = (item: GalleryItem) => {
    if (!item.gifResult) {
      return (
        <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg flex items-center justify-center">
          <div className="text-6xl sm:text-7xl md:text-8xl">{item.emoji}</div>
        </div>
      );
    }

    return (
      <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg p-1 flex items-center justify-center overflow-hidden">
        <img
          src={item.gifResult.thumbnailUrl}
          alt={item.gifResult.title}
          className="w-full h-full object-cover rounded"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            // Fallback to emoji if GIF fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="text-6xl sm:text-7xl md:text-8xl">${item.emoji}</div>
              `;
            }
          }}
        />
      </div>
    );
  };

  // Render GIF canvas
  const renderGifCanvas = (item: GifItem) => {
    return (
      <div className="aspect-square bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-lg p-1 flex items-center justify-center overflow-hidden">
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover rounded"
          style={{ imageRendering: 'auto' }}
          onError={(e) => {
            // Fallback to a placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="text-white/60 text-sm text-center p-4">
                  <div class="text-4xl mb-2">🎬</div>
                  <div>GIF Preview</div>
                </div>
              `;
            }
          }}
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
              <div 
                className="h-full rounded-2xl bg-gradient-to-br from-slate-800/40 to-purple-900/30 backdrop-blur-xl shadow-2xl border border-cyan-400/20 flex flex-col"
                style={{
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                }}
              >
                
                {/* Gallery Header */}
                <div 
                  className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-cyan-400/20 bg-gradient-to-r from-slate-800/60 to-purple-900/40"
                  style={{
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                  }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Back Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-slate-700/60 border-cyan-400/30 text-white hover:bg-slate-700/80 backdrop-blur-sm p-2 sm:p-3"
                      onClick={handleBackToSource}
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    
                    {/* Title */}
                    <div className="flex-1">
                      <h1 
                        className="text-lg sm:text-xl font-bold text-white"
                        style={{
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          textRendering: 'optimizeLegibility',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {t('gallery.title')}
                      </h1>
                    </div>

                    {/* Pixel Format Selector */}
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-cyan-400" />
                      <Select value={pixelFormat} onValueChange={(value: PixelFormat) => setPixelFormat(value)}>
                        <SelectTrigger 
                          className="w-32 bg-slate-700/60 border-cyan-400/30 text-white hover:bg-slate-700/80"
                          style={{
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-cyan-400/30">
                          <SelectItem 
                            value="32x32" 
                            className="text-white hover:bg-slate-700/60"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                            }}
                          >
                            {t('pixel.format32x32')}
                          </SelectItem>
                          <SelectItem 
                            value="32x16" 
                            className="text-white hover:bg-slate-700/60"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                            }}
                          >
                            {t('pixel.format32x16')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div 
                  className="flex-shrink-0 p-3 sm:p-4 border-b border-cyan-400/20 bg-gradient-to-br from-slate-800/50 to-purple-900/30"
                  style={{
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                  }}
                >
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 backdrop-blur-sm border border-cyan-400/20 rounded-lg p-1">
                      <TabsTrigger 
                        value="public" 
                        className="text-white/90 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-slate-700/40 data-[state=inactive]:hover:bg-slate-700/60 transition-all duration-200 rounded-md font-semibold"
                        style={{
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          WebkitTapHighlightColor: 'transparent',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {t('gallery.public')}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="mycreator"
                        className="text-white/90 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-slate-700/40 data-[state=inactive]:hover:bg-slate-700/60 transition-all duration-200 rounded-md font-semibold"
                        style={{
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          WebkitTapHighlightColor: 'transparent',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {t('gallery.myCreator')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {/* Public Sub-tabs */}
                  {activeTab === 'public' && (
                    <div className="mt-3">
                      <Tabs value={publicSubTab} onValueChange={setPublicSubTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 backdrop-blur-sm border border-cyan-400/20 rounded-lg p-1">
                          <TabsTrigger 
                            value="pixel" 
                            className="text-white/90 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-slate-700/40 data-[state=inactive]:hover:bg-slate-700/60 transition-all duration-200 rounded-md text-sm font-medium"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                              WebkitTapHighlightColor: 'transparent',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            }}
                          >
                            🎨 {t('gallery.pixelEmojis')}
                          </TabsTrigger>
                          <TabsTrigger 
                            value="gif"
                            className="text-white/90 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-slate-700/40 data-[state=inactive]:hover:bg-slate-700/60 transition-all duration-200 rounded-md text-sm font-medium"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                              WebkitTapHighlightColor: 'transparent',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            }}
                          >
                            🎬 {t('gallery.animatedGifs')}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  )}
                </div>

                {/* Gallery Content */}
                <div 
                  ref={galleryScrollRef}
                  className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-slate-900/20"
                >
                  <Tabs value={activeTab} className="w-full h-full">
                    {/* Public Gallery */}
                    <TabsContent value="public" className="h-full">
                      <Tabs value={publicSubTab} className="w-full h-full">
                        {/* Pixel Art Sub-tab */}
                        <TabsContent value="pixel" className="h-full">
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
                              <div 
                                key={item.id} 
                                className="bg-slate-700/40 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/20 hover:bg-slate-700/60 hover:border-cyan-400/40 transition-all duration-200 flex flex-col"
                                style={{
                                  WebkitFontSmoothing: 'antialiased',
                                  MozOsxFontSmoothing: 'grayscale',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                <div className="flex-1">
                                  {renderPixelCanvas(item)}
                                </div>
                                <div className="mt-3 space-y-2">
                                  <h3 
                                    className="text-white font-semibold text-sm truncate"
                                    style={{
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    }}
                                  >
                                    {item.title}
                                  </h3>
                                  <p 
                                    className="text-white/70 text-xs truncate"
                                    style={{
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    }}
                                  >
                                    by {item.creator}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span 
                                      className="text-cyan-400 text-xs font-medium"
                                      style={{
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                      }}
                                    >
                                      ❤️ {item.likes}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="bg-cyan-500/20 border-cyan-400/40 text-white hover:bg-cyan-500/30 hover:border-cyan-400/60 text-xs px-2 py-1 font-medium"
                                        onClick={() => handleUsePublicItem(item)}
                                        style={{
                                          WebkitTapHighlightColor: 'transparent',
                                          WebkitFontSmoothing: 'antialiased',
                                          MozOsxFontSmoothing: 'grayscale',
                                        }}
                                      >
                                        Use
                                      </Button>
                                      <div 
                                        className="text-xs text-white/70 px-1 py-1 bg-slate-800/60 rounded border border-cyan-400/20 font-medium"
                                        style={{
                                          WebkitFontSmoothing: 'antialiased',
                                          MozOsxFontSmoothing: 'grayscale',
                                        }}
                                      >
                                        {pixelFormat}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        {/* GIF Sub-tab */}
                        <TabsContent value="gif" className="h-full">
                          <div className="grid grid-cols-2 gap-4">
                            {gifGalleryItems.map((item) => (
                              <div 
                                key={item.id} 
                                className="bg-slate-700/40 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/20 hover:bg-slate-700/60 hover:border-cyan-400/40 transition-all duration-200 flex flex-col"
                                style={{
                                  WebkitFontSmoothing: 'antialiased',
                                  MozOsxFontSmoothing: 'grayscale',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                <div className="flex-1">
                                  {renderGifCanvas(item)}
                                </div>
                                <div className="mt-3 space-y-2">
                                  <h3 
                                    className="text-white font-semibold text-sm truncate"
                                    style={{
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    }}
                                  >
                                    {item.title}
                                  </h3>
                                  <p 
                                    className="text-white/70 text-xs truncate"
                                    style={{
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    }}
                                  >
                                    by {item.creator}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span 
                                      className="text-cyan-400 text-xs font-medium"
                                      style={{
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                      }}
                                    >
                                      ❤️ {item.likes}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="bg-cyan-500/20 border-cyan-400/40 text-white hover:bg-cyan-500/30 hover:border-cyan-400/60 text-xs px-2 py-1 font-medium"
                                        onClick={() => handleUseGifItem(item)}
                                        style={{
                                          WebkitTapHighlightColor: 'transparent',
                                          WebkitFontSmoothing: 'antialiased',
                                          MozOsxFontSmoothing: 'grayscale',
                                        }}
                                      >
                                        Use
                                      </Button>
                                      <div 
                                        className="text-xs text-white/70 px-1 py-1 bg-slate-800/60 rounded border border-cyan-400/20 font-medium"
                                        style={{
                                          WebkitFontSmoothing: 'antialiased',
                                          MozOsxFontSmoothing: 'grayscale',
                                        }}
                                      >
                                        {item.width}x{item.height}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </TabsContent>

                    {/* My Creator Gallery */}
                    <TabsContent value="mycreator" className="h-full">
                      {!isAuthenticated() ? (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                          <div 
                            className="bg-slate-700/60 backdrop-blur-sm rounded-lg p-6 border border-cyan-400/30 max-w-md shadow-xl text-center"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                            }}
                          >
                            <Palette className="h-12 w-12 mx-auto mb-4 text-cyan-400" />
                            <h3 
                              className="text-white font-semibold text-lg mb-2"
                              style={{
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              }}
                            >
                              {t('auth.loginRequired')}
                            </h3>
                            <p 
                              className="text-white/80 text-sm mb-4"
                              style={{
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              }}
                            >
                              {t('gallery.loginToViewCreations')}
                            </p>
                            <Button
                              onClick={() => setShowLoginModal(true)}
                              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold"
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                              }}
                            >
                              {t('common.login') || 'Login'}
                            </Button>
                          </div>
                        </div>
                      ) : isLoadingUserCreations ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="text-white/60 text-sm flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                            {t('gallery.loadingCreations')}
                          </div>
                        </div>
                      ) : userCreations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <div 
                            className="bg-slate-700/60 backdrop-blur-sm rounded-lg p-6 border border-cyan-400/30 max-w-md shadow-xl"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                            }}
                          >
                            <Palette className="h-12 w-12 mx-auto mb-4 text-cyan-400" />
                            <h3 
                              className="text-white font-semibold text-lg mb-2"
                              style={{
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              }}
                            >
                              {t('gallery.noCreations')}
                            </h3>
                            <p 
                              className="text-white/80 text-sm mb-4"
                              style={{
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              }}
                            >
                              {t('gallery.startCreating')}
                            </p>
                            <Button
                              onClick={handleCreateClick}
                              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold"
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t('gallery.createNew')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-2 gap-4">
                            {userCreations.map((item) => (
                              <div 
                                key={item.id} 
                                className="bg-slate-700/40 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/20 hover:bg-slate-700/60 hover:border-cyan-400/40 transition-all duration-200 flex flex-col"
                                style={{
                                  WebkitFontSmoothing: 'antialiased',
                                  MozOsxFontSmoothing: 'grayscale',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                <div className="flex-1">
                                  {renderUserCreationCanvas(item)}
                                </div>
                                <div className="mt-3 space-y-2">
                                  <h3 
                                    className="text-white font-semibold text-sm truncate" 
                                    title={item.title}
                                    style={{
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                    }}
                                  >
                                    {item.title}
                                  </h3>
                                  {item.description && (
                                    <p 
                                      className="text-white/70 text-xs truncate" 
                                      title={item.description}
                                      style={{
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                      }}
                                    >
                                      {item.description}
                                    </p>
                                  )}
                                  <div 
                                    className="flex items-center justify-between text-xs text-white/60"
                                    style={{
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                    }}
                                  >
                                    <span>{item.status}</span>
                                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span 
                                      className="text-cyan-400 text-xs font-medium"
                                      style={{
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                      }}
                                    >
                                      ❤️ {item.likes}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="bg-cyan-500/20 border-cyan-400/40 text-white hover:bg-cyan-500/30 hover:border-cyan-400/60 text-xs px-2 py-1 font-medium"
                                        onClick={() => handleUseCreationItem(item)}
                                        style={{
                                          WebkitTapHighlightColor: 'transparent',
                                          WebkitFontSmoothing: 'antialiased',
                                          MozOsxFontSmoothing: 'grayscale',
                                        }}
                                      >
                                        Use
                                      </Button>
                                      {item.gifResult && (
                                        <div 
                                          className="text-xs text-white/70 px-1 py-1 bg-slate-800/60 rounded border border-cyan-400/20 font-medium"
                                          style={{
                                            WebkitFontSmoothing: 'antialiased',
                                            MozOsxFontSmoothing: 'grayscale',
                                          }}
                                        >
                                          {item.gifResult.width}x{item.gifResult.height}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Loading More Indicator */}
                          {isLoadingMore && (
                            <div className="flex justify-center items-center py-6">
                              <div className="text-white/60 text-sm flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                                {t('gallery.loadingMore')}
                              </div>
                            </div>
                          )}
                          
                          {/* End of List Indicator */}
                          {!hasMoreCreations && userCreations.length > 0 && (
                            <div className="flex justify-center items-center py-6">
                              <div className="text-white/40 text-sm">
                                {t('gallery.allLoaded')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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

        {/* Login Modals */}
        {showLoginModal && (
          <Dialog 
            open={showLoginModal} 
            onOpenChange={(open) => {
              setShowLoginModal(open);
              if (!open) {
                navigate('/');
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-transparent border-0 p-0">
              <LoginScreen
                onEmailLoginClick={() => {
                  setShowLoginModal(false);
                  setShowEmailLoginModal(true);
                }}
                onRegisterClick={() => {
                  setShowLoginModal(false);
                  setShowRegisterModal(true);
                }}
                loading={authLoading}
                closeBehavior="navigateToHome"
                onClose={() => {
                  setShowLoginModal(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {showRegisterModal && (
          <Dialog 
            open={showRegisterModal} 
            onOpenChange={(open) => {
              setShowRegisterModal(open);
              if (!open) {
                navigate('/');
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-transparent border-0 p-0">
              <RegisterScreen
                onRegister={async (nickname: string, email: string, password: string) => {
                  try {
                    await registerWithEmail(nickname, email, password);
                    setShowRegisterModal(false);
                    setShowLoginModal(false);
                  } catch (error) {
                    console.error('[Gallery] Registration failed:', error);
                    throw error;
                  }
                }}
                onBackToLogin={() => {
                  setShowRegisterModal(false);
                  setShowLoginModal(true);
                }}
                loading={authLoading}
                onClose={() => {
                  setShowRegisterModal(false);
                  navigate('/');
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {showEmailLoginModal && (
          <Dialog 
            open={showEmailLoginModal} 
            onOpenChange={(open) => {
              setShowEmailLoginModal(open);
              if (!open) {
                navigate('/');
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-transparent border-0 p-0">
              <EmailLoginScreen
                onEmailLogin={async (email: string, password: string) => {
                  try {
                    const userInfo = await loginWithEmailPassword(email, password);
                    setShowEmailLoginModal(false);
                    setShowLoginModal(false);
                    return userInfo;
                  } catch (error) {
                    console.error('[Gallery] Email login failed:', error);
                    throw error;
                  }
                }}
                onBackToLogin={() => {
                  setShowEmailLoginModal(false);
                  setShowLoginModal(true);
                }}
                loading={authLoading}
                onClose={() => {
                  setShowEmailLoginModal(false);
                  navigate('/');
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageLayout>
  );
};

export default Gallery;
