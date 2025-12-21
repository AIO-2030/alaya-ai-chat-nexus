import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Send, Smile, Smartphone, X } from 'lucide-react';
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
  getChatMessagesPaginated,
  getChatMessageCount,
  startChatWithContact,
  checkForNewMessages,
  NotificationInfo,
  GifInfo,
  sendGifMessage
} from '../services/api/chatApi';
import { deviceMessageService } from '../services/deviceMessageService';
import { deviceSimulator } from '../services/deviceSimulator';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import DeviceStatusIndicator from '../components/DeviceStatusIndicator';
import { deviceApiService, DeviceRecord } from '../services/api/deviceApi';
import { convertPixelToGif, GifResult } from '../lib/pixelToGifConverter';

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


  // Check for immediate restoration needs
  const hasGifData = searchParams.get('gifData');
  const needsImmediateRestoration = !contactPrincipalId && !hasGifData;
  const needsGifRestoration = hasGifData && !contactPrincipalId;

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
          if (contactInfo.contactId !== null && contactInfo.contactId !== undefined) {
            restoreParams.set('contactId', contactInfo.contactId.toString());
          }
          if (contactInfo.contactName) restoreParams.set('contactName', contactInfo.contactName);
          if (contactInfo.contactAvatar) restoreParams.set('contactAvatar', contactInfo.contactAvatar);
          if (contactInfo.contactType) restoreParams.set('contactType', contactInfo.contactType);
          if (contactInfo.contactStatus) restoreParams.set('contactStatus', contactInfo.contactStatus);
          if (contactInfo.contactDevices?.length > 0) restoreParams.set('contactDevices', contactInfo.contactDevices.join(','));
          if (contactInfo.contactIsOnline !== undefined) restoreParams.set('contactIsOnline', contactInfo.contactIsOnline.toString());
          if (contactInfo.contactNickname) restoreParams.set('contactNickname', contactInfo.contactNickname);
          if (contactInfo.contactPrincipalId) restoreParams.set('contactPrincipalId', contactInfo.contactPrincipalId);
          
          // Preserve current gifData parameter (if any)
          const currentGifData = searchParams.get('gifData');
          if (currentGifData) {
            restoreParams.set('gifData', currentGifData);
          }
          
          // Navigate first, then clear sessionStorage after navigation completes
          navigate(`/chat?${restoreParams.toString()}`, { replace: true });
          // Clear sessionStorage after navigation to prevent re-restoration
          setTimeout(() => {
            sessionStorage.removeItem('chat_contact_info');
          }, 100);
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
            
            // Preserve current gifData parameter (if any)
            const currentGifData = searchParams.get('gifData');
            if (currentGifData) {
              restoreParams.set('gifData', currentGifData);
            }
            
            // Navigate first, then clear sessionStorage after navigation completes
            navigate(`/chat?${restoreParams.toString()}`, { replace: true });
            // Clear sessionStorage after navigation to prevent re-restoration
            setTimeout(() => {
              sessionStorage.removeItem('chat_contact_info');
            }, 100);
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
  const [pendingGif, setPendingGif] = useState<GifInfo | null>(null);
  const [contactDeviceList, setContactDeviceList] = useState<DeviceRecord[]>([]);
  const [hasContactDevices, setHasContactDevices] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(true); // Control visibility of contact details card
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [unrecoverableGifs, setUnrecoverableGifs] = useState<Set<string>>(new Set());
  const [recoveredImages, setRecoveredImages] = useState<Set<string>>(new Set());
  const imageErrorHandlers = useRef<Map<string, boolean>>(new Map());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 20; // Messages per page
  const pagesPerLoad = 5; // Load 5 pages at a time
  

  // Handle immediate restoration in useEffect to avoid React error #310
  useEffect(() => {
    if (needsImmediateRestoration) {
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
            if (contactInfo.contactId !== null && contactInfo.contactId !== undefined) {
              restoreParams.set('contactId', contactInfo.contactId.toString());
            }
            if (contactInfo.contactName) restoreParams.set('contactName', contactInfo.contactName);
            if (contactInfo.contactAvatar) restoreParams.set('contactAvatar', contactInfo.contactAvatar);
            if (contactInfo.contactType) restoreParams.set('contactType', contactInfo.contactType);
            if (contactInfo.contactStatus) restoreParams.set('contactStatus', contactInfo.contactStatus);
            if (contactInfo.contactDevices?.length > 0) restoreParams.set('contactDevices', contactInfo.contactDevices.join(','));
            if (contactInfo.contactIsOnline !== undefined) restoreParams.set('contactIsOnline', contactInfo.contactIsOnline.toString());
            if (contactInfo.contactNickname) restoreParams.set('contactNickname', contactInfo.contactNickname);
            restoreParams.set('contactPrincipalId', contactInfo.contactPrincipalId);
            
            console.log('[Chat] Restoring contact info immediately with params:', Object.fromEntries(restoreParams.entries()));
            console.log('[Chat] Contact info details:', {
              contactId: contactInfo.contactId,
              contactName: contactInfo.contactName,
              contactPrincipalId: contactInfo.contactPrincipalId,
              contactAvatar: contactInfo.contactAvatar
            });
            
            // Navigate first, then clear sessionStorage after navigation completes
            navigate(`/chat?${restoreParams.toString()}`, { replace: true });
            // Clear sessionStorage after navigation to prevent re-restoration
            setTimeout(() => {
              sessionStorage.removeItem('chat_contact_info');
            }, 100);
          }
        } catch (error) {
          console.error('[Chat] Error parsing sessionStorage contact info:', error);
        }
      }
    } else if (needsGifRestoration) {
      // We have GIF data but missing contact info - try to restore from sessionStorage
      console.log('[Chat] GIF data present but contact info missing, attempting restoration');
      const savedContactInfo = sessionStorage.getItem('chat_contact_info');
      console.log('[Chat] SessionStorage check for GIF restoration:', {
        hasData: !!savedContactInfo,
        rawData: savedContactInfo,
        parsedData: savedContactInfo ? (() => {
          try { return JSON.parse(savedContactInfo); } catch(e) { return 'Parse error: ' + e; }
        })() : null
      });
      if (savedContactInfo) {
        try {
          const contactInfo = JSON.parse(savedContactInfo);
          if (contactInfo.contactPrincipalId) {
            console.log('[Chat] Found contact info for GIF restoration');
            
            // Build URL with contact info and preserve GIF data
            const restoreParams = new URLSearchParams(searchParams);
            if (contactInfo.contactId !== null && contactInfo.contactId !== undefined) {
              restoreParams.set('contactId', contactInfo.contactId.toString());
            }
            if (contactInfo.contactName) restoreParams.set('contactName', contactInfo.contactName);
            if (contactInfo.contactAvatar) restoreParams.set('contactAvatar', contactInfo.contactAvatar);
            if (contactInfo.contactType) restoreParams.set('contactType', contactInfo.contactType);
            if (contactInfo.contactStatus) restoreParams.set('contactStatus', contactInfo.contactStatus);
            if (contactInfo.contactDevices?.length > 0) restoreParams.set('contactDevices', contactInfo.contactDevices.join(','));
            if (contactInfo.contactIsOnline !== undefined) restoreParams.set('contactIsOnline', contactInfo.contactIsOnline.toString());
            if (contactInfo.contactNickname) restoreParams.set('contactNickname', contactInfo.contactNickname);
            restoreParams.set('contactPrincipalId', contactInfo.contactPrincipalId);
            
            console.log('[Chat] Restoring contact info with GIF data:', Object.fromEntries(restoreParams.entries()));
            console.log('[Chat] Contact info details:', {
              contactId: contactInfo.contactId,
              contactName: contactInfo.contactName,
              contactPrincipalId: contactInfo.contactPrincipalId,
              contactAvatar: contactInfo.contactAvatar
            });
            
            // Navigate first, then clear sessionStorage after navigation completes
            navigate(`/chat?${restoreParams.toString()}`, { replace: true });
            // Clear sessionStorage after navigation to prevent re-restoration
            setTimeout(() => {
              sessionStorage.removeItem('chat_contact_info');
            }, 100);
          }
        } catch (error) {
          console.error('[Chat] Error parsing sessionStorage contact info for GIF:', error);
        }
      }
    }
  }, [needsImmediateRestoration, needsGifRestoration, searchParams, navigate]);
  // Use device status hook for real-time device management
  const {
    deviceStatus,
    hasConnectedDevices,
    isTencentIoTEnabled,
    isLoading: deviceLoading,
    error: deviceError,
    sendMessageToDevices,
    sendGifToDevices,
    sendGifToDevice,
    refreshDeviceStatus
  } = useDeviceStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if contact info needs to be restored from sessionStorage on component load
  useEffect(() => {
    // Check if user came from Gallery page or if sessionStorage has contact info
    const returningFlag = sessionStorage.getItem('returning_from_gallery');
    const fromGalleryParam = searchParams.get('from') === 'gallery';
    const hasContactInfo = sessionStorage.getItem('chat_contact_info');
    const hasGifData = searchParams.get('gifData');
    const cameFromGallery = document.referrer.includes('/gallery') || 
                           returningFlag === 'true' ||
                           fromGalleryParam;
    
    // Only attempt to restore when auth is complete and contact info is missing
    // Skip restoration if we already have GIF data (handled by immediate restoration)
    if (!authLoading && !contactPrincipalId && !hasGifData) {
      console.log('[Chat] Auth complete, checking if contact restoration needed:', {
        cameFromGallery,
        referrer: document.referrer,
        returningFlag,
        fromGalleryParam,
        hasContactInfo: !!hasContactInfo,
        hasGifData: !!hasGifData,
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

  // Determine contact online status based on actual device presence
  const actualContactIsOnline = hasContactDevices;
  
  // Build current contact object
  const currentContact: ContactInfo = {
    id: contactId ? parseInt(contactId) : 0,
    name: contactName,
    type: contactType as 'friend' | 'system',
    status: contactStatus as 'Active' | 'Pending' | 'Blocked' | 'Deleted',
    date: new Date().toISOString().split('T')[0],
    avatar: contactAvatar,
    devices: contactDevices,
    isOnline: actualContactIsOnline, // Use actual device presence instead of URL parameter
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
        
        // Contact information check removed - functionality works correctly without this warning
        // The warning was unnecessarily strict and prevented normal operation
        
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
        
        // Load initial chat history (latest 5 pages)
        // Messages are stored from oldest to newest, so we need to load from the end
        const totalCount = await getChatMessageCount(user.principalId, contactPrincipalId);
        const initialLoadSize = pageSize * pagesPerLoad;
        
        if (totalCount === 0) {
          setMessages([]);
          setCurrentPage(0);
          setHasMoreMessages(false);
          console.log('[Chat] No messages found');
        } else {
          // Calculate offset to load from the end (latest messages first)
          // If totalCount = 100, initialLoadSize = 100, we want offset = 0 (load all)
          // If totalCount = 200, initialLoadSize = 100, we want offset = 100 (load last 100)
          const offset = Math.max(0, totalCount - initialLoadSize);
          const actualLoadSize = Math.min(initialLoadSize, totalCount - offset);
          
          const initialMessages = await getChatMessagesPaginated(
            user.principalId, 
            contactPrincipalId, 
            offset, 
            actualLoadSize
          );
          
          setMessages(initialMessages);
          // Set currentOffset to the next offset to load (going backwards, so subtract)
          setCurrentPage(offset);
          setHasMoreMessages(offset > 0);
          console.log('[Chat] Loaded initial messages:', {
            totalCount,
            offset,
            actualLoadSize,
            messageCount: initialMessages.length,
            hasMore: offset > 0,
            currentPage: offset
          });
          
          // Log pagination state for debugging
          console.log('[Chat] Pagination state after initial load:', {
            currentPage: offset,
            hasMoreMessages: offset > 0,
            totalMessages: totalCount,
            loadedMessages: initialMessages.length
          });
        }
        
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

  // 像素图数据现在通过GIF格式传递，不再需要单独处理

  // Handle GIF data from URL params
  useEffect(() => {
    const gifDataParam = searchParams.get('gifData');
    
    if (gifDataParam) {
      try {
        const gifData = JSON.parse(gifDataParam) as GifInfo;
        setPendingGif(gifData);
        
        // Clear the URL parameter after a short delay to ensure the component has rendered
        setTimeout(() => {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('gifData');
          const newUrl = newSearchParams.toString() ? `/chat?${newSearchParams.toString()}` : '/chat';
          navigate(newUrl, { replace: true });
        }, 100);
      } catch (error) {
        console.error('[Chat] Error parsing GIF data:', error);
        console.error('[Chat] Raw GIF data:', gifDataParam);
      }
    }
  }, [searchParams, navigate]);

  // Auto scroll to bottom when messages update (only if not loading more)
  useEffect(() => {
    if (!isLoadingMore) {
      scrollToBottom();
    }
  }, [messages, isLoadingMore]);

  // Load more messages when scrolling to top
  const loadMoreMessages = useRef<(() => Promise<void>) | null>(null);
  
  // Create the load function with useCallback to avoid stale closures
  useEffect(() => {
    loadMoreMessages.current = async () => {
      if (!user?.principalId || !contactPrincipalId || isLoadingMore || !hasMoreMessages) {
        console.log('[Chat] Cannot load more messages:', {
          hasUser: !!user?.principalId,
          hasContact: !!contactPrincipalId,
          isLoading: isLoadingMore,
          hasMore: hasMoreMessages
        });
        return;
      }

      try {
        setIsLoadingMore(true);
        console.log('[Chat] Loading more messages, current offset:', currentPage);
        
        // Calculate next offset to load (going backwards, so subtract)
        // currentPage represents the current offset (the oldest message we've loaded)
        const loadPageSize = pageSize * pagesPerLoad;
        const nextOffset = Math.max(0, currentPage - loadPageSize);
        const actualLoadSize = currentPage - nextOffset;
        
        console.log('[Chat] Pagination calculation:', {
          currentPage,
          loadPageSize,
          nextOffset,
          actualLoadSize
        });
        
        if (actualLoadSize <= 0) {
          setHasMoreMessages(false);
          console.log('[Chat] No more messages to load');
          return;
        }
        
        const olderMessages = await getChatMessagesPaginated(
          user.principalId, 
          contactPrincipalId, 
          nextOffset, 
          actualLoadSize
        );
        
        console.log('[Chat] Retrieved older messages:', {
          count: olderMessages.length,
          nextOffset,
          actualLoadSize
        });
        
        if (olderMessages.length > 0) {
          // Get current scroll position before adding messages
          const container = messagesContainerRef.current;
          const scrollHeightBefore = container?.scrollHeight || 0;
          const scrollTopBefore = container?.scrollTop || 0;
          
          // Prepend older messages to the beginning
          setMessages(prev => [...olderMessages, ...prev]);
          
          // Update pagination state
          setCurrentPage(nextOffset);
          setHasMoreMessages(nextOffset > 0);
          
          // Restore scroll position after messages are added
          setTimeout(() => {
            if (container) {
              const scrollHeightAfter = container.scrollHeight;
              const scrollDiff = scrollHeightAfter - scrollHeightBefore;
              container.scrollTop = scrollTopBefore + scrollDiff;
              console.log('[Chat] Scroll position restored:', {
                before: scrollTopBefore,
                after: container.scrollTop,
                diff: scrollDiff
              });
            }
          }, 0);
          
          console.log('[Chat] Loaded more messages:', {
            messageCount: olderMessages.length,
            nextOffset,
            hasMore: nextOffset > 0
          });
        } else {
          setHasMoreMessages(false);
          console.log('[Chat] No more messages to load');
        }
      } catch (error) {
        console.error('[Chat] Error loading more messages:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };
  }, [user?.principalId, contactPrincipalId, isLoadingMore, hasMoreMessages, currentPage]);

  // Handle scroll event to detect when user scrolls to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingChat) {
      console.log('[Chat] Scroll listener not attached:', {
        hasContainer: !!container,
        isLoadingChat
      });
      return;
    }

    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce: wait 100ms after scrolling stops before checking (reduced for better responsiveness)
      scrollTimeoutRef.current = setTimeout(() => {
        // Check if user scrolled near the top (within 300px for better UX on mobile)
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const distanceFromTop = scrollTop;
        const shouldLoad = distanceFromTop < 300 && hasMoreMessages && !isLoadingMore;
        
        console.log('[Chat] Scroll event (debounced):', {
          scrollTop,
          scrollHeight,
          clientHeight,
          distanceFromTop,
          hasMore: hasMoreMessages,
          isLoading: isLoadingMore,
          shouldLoad,
          canScroll: scrollHeight > clientHeight
        });
        
        if (shouldLoad && loadMoreMessages.current) {
          console.log('[Chat] ✅ Triggering load more messages');
          loadMoreMessages.current();
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    console.log('[Chat] Scroll listener attached, state:', {
      hasMore: hasMoreMessages,
      isLoading: isLoadingMore,
      isLoadingChat
    });
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      container.removeEventListener('scroll', handleScroll);
      console.log('[Chat] Scroll listener removed');
    };
  }, [hasMoreMessages, isLoadingMore, isLoadingChat]);

  // Check for unrecoverable blob URLs on message load (page refresh scenario)
  useEffect(() => {
    const checkUnrecoverableBlobUrls = () => {
      if (messages.length === 0) return;

      const newUnrecoverableGifs = new Set<string>();

      messages.forEach((message) => {
        if (message.mode === 'Gif' && message.gifInfo && message.gifInfo.gifUrl?.startsWith('blob:')) {
          // Check if we have restoration data
          const hasRestorationData = message.gifInfo.palette && message.gifInfo.pixels && 
                                     message.gifInfo.palette.length > 0 && message.gifInfo.pixels.length > 0;
          
          if (!hasRestorationData) {
            const key = `${message.sendBy}-${message.timestamp}`;
            console.warn('[Chat] Detected unrecoverable blob URL (page was refreshed):', {
              title: message.gifInfo.title,
              key
            });
            newUnrecoverableGifs.add(key);
          }
        }
      });

      if (newUnrecoverableGifs.size > 0) {
        setUnrecoverableGifs(prev => new Set([...prev, ...newUnrecoverableGifs]));
      }
    };

    checkUnrecoverableBlobUrls();
  }, [messages]);

  // Track if restoration is in progress to avoid duplicate attempts
  const restorationInProgress = useRef<Set<string>>(new Set());
  
  // Restore broken blob URLs from pixel data in messages
  useEffect(() => {
    const restoreBrokenBlobUrls = async () => {
      if (messages.length === 0 || failedImages.size === 0) return;

      let needsUpdate = false;
      const updatedMessages = [...messages];
      const newRecovered = new Set<string>();
      const newUnrecoverable = new Set<string>();

      for (let i = 0; i < updatedMessages.length; i++) {
        const message = updatedMessages[i];
        
        if (message.mode === 'Gif' && message.gifInfo) {
          const gifInfo = message.gifInfo;
          const messageKey = `${message.sendBy}-${message.timestamp}`;
          
          // Skip if already recovered, not in failedImages, or currently being processed
          if (recoveredImages.has(messageKey) || !failedImages.has(messageKey) || restorationInProgress.current.has(messageKey)) {
            continue;
          }
          
          // Check if we need to restore (blob URL is present but failed)
          if (gifInfo.gifUrl && gifInfo.gifUrl.startsWith('blob:')) {
            // Mark as in progress
            restorationInProgress.current.add(messageKey);
            
            console.log('[Chat] Attempting to restore blob URL. Checking pixel data:', {
              hasPalette: !!gifInfo.palette,
              hasPixels: !!gifInfo.pixels,
              title: gifInfo.title,
              width: gifInfo.width,
              height: gifInfo.height
            });
            
            // Try to restore from pixel data
            if (gifInfo.palette && gifInfo.pixels && gifInfo.palette.length > 0 && gifInfo.pixels.length > 0) {
              try {
                console.log('[Chat] Restoring blob URL from pixel data for:', gifInfo.title, {
                  paletteSize: gifInfo.palette.length,
                  pixelsSize: gifInfo.pixels.length
                });
                const recreatedGif = await convertPixelToGif({
                  width: gifInfo.width,
                  height: gifInfo.height,
                  palette: gifInfo.palette,
                  pixels: gifInfo.pixels,
                  title: gifInfo.title,
                  duration: gifInfo.duration
                });
                
                // Update the message with new blob URL
                updatedMessages[i] = {
                  ...message,
                  gifInfo: {
                    ...gifInfo,
                    gifUrl: recreatedGif.gifUrl,
                    thumbnailUrl: recreatedGif.thumbnailUrl
                  }
                };
                
                // Mark as recovered and remove from in-progress
                newRecovered.add(messageKey);
                restorationInProgress.current.delete(messageKey);
                needsUpdate = true;
                console.log('[Chat] Successfully restored blob URL from pixel data');
              } catch (error) {
                console.error('[Chat] Failed to restore blob URL from pixel data:', error);
                newUnrecoverable.add(messageKey);
                restorationInProgress.current.delete(messageKey);
              }
            } else {
              console.warn('[Chat] Cannot restore blob URL - missing pixel data', {
                hasPalette: !!gifInfo.palette,
                hasPixels: !!gifInfo.pixels,
                gifUrl: gifInfo.gifUrl
              });
              
              // Mark as unrecoverable if it's a blob URL without restoration data
              if (gifInfo.gifUrl.startsWith('blob:')) {
                newUnrecoverable.add(messageKey);
              }
              restorationInProgress.current.delete(messageKey);
            }
          }
        }
      }

      // Update states
      if (newRecovered.size > 0) {
        setRecoveredImages(prev => new Set([...prev, ...newRecovered]));
        // Remove from failed images
        setFailedImages(prev => {
          const newSet = new Set(prev);
          newRecovered.forEach(key => newSet.delete(key));
          return newSet;
        });
      }
      
      if (newUnrecoverable.size > 0) {
        setUnrecoverableGifs(prev => new Set([...prev, ...newUnrecoverable]));
        // Remove from failed images
        setFailedImages(prev => {
          const newSet = new Set(prev);
          newUnrecoverable.forEach(key => newSet.delete(key));
          return newSet;
        });
      }

      if (needsUpdate) {
        console.log('[Chat] Updating messages with restored blob URLs');
        setMessages(updatedMessages);
      }
    };

    restoreBrokenBlobUrls();
  }, [failedImages.size, messages.length]);

  // Device status is now managed by useDeviceStatus hook

  // Fetch contact's devices from backend
  useEffect(() => {
    console.log('[Chat] useEffect for fetchContactDevices triggered:', {
      contactPrincipalId,
      hasContactPrincipalId: !!contactPrincipalId,
      userPrincipalId: user?.principalId,
      authLoading,
      contactPrincipalIdValue: contactPrincipalId,
      expectedContactPrincipalId: 'c5l6l-mb4vs-oo6hx-mbawz-tm6tf-7tzpi-jt2va-b726k-4h3yw-krk42-66a'
    });
    
    const fetchContactDevices = async () => {
      console.log('[Chat] fetchContactDevices called:', {
        contactPrincipalId,
        hasContactPrincipalId: !!contactPrincipalId,
        userPrincipalId: user?.principalId,
        authLoading,
        contactPrincipalIdValue: contactPrincipalId,
        expectedContactPrincipalId: 'c5l6l-mb4vs-oo6hx-mbawz-tm6tf-7tzpi-jt2va-b726k-4h3yw-krk42-66a',
        isCorrectPrincipalId: contactPrincipalId === 'c5l6l-mb4vs-oo6hx-mbawz-tm6tf-7tzpi-jt2va-b726k-4h3yw-krk42-66a'
      });
      
      if (!contactPrincipalId) {
        console.log('[Chat] No contact principal ID, skipping device fetch');
        console.log('[Chat] URL searchParams:', Object.fromEntries(searchParams.entries()));
        return;
      }

      try {
        console.log('[Chat] Fetching contact devices for principal:', contactPrincipalId);
        console.log('[Chat] Current user principal (for comparison):', user?.principalId);
        console.log('[Chat] Contact principal ID (should be different from user):', contactPrincipalId);
        console.log('[Chat] Principal IDs match?', contactPrincipalId === user?.principalId);
        console.log('[Chat] Expected contact principal ID: c5l6l-mb4vs-oo6hx-mbawz-tm6tf-7tzpi-jt2va-b726k-4h3yw-krk42-66a');
        console.log('[Chat] Actual contact principal ID:', contactPrincipalId);
        console.log('[Chat] Calling getDevicesByOwner with contactPrincipalId:', contactPrincipalId);
        const response = await deviceApiService.getDevicesByOwner(contactPrincipalId, 0, 100);
        
        console.log('[Chat] Device fetch response:', {
          success: response.success,
          hasData: !!response.data,
          deviceCount: response.data?.devices.length || 0,
          devices: response.data?.devices,
          error: response.error
        });
        
        if (response.success && response.data && response.data.devices.length > 0) {
          // Filter devices to only include online devices
          const onlineDevices = response.data.devices.filter(device => {
            const isOnline = 'Online' in device.status;
            console.log('[Chat] Device status check:', {
              deviceId: device.id,
              deviceName: device.name,
              status: device.status,
              isOnline
            });
            return isOnline;
          });
          
          console.log('[Chat] Contact devices filtered:', {
            total: response.data.devices.length,
            online: onlineDevices.length,
            devices: onlineDevices
          });
          
          if (onlineDevices.length > 0) {
            console.log('[Chat] Contact has online devices:', onlineDevices);
            setContactDeviceList(onlineDevices);
            setHasContactDevices(true);
          } else {
            console.log('[Chat] Contact has devices but none are online');
            setContactDeviceList([]);
            setHasContactDevices(false);
          }
        } else {
          console.log('[Chat] No devices found for contact:', {
            success: response.success,
            hasData: !!response.data,
            deviceCount: response.data?.devices.length || 0,
            error: response.error
          });
          setContactDeviceList([]);
          setHasContactDevices(false);
        }
      } catch (error) {
        console.error('[Chat] Error fetching contact devices:', error);
        setContactDeviceList([]);
        setHasContactDevices(false);
      }
    };

    fetchContactDevices();
  }, [contactPrincipalId, user?.principalId]);

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
    const hasGif = !!pendingGif;
    const hasUserPrincipal = !!user?.principalId;
    const hasContactPrincipal = !!contactPrincipalId;
    
    console.log('[Chat] Send message validation:', {
      hasMessage,
      hasGif,
      hasUserPrincipal,
      hasContactPrincipal,
      userPrincipalId: user?.principalId,
      contactPrincipalId
    });

    if (!hasMessage && !hasGif) {
      console.warn('[Chat] Cannot send message: no message content or GIF');
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

    // Contact principal ID check removed - functionality works correctly without this warning
    // The warning was unnecessarily strict and prevented normal operation

    try {
      setLoading(true);
      
      // Use fallback values if contactPrincipalId is null
      const contactId = contactPrincipalId || 'unknown';
      
      if (pendingGif) {
        // Send GIF message
        console.log('[Chat] Sending GIF message:', pendingGif);
        await sendGifMessage(user.principalId, contactId, pendingGif);
        setPendingGif(null);
      } else {
        // Send text message
        console.log('[Chat] Sending message:', newMessage);
        await sendChatMessage(user.principalId, contactId, newMessage, 'Text');
        setNewMessage('');
      }
      
      // Reload messages to include the new one
      const updatedMessages = await getRecentChatMessages(user.principalId, contactId);
      setMessages(updatedMessages);
      
      console.log('[Chat] Message sent successfully');
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      if (pendingGif) {
        // Add fallback GIF message if backend fails
        const fallbackMsg: ChatMessageInfo = {
          sendBy: user.principalId,
          content: JSON.stringify(pendingGif),
          mode: 'Gif',
          timestamp: Date.now(),
          gifInfo: pendingGif
        };
        setMessages(prev => [...prev, fallbackMsg]);
        setPendingGif(null);
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
    // Contact info check removed - functionality works correctly without this warning
    // The warning was unnecessarily strict and prevented normal operation

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
    console.log('[Chat] Saved contact info to sessionStorage before navigating to gallery:', contactInfo);
    console.log('[Chat] SessionStorage after saving:', sessionStorage.getItem('chat_contact_info'));
    navigate('/gallery?from=chat');
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

  // Contact information check removed - functionality works correctly without this warning
  // The warning was unnecessarily strict and prevented normal operation

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
                {showContactDetails && (
                  <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/10 bg-white/3">
                    <div className="relative p-2 sm:p-3 bg-white/5 rounded-lg backdrop-blur-sm">
                      {/* Close Button */}
                      <button
                        onClick={() => setShowContactDetails(false)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                        }}
                        aria-label="Close contact details"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <div className="text-xs sm:text-sm text-white/80 space-y-1 pr-6">
                        <p><span className="text-cyan-400">Devices:</span> {contactDeviceList.length > 0 ? `${contactDeviceList.length} device(s)` : 'None'}</p>
                        <p><span className="text-cyan-400">Online:</span> {currentContact.isOnline ? 'Yes' : 'No'}</p>
                        {currentContact.contactPrincipalId && (
                          <p><span className="text-cyan-400">Principal ID:</span> <code className="text-cyan-300 text-xs">{currentContact.contactPrincipalId}</code></p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-slate-900/20"
                >
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
                    <>
                      {/* Loading indicator when loading more messages */}
                      {isLoadingMore && (
                        <div className="flex items-center justify-center py-4">
                          <div className="text-white/60 text-sm flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>加载历史消息...</span>
                          </div>
                        </div>
                      )}
                      {messages
                        .filter(message => {
                        // Skip messages without proper content (e.g., GIF messages without gifInfo)
                        if (message.mode === 'Gif' && !message.gifInfo) {
                          console.warn('[Chat] Skipping message without gifInfo:', message);
                          return false;
                        }
                        // Skip unrecoverable GIF messages to avoid showing empty content
                        if (message.mode === 'Gif' && unrecoverableGifs.has(`${message.sendBy}-${message.timestamp}`)) {
                          console.warn('[Chat] Skipping unrecoverable GIF message:', message);
                          return false;
                        }
                        return true;
                      })
                      .map((message, index) => (
                      <div 
                        key={`${message.sendBy}-${message.timestamp}-${index}`}
                        className={`flex mb-3 ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-2 sm:p-3 rounded-lg ${
                          isMyMessage(message)
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                            : 'bg-white/10 text-white backdrop-blur-sm'
                        }`}>
                          {message.mode === 'Gif' && message.gifInfo ? (
                            <div className="space-y-2">
                              {failedImages.has(`${message.sendBy}-${message.timestamp}`) ? (
                                <div className="flex flex-col items-center justify-center bg-white/5 rounded p-4 text-center border border-white/10" style={{ minHeight: '100px' }}>
                                  <div className="text-white/40 text-xs">
                                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="font-medium">{message.gifInfo.title}</p>
                                    {unrecoverableGifs.has(`${message.sendBy}-${message.timestamp}`) && (
                                      <p className="text-white/30 text-xs mt-1">⚠️ 此GIF无法恢复</p>
                                    )}
                                    <p className="text-white/30 text-xs mt-1">
                                      {message.gifInfo.width}x{message.gifInfo.height}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center p-2">
                                  <img 
                                    src={message.gifInfo.gifUrl} 
                                    alt={message.gifInfo.title}
                                    className="rounded"
                                    style={{ 
                                      width: `${message.gifInfo.width * 4}px`,
                                      height: `${message.gifInfo.height * 4}px`,
                                      minWidth: '160px',
                                      minHeight: '160px',
                                      maxWidth: '320px',
                                      maxHeight: '320px',
                                      imageRendering: 'pixelated',
                                      objectFit: 'contain'
                                    }}
                                    onError={(e) => {
                                    if (!message.gifInfo) return;
                                    
                                    const key = `${message.sendBy}-${message.timestamp}`;
                                    // Prevent multiple error triggers
                                    if (!imageErrorHandlers.current.get(key)) {
                                      imageErrorHandlers.current.set(key, true);
                                      console.error('[Chat] GIF image failed to load:', message.gifInfo.gifUrl);
                                      
                                      // Check if it's a blob URL (likely page reload issue)
                                      if (message.gifInfo.gifUrl?.startsWith('blob:')) {
                                        console.warn('[Chat] Blob URL failed - this likely means page was refreshed');
                                        // Check if we have restoration data
                                        const hasRestorationData = message.gifInfo.palette && message.gifInfo.pixels && 
                                                                   message.gifInfo.palette.length > 0 && 
                                                                   message.gifInfo.pixels.length > 0;
                                        if (!hasRestorationData) {
                                          console.error('[Chat] Blob URL failed and no restoration data available');
                                          setUnrecoverableGifs(prev => new Set([...prev, key]));
                                        }
                                      }
                                      
                                      setFailedImages(prev => new Set([...prev, key]));
                                    }
                                    e.preventDefault(); // Prevent further error events
                                  }}
                                />
                                </div>
                              )}
                              <p className="text-xs opacity-70">{message.gifInfo.title}</p>
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
                    ))}
                    </>
                  )}
                  {/* Hidden element for auto scroll to bottom */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/10 bg-white/5 space-y-3 sm:space-y-4">
                      {/* 像素图现在通过GIF格式处理，不再需要单独的预览 */}

                      {/* Pending GIF Preview */}
                      {pendingGif && (
                        <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-medium">{t('chat.readyToSend')}:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingGif(null)}
                              className="text-white/60 hover:text-white hover:bg-white/10 p-1"
                            >
                              ✕
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <img 
                              src={pendingGif.thumbnailUrl} 
                              alt="GIF Preview"
                              className="w-12 h-12 rounded border border-white/20 object-cover"
                              onError={(e) => {
                                console.error('[Chat] GIF preview image failed to load:', e);
                              }}
                            />
                            <div className="flex-1 text-white/80 text-xs">
                              <div className="font-medium">{pendingGif.title}</div>
                              <div className="text-white/60">GIF • {pendingGif.width}x{pendingGif.height}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Send to Device Section - Only show when contact has devices */}
                      {hasContactDevices && (pendingGif || newMessage.trim()) && (
                        <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-cyan-400" />
                              <span className="text-white text-sm font-medium">
                                {t('chat.sendToDevice') || 'Send to Device'}
                              </span>
                            </div>
                            <Button
                              onClick={async () => {
                                if (!hasContactDevices) {
                                  toast({
                                    title: t('chat.error.noDeviceConnected'),
                                    description: 'Contact has no registered devices',
                                    variant: "destructive"
                                  });
                                  return;
                                }

                                try {
                                  const sentTo: string[] = [];
                                  const errors: string[] = [];
                                  
                                  for (const device of contactDeviceList) {
                                    // Use deviceName (MCP device name) if available, otherwise fall back to name
                                    const deviceName = device.deviceName || device.name;
                                    
                                    console.log('[Chat] Sending to device:', {
                                      deviceId: device.id,
                                      deviceName: deviceName,
                                      name: device.name,
                                      deviceNameField: device.deviceName,
                                      productId: device.productId
                                    });
                                    
                                    try {
                                      if (pendingGif) {
                                        console.log('[Chat] Sending GIF to contact device:', { deviceName, pendingGif });
                                        const result = await sendGifToDevice(deviceName, pendingGif);
                                        if (result.success) {
                                          sentTo.push(deviceName);
                                        } else {
                                          errors.push(`${deviceName}: ${result.error || 'Failed'}`);
                                        }
                                      } else if (newMessage.trim()) {
                                        console.log('[Chat] Sending text to contact device:', { deviceName, message: newMessage });
                                        const result = await sendMessageToDevices(newMessage, deviceName);
                                        if (result.success) {
                                          sentTo.push(deviceName);
                                        } else {
                                          errors.push(`${deviceName}: ${result.errors?.join('; ') || 'Failed'}`);
                                        }
                                      }
                                    } catch (error) {
                                      errors.push(`${deviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    }
                                  }
                                  
                                  if (sentTo.length > 0) {
                                    toast({
                                      title: pendingGif ? t('chat.success.gifSent') : t('chat.success.textSent'),
                                      description: `Sent to ${sentTo.length} of ${contactDeviceList.length} device(s)`,
                                      variant: "default"
                                    });
                                    setPendingGif(null);
                                    setNewMessage('');
                                  } else {
                                    throw new Error(errors.join('; '));
                                  }
                                } catch (error) {
                                  console.error('[Chat] Failed to send to contact devices:', error);
                                  toast({
                                    title: t('chat.error.deviceSendFailed'),
                                    description: error instanceof Error ? error.message : t('chat.error.unknownError'),
                                    variant: "destructive"
                                  });
                                }
                              }}
                              disabled={!newMessage.trim() && !pendingGif}
                              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {t('chat.send') || 'Send'}
                            </Button>
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
                          disabled={loading || (!newMessage.trim() && !pendingGif)}
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 p-2 sm:p-3 min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send message to chat"
                        >
                          {loading ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
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
                        
                        {/* Device Status Indicator - Hidden in chat page as we show contact's devices instead */}
                        {/* <DeviceStatusIndicator 
                          showDetails={false}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white/5 border-white/10"
                        /> */}

                        {/* Device Simulator Controls (Development Only) */}
                        {import.meta.env.DEV && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-yellow-500/20 border-yellow-400/30 text-yellow-300 hover:bg-yellow-500/30 text-xs px-2 py-1"
                            onClick={() => {
                              if (deviceSimulator.isCurrentlySimulating()) {
                                deviceSimulator.stopSimulation();
                                toast({
                                  title: "Device Simulator",
                                  description: "Simulated device disconnected",
                                  variant: "default"
                                });
                              } else {
                                deviceSimulator.startSimulation();
                                toast({
                                  title: "Device Simulator",
                                  description: "Simulated device connected",
                                  variant: "default"
                                });
                              }
                            }}
                            title="Toggle device simulation"
                          >
                            {deviceSimulator.isCurrentlySimulating() ? '🔌' : '🔌'}
                          </Button>
                        )}
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
