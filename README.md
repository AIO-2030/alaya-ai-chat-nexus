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

### New Bluetooth-First Configuration Flow

The device initialization process has been completely redesigned to follow industry-standard IoT device onboarding patterns with Bluetooth-first connectivity:

**Updated Flow (5 Steps):**
1. **Scan Bluetooth devices** - Discover nearby IoT devices  
2. **Select and connect to Bluetooth device** - Establish secure connection
3. **Request WiFi networks from device** - Device scans and returns available networks via Bluetooth
4. **Configure WiFi credentials** - User selects network and provides password, sent to device via Bluetooth
5. **Submit device record to backend canister** - Save configured device to IC backend

**Technical Implementation:**
- **Page Updates** (`pages/AddDevice.tsx`):
  - 5-step progress indicator with Bluetooth-first flow
  - Enhanced responsive design and scroll handling
  - New Bluetooth connection status UI
  - Improved WiFi password dialog with show/hide toggle
- **Core Services**:
  - `services/deviceInitManager.ts`: Complete flow redesign with new step sequence
  - `services/realDeviceService.ts`: 
    - Enhanced Bluetooth device discovery and connection
    - New `requestWiFiScanFromDevice()` method for device-side WiFi scanning
    - `submitDeviceRecordToCanister()` for IC backend integration
  - `hooks/useDeviceManagement.ts`: Updated to support new flow and error handling

**Key Improvements:**
- **Industry Standard Approach**: Bluetooth-first configuration matches real IoT device patterns
- **Reduced Browser Limitations**: Avoids web WiFi API restrictions by using device-side scanning
- **Better User Experience**: Clear 5-step process with real-time progress feedback
- **IC Integration**: Direct backend canister integration for device management
- **Enhanced Error Handling**: Comprehensive error recovery and user guidance

> **Browser Support**: Web Bluetooth requires supported browsers (Chrome/Edge) and HTTPS context. Graceful fallbacks provided for unsupported environments.

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
- `services/realDeviceService.ts`: **Updated** - Bluetooth-first device configuration with IC integration
- `services/deviceInitManager.ts`: **Redesigned** - 5-step device setup pipeline
- `hooks/useDeviceManagement.ts`: **Enhanced** - Updated device management hook
- `pages/AddDevice.tsx`: **Improved** - Bluetooth-first device onboarding UI

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

## Gallery & Creation System

The Gallery & Creation System provides a comprehensive emoji/content gallery with creation capabilities. Users can browse public content, manage their own creations, and create new content through an intuitive interface.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gallery UI    │    │   Creation UI   │    │   Content API   │
│   (React)       │◄──►│   (React)       │◄──►│   Service       │
│                 │    │                 │    │                 │
│ • Public Tab    │    │ • Emoji Preview │    │ • Content CRUD  │
│ • My Creator    │    │ • Basic Info    │    │ • File Upload   │
│ • Grid Layout   │    │ • Emoji Picker  │    │ • Categorization│
│ • Floating +    │    │ • Upload Area   │    │ • Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │           Navigation Integration               │
         │              & Route Management               │
         │                                               │
         │ • Chat → Gallery Navigation                   │
         │ • Gallery → Creation Flow                     │
         │ • Responsive Route Handling                   │
         │ • Multi-language Support                      │
         └───────────────────────────────────────────────┘
```

### Core Components

#### 1. Gallery Interface (`Gallery.tsx`)
- **Purpose**: Main gallery browsing interface with tabbed navigation
- **Features**:
  - Public content tab for browsing community creations
  - My Creator tab for managing personal content
  - Grid-based responsive layout
  - Content interaction controls (Use, Edit)
  - Floating creation button for easy access
  - Seamless navigation between tabs

#### 2. Creation Interface (`Creation.tsx`)
- **Purpose**: Comprehensive content creation workspace
- **Capabilities**:
  - Real-time emoji preview with visual feedback
  - Basic information input (title, description)
  - Interactive emoji selector with 24+ options
  - Drag-and-drop file upload area
  - Save functionality with validation
  - Responsive design for all screen sizes

#### 3. Navigation Integration
- **Purpose**: Seamless integration with existing chat system
- **Features**:
  - Chat emoji button → Gallery navigation
  - Gallery floating button → Creation flow
  - Breadcrumb-style back navigation
  - Consistent UI patterns across pages

### Technical Implementation

#### Data Types and Interfaces

```typescript
// Gallery item representation
interface GalleryItem {
  id: number;
  title: string;
  creator?: string;        // For public items
  status?: string;         // For creator items ('Published', 'Draft')
  likes: number;
  emoji?: string;          // Preview emoji
  content?: string;        // Base64 encoded content
  timestamp?: number;      // Creation/update time
}

// Creation form data
interface CreationFormData {
  title: string;
  description: string;
  selectedEmoji: string;
  uploadedFile?: File;
  isPublic: boolean;
}
```

#### Navigation Flow Architecture

```typescript
// Chat to Gallery navigation
const handleEmojiClick = () => {
  navigate('/gallery');
};

// Gallery to Creation navigation
const handleCreateClick = () => {
  navigate('/creation');
};

// Creation save and return
const handleSave = async (formData: CreationFormData) => {
  try {
    // 1. Validate form data
    validateCreationData(formData);
    
    // 2. Save to backend (future implementation)
    await saveCreation(formData);
    
    // 3. Navigate back to gallery
    navigate('/gallery');
  } catch (error) {
    handleSaveError(error);
  }
};
```

#### Tab-based Content Organization

```typescript
// Gallery tab management
const [activeTab, setActiveTab] = useState('public');

// Tab content rendering
const renderTabContent = (tab: string) => {
  switch (tab) {
    case 'public':
      return <PublicGalleryGrid items={publicItems} />;
    case 'mycreator':
      return <MyCreatorGrid items={myItems} />;
    default:
      return null;
  }
};
```

### Multi-language Support

#### Internationalization Integration
```typescript
// i18n configuration additions
const galleryTranslations = {
  en: {
    gallery: {
      title: 'Gallery',
      public: 'Public',
      myCreator: 'My Creator',
      create: 'Create',
      createNew: '+ Create'
    }
  },
  zh: {
    gallery: {
      title: 'Gallery (Chinese)',
      public: 'Public (Chinese)',
      myCreator: 'My Creator (Chinese)',
      create: 'Create (Chinese)',
      createNew: '+ Create (Chinese)'
    }
  }
};

// Usage in components
const { t } = useTranslation();
<h1>{t('gallery.title')}</h1>
<Button>{t('gallery.createNew')}</Button>
```

#### Language-aware Content Display
- **Dynamic Text Rendering**: All UI text uses translation keys
- **Cultural Adaptation**: Emoji selection considering cultural preferences
- **RTL Support Ready**: Layout structure supports future RTL languages

### User Interface & Experience

#### Responsive Design System
```typescript
// Grid layout responsive breakpoints
const galleryGridClasses = [
  'grid',
  'grid-cols-1',           // Mobile: single column
  'sm:grid-cols-2',        // Small: 2 columns  
  'lg:grid-cols-3',        // Large: 3 columns
  'xl:grid-cols-4',        // Extra large: 4 columns
  'gap-4'                  // Consistent spacing
].join(' ');
```

#### Interactive Elements
- **Hover Effects**: Smooth transitions and visual feedback
- **Loading States**: Skeleton loading for content areas
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation for save operations

#### Floating Action Button
```typescript
// Fixed positioning with smooth interactions
const FloatingCreateButton = () => (
  <div className="fixed bottom-6 right-6 z-50">
    <Button
      onClick={handleCreateClick}
      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-xl rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-105"
    >
      <Plus className="h-5 w-5 mr-2" />
      {t('gallery.createNew')}
    </Button>
  </div>
);
```

### Content Management

#### Creation Workflow
1. **Initial State**: Empty form with default emoji selection
2. **Content Input**: Title, description, and emoji selection
3. **File Upload**: Optional custom content upload
4. **Validation**: Client-side form validation
5. **Save Process**: Backend integration (future)
6. **Navigation**: Return to gallery with success feedback

#### Content Categories
```typescript
// Emoji categorization for better organization
const emojiCategories = {
  faces: ['😊', '😍', '🤔', '😂', '🥰', '😎', '🤩', '😋'],
  expressions: ['🙂', '😇', '🤗', '🤭', '😬', '🤯', '😴', '🤓'],
  symbols: ['🎉', '🎊', '🌟', '⭐', '🔥', '💡', '🎨', '🌈']
};
```

#### File Upload System
```typescript
// Upload area with validation
const handleFileUpload = (file: File) => {
  // 1. File type validation
  const allowedTypes = ['image/png', 'image/jpg', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  // 2. File size validation (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  // 3. Process upload
  processFileUpload(file);
};
```

### Performance Optimizations

#### Efficient Rendering
- **Virtual Scrolling**: For large content lists (future enhancement)
- **Image Lazy Loading**: Load images as they enter viewport
- **Component Memoization**: Prevent unnecessary re-renders
- **State Optimization**: Minimal state updates for smooth interactions

#### Memory Management
```typescript
// Efficient state updates
const updateGalleryItems = useCallback((newItems: GalleryItem[]) => {
  setItems(prevItems => {
    // Only update if items actually changed
    if (JSON.stringify(prevItems) !== JSON.stringify(newItems)) {
      return newItems;
    }
    return prevItems;
  });
}, []);
```

### Integration Points

#### Chat System Integration
```typescript
// Seamless navigation from chat
const ChatEmojiButton = () => (
  <Button
    onClick={handleEmojiClick}
    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
  >
    <Smile className="h-4 w-4 mr-2" />
    {t('common.emoji')}
  </Button>
);
```

#### Future Backend Integration
```typescript
// API service structure for future implementation
class GalleryApiService {
  async getPublicGallery(): Promise<GalleryItem[]> {
    // Fetch public content from backend
  }
  
  async getMyCreations(userId: string): Promise<GalleryItem[]> {
    // Fetch user's creations
  }
  
  async saveCreation(data: CreationFormData): Promise<GalleryItem> {
    // Save new creation to backend
  }
  
  async updateCreation(id: number, data: Partial<CreationFormData>): Promise<GalleryItem> {
    // Update existing creation
  }
}
```

### Error Handling & Recovery

#### Comprehensive Error Management
```typescript
// Multi-context error handling
const handleGalleryError = (error: any, context: string) => {
  switch (context) {
    case 'load':
      showRetryOption('Failed to load gallery content');
      break;
    case 'save':
      showErrorMessage('Failed to save creation');
      preserveFormData(); // Don't lose user input
      break;
    case 'upload':
      showFileUploadError(error.message);
      break;
    default:
      showGenericError();
  }
};
```

#### Graceful Degradation
- **Offline Support**: Cache content when offline (future)
- **Retry Mechanisms**: Automatic retry for failed operations
- **Fallback Content**: Show placeholder content when loading fails
- **User Feedback**: Clear error messages and recovery options

### Security & Privacy

#### Content Validation
```typescript
// Client-side content validation
const validateContent = (content: any) => {
  // 1. Content type validation
  // 2. Size limits enforcement
  // 3. Malicious content detection
  // 4. Privacy compliance checks
};
```

#### User Authorization
- **Creation Permissions**: Verify user can create content
- **Content Ownership**: Ensure users can only edit their own content
- **Public/Private Toggle**: Respect user privacy preferences

### Future Enhancements

#### Planned Features
- **Content Search**: Full-text search across gallery
- **Categories & Tags**: Better content organization
- **Social Features**: Like, comment, share functionality
- **Advanced Editor**: Rich content creation tools
- **Animation Support**: Animated emoji and GIF support
- **Collaboration**: Shared creation and remix features

#### Scalability Improvements
- **Content CDN**: Optimize content delivery
- **Progressive Loading**: Load content in chunks
- **Caching Strategy**: Smart content caching
- **Search Indexing**: Full-text search capabilities

### Development & Testing

#### Development Setup
```bash
# Gallery-specific development
npm install

# Environment configuration
# No additional environment variables needed for basic functionality

# Run with gallery features
npm run dev

# Test gallery components
npm run test -- --testPathPattern=Gallery
```

#### Testing Strategy
- **Component Tests**: Individual gallery and creation component testing
- **Integration Tests**: Full navigation flow testing
- **Visual Tests**: Screenshot testing for UI consistency
- **Accessibility Tests**: Keyboard navigation and screen reader support

### Browser Compatibility

#### Supported Features
- **File API**: For content upload functionality
- **Local Storage**: For draft persistence (future)
- **CSS Grid**: For responsive gallery layouts
- **Transform/Transition**: For smooth animations

#### Progressive Enhancement
```typescript
// Feature detection for advanced functionality
const checkGalleryCapabilities = () => {
  return {
    fileAPI: !!window.File && !!window.FileReader,
    localStorage: !!window.localStorage,
    dragDrop: !!window.FileReader,
    webGL: !!window.WebGLRenderingContext // For future 3D previews
  };
};
```

### Quick Navigation

- `pages/Gallery.tsx`: Main gallery interface with tabbed navigation
- `pages/Creation.tsx`: Content creation workspace
- `i18n.ts`: Multi-language support for gallery features
- `App.tsx`: Route configuration for gallery system
- `components/ui/tabs.tsx`: Reusable tab component used in gallery

## Pixel Art Creation System

The Pixel Art Creation System is a comprehensive pixel art creation and management platform integrated with the Internet Computer backend. It provides users with tools to create, save, and manage pixel art creations with full backend persistence and real-time collaboration capabilities.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Creation UI   │    │   Pixel API     │    │ AIO Backend     │
│   (React)       │◄──►│   Service       │◄──►│ Canister        │
│                 │    │                 │    │                 │
│ • Pixel Editor  │    │ • API Calls     │    │ • Project CRUD  │
│ • Drawing Tools │    │ • Data Transform│    │ • Version Control│
│ • Metadata Form │    │ • Auth Handling │    │ • Stable Storage│
│ • Save Controls │    │ • Error Handling│    │ • User Indexing │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │           Gallery Integration                  │
         │              & User Management                 │
         │                                               │
         │ • User Creation Display                       │
         │ • Real-time Data Loading                      │
         │ • Authentication Flow                         │
         │ • Project Organization                        │
         └───────────────────────────────────────────────┘
```

### Core Components

#### 1. Pixel Art Creation Interface (`Creation.tsx`)
- **Purpose**: Interactive pixel art creation workspace
- **Features**:
  - 32x32 pixel grid with customizable canvas
  - Complete drawing toolkit (pen, eraser, fill, color picker)
  - Real-time pixel art rendering with smooth scaling
  - Comprehensive color palette with 16+ default colors
  - Undo/redo functionality with action history
  - Grid toggle and zoom controls
  - Metadata input (title, description)
  - Direct save to backend canister

#### 2. Pixel Creation API Service (`pixelCreationApi.ts`)
- **Purpose**: Frontend-backend integration layer for pixel art operations
- **Capabilities**:
  - Full CRUD operations for pixel art projects
  - Version management and history tracking
  - User authentication with Internet Identity
  - Data format conversion (frontend ↔ backend)
  - Error handling and recovery mechanisms
  - Project listing and pagination
  - Export functionality for IoT devices

#### 3. Gallery Integration (`Gallery.tsx` - My Creator Tab)
- **Purpose**: Display and manage user's pixel art creations
- **Features**:
  - Real-time data loading from backend
  - Authentication-aware content display
  - Project metadata visualization
  - Edit functionality integration
  - Canvas-based pixel art rendering
  - Empty state and loading management

### Technical Implementation

#### Data Types and Interfaces

```typescript
// Frontend pixel art representation
interface PixelArtData {
  title?: string;
  description?: string;
  width: number;
  height: number;
  palette: string[];         // HEX color values
  pixels: number[][];        // 2D array of palette indices
  tags?: string[];
}

// Project management
interface ProjectListItem {
  projectId: string;
  title: string;
  description?: string;
  owner: string;
  createdAt: bigint;
  updatedAt: bigint;
  currentVersion: {
    versionId: string;
    createdAt: bigint;
    editor: string;
    message?: string;
  };
}
```

#### Backend Integration

```typescript
// Internet Computer Canister integration
const createActor = async (): Promise<ActorSubclass<_SERVICE>> => {
  const client = await AuthClient.create();
  const identity = client.getIdentity();
  
  const agent = new HttpAgent({ 
    host: HOST,
    identity
  });

  if (isLocalNet()) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
};

// Project creation workflow
const createProject = async (pixelArt: PixelArtData, message?: string) => {
  const actor = await createActor();
  const backendSource = convertToBackendFormat(pixelArt);
  
  const result = await actor.create_pixel_project(
    backendSource, 
    message ? [message] : []
  );
  
  if ('Ok' in result) {
    return result.Ok; // Project ID
  } else {
    throw new Error(result.Err);
  }
};
```

### User Experience Features

#### Interactive Drawing Interface
- **Smooth Drawing**: Line interpolation for smooth brush strokes
- **Multiple Tools**: Pen, eraser, fill tool, color picker
- **Undo/Redo**: Complete action history management
- **Responsive Design**: Adaptive to different screen sizes

#### Real-time Gallery Updates
- **Dynamic Data Loading**: Auto-fetch user creations when switching to "My Creator" tab
- **Authentication Integration**: Login prompts for unauthenticated users
- **Empty State Management**: Guidance interface when no creations exist
- **Error Handling**: Comprehensive error recovery mechanisms

### Performance Optimizations

#### Efficient State Management
- **Minimal Re-renders**: Update Canvas only when necessary
- **Memory Management**: Automatic cleanup of unused resources
- **Batch Updates**: Optimize frequent pixel operations

#### Canvas Optimization
- **Dirty Region Tracking**: Redraw only changed areas
- **Hardware Acceleration**: Utilize GPU rendering capabilities
- **Adaptive Scaling**: Smart adjustment based on container size

### Quick Navigation

- `pages/Creation.tsx`: Interactive pixel art creation interface
- `services/api/pixelCreationApi.ts`: Backend API integration service
- `pages/Gallery.tsx`: Updated gallery with user creation management
- Backend integration: `src/aio-base-backend/src/pixel_creation_types.rs`
- Backend API: `src/aio-base-backend/src/lib.rs` (pixel art endpoints)
- Candid interface: `src/aio-base-backend/aio-base-backend.did`


