# Alaya Chat Nexus Frontend – Recent Updates

This document summarizes the latest changes implemented in the Chat Nexus frontend (`src/alaya-chat-nexus-frontend`). It complements the project root `README.md` and focuses on UI, authentication, device initialization, and layout improvements.

## Navigation & Header

- Introduced a reusable `AppHeader` component that standardizes:
  - Avatar click → navigates to `/profile` (mobile and desktop)
  - Login/Logout actions (wallet/Google)
  - Optional sidebar trigger control
- Bottom navigation update:
  - Item `Profile` renamed to `AI`, icon changed to Sparkles
  - `AI` routes to `/` (home/chat)

## Authentication (Google OAuth)

- Added `hooks/useGoogleAuth` hook encapsulating Google OAuth logic with non-blocking fallback
- Added `components/GoogleAuthProvider` to lazily load Google APIs and initialize auth
- Updated `lib/auth.ts` to integrate Google auth (login/logout/status/validation)
- Environment keys migrated to Vite style:
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_API_URL`
  - `VITE_ENVIRONMENT`
- CSP updated (in `.ic-assets.json5`) to allow:
  - `script-src`: `https://apis.google.com https://accounts.google.com`
  - `connect-src`: `https://accounts.google.com https://www.googleapis.com`
  - `img-src`: `https://lh3.googleusercontent.com`

## Authentication (ICP Internet Identity – Principal Bridging)

This app bridges user identity to ICP principals using Internet Identity (II).

- Dependencies
  - `@dfinity/auth-client@^2.1.3` (aligned with current `@dfinity/agent@^2.x`)

- Modules
  - `src/lib/ii.ts`
    - `getAuthClient()`: lazy-create singleton AuthClient
    - `getIIUrl()`: read II provider from `VITE_II_URL` or default `https://identity.ic0.app`
    - `ensureIILogin()`: trigger II login if not authenticated
    - `getPrincipalFromII()`: return principal text via II identity
    - `logoutII()`: logout II session
  - `src/lib/identity.ts`
    - `generatePrincipalForNonPlug()`: now uses `getPrincipalFromII()` (real II flow)
  - `src/lib/principal.ts`
    - Cache and persist principal id for global access (`getPrincipalId`, `setPrincipalId`, `clearPrincipalId`, `ensurePrincipalId`)
  - `src/lib/auth.ts`
    - Google login and auto-sync path call II to obtain `principalId`
    - Logout path also calls `logoutII()` and clears cached principal
  - `src/services/api/userApi.ts`
    - call canister backend actor 

- UserInfo unification
  - Unified shape: `userId`, `principalId`, `nickname`, `loginMethod`, `loginStatus`, `email?`, `picture?`, `walletAddress?`
  - Stored under `localStorage['alaya_user']` and synced via `syncUserInfo()` (mock)

- i18n
  - Added keys in `src/i18n.ts`:
    - `common.iiAuthFailed`
    - `common.iiPrincipalFailed`

- Environment
  - Add to project root `.env` (Vite):
    - `VITE_II_URL=https://identity.ic0.app`

- Migration notes
  - When backend canister API is ready, replace `src/services/api/userApi.ts` with real actor calls created from `src/declarations/aio-base-backend`


## Layout & Visibility Fixes

- Prevented bottom navigation from covering content on mobile by using responsive `calc(100vh-...)` heights
- `ChatBox` now uses `max-h` with header and nav offsets and `min-h-0` to ensure proper scroll behavior
- Page containers adjusted margins/paddings for consistent spacing on small screens

## Wallet Section Scope

- Removed the "My Wallet" card from:
  - `pages/Index.tsx`
  - `pages/Contracts.tsx`
  - `pages/MyDevices.tsx`
  - `pages/Shop.tsx`
- Kept the wallet display exclusively on `pages/Profile.tsx`

## Device Initialization (Add Device)

- Page `pages/AddDevice.tsx` updates:
  - Responsive header and height rules to avoid bottom nav overlap
  - WiFi password dialog with show/hide and Enter-to-submit
  - Improved content scroll areas on various screen sizes
- Real device services:
  - New `services/realDeviceService.ts` attempts real WiFi/Bluetooth operations:
    - WiFi: tries Web WiFi / Network Information APIs; falls back to realistic mock data when unsupported
    - Bluetooth: uses Web Bluetooth for selection and GATT connection; falls back to realistic mock data
  - `services/deviceInitManager.ts` switched from the mock `deviceService` to `realDeviceService` for:
    - WiFi scanning → selection (with password) → Bluetooth scanning → connection → WiFi provisioning → record submission

> Limitations: Real WiFi enumeration is not broadly available on the web for security reasons. The app attempts available APIs and gracefully falls back to simulated data. Web Bluetooth requires a supported browser and HTTPS context.

## Environment Setup (Vite)

Create an `.env` file at the repository root with:

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

## Quick Navigation

- `components/AppHeader.tsx`: unified header
- `components/BottomNavigation.tsx`: updated bottom nav labels/icons
- `hooks/useGoogleAuth.ts`: Google OAuth logic
- `components/GoogleAuthProvider.tsx`: Google API loader and initializer
- `lib/auth.ts`: auth abstraction with Google integration
- `services/realDeviceService.ts`: real WiFi/Bluetooth attempts with fallbacks
- `services/deviceInitManager.ts`: device setup pipeline using real services
- `pages/AddDevice.tsx`: full device init UI/flow

## Univoice AI Agent Implementation

The Univoice AI Agent is a sophisticated voice-based AI interaction system integrated into the Chat Nexus frontend. It provides natural, real-time voice conversations with AI agents through ElevenLabs' advanced voice synthesis and conversation capabilities.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Voice Hook    │    │   ElevenLabs    │
│   Components    │◄──►│   (useElevenLabs│◄──►│   API & WebSocket│
│                 │    │   Stable)       │    │                 │
│ • Voice Controls│    │ • State Mgmt    │    │ • Voice Synthesis│
│ • Chat Display  │    │ • Session Ctrl  │    │ • Conversation  │
│ • Status Ind.   │    │ • Error Handling│    │ • Real-time I/O │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │           Global State Manager                │
         │        (ElevenLabsGlobalState)                │
         │                                               │
         │ • Persistent State Storage                    │
         │ • Cross-Component State Sync                  │
         │ • localStorage Persistence                    │
         │ • State Change Notifications                  │
         └───────────────────────────────────────────────┘
```

### Core Components

#### 1. Voice Chat Interface (`ElevenLabsVoiceChat.tsx`)
- **Purpose**: Main voice interaction UI component
- **Features**:
  - Voice session controls (Start/Stop Voice)
  - Real-time status indicators
  - Chat message display with timestamps
  - Error handling and recovery
  - Responsive design for mobile/desktop

#### 2. Voice Hook (`useElevenLabsStable`)
- **Purpose**: Core voice functionality and state management
- **Capabilities**:
  - ElevenLabs conversation management
  - Session lifecycle control
  - Voice recording and playback
  - Error handling and recovery
  - State persistence across sessions

#### 3. Global State Manager (`ElevenLabsGlobalState`)
- **Purpose**: Centralized state management for voice sessions
- **Features**:
  - Singleton pattern for global state access
  - Persistent storage via localStorage
  - Publish-subscribe pattern for state changes
  - Cross-component state synchronization
  - Automatic state cleanup and validation

### Technical Implementation

#### State Management Architecture

```typescript
class ElevenLabsGlobalState {
  private static instance: ElevenLabsGlobalState;
  private state: Map<string, any> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();
  private conversationInstances: Map<string, any> = new Map();

  // Singleton pattern ensures single state instance
  static getInstance(): ElevenLabsGlobalState {
    if (!ElevenLabsGlobalState.instance) {
      ElevenLabsGlobalState.instance = new ElevenLabsGlobalState();
    }
    return ElevenLabsGlobalState.instance;
  }

  // State operations with persistence
  updateState(agentId: string, updates: Partial<any>): void
  getState(agentId: string): any
  persistState(agentId: string, state: any): void
  loadPersistedState(agentId: string): any
}
```

#### Voice Session Lifecycle

```typescript
const useElevenLabsStable = (agentId: string) => {
  // Session initialization
  const startSession = async () => {
    // 1. Validate agent configuration
    // 2. Request microphone permissions
    // 3. Get signed URL from ElevenLabs
    // 4. Establish WebSocket connection
    // 5. Update global state
  };

  // Session management
  const endSession = async () => {
    // 1. Gracefully close ElevenLabs connection
    // 2. Clear session state
    // 3. Reset local references
    // 4. Update global state
  };

  // Voice recording control
  const startVoiceRecording = async () => {
    // 1. Check session status
    // 2. Activate voice input
    // 3. Begin real-time processing
  };
};
```

### Integration with ElevenLabs

#### API Configuration
```typescript
// Environment variables required
VITE_ELEVENLABS_API_KEY=your_api_key_here

// ElevenLabs conversation configuration
const conversation = useConversation({
  onConnect: () => {
    // Handle successful connection
    updateSessionState({ isSessionActive: true });
    addSystemMessage('Voice connection established');
  },
  
  onDisconnect: (reason) => {
    // Handle disconnection with reason analysis
    if (reason?.reason === 'user') {
      // User-initiated disconnect
      updateSessionState({ isSessionActive: false });
    } else {
      // System or error disconnect
      handleSystemDisconnect(reason);
    }
  },
  
  onMessage: (message) => {
    // Process incoming voice messages
    processVoiceMessage(message);
  }
});
```

#### Voice Processing Pipeline

```typescript
// Voice input processing
const processVoiceInput = async (audioData: ArrayBuffer) => {
  try {
    // 1. Audio format validation
    // 2. Send to ElevenLabs for processing
    // 3. Receive AI response
    // 4. Update conversation state
    // 5. Display in UI
  } catch (error) {
    handleVoiceProcessingError(error);
  }
};

// Voice output handling
const handleVoiceOutput = (response: any) => {
  // 1. Extract audio data
  // 2. Queue for playback
  // 3. Update speaking status
  // 4. Handle playback completion
};
```

### Error Handling & Recovery

#### Comprehensive Error Management
```typescript
// Error categorization and handling
const handleError = (error: any, context: string) => {
  switch (context) {
    case 'connection':
      handleConnectionError(error);
      break;
    case 'voice_processing':
      handleVoiceProcessingError(error);
      break;
    case 'permission':
      handlePermissionError(error);
      break;
    default:
      handleGenericError(error);
  }
};

// Automatic recovery mechanisms
const attemptRecovery = async (error: any) => {
  if (isRecoverableError(error)) {
    await retryOperation();
  } else {
    fallbackToTextMode();
  }
};
```

#### State Consistency Management
```typescript
// State validation and cleanup
const validateState = (state: any) => {
  const inconsistencies = [];
  
  if (state.isSessionActive && !state.conversationId) {
    inconsistencies.push('Active session without conversation ID');
  }
  
  if (state.status === 'connecting' && !state.isSessionActive) {
    inconsistencies.push('Connecting status without active session');
  }
  
  return inconsistencies;
};

// Automatic state repair
const repairState = (inconsistencies: string[]) => {
  inconsistencies.forEach(issue => {
    console.log(`Repairing state issue: ${issue}`);
    // Apply appropriate fixes
  });
};
```

### Performance Optimizations

#### Memory Management
- **Efficient State Updates**: Only update changed state properties
- **Event Listener Cleanup**: Proper cleanup of WebSocket listeners
- **Memory Leak Prevention**: Automatic cleanup of abandoned sessions

#### Real-time Performance
- **WebSocket Optimization**: Efficient message handling and buffering
- **Audio Processing**: Optimized audio format handling
- **UI Responsiveness**: Non-blocking voice operations

### Security Features

#### Permission Management
```typescript
// Microphone permission handling
const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    });
    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Microphone access denied by user');
    }
    throw error;
  }
};
```

#### Data Privacy
- **Local Processing**: Voice data processed locally when possible
- **Secure Transmission**: Encrypted communication with ElevenLabs
- **Session Isolation**: Separate state for different agent sessions

### Browser Compatibility

#### Supported Browsers
- **Chrome/Edge**: Full support with WebRTC and WebSocket
- **Firefox**: Full support with some audio format limitations
- **Safari**: Limited support, may require fallback implementations

#### Feature Detection
```typescript
// Progressive enhancement approach
const checkBrowserCapabilities = () => {
  const capabilities = {
    webRTC: !!navigator.mediaDevices,
    webSocket: !!window.WebSocket,
    audioContext: !!window.AudioContext,
    mediaRecorder: !!window.MediaRecorder
  };
  
  return capabilities;
};
```

### Development & Testing

#### Development Environment Setup
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your ElevenLabs API key

# Start development server
npm run dev

# Run tests
npm run test
```

#### Testing Strategy
- **Unit Tests**: Component and hook testing
- **Integration Tests**: Voice processing pipeline testing
- **E2E Tests**: Complete voice conversation flow testing
- **Performance Tests**: Memory and CPU usage monitoring

#### Debugging Tools
```typescript
// Comprehensive logging system
const debugLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${level.toUpperCase()}] ${message}`, data);
  }
};

// State inspection utilities
const inspectState = (agentId: string) => {
  const state = globalState.getState(agentId);
  console.log('Current state:', state);
  return state;
};
```

### Deployment & Configuration

#### Production Configuration
```typescript
// Environment-specific configurations
const config = {
  development: {
    apiUrl: 'http://localhost:3001',
    enableDebugLogging: true,
    mockMode: false
  },
  production: {
    apiUrl: 'https://api.elevenlabs.io',
    enableDebugLogging: false,
    mockMode: false
  }
};
```

#### Monitoring & Analytics
- **Session Metrics**: Connection success rates, error frequencies
- **Performance Metrics**: Response times, audio quality
- **User Experience**: Voice interaction patterns, session duration

### Future Enhancements

#### Planned Features
- **Multi-language Support**: Internationalization for voice interactions
- **Voice Customization**: User-selectable voice personalities
- **Advanced AI Integration**: Integration with additional AI models
- **Offline Capabilities**: Local voice processing when possible

#### Scalability Improvements
- **Load Balancing**: Multiple ElevenLabs endpoints
- **Caching**: Voice response caching for common queries
- **CDN Integration**: Global voice asset distribution

### Quick Navigation

- `components/ElevenLabsVoiceChat.tsx`: Main voice chat interface
- `hooks/elevenlabhook-stable.ts`: Core voice functionality hook
- `services/voice/`: Voice processing services
- `utils/voice/`: Voice utility functions

## Social Chat System

The Social Chat System provides a comprehensive point-to-point messaging platform with real-time communication capabilities. Built on Internet Computer Protocol (ICP), it enables secure, decentralized messaging between users with support for multiple content types and real-time notifications.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat UI       │    │   Chat API      │    │  AIO Backend    │
│   (React)       │◄──►│   Service       │◄──►│   Canister      │
│                 │    │                 │    │                 │
│ • Message List  │    │ • API Calls     │    │ • Social Pairs  │
│ • Input Field   │    │ • Data Transform│    │ • Chat History  │
│ • Send Controls │    │ • Error Handling│    │ • Notifications │
│ • Notifications │    │ • State Mgmt    │    │ • Stable Storage│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │           Principal-based Authentication       │
         │              & Identity Management            │
         │                                               │
         │ • User Principal ID                           │
         │ • Social Pair Key Generation                  │
         │ • Permission Management                       │
         │ • Cross-Platform Identity                     │
         └───────────────────────────────────────────────┘
```

### Core Components

#### 1. Chat API Service (`chatApi.ts`)
- **Purpose**: Frontend-backend communication layer for chat functionality
- **Features**:
  - Real-time message sending and receiving
  - Social pair key generation for deterministic chat rooms
  - Notification queue management
  - Pagination support for chat history
  - Multi-modal content support (Text, Voice, Image, Emoji)

#### 2. Chat Interface (`Chat.tsx`)
- **Purpose**: User interface for chat interactions
- **Capabilities**:
  - Real-time message display with sender identification
  - Message input with send controls
  - Auto-scrolling to latest messages
  - Loading states and error handling
  - Contact information display
  - Notification indicators

#### 3. Backend Integration
- **Purpose**: Secure canister-based message storage and routing
- **Features**:
  - Stable memory storage for persistence
  - Principal-based authentication
  - Deterministic social pair key algorithm
  - Push notification system
  - Message indexing and retrieval

### Technical Implementation

#### Data Types and Interfaces

```typescript
// Frontend message representation
interface ChatMessageInfo {
  sendBy: string;           // Sender's principal ID
  content: string;          // Message content (base64 for non-text modes)
  mode: 'Text' | 'Voice' | 'Image' | 'Emoji';  // Content type
  timestamp: number;        // Message timestamp (in milliseconds)
}

// Notification system
interface NotificationInfo {
  socialPairKey: string;    // Social pair this notification belongs to
  toWho: string;           // Receiver's principal ID
  messageId: number;       // Index of the message in chat history
  timestamp: number;       // Notification timestamp (in milliseconds)
}
```

#### Social Pair Key Algorithm

```typescript
// Deterministic key generation for chat rooms
const generateSocialPairKey = (principal1: string, principal2: string): string => {
  // Sort principals to ensure consistent key regardless of sender/receiver order
  const sortedPrincipals = [principal1, principal2].sort();
  const combined = `${sortedPrincipals[0]}:${sortedPrincipals[1]}`;
  
  // Generate hash-based key for efficient storage and lookup
  const hash = hashFunction(combined);
  return `social_pair_${hash}`;
};
```

#### Message Flow Architecture

```typescript
// Send message workflow
const sendMessage = async (sender: string, receiver: string, content: string) => {
  // 1. Generate or retrieve social pair key
  const socialPairKey = await generateSocialPairKey(sender, receiver);
  
  // 2. Send message to backend canister
  const messageIndex = await sendChatMessage(sender, receiver, content, 'Text');
  
  // 3. Backend automatically pushes notification to receiver's queue
  // 4. Update local UI state
  // 5. Reload recent messages for real-time display
};

// Receive message workflow
const pollForMessages = async (userPrincipal: string) => {
  // 1. Check notification queue for new messages
  const notifications = await checkForNewMessages(userPrincipal);
  
  // 2. For each notification, update relevant chat
  for (const notification of notifications) {
    const messages = await getRecentChatMessages(/* participants */);
    updateChatUI(notification.socialPairKey, messages);
  }
  
  // 3. Clear processed notifications
  await clearNotificationsForPair(socialPairKey, userPrincipal);
};
```

### Real-time Communication

#### Polling-based Updates
```typescript
// Continuous message polling every 5 seconds
useEffect(() => {
  const pollInterval = setInterval(async () => {
    try {
      const notifications = await checkForNewMessages(userPrincipalId);
      
      if (notifications.length > 0) {
        // Update UI with new messages
        setNotifications(notifications);
        
        // Reload messages for active chats
        if (notifications.some(n => n.socialPairKey === currentChatKey)) {
          const updatedMessages = await getRecentChatMessages(/* ... */);
          setMessages(updatedMessages);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}, [userPrincipalId, currentChatKey]);
```

#### Message Synchronization
- **Immediate UI Updates**: Messages appear instantly for sender
- **Backend Persistence**: All messages stored in stable memory
- **Cross-device Sync**: Messages accessible from any device with same principal
- **Conflict Resolution**: Timestamp-based ordering for message consistency

### Content Type Support

#### Multi-modal Messaging
```typescript
// Content type handling
const handleContentType = (mode: MessageMode, content: string) => {
  switch (mode) {
    case 'Text':
      return content; // Plain text, no encoding needed
    case 'Voice':
      return encodeBase64(audioData); // Base64 encoded audio
    case 'Image':
      return encodeBase64(imageData); // Base64 encoded image
    case 'Emoji':
      return encodeBase64(emojiData); // Base64 encoded emoji/sticker
  }
};
```

#### Content Processing Pipeline
1. **Input Validation**: Ensure content meets format requirements
2. **Encoding**: Convert non-text content to base64
3. **Size Validation**: Check content size limits
4. **Transmission**: Send to backend canister
5. **Storage**: Persist in stable memory
6. **Retrieval**: Decode and display in UI

### Security & Privacy

#### Principal-based Authentication
```typescript
// User identity verification
const authenticateUser = async () => {
  // 1. Get principal ID from Internet Identity
  const principalId = await getPrincipalFromII();
  
  // 2. Verify principal with backend
  const userProfile = await getUserProfileByPrincipal(principalId);
  
  // 3. Authorize chat operations
  return { principalId, userProfile };
};
```

#### Access Control
- **Message Ownership**: Only message sender and receiver can access
- **Principal Verification**: All operations require valid principal ID
- **Stable Storage**: Messages encrypted and stored securely
- **No Central Authority**: Decentralized storage on IC network

### Performance Optimizations

#### Efficient Data Loading
```typescript
// Pagination for large chat histories
const loadChatHistory = async (page: number = 0, pageSize: number = 20) => {
  const offset = page * pageSize;
  const messages = await getChatMessagesPaginated(
    principal1, 
    principal2, 
    offset, 
    pageSize
  );
  
  return {
    messages,
    hasMore: messages.length === pageSize,
    currentPage: page
  };
};
```

#### Memory Management
- **Message Caching**: Recent messages cached locally
- **Lazy Loading**: Load older messages on demand
- **State Cleanup**: Automatic cleanup of inactive chat sessions
- **Efficient Updates**: Only update changed UI components

### Error Handling & Recovery

#### Comprehensive Error Management
```typescript
// Multi-layer error handling
const handleChatError = (error: any, context: string) => {
  switch (context) {
    case 'network':
      // Network connectivity issues
      showRetryOption();
      cacheMessageForLaterSend();
      break;
      
    case 'authentication':
      // Principal ID or permission issues
      promptReAuthentication();
      break;
      
    case 'storage':
      // Backend canister issues
      showFallbackMessage();
      useLocalStorageBackup();
      break;
      
    default:
      showGenericErrorMessage();
  }
};
```

#### Graceful Degradation
- **Offline Support**: Cache messages when offline
- **Retry Mechanisms**: Automatic retry for failed operations
- **Fallback Storage**: Local storage as backup
- **User Feedback**: Clear error messages and recovery options

### Integration Points

#### Contact System Integration
```typescript
// Link with contact management
const startChatWithContact = async (contactInfo: ContactInfo) => {
  if (!contactInfo.contactPrincipalId) {
    throw new Error('Contact must have valid principal ID');
  }
  
  // Initialize chat session
  const socialPairKey = await generateSocialPairKey(
    currentUserPrincipal, 
    contactInfo.contactPrincipalId
  );
  
  // Load existing chat history
  const messages = await getRecentChatMessages(
    currentUserPrincipal, 
    contactInfo.contactPrincipalId
  );
  
  return { socialPairKey, messages };
};
```

#### Voice Integration
- **Voice Message Support**: Record and send voice messages
- **Transcription**: Convert voice to text for accessibility
- **Audio Quality**: Optimized audio compression
- **Playback Controls**: Play, pause, seek functionality

### Future Enhancements

#### Planned Features
- **Group Chat Support**: Multi-participant conversations
- **Message Reactions**: Emoji reactions and responses
- **Message Editing**: Edit and delete sent messages
- **Message Search**: Full-text search across chat history
- **File Sharing**: Document and media file support
- **Read Receipts**: Message delivery and read confirmations

#### Scalability Improvements
- **Message Sharding**: Distribute large chat histories
- **CDN Integration**: Optimize media content delivery
- **Push Notifications**: Real-time browser notifications
- **Offline Sync**: Advanced offline message synchronization

### Development & Testing

#### Development Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend canister IDs

# Start development server
npm run dev

# Run chat-specific tests
npm run test:chat
```

#### Testing Strategy
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Chat flow end-to-end testing
- **Performance Tests**: Message load and rendering performance
- **Security Tests**: Principal authentication and authorization

### Browser Compatibility

#### Supported Features
- **WebRTC**: For future P2P features
- **WebSocket**: Real-time communication (future enhancement)
- **Local Storage**: Message caching and state persistence
- **Service Workers**: Offline support (planned)

#### Progressive Enhancement
```typescript
// Feature detection and fallbacks
const checkChatCapabilities = () => {
  return {
    localStorage: !!window.localStorage,
    webRTC: !!navigator.mediaDevices,
    serviceWorker: !!navigator.serviceWorker,
    notifications: !!window.Notification
  };
};
```

### Quick Navigation

- `services/api/chatApi.ts`: Chat API service and backend integration
- `pages/Chat.tsx`: Main chat interface component
- `hooks/useChat.ts`: Chat state management hook (future)
- `components/ChatMessage.tsx`: Individual message component (future)
- `utils/chatUtils.ts`: Chat utility functions (future)


