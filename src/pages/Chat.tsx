import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Smile, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../lib/auth';
import { AppSidebar } from '../components/AppSidebar';
import { useToast } from '../hooks/use-toast';
import { AppHeader } from '../components/AppHeader';
import { PageLayout } from '../components/PageLayout';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ContactInfo } from '../services/api/userApi';
import { 
  ChatMessageInfo, 
  sendChatMessage, 
  getRecentChatMessages, 
  getChatHistory,
  startChatWithContact,
  checkForNewMessages,
  NotificationInfo,
  PixelArtInfo,
  sendPixelArtMessage
} from '../services/api/chatApi';

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get contact information from URL parameters
  const contactId = searchParams.get('contactId');
  const contactName = searchParams.get('contactName') || 'Unknown';
  const contactAvatar = searchParams.get('contactAvatar') || 'U';
  const contactType = searchParams.get('contactType') || 'friend';
  const contactStatus = searchParams.get('contactStatus') || 'Active';
  const contactDevices = searchParams.get('contactDevices')?.split(',') || [];
  const contactIsOnline = searchParams.get('contactIsOnline') === 'true';
  const contactNickname = searchParams.get('contactNickname');
  const contactPrincipalId = searchParams.get('contactPrincipalId');

  // Debug URL parameters
  console.log('[Chat] URL parameters:', {
    contactId,
    contactName,
    contactPrincipalId,
    hasContactPrincipalId: !!contactPrincipalId,
    allSearchParams: Object.fromEntries(searchParams.entries())
  });

  // Immediate check for sessionStorage if contactPrincipalId is missing
  if (!contactPrincipalId) {
    console.log('[Chat] Contact principal ID missing, checking sessionStorage immediately');
    const savedContactInfo = sessionStorage.getItem('chat_contact_info');
    console.log('[Chat] SessionStorage content:', {
      hasData: !!savedContactInfo,
      rawData: savedContactInfo,
      parsedData: savedContactInfo ? (() => {
        try { return JSON.parse(savedContactInfo); } catch(e) { return 'Parse error: ' + e; }
      })() : null
    });

    // Try immediate restoration if data exists
    if (savedContactInfo) {
      try {
        const contactInfo = JSON.parse(savedContactInfo);
        if (contactInfo.contactPrincipalId) {
          console.log('[Chat] Found contact info in sessionStorage, attempting immediate restoration');
          
          // Build URL with all available contact information
          const restoreParams = new URLSearchParams(searchParams);
          if (contactInfo.contactId) restoreParams.set('contactId', contactInfo.contactId);
          if (contactInfo.contactName) restoreParams.set('contactName', contactInfo.contactName);
          if (contactInfo.contactAvatar) restoreParams.set('contactAvatar', contactInfo.contactAvatar);
          if (contactInfo.contactType) restoreParams.set('contactType', contactInfo.contactType);
          if (contactInfo.contactStatus) restoreParams.set('contactStatus', contactInfo.contactStatus);
          if (contactInfo.contactDevices?.length > 0) restoreParams.set('contactDevices', contactInfo.contactDevices.join(','));
          if (contactInfo.contactIsOnline !== undefined) restoreParams.set('contactIsOnline', contactInfo.contactIsOnline.toString());
          if (contactInfo.contactNickname) restoreParams.set('contactNickname', contactInfo.contactNickname);
          restoreParams.set('contactPrincipalId', contactInfo.contactPrincipalId);
          
          console.log('[Chat] Restoring contact info immediately with params:', Object.fromEntries(restoreParams.entries()));
          
          // Clear sessionStorage and redirect
          sessionStorage.removeItem('chat_contact_info');
          window.location.replace(`/chat?${restoreParams.toString()}`);
          return; // Stop further execution
        }
      } catch (error) {
        console.error('[Chat] Error parsing sessionStorage contact info:', error);
      }
    }
  }

  // Attempt to restore contact info from sessionStorage (when returning from Gallery)
  const restoreContactInfoFromStorage = () => {
    try {
      const savedContactInfo = sessionStorage.getItem('chat_contact_info');
      console.log('[Chat] Checking sessionStorage for contact info:', {
        hasData: !!savedContactInfo,
        rawData: savedContactInfo
      });
      
      if (savedContactInfo) {
        const contactInfo = JSON.parse(savedContactInfo);
        const timeDiff = Date.now() - contactInfo.timestamp;
        const isRecent = timeDiff < 5 * 60 * 1000; // Valid within 5 minutes
        
        console.log('[Chat] SessionStorage contact info analysis:', {
          contactInfo,
          timeDiffSeconds: Math.round(timeDiff / 1000),
          isRecent,
          hasContactPrincipalId: !!contactInfo.contactPrincipalId
        });
        
        if (isRecent && contactInfo.contactPrincipalId) {
          console.log('[Chat] Restoring contact info from sessionStorage:', contactInfo);
          
          // Build restored URL parameters
          const restoreParams = new URLSearchParams();
          if (contactInfo.contactId) restoreParams.set('contactId', contactInfo.contactId);
          if (contactInfo.contactName) restoreParams.set('contactName', contactInfo.contactName);
          if (contactInfo.contactAvatar) restoreParams.set('contactAvatar', contactInfo.contactAvatar);
          if (contactInfo.contactType) restoreParams.set('contactType', contactInfo.contactType);
          if (contactInfo.contactStatus) restoreParams.set('contactStatus', contactInfo.contactStatus);
          if (contactInfo.contactDevices?.length > 0) restoreParams.set('contactDevices', contactInfo.contactDevices.join(','));
          if (contactInfo.contactIsOnline !== undefined) restoreParams.set('contactIsOnline', contactInfo.contactIsOnline.toString());
          if (contactInfo.contactNickname) restoreParams.set('contactNickname', contactInfo.contactNickname);
          if (contactInfo.contactPrincipalId) restoreParams.set('contactPrincipalId', contactInfo.contactPrincipalId);
          
          // Preserve current pixelArt parameter (if any)
          const currentPixelArt = searchParams.get('pixelArt');
          if (currentPixelArt) {
            restoreParams.set('pixelArt', currentPixelArt);
          }
          
          // Clear sessionStorage and update URL
          sessionStorage.removeItem('chat_contact_info');
          navigate(`/chat?${restoreParams.toString()}`, { replace: true });
          return true; // Indicates restoring, need to re-render
        } else if (contactInfo.contactPrincipalId) {
          // Data exists but is expired, offer to restore anyway
          console.warn('[Chat] SessionStorage contact info is expired but valid:', {
            timeDiffMinutes: Math.round(timeDiff / 60000),
            contactInfo
          });
          
          // For now, extend the time limit to 30 minutes for Gallery returns
          const isWithinExtendedTime = timeDiff < 30 * 60 * 1000; // 30 minutes
          if (isWithinExtendedTime) {
            console.log('[Chat] Using extended time limit, restoring contact info');
            
            // Build restored URL parameters
            const restoreParams = new URLSearchParams();
            if (contactInfo.contactId) restoreParams.set('contactId', contactInfo.contactId);
            if (contactInfo.contactName) restoreParams.set('contactName', contactInfo.contactName);
            if (contactInfo.contactAvatar) restoreParams.set('contactAvatar', contactInfo.contactAvatar);
            if (contactInfo.contactType) restoreParams.set('contactType', contactInfo.contactType);
            if (contactInfo.contactStatus) restoreParams.set('contactStatus', contactInfo.contactStatus);
            if (contactInfo.contactDevices?.length > 0) restoreParams.set('contactDevices', contactInfo.contactDevices.join(','));
            if (contactInfo.contactIsOnline !== undefined) restoreParams.set('contactIsOnline', contactInfo.contactIsOnline.toString());
            if (contactInfo.contactNickname) restoreParams.set('contactNickname', contactInfo.contactNickname);
            if (contactInfo.contactPrincipalId) restoreParams.set('contactPrincipalId', contactInfo.contactPrincipalId);
            
            // Preserve current pixelArt parameter (if any)
            const currentPixelArt = searchParams.get('pixelArt');
            if (currentPixelArt) {
              restoreParams.set('pixelArt', currentPixelArt);
            }
            
            // Clear sessionStorage and update URL
            sessionStorage.removeItem('chat_contact_info');
            navigate(`/chat?${restoreParams.toString()}`, { replace: true });
            return true; // Indicates restoring, need to re-render
          } else {
            // Clear very old data
            console.log('[Chat] Contact info too old, clearing sessionStorage');
            sessionStorage.removeItem('chat_contact_info');
          }
        } else {
          // Clear invalid data
          console.log('[Chat] Invalid contact info in sessionStorage, clearing');
          sessionStorage.removeItem('chat_contact_info');
        }
      }
    } catch (error) {
      console.error('[Chat] Error restoring contact info from sessionStorage:', error);
      sessionStorage.removeItem('chat_contact_info');
    }
    return false;
  };

  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [socialPairKey, setSocialPairKey] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [pendingPixelArt, setPendingPixelArt] = useState<PixelArtInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if contact info needs to be restored from sessionStorage on component load
  useEffect(() => {
    // Check if user came from Gallery page or if sessionStorage has contact info
    const returningFlag = sessionStorage.getItem('returning_from_gallery');
    const fromGalleryParam = searchParams.get('from') === 'gallery';
    const hasContactInfo = sessionStorage.getItem('chat_contact_info');
    const cameFromGallery = document.referrer.includes('/gallery') || 
                           returningFlag === 'true' ||
                           fromGalleryParam ||
                           !!hasContactInfo; // If there's contact info, assume came from Gallery
    
    // Only attempt to restore when auth is complete and contact info is missing
    if (!authLoading && !contactPrincipalId) {
      console.log('[Chat] Auth complete, checking if contact restoration needed:', {
        cameFromGallery,
        referrer: document.referrer,
        returningFlag,
        fromGalleryParam,
        hasContactInfo: !!hasContactInfo,
        forceRestore: true // Always try to restore if contact info is missing
      });
      
      // Always try to restore if contact principal ID is missing and we have session data
      const isRestoring = restoreContactInfoFromStorage();
      if (isRestoring) {
        console.log('[Chat] Restoring contact info, component will re-render');
        return; // Currently restoring, wait for re-render
      } else {
        console.log('[Chat] No contact info to restore from sessionStorage');
        
        // If we have session data but restoration failed, show helpful message
        if (hasContactInfo) {
          console.warn('[Chat] Session data exists but contact info restoration failed');
          toast({
            title: t('chat.error.contactRestoreFailed'),
            description: t('chat.error.contactRestoreFailedDesc'),
            variant: "destructive"
          });
        }
      }
    } else if (authLoading) {
      console.log('[Chat] Auth still loading, delaying contact restoration check');
    } else {
      console.log('[Chat] Contact principal ID already available:', contactPrincipalId);
    }
    
    // Clear the returning flag after processing
    if (sessionStorage.getItem('returning_from_gallery')) {
      sessionStorage.removeItem('returning_from_gallery');
    }
    
    // Clear the from parameter from URL after processing
    if (searchParams.get('from') === 'gallery') {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('from');
      const newUrl = newSearchParams.toString() ? `/chat?${newSearchParams.toString()}` : '/chat';
      navigate(newUrl, { replace: true });
    }
  }, [authLoading, contactPrincipalId, toast, t]); // Execute when auth status or contact ID changes

  // Build current contact object
  const currentContact: ContactInfo = {
    id: contactId ? parseInt(contactId) : 0,
    name: contactName,
    type: contactType as 'friend' | 'system',
    status: contactStatus as 'Active' | 'Pending' | 'Blocked' | 'Deleted',
    date: new Date().toISOString().split('T')[0],
    avatar: contactAvatar,
    devices: contactDevices,
    isOnline: contactIsOnline,
    nickname: contactNickname || undefined,
    contactPrincipalId: contactPrincipalId || undefined,
  };

  // Scroll to latest message
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initialize chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      // Add detailed debugging for missing principal IDs
      console.log('[Chat] Initializing chat with:', {
        userExists: !!user,
        userPrincipalId: user?.principalId,
        contactPrincipalId: contactPrincipalId,
        hasUserPrincipal: !!user?.principalId,
        hasContactPrincipal: !!contactPrincipalId,
        authLoading: authLoading,
        userObject: user
      });
      
      if (!user?.principalId || !contactPrincipalId) {
        console.warn('[Chat] Missing user principal ID or contact principal ID:', {
          userPrincipalMissing: !user?.principalId,
          contactPrincipalMissing: !contactPrincipalId,
          userPrincipalId: user?.principalId,
          contactPrincipalId: contactPrincipalId
        });
        
        // Show user-friendly notification about missing information
        if (!user?.principalId) {
          toast({
            title: t('chat.error.authRequired'),
            description: t('chat.error.authRequiredDesc'),
            variant: "destructive"
          });
        } else if (!contactPrincipalId) {
          toast({
            title: t('chat.error.contactMissing'),
            description: t('chat.error.contactMissingDesc'),
            variant: "destructive"
          });
        }
        
        setIsLoadingChat(false);
        return;
      }

      try {
        setIsLoadingChat(true);
        console.log('[Chat] Initializing chat between:', user.principalId, 'and', contactPrincipalId);
        
        // Start chat and get social pair key
        const pairKey = await startChatWithContact(user.principalId, contactPrincipalId);
        setSocialPairKey(pairKey);
        console.log('[Chat] Generated social pair key:', pairKey);
        
        // Load recent chat messages
        const recentMessages = await getRecentChatMessages(user.principalId, contactPrincipalId);
        setMessages(recentMessages);
        console.log('[Chat] Loaded recent messages:', recentMessages.length);
        
      } catch (error) {
        console.error('[Chat] Error initializing chat:', error);
        // Set fallback demo messages if chat initialization fails
        setMessages([]);
      } finally {
        setIsLoadingChat(false);
      }
    };

    // Only initialize when not loading and we have the necessary data
    if (!authLoading) {
      initializeChat();
    } else {
      console.log('[Chat] Waiting for auth to complete before initializing chat');
    }
  }, [user?.principalId, contactPrincipalId, authLoading]);

  // Handle pixel art data from URL params
  useEffect(() => {
    const pixelArtParam = searchParams.get('pixelArt');
    if (pixelArtParam) {
      try {
        const pixelArtData = JSON.parse(pixelArtParam) as PixelArtInfo;
        setPendingPixelArt(pixelArtData);
        console.log('[Chat] Received pixel art data:', pixelArtData);
        
        // Clear the URL parameter
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('pixelArt');
        navigate(`/chat?${newSearchParams.toString()}`, { replace: true });
      } catch (error) {
        console.error('[Chat] Error parsing pixel art data:', error);
      }
    }
  }, [searchParams, navigate]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!user?.principalId) return;

    const pollInterval = setInterval(async () => {
      try {
        const newNotifications = await checkForNewMessages(user.principalId);
        setNotifications(newNotifications);
        
        // If there are new notifications for this chat, reload messages
        if (newNotifications.some(notif => notif.socialPairKey === socialPairKey)) {
          console.log('[Chat] socialPairKey:', socialPairKey);
          const updatedMessages = await getRecentChatMessages(user.principalId, contactPrincipalId || '');
          setMessages(updatedMessages);
        }
      } catch (error) {
        console.error('[Chat] Error polling for new messages:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [user?.principalId, socialPairKey, contactPrincipalId]);

  const handleSendMessage = async () => {
    // Detailed check for missing data
    const hasMessage = newMessage.trim();
    const hasPixelArt = !!pendingPixelArt;
    const hasUserPrincipal = !!user?.principalId;
    const hasContactPrincipal = !!contactPrincipalId;
    
    console.log('[Chat] Send message validation:', {
      hasMessage,
      hasPixelArt,
      hasUserPrincipal,
      hasContactPrincipal,
      userPrincipalId: user?.principalId,
      contactPrincipalId
    });

    if (!hasMessage && !hasPixelArt) {
      console.warn('[Chat] Cannot send message: no message content or pixel art');
      toast({
        title: t('chat.error.emptyMessage'),
        description: t('chat.error.emptyMessageDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!hasUserPrincipal) {
      console.warn('[Chat] Cannot send message: user principal ID missing');
      toast({
        title: t('chat.error.authFailed'),
        description: t('chat.error.authFailedDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!hasContactPrincipal) {
      console.warn('[Chat] Cannot send message: contact principal ID missing');
      toast({
        title: t('chat.error.contactMissing'),
        description: t('chat.error.contactMissingDesc'),
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (pendingPixelArt) {
        // Send pixel art message
        console.log('[Chat] Sending pixel art message:', pendingPixelArt);
        await sendPixelArtMessage(user.principalId, contactPrincipalId, pendingPixelArt);
        setPendingPixelArt(null);
      } else {
        // Send text message
        console.log('[Chat] Sending message:', newMessage);
        await sendChatMessage(user.principalId, contactPrincipalId, newMessage, 'Text');
        setNewMessage('');
      }
      
      // Reload messages to include the new one
      const updatedMessages = await getRecentChatMessages(user.principalId, contactPrincipalId);
      setMessages(updatedMessages);
      
      console.log('[Chat] Message sent successfully');
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      if (pendingPixelArt) {
        // Add fallback pixel art message if backend fails
        const fallbackMsg: ChatMessageInfo = {
          sendBy: user.principalId,
          content: JSON.stringify(pendingPixelArt),
          mode: 'PixelArt',
          timestamp: Date.now(),
          pixelArt: pendingPixelArt
        };
        setMessages(prev => [...prev, fallbackMsg]);
        setPendingPixelArt(null);
      } else {
        // Add fallback text message if backend fails
        const fallbackMsg: ChatMessageInfo = {
          sendBy: user.principalId,
          content: newMessage,
          mode: 'Text',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, fallbackMsg]);
        setNewMessage('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToContracts = () => {
    navigate('/contracts');
  };

  const handleEmojiClick = () => {
    // Save current contact info to sessionStorage for restoration when returning from Gallery
    const contactInfo = {
      contactId,
      contactName,
      contactAvatar,
      contactType,
      contactStatus,
      contactDevices,
      contactIsOnline,
      contactNickname,
      contactPrincipalId,
      timestamp: Date.now() // Add timestamp to avoid expired data
    };
    
    sessionStorage.setItem('chat_contact_info', JSON.stringify(contactInfo));
    console.log('[Chat] Saved contact info to sessionStorage before navigating to gallery');
    navigate('/gallery');
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to determine if message is from current user
  const isMyMessage = (message: ChatMessageInfo): boolean => {
    return message.sendBy === user?.principalId;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
              {t('common.initializingAI')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if critical chat information is missing
  if (!contactPrincipalId) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-4">{t('chat.error.contactInfoMissing')}</h2>
            <p className="text-white/70 mb-6">
              {t('chat.error.contactInfoMissingDesc')}
            </p>
            <div className="space-y-2 text-sm text-white/50 mb-6">
              <p>{t('chat.debug.info')}:</p>
              <p>contactId: {contactId || t('common.none')}</p>
              <p>contactName: {contactName}</p>
              <p>contactPrincipalId: {contactPrincipalId || t('common.none')}</p>
            </div>
            <Button
              onClick={handleBackToContracts}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
            >
              {t('chat.backToContacts')}
            </Button>
          </div>
        </div>
      </PageLayout>
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
          <div className="flex-1 min-w-0">
            <div className="h-full p-2 md:p-4">
              <div className="h-full rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col">
                    {/* Chat Header */}
                    <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-white/10 bg-white/5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Back Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-2 sm:p-3"
                          onClick={handleBackToContracts}
                        >
                          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        
                        {/* Contact Info */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="relative">
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                              <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold text-xs sm:text-sm">
                                {currentContact.avatar}
                              </AvatarFallback>
                            </Avatar>
                            {currentContact.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <h1 className="text-lg sm:text-xl font-bold text-white">{currentContact.name}</h1>
                              {currentContact.nickname && (
                                <span className="text-sm text-cyan-400/70">({currentContact.nickname})</span>
                              )}
                              {notifications.length > 0 && (
                                <div className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[16px] text-center">
                                  {notifications.length}
                                </div>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-white/60">
                              {currentContact.isOnline ? 'Online' : 'Offline'}
                              {currentContact.devices.length > 0 && ` • ${currentContact.devices.join(', ')}`}
                              {socialPairKey && (
                                <span className="block text-xs text-cyan-400/50 mt-1">
                                  Chat ID: {socialPairKey.substring(0, 12)}...
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                {/* Contact Details */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/10 bg-white/3">
                  <div className="p-2 sm:p-3 bg-white/5 rounded-lg backdrop-blur-sm">
                    <div className="text-xs sm:text-sm text-white/80 space-y-1">
                      <p><span className="text-cyan-400">Devices:</span> {currentContact.devices.length > 0 ? currentContact.devices.join(', ') : 'None'}</p>
                      <p><span className="text-cyan-400">Online:</span> {currentContact.isOnline ? 'Yes' : 'No'}</p>
                      {currentContact.contactPrincipalId && (
                        <p><span className="text-cyan-400">Principal ID:</span> <code className="text-cyan-300 text-xs">{currentContact.contactPrincipalId}</code></p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-slate-900/20">
                  {isLoadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-white/60 text-sm">Loading chat history...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-white/60 text-sm text-center">
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div 
                        key={`${message.sendBy}-${message.timestamp}-${index}`}
                        className={`flex mb-3 ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-2 sm:p-3 rounded-lg ${
                          isMyMessage(message)
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                            : 'bg-white/10 text-white backdrop-blur-sm'
                        }`}>
                          {message.mode === 'PixelArt' && message.pixelArt ? (
                            <div className="space-y-2">
                              <img 
                                src={message.pixelArt.chatFormat} 
                                alt="Pixel Art"
                                className="max-w-full h-auto rounded pixelated"
                                style={{ imageRendering: 'pixelated', maxHeight: '200px' }}
                              />
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm">{message.content}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">{formatTimestamp(message.timestamp)}</p>
                            {message.mode !== 'Text' && (
                              <span className="text-xs opacity-70 ml-2 px-1 bg-white/20 rounded">
                                {message.mode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {/* Hidden element for auto scroll to bottom */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/10 bg-white/5 space-y-3 sm:space-y-4">
                      {/* Pending Pixel Art Preview */}
                      {pendingPixelArt && (
                        <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-medium">{t('chat.readyToSend')}:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingPixelArt(null)}
                              className="text-white/60 hover:text-white hover:bg-white/10 p-1"
                            >
                              ✕
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <img 
                              src={pendingPixelArt.chatFormat} 
                              alt="Pixel Art Preview"
                              className="w-12 h-12 rounded pixelated border border-white/20"
                              style={{ imageRendering: 'pixelated' }}
                            />
                            <div className="flex-1 text-white/80 text-xs">
                              <div>{t('chat.pixelArt')}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Message Input Row */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={t('common.typeYourMessage') as string}
                            className="w-full bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm text-xs sm:text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !loading) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                        </div>
                        
                        {/* Send to Chat Button */}
                        <Button
                          onClick={handleSendMessage}
                          disabled={loading || (!newMessage.trim() && !pendingPixelArt)}
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 p-2 sm:p-3 min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send message to chat"
                        >
                          {loading ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                        
                        {/* Send to Device Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/50 backdrop-blur-sm text-xs px-3 py-2 min-w-[44px] transition-all duration-200"
                          onClick={() => {
                            if (pendingPixelArt) {
                              // Send pixel art to device in device format
                              console.log('Sending pixel art to device:', pendingPixelArt.deviceFormat);
                              // TODO: Implement actual device communication
                              // For now, just log the device format data
                              try {
                                const deviceData = JSON.parse(pendingPixelArt.deviceFormat);
                                console.log('Device format data:', deviceData);
                                alert(`Pixel art sent to device!\nFormat: ${deviceData.width}x${deviceData.height}\nColors: ${deviceData.palette?.length || 0}`);
                              } catch (error) {
                                console.error('Invalid device format:', error);
                              }
                              setPendingPixelArt(null);
                            } else if (newMessage.trim()) {
                              // Send text message to device
                              console.log('Sending text to device:', newMessage);
                              // TODO: Implement device text message sending
                              alert(`Text sent to device: ${newMessage}`);
                              setNewMessage('');
                            }
                          }}
                          disabled={!newMessage.trim() && !pendingPixelArt}
                          title="Send message to device"
                        >
                          <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      
                      {/* Function Buttons Row */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm text-xs px-3 py-2 flex-1"
                          onClick={handleEmojiClick}
                        >
                          <Smile className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          {t('common.emoji')}
                        </Button>
                        
                        {/* Device Status Indicator */}
                        <div className="inline-flex items-center gap-1 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-white/60">Device Connected</span>
                        </div>
                      </div>
                    </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </PageLayout>
  );
};

export default Chat;
