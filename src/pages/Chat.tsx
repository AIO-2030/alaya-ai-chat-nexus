import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChatSse } from '../hooks/useChatSse';
import {
  hasUnivoiceChatAuth,
  createOrGetDmSession,
  listMessages,
  sendTextMessage,
  sendGifMessageDm,
  markRead,
  messageItemToChatMessageInfo,
  type MessageItem,
} from '../services/api/univoiceChatApi';
import { ArrowLeft, Bot, Send, Smile, Smartphone, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  clearChatHistoryForPair,
  NotificationInfo,
  GifInfo,
  sendGifMessage
} from '../services/api/chatApi';
import { deviceMessageService } from '../services/deviceMessageService';
import { deviceSimulator } from '../services/deviceSimulator';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { useGlobalDeviceStatus } from '../hooks/useGlobalDeviceStatus';
import DeviceStatusIndicator from '../components/DeviceStatusIndicator';
import { deviceApiService, DeviceRecord } from '../services/api/deviceApi';
import { convertPixelToGif, GifResult } from '../lib/pixelToGifConverter';
import { cn } from '../lib/utils';
import { execWebChat, AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID } from '../runtime/AIOProtocolExecutor';
import { isSubscribedToPersonalAi } from '../services/api/aiSubscriptionApi';
import { formatChatForAiSuggestion, buildWebChatMessagesForSuggestion } from '../lib/formatChatForAiSuggestion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../styles/pages/Chat.module.css';

const AI_CHAT_STORAGE_KEY_PREFIX = 'aio_webchat_chat_';
/** Guest session count for Univoice AI (per principal, localStorage) */
const AI_CHAT_GUEST_SESSION_COUNT_KEY_PREFIX = 'aio_webchat_ai_guest_session_count_';
const AI_CHAT_GUEST_SESSION_LIMIT = 3;

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

  /** AI contact: execWebChat + localStorage (no canister) */
  const isAiContact = contactPrincipalId === AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID;

  /** Human chat with stored email credentials: chat-api + chat-sse; else canister */
  const useUnivoiceDm = useMemo(
    () => !isAiContact && hasUnivoiceChatAuth() && !!contactPrincipalId,
    [isAiContact, contactPrincipalId]
  );

  const [dmSessionId, setDmSessionId] = useState<string | null>(null);
  /** Cursor for loading older DM messages (chat-api `nextCursor`) */
  const [univoiceNextCursor, setUnivoiceNextCursor] = useState<string | null>(null);
  const lastMarkReadId = useRef<string | null>(null);

  useEffect(() => {
    setDmSessionId(null);
    setUnivoiceNextCursor(null);
  }, [contactPrincipalId]);

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
  const [isSendingToDevice, setIsSendingToDevice] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendProgressText, setSendProgressText] = useState('');
  /** AI reply suggestion drawer (human chat only) */
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiSuggestionContent, setAiSuggestionContent] = useState('');
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  
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
    isInitialized: deviceServiceInitialized,
    sendMessageToDevices,
    sendGifToDevices,
    sendGifToDevice,
    refreshDeviceStatus
  } = useDeviceStatus();

  // Use global device status for contact devices
  const {
    getContactDeviceStatus,
    getContactDevices,
    refreshContactDevices,
    lastUpdateTime: deviceStatusUpdateTime
  } = useGlobalDeviceStatus(contactPrincipalId ? [contactPrincipalId] : []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const MAX_INPUT_HEIGHT_PX = 120; // ~7.5rem, ~5 lines

  const adjustInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX)}px`;
  }, []);

  useEffect(() => {
    adjustInputHeight();
  }, [newMessage, adjustInputHeight]);

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

  // Determine contact online status based on contact's device online status
  // Check if any of the contact's devices are online using global status service
  // Only trust real-time status from MCP, not backend cached status
  const actualContactIsOnline = useMemo(() => {
    if (!contactPrincipalId || contactDeviceList.length === 0) {
      return false;
    }
    
    // Check if any contact device is online using global status service
    // Only use real-time MCP status, don't fallback to backend status
    return contactDeviceList.some(device => {
      const globalStatus = getContactDeviceStatus(contactPrincipalId, device.id);
      if (globalStatus) {
        return globalStatus.isOnline;
      }
      // If no real-time status available, assume offline
      return false;
    });
  }, [contactPrincipalId, contactDeviceList, getContactDeviceStatus, deviceStatusUpdateTime]);
  
  // Check if contact device is online using global status service
  // Only trust real-time status from MCP, not backend cached status
  const isContactDeviceOnline = (device: DeviceRecord): boolean => {
    if (!contactPrincipalId) {
      return false; // Unknown status if no contact ID
    }
    
    // Only use global device status service (real-time MCP status)
    // Don't fallback to backend status as it may be stale
    const globalStatus = getContactDeviceStatus(contactPrincipalId, device.id);
    if (globalStatus) {
      return globalStatus.isOnline;
    }
    
    // If no real-time status available, assume offline (safer than assuming online)
    return false;
  };
  
  // Get contact device status text
  const getContactDeviceStatusText = (): string => {
    if (contactDeviceList.length === 0) {
      return '';
    }
    
    const onlineCount = contactDeviceList.filter(device => isContactDeviceOnline(device)).length;
    const totalCount = contactDeviceList.length;
    
    if (onlineCount === totalCount && totalCount > 0) {
      return t('chat.deviceStatus.online');
    } else if (onlineCount === 0) {
      return t('chat.deviceStatus.offline');
    } else {
      return `${t('chat.deviceStatus.online')} (${onlineCount}/${totalCount})`;
    }
  };
  
  // Get contact device status color
  const getContactDeviceStatusColor = (): string => {
    if (contactDeviceList.length === 0) {
      return 'text-white/60';
    }
    
    const onlineCount = contactDeviceList.filter(device => isContactDeviceOnline(device)).length;
    
    if (onlineCount > 0) {
      return 'text-green-400';
    } else {
      return 'text-red-400';
    }
  };
  
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

  // Get avatar image URL for a contact
  // Returns null if no image should be displayed (will use text fallback with gradient background)
  const getAvatarImageUrl = (contact: ContactInfo): string | null => {
    // Only Univoice should display image logo, all other contacts use text fallback
    if (contact.name === 'Univoice' || contact.id === 999) {
      return '/univoice_avatar_logo.png';
    }
    // For all other contacts, return null to use AvatarFallback with text and gradient background
    // This preserves the original logo display mode for non-Univoice contacts
    return null;
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
        
        setIsLoadingChat(false);
        return;
      }

      try {
        setIsLoadingChat(true);

        if (contactPrincipalId === AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID) {
          // AI contact: load from localStorage (no canister)
          const storageKey = `${AI_CHAT_STORAGE_KEY_PREFIX}${user.principalId}`;
          try {
            const raw = localStorage.getItem(storageKey);
            const list = raw ? (JSON.parse(raw) as ChatMessageInfo[]) : [];
            setMessages(Array.isArray(list) ? list : []);
          } catch {
            setMessages([]);
          }
          setSocialPairKey('');
          setCurrentPage(0);
          setHasMoreMessages(false);
          console.log('[Chat] Loaded AI chat from localStorage');
        } else if (useUnivoiceDm) {
          console.log('[Chat] Initializing Univoice DM:', user.principalId, '↔', contactPrincipalId);
          const summary = await createOrGetDmSession(user.principalId, contactPrincipalId, {
            userNickname: user.nickname || user.name || undefined,
          });
          setDmSessionId(summary.sessionId);
          const dmPageLimit = pageSize * pagesPerLoad;
          const { items, nextCursor } = await listMessages(
            user.principalId,
            summary.sessionId,
            undefined,
            dmPageLimit
          );
          const sorted = [...items].sort(
            (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
          );
          setMessages(sorted.map(messageItemToChatMessageInfo));
          setUnivoiceNextCursor(nextCursor);
          setHasMoreMessages(!!nextCursor);
          setSocialPairKey(summary.sessionId);
          setCurrentPage(0);
          lastMarkReadId.current = null;
          console.log('[Chat] Univoice DM session:', summary.sessionId, 'messages:', sorted.length, 'hasMore:', !!nextCursor);
        } else {
          console.log('[Chat] Initializing chat between:', user.principalId, 'and', contactPrincipalId);
          const pairKey = await startChatWithContact(user.principalId, contactPrincipalId);
          setSocialPairKey(pairKey);
          console.log('[Chat] Generated social pair key:', pairKey);

          const totalCount = await getChatMessageCount(user.principalId, contactPrincipalId);
          const initialLoadSize = pageSize * pagesPerLoad;

          if (totalCount === 0) {
            setMessages([]);
            setCurrentPage(0);
            setHasMoreMessages(false);
            console.log('[Chat] No messages found');
          } else {
            const offset = Math.max(0, totalCount - initialLoadSize);
            const actualLoadSize = Math.min(initialLoadSize, totalCount - offset);
            const initialMessages = await getChatMessagesPaginated(
              user.principalId,
              contactPrincipalId,
              offset,
              actualLoadSize
            );
            setMessages(initialMessages);
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
          }
        }
      } catch (error) {
        console.error('[Chat] Error initializing chat:', error);
        setMessages([]);
        setDmSessionId(null);
      } finally {
        setIsLoadingChat(false);
      }
    };

    if (!authLoading) {
      initializeChat();
    } else {
      console.log('[Chat] Waiting for auth to complete before initializing chat');
    }
  }, [user?.principalId, contactPrincipalId, authLoading, useUnivoiceDm]);

  const onUnivoiceMessageNew = useCallback(
    (m: MessageItem) => {
      if (!user?.principalId) return;
      setMessages((prev) => {
        const ci = messageItemToChatMessageInfo(m);
        const stripped = prev.filter((p) => {
          if (p.serverMessageId) return true;
          if (
            ci.clientMsgId &&
            p.clientMsgId &&
            p.clientMsgId === ci.clientMsgId &&
            p.sendBy === user.principalId
          ) {
            return false;
          }
          if (
            p.clientMsgId &&
            p.sendBy === user.principalId &&
            p.content === ci.content &&
            Math.abs(p.timestamp - ci.timestamp) < 120_000
          ) {
            return false;
          }
          return true;
        });
        if (stripped.some((x) => x.serverMessageId === ci.serverMessageId)) {
          return prev;
        }
        return [...stripped, ci].sort((a, b) => a.timestamp - b.timestamp);
      });
    },
    [user?.principalId]
  );

  const onUnivoiceSyncHint = useCallback(async () => {
    if (!user?.principalId || !dmSessionId) return;
    try {
      const dmPageLimit = pageSize * pagesPerLoad;
      const { items, nextCursor } = await listMessages(
        user.principalId,
        dmSessionId,
        undefined,
        dmPageLimit
      );
      const sorted = [...items].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
      setMessages(sorted.map(messageItemToChatMessageInfo));
      setUnivoiceNextCursor(nextCursor);
      setHasMoreMessages(!!nextCursor);
    } catch (e) {
      console.warn('[Chat] sync.hint refetch failed', e);
    }
  }, [user?.principalId, dmSessionId]);

  useChatSse(
    useUnivoiceDm ? user?.principalId ?? null : null,
    dmSessionId,
    onUnivoiceMessageNew,
    onUnivoiceSyncHint
  );

  useEffect(() => {
    if (!useUnivoiceDm || !dmSessionId || !user?.principalId) return;
    const last = [...messages].reverse().find((m) => m.serverMessageId);
    if (!last?.serverMessageId) return;
    if (lastMarkReadId.current === last.serverMessageId) return;
    lastMarkReadId.current = last.serverMessageId;
    markRead(user.principalId, dmSessionId, last.serverMessageId).catch(() => {});
  }, [useUnivoiceDm, dmSessionId, messages, user?.principalId]);

  // Pixel art is passed as GIF data; no separate channel

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
      if (useUnivoiceDm) {
        if (!dmSessionId || !univoiceNextCursor) {
          return;
        }
        try {
          setIsLoadingMore(true);
          const container = messagesContainerRef.current;
          const scrollHeightBefore = container?.scrollHeight || 0;
          const scrollTopBefore = container?.scrollTop || 0;
          const dmPageLimit = pageSize * pagesPerLoad;
          const { items, nextCursor } = await listMessages(
            user.principalId,
            dmSessionId,
            univoiceNextCursor,
            dmPageLimit
          );
          if (items.length === 0) {
            setHasMoreMessages(false);
            setUnivoiceNextCursor(null);
            setIsLoadingMore(false);
            return;
          }
          const sorted = [...items].sort(
            (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
          );
          const older = sorted.map(messageItemToChatMessageInfo);
          setMessages((prev) => [...older, ...prev]);
          setUnivoiceNextCursor(nextCursor);
          setHasMoreMessages(!!nextCursor);
          setTimeout(() => {
            if (container) {
              const scrollDiff = container.scrollHeight - scrollHeightBefore;
              container.scrollTop = scrollTopBefore + scrollDiff;
            }
          }, 0);
        } catch (error) {
          console.error('[Chat] Error loading older DM messages:', error);
        } finally {
          setIsLoadingMore(false);
        }
        return;
      }
      if (contactPrincipalId === AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID) {
        return; // AI chat is fully in localStorage — no pagination
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
  }, [
    user?.principalId,
    contactPrincipalId,
    isLoadingMore,
    hasMoreMessages,
    currentPage,
    useUnivoiceDm,
    dmSessionId,
    univoiceNextCursor,
  ]);

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
          // Get all devices (don't filter by status, as status may not reflect real-time connection)
          const allDevices = response.data.devices;
          
          console.log('[Chat] Contact devices fetched:', {
            total: allDevices.length,
            devices: allDevices.map(device => ({
              id: device.id,
              name: device.name,
              status: device.status,
              isOnline: 'Online' in device.status
            }))
          });
          
          // Set all devices, not just online ones
          // The status check will be done in the UI using global device status service
          setContactDeviceList(allDevices);
          setHasContactDevices(allDevices.length > 0);
          
          // Device status refresh is now handled by the page active effect below
          // This ensures we only refresh when page is active and devices don't have status yet
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

  // Refresh contact device status when page becomes active (only refresh friend's devices, not own devices)
  useEffect(() => {
    if (!contactPrincipalId || contactDeviceList.length === 0) {
      // Wait for device list to be loaded
      return;
    }

    // Check if contact devices already have status - if yes, skip refresh
    const hasDeviceStatus = contactDeviceList.some(device => {
      const status = getContactDeviceStatus(contactPrincipalId, device.id);
      return status !== undefined; // Has status means already refreshed
    });

    if (hasDeviceStatus) {
      console.log('[Chat] Contact devices already have status, skipping refresh');
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check again if status exists before refreshing
        const stillHasStatus = contactDeviceList.some(device => {
          const status = getContactDeviceStatus(contactPrincipalId, device.id);
          return status !== undefined;
        });
        
        if (!stillHasStatus) {
          console.log('[Chat] Page became visible, refreshing contact device status (friend devices only)...');
          refreshContactDevices(contactPrincipalId).catch(error => {
            console.error('[Chat] Failed to refresh contact device status on visibility change:', error);
          });
        }
      }
    };

    // Refresh immediately when device list is loaded and no status exists (only friend devices)
    console.log('[Chat] Refreshing contact device status on page active (friend devices only)...');
    refreshContactDevices(contactPrincipalId).catch(error => {
      console.error('[Chat] Failed to refresh contact device status:', error);
    });

    // Also refresh when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [contactPrincipalId, refreshContactDevices, contactDeviceList, getContactDeviceStatus]);

  // Poll canister every 5s (skipped for AI localStorage and Univoice DM — SSE handles realtime)
  useEffect(() => {
    if (!user?.principalId || contactPrincipalId === AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID) return;
    if (useUnivoiceDm) return;

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
  }, [user?.principalId, socialPairKey, contactPrincipalId, useUnivoiceDm]);

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
      const contactId = contactPrincipalId || 'unknown';

      if (contactPrincipalId === AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID) {
        // AI contact: execWebChat + localStorage (not canister)
        if (pendingGif) {
          toast({ title: t('chat.error.generic'), description: 'GIF is not supported in AI chat', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const textToSend = newMessage.trim();

        // Guest limit: 3 sessions when not subscribed to personal AI
        const subscribed = await isSubscribedToPersonalAi(user.principalId);
        if (!subscribed) {
          const guestCountKey = `${AI_CHAT_GUEST_SESSION_COUNT_KEY_PREFIX}${user.principalId}`;
          const count = parseInt(localStorage.getItem(guestCountKey) || '0', 10);
          if (count >= AI_CHAT_GUEST_SESSION_LIMIT) {
            toast({
              title: t('chat.aiSessionLimitReached'),
              description: t('chat.aiSessionLimitReachedDesc'),
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        setNewMessage('');
        const userMsg: ChatMessageInfo = {
          sendBy: user.principalId,
          content: textToSend,
          mode: 'Text',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        const historyForApi = messages.map(m => ({
          role: (m.sendBy === user.principalId ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content
        }));
        const result = await execWebChat({
          messages: [...historyForApi, { role: 'user', content: textToSend }],
          user: user.principalId,
          user_nickname: user.nickname || user.name || '',
          stream: false
        });
        const aiContent = result.success && result.data?.choices?.[0]?.message?.content
          ? result.data.choices[0].message.content
          : (result.error || 'Reply failed, please try again');
        const aiMsg: ChatMessageInfo = {
          sendBy: contactPrincipalId,
          content: aiContent,
          mode: 'Text',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
        const storageKey = `${AI_CHAT_STORAGE_KEY_PREFIX}${user.principalId}`;
        const toSave = [...messages, userMsg, aiMsg];
        localStorage.setItem(storageKey, JSON.stringify(toSave));

        if (!subscribed) {
          const guestCountKey = `${AI_CHAT_GUEST_SESSION_COUNT_KEY_PREFIX}${user.principalId}`;
          const count = parseInt(localStorage.getItem(guestCountKey) || '0', 10);
          localStorage.setItem(guestCountKey, String(count + 1));
        }
        console.log('[Chat] AI message sent and saved to localStorage');
      } else {
        if (useUnivoiceDm && dmSessionId && user.principalId) {
          if (pendingGif) {
            const clientMsgId = crypto.randomUUID();
            const added = await sendGifMessageDm(
              user.principalId,
              dmSessionId,
              clientMsgId,
              pendingGif
            );
            setPendingGif(null);
            setMessages((prev) => [...prev, added]);
            console.log('[Chat] Univoice DM GIF sent');
            setLoading(false);
            return;
          }
          const textToSend = newMessage.trim();
          if (!textToSend) {
            setLoading(false);
            return;
          }
          const clientMsgId = crypto.randomUUID();
          await sendTextMessage(user.principalId, dmSessionId, clientMsgId, textToSend);
          setNewMessage('');
          setMessages((prev) => [
            ...prev,
            {
              sendBy: user.principalId,
              content: textToSend,
              mode: 'Text',
              timestamp: Date.now(),
              clientMsgId,
            },
          ]);
          console.log('[Chat] Univoice DM message sent');
          setLoading(false);
          return;
        }
        if (pendingGif) {
          console.log('[Chat] Sending GIF message:', pendingGif);
          await sendGifMessage(user.principalId, contactId, pendingGif);
          setPendingGif(null);
        } else {
          console.log('[Chat] Sending message:', newMessage);
          await sendChatMessage(user.principalId, contactId, newMessage, 'Text');
          setNewMessage('');
        }
        const updatedMessages = await getRecentChatMessages(user.principalId, contactId);
        setMessages(updatedMessages);
        console.log('[Chat] Message sent successfully');
      }
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      if (contactPrincipalId === AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID) {
        const errMsg = error instanceof Error ? error.message : String(error);
        setMessages(prev => [...prev, {
          sendBy: contactPrincipalId,
          content: `Error: ${errMsg}`,
          mode: 'Text',
          timestamp: Date.now()
        }]);
      } else if (pendingGif) {
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

  const handleDeleteAllChatRecords = async () => {
    if (!user?.principalId || !contactPrincipalId) return;
    const confirmed = window.confirm(t('chat.deleteAllChatRecordsConfirm'));
    if (!confirmed) return;
    try {
      if (isAiContact) {
        const storageKey = `${AI_CHAT_STORAGE_KEY_PREFIX}${user.principalId}`;
        localStorage.removeItem(storageKey);
        setMessages([]);
        setCurrentPage(0);
        setHasMoreMessages(false);
        toast({ title: t('chat.deleteAllChatRecordsSuccess'), variant: 'default' });
      } else if (useUnivoiceDm) {
        toast({
          title: t('chat.deleteAllChatRecordsFailed'),
          description: 'Clearing DM history requires server support — not available yet',
          variant: 'destructive',
        });
      } else {
        await clearChatHistoryForPair(user.principalId, contactPrincipalId);
        setMessages([]);
        setCurrentPage(0);
        setHasMoreMessages(false);
        setSocialPairKey('');
        toast({ title: t('chat.deleteAllChatRecordsSuccess'), variant: 'default' });
      }
    } catch (e) {
      console.error('[Chat] Error deleting chat records:', e);
      toast({ title: t('chat.deleteAllChatRecordsFailed'), variant: 'destructive' });
    }
  };

  const handleRequestAiSuggestion = useCallback(async () => {
    if (!user?.principalId || isAiContact) return;
    const recent = messages.slice(-10);
    if (recent.length === 0) {
      toast({
        title: t('chat.aiSuggestion.noMessages') || 'No messages',
        description: t('chat.aiSuggestion.noMessagesDesc') || 'Send some messages first to get suggestions.',
        variant: 'destructive',
      });
      return;
    }
    setAiDrawerOpen(true);
    setAiSuggestionContent('');
    setAiSuggestionLoading(true);
    try {
      const formattedPrompt = formatChatForAiSuggestion({
        messages,
        userPrincipalId: user.principalId,
        partnerDisplayName: contactName || contactNickname || 'partner',
        maxMessages: 10,
      });
      const webChatMessages = buildWebChatMessagesForSuggestion(formattedPrompt);
      const result = await execWebChat({
        messages: webChatMessages,
        user: user.principalId,
        user_nickname: user.nickname || user.name || '',
        stream: false,
      });
      const text = result.success && result.data?.choices?.[0]?.message?.content
        ? result.data.choices[0].message.content
        : (result.error || (t('chat.aiSuggestion.error') || 'Failed to get suggestion'));
      setAiSuggestionContent(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiSuggestionContent(t('chat.aiSuggestion.error') || 'Error: ' + msg);
    } finally {
      setAiSuggestionLoading(false);
    }
  }, [user?.principalId, user?.nickname, user?.name, messages, contactName, contactNickname, isAiContact, toast, t]);

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
      <div className={styles.chat__loading}>
        <div className={styles.chat__loading__spinner}>
          <div className={styles.chat__loading__spinner__outer}></div>
          <div className={styles.chat__loading__spinner__inner}></div>
          <div className={styles.chat__loading__text}>
            <div className={styles.chat__loading__text__gradient}>
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
      <div className={styles.chat__page}>
        {/* Header */}
        <AppHeader />

        <div className={styles.chat__container}>
          {/* Sidebar for desktop only */}
          <div className={styles.chat__sidebar}>
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className={styles.chat__main}>
            <div className={styles.chat__main__inner}>
              <div className={styles.chat__main__content}>
                {/* Chat Header */}
                    <div className={styles.chat__header}>
                      <div className={styles.chat__header__content}>
                        {/* Back Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className={styles.chat__back__button}
                          onClick={handleBackToContracts}
                        >
                          <ArrowLeft className={styles.chat__back__button__icon} />
                        </Button>
                        
                        {/* Contact Info */}
                        <div className={styles.chat__contact__info}>
                          <div className={styles.chat__contact__avatar}>
                            <Avatar className="w-12 h-12 sm:w-14 sm:h-14">
                              {/* Show image if available (Univoice or URL-based avatar) */}
                              {getAvatarImageUrl(currentContact) ? (
                                <AvatarImage 
                                  src={getAvatarImageUrl(currentContact)!} 
                                  alt={currentContact.name}
                                />
                              ) : null}
                              {/* Fallback: Show text with gradient background for contacts without image */}
                              <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold text-sm sm:text-base">
                                {currentContact.avatar}
                              </AvatarFallback>
                            </Avatar>
                            {currentContact.isOnline && (
                              <div className={styles.chat__contact__avatar__badge}></div>
                            )}
                          </div>
                          <div className={styles.chat__contact__details}>
                            <div className={styles.chat__contact__name__row}>
                              <h1 className={styles.chat__contact__name}>{currentContact.name}</h1>
                              {currentContact.nickname && (
                                <span className={styles.chat__contact__nickname}>({currentContact.nickname})</span>
                              )}
                              {notifications.length > 0 && (
                                <div className={styles.chat__contact__notification}>
                                  {notifications.length}
                                </div>
                              )}
                            </div>
                            <p className={styles.chat__contact__status}>
                              {currentContact.isOnline ? 'Online' : 'Offline'}
                              {currentContact.devices.length > 0 && ` • ${currentContact.devices.join(', ')}`}
                              {socialPairKey && (
                                <span className={styles.chat__contact__status__id}>
                                  Chat ID: {socialPairKey.substring(0, 12)}...
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className={styles.chat__header__actions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={styles.chat__delete_all__button}
                            onClick={handleDeleteAllChatRecords}
                            title={t('chat.deleteAllChatRecords')}
                            aria-label={t('chat.deleteAllChatRecords')}
                          >
                            <Trash2 className={styles.chat__delete_all__icon} />
                          </Button>
                        </div>
                      </div>
                    </div>

                {/* Contact Details */}
                {showContactDetails && (
                  <div className={styles.chat__contact__details__section}>
                    <div className={styles.chat__contact__details__card}>
                      {/* Close Button */}
                      <button
                        onClick={() => setShowContactDetails(false)}
                        className={styles.chat__contact__details__close}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                        }}
                        aria-label="Close contact details"
                      >
                        <X className={styles.chat__contact__details__close__icon} />
                      </button>
                      <div className={styles.chat__contact__details__content}>
                        <p><span className={styles.chat__contact__details__label}>Devices:</span> {contactDeviceList.length > 0 ? `${contactDeviceList.length} device(s)` : 'None'}</p>
                        <p><span className={styles.chat__contact__details__label}>Online:</span> {currentContact.isOnline ? 'Yes' : 'No'}</p>
                        {currentContact.contactPrincipalId && (
                          <p><span className={styles.chat__contact__details__label}>Principal ID:</span> <code className={styles.chat__contact__details__code}>{currentContact.contactPrincipalId}</code></p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div 
                  ref={messagesContainerRef}
                  className={styles.chat__messages__container}
                >
                  {isLoadingChat ? (
                    <div className={styles.chat__messages__loading}>
                      <div className={styles.chat__messages__loading__text}>Loading chat history...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className={styles.chat__messages__empty}>
                      <div className={styles.chat__messages__empty__content}>
                        <p>No messages yet</p>
                        <p className={styles.chat__messages__empty__subtext}>Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Loading indicator when loading more messages */}
                      {isLoadingMore && (
                        <div className={styles.chat__messages__loading__more}>
                          <div className={styles.chat__messages__loading__more__content}>
                            <div className={styles.chat__messages__loading__more__spinner}></div>
                            <span>Loading older messages...</span>
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
                        className={cn(
                          styles.chat__message__wrapper,
                          isMyMessage(message) ? styles['chat__message__wrapper--sent'] : styles['chat__message__wrapper--received']
                        )}
                      >
                        <div className={cn(
                          styles.chat__message__bubble,
                          isMyMessage(message) ? styles['chat__message__bubble--sent'] : styles['chat__message__bubble--received']
                        )}>
                          {message.mode === 'Gif' && message.gifInfo ? (
                            <div className={styles.chat__message__gif}>
                              {failedImages.has(`${message.sendBy}-${message.timestamp}`) ? (
                                <div className={styles.chat__message__gif__failed} style={{ minHeight: '100px' }}>
                                  <div className={styles.chat__message__gif__failed__content}>
                                    <svg className={styles.chat__message__gif__failed__icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className={styles.chat__message__gif__failed__title}>{message.gifInfo.title}</p>
                                    {unrecoverableGifs.has(`${message.sendBy}-${message.timestamp}`) && (
                                      <p className={styles.chat__message__gif__failed__warning}>⚠️ This GIF cannot be recovered</p>
                                    )}
                                    <p className={styles.chat__message__gif__failed__size}>
                                      {message.gifInfo.width}x{message.gifInfo.height}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className={styles.chat__message__gif__container}>
                                  <img 
                                    src={message.gifInfo.gifUrl} 
                                    alt={message.gifInfo.title}
                                    className={styles.chat__message__gif__image}
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
                            </div>
                          ) : (
                            <div className={styles.chat__message__text}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                            </div>
                          )}
                          <div className={styles.chat__message__meta}>
                            <p className={styles.chat__message__time}>{formatTimestamp(message.timestamp)}</p>
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
                <div className={styles.chat__input__area}>
                      {/* Pixel art is sent as GIF; no separate preview strip */}

                      {/* Pending GIF Preview */}
                      {pendingGif && (
                        <div className={styles.chat__pending__gif}>
                          <div className={styles.chat__pending__gif__header}>
                            <span className={styles.chat__pending__gif__title}>{t('chat.readyToSend')}:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingGif(null)}
                              className={styles.chat__pending__gif__close}
                            >
                              ✕
                            </Button>
                          </div>
                          <div className={styles.chat__pending__gif__content}>
                            <img 
                              src={pendingGif.thumbnailUrl} 
                              alt="GIF Preview"
                              className={styles.chat__pending__gif__thumbnail}
                              onError={(e) => {
                                console.error('[Chat] GIF preview image failed to load:', e);
                              }}
                            />
                            <div className={styles.chat__pending__gif__info}>
                              <div className={styles.chat__pending__gif__info__title}>{pendingGif.title}</div>
                              <div className={styles.chat__pending__gif__info__meta}>GIF • {pendingGif.width}x{pendingGif.height}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Send to Device Section - Only show when contact has devices */}
                      {hasContactDevices && (pendingGif || newMessage.trim()) && (
                        <div className={styles.chat__device__section}>
                          <div className={styles.chat__device__section__header}>
                            <div className={styles.chat__device__section__left}>
                              <Smartphone className={styles.chat__device__section__icon} />
                              <div className={styles.chat__device__section__info}>
                                <span className={styles.chat__device__section__title}>
                                  {t('chat.sendToDevice') || 'Send to Device'}
                                </span>
                                {contactDeviceList.length > 0 && (
                                  <div className={styles.chat__device__section__status}>
                                    <div className={cn(
                                      styles.chat__device__section__status__dot,
                                      contactDeviceList.some(device => isContactDeviceOnline(device))
                                        ? styles['chat__device__section__status__dot--online']
                                        : styles['chat__device__section__status__dot--offline']
                                    )} />
                                    <span className={cn(styles.chat__device__section__status__text, getContactDeviceStatusColor())}>
                                      {getContactDeviceStatusText()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Only show Send button if at least one device is online */}
                            {contactDeviceList.some(device => isContactDeviceOnline(device)) && (
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
                                  setIsSendingToDevice(true);
                                  setSendProgress(0);
                                  
                                  // Check if device service is initialized, if not, try to initialize it (with timeout)
                                  if (!deviceServiceInitialized) {
                                    console.log('[Chat] Device service not initialized, attempting to initialize...');
                                    setSendProgressText(t('chat.initializingDeviceService') || 'Initializing device service...');
                                    
                                    // Initialize with timeout to prevent blocking
                                    try {
                                      await Promise.race([
                                        refreshDeviceStatus(),
                                        new Promise((_, reject) => 
                                          setTimeout(() => reject(new Error('Initialization timeout')), 3000)
                                        )
                                      ]);
                                    } catch (initError) {
                                      console.warn('[Chat] Device service initialization timeout or failed, continuing anyway:', initError);
                                      // Continue even if initialization fails or times out
                                    }
                                  }
                                  
                                  setSendProgressText(t('chat.sending') || 'Sending...');
                                  
                                  const sentTo: string[] = [];
                                  const errors: string[] = [];
                                  const totalDevices = contactDeviceList.length;
                                  
                                  for (let i = 0; i < contactDeviceList.length; i++) {
                                    const device = contactDeviceList[i];
                                    // Use deviceName (MCP device name) if available, otherwise fall back to name
                                    const deviceName = device.deviceName || device.name;
                                    
                                    // Update progress before sending
                                    const currentProgress = Math.round((i / totalDevices) * 100);
                                    setSendProgress(currentProgress);
                                    setSendProgressText(t('chat.sendingToDevice', { current: i + 1, total: totalDevices }) || `Sending to device ${i + 1}/${totalDevices}...`);
                                    
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
                                      
                                      // Update progress after sending
                                      const progressAfterSend = Math.round(((i + 1) / totalDevices) * 100);
                                      setSendProgress(progressAfterSend);
                                    } catch (error) {
                                      errors.push(`${deviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                      // Update progress even on error
                                      const progressAfterError = Math.round(((i + 1) / totalDevices) * 100);
                                      setSendProgress(progressAfterError);
                                    }
                                  }
                                  
                                  // Complete progress
                                  setSendProgress(100);
                                  setSendProgressText(t('chat.sendComplete') || 'Send complete');
                                  
                                  // Clear pending content first
                                  const hadPendingGif = !!pendingGif;
                                  const hadPendingMessage = !!newMessage.trim();
                                  setPendingGif(null);
                                  setNewMessage('');
                                  
                                  if (sentTo.length > 0) {
                                    toast({
                                      title: hadPendingGif ? t('chat.success.gifSent') : t('chat.success.textSent'),
                                      description: `Sent to ${sentTo.length} of ${contactDeviceList.length} device(s)`,
                                      variant: "success"
                                    });
                                    
                                    // Send automatic chat message to friend (don't wait for it)
                                    const sendAutoMessage = async () => {
                                      try {
                                        const deviceMessage = t('chat.deviceMessageSent');
                                        const contactId = contactPrincipalId || 'unknown';
                                        if (user?.principalId && contactId !== 'unknown') {
                                          if (useUnivoiceDm && dmSessionId) {
                                            const cid = crypto.randomUUID();
                                            await sendTextMessage(user.principalId, dmSessionId, cid, deviceMessage);
                                            const dmPageLimit = pageSize * pagesPerLoad;
                                            const { items, nextCursor } = await listMessages(
                                              user.principalId,
                                              dmSessionId,
                                              undefined,
                                              dmPageLimit
                                            );
                                            const sorted = [...items].sort(
                                              (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
                                            );
                                            setMessages(sorted.map(messageItemToChatMessageInfo));
                                            setUnivoiceNextCursor(nextCursor);
                                            setHasMoreMessages(!!nextCursor);
                                          } else {
                                            await sendChatMessage(user.principalId, contactId, deviceMessage, 'Text');
                                            const updatedMessages = await getRecentChatMessages(user.principalId, contactId);
                                            setMessages(updatedMessages);
                                          }
                                          console.log('[Chat] Auto-sent device message to chat:', deviceMessage);
                                        }
                                      } catch (error) {
                                        console.error('[Chat] Failed to send auto device message to chat:', error);
                                        // Don't show error to user, as device send was successful
                                      }
                                    };
                                    
                                    // Send auto message in background, don't wait
                                    sendAutoMessage();
                                    
                                    // Wait a moment to show completion, then close
                                    await new Promise(resolve => setTimeout(resolve, 800));
                                  } else {
                                    throw new Error(errors.join('; '));
                                  }
                                  
                                  // Close sending UI
                                  setIsSendingToDevice(false);
                                  setSendProgress(0);
                                  setSendProgressText('');
                                } catch (error) {
                                  console.error('[Chat] Failed to send to contact devices:', error);
                                  setIsSendingToDevice(false);
                                  setSendProgress(0);
                                  setSendProgressText('');
                                  toast({
                                    title: t('chat.error.deviceSendFailed'),
                                    description: error instanceof Error ? error.message : t('chat.error.unknownError'),
                                    variant: "destructive"
                                  });
                                }
                              }}
                              disabled={(!newMessage.trim() && !pendingGif) || isSendingToDevice}
                              className={styles.chat__device__section__button}
                            >
                              {isSendingToDevice ? (t('chat.sending') || 'Sending...') : (t('chat.send') || 'Send')}
                            </Button>
                            )}
                          </div>
                          {/* Progress Bar */}
                          {isSendingToDevice && (
                            <div className={styles.chat__device__section__progress}>
                              <div className={styles.chat__device__section__progress__info}>
                                <span>{sendProgressText}</span>
                                <span>{sendProgress}%</span>
                              </div>
                              <div className={styles.chat__device__section__progress__bar}>
                                <div 
                                  className={styles.chat__device__section__progress__fill}
                                  style={{ width: `${sendProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message input: Enter = newline; Ctrl/Cmd+Enter = send */}
                      <div className={styles.chat__input__row}>
                        <div className={styles.chat__input__field}>
                          <textarea
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={t('common.typeYourMessage') as string}
                            className={cn(styles.chat__input__textarea, 'w-full bg-white/5 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm text-xs sm:text-sm')}
                            rows={1}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                if (!loading) handleSendMessage();
                              }
                            }}
                            aria-label={t('common.typeYourMessage') as string}
                          />
                        </div>
                        
                        {/* Send to Chat Button */}
                        <Button
                          onClick={handleSendMessage}
                          disabled={loading || (!newMessage.trim() && !pendingGif)}
                          className={styles.chat__input__send__button}
                          title="Send message to chat"
                        >
                          {loading ? (
                            <div className={styles.chat__input__send__button__spinner} />
                          ) : (
                            <Send className={styles.chat__input__send__button__icon} />
                          )}
                        </Button>
                      </div>
                      
                      {/* Function Buttons Row */}
                      <div className={styles.chat__function__buttons}>
                        <Button
                          variant="outline"
                          size="sm"
                          className={styles.chat__function__button}
                          onClick={handleEmojiClick}
                        >
                          <Smile className={styles.chat__function__button__icon} />
                          {t('common.emoji')}
                        </Button>
                        {!isAiContact && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={styles.chat__function__button}
                            onClick={handleRequestAiSuggestion}
                            disabled={aiSuggestionLoading || messages.length === 0}
                            title={t('chat.withAiAssistant') || 'With AI assistant'}
                          >
                            <Bot className={styles.chat__function__button__icon} />
                            {t('chat.withAiAssistant') || 'With AI assistant'}
                          </Button>
                        )}
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
                            className={styles['chat__function__button--dev']}
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

        {/* AI reply suggestion drawer (human chat, button to open) */}
        {aiDrawerOpen && (
          <>
            <div
              className={styles.chat__ai_drawer__backdrop}
              onClick={() => !aiSuggestionLoading && setAiDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className={cn(styles.chat__ai_drawer, aiDrawerOpen && styles.chat__ai_drawer__open)}>
              <div className={styles.chat__ai_drawer__handle} />
              <div className={styles.chat__ai_drawer__header}>
                <h2 className={styles.chat__ai_drawer__title}>
                  {t('chat.aiSuggestion.title') || 'AI Reply Suggestion'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.chat__ai_drawer__close}
                  onClick={() => !aiSuggestionLoading && setAiDrawerOpen(false)}
                  disabled={aiSuggestionLoading}
                  aria-label={t('common.close') || 'Close'}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className={styles.chat__ai_drawer__body}>
                {aiSuggestionLoading ? (
                  <div className={styles.chat__ai_drawer__loading}>
                    <div className={styles.chat__messages__loading__more__spinner} />
                    <span>{t('chat.aiSuggestion.loading') || 'Getting suggestion...'}</span>
                  </div>
                ) : (
                  <div className={styles.chat__ai_drawer__content}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSuggestionContent || '—'}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default Chat;
