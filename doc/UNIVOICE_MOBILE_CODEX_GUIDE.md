# Univoice Mobile Migration — Codex Guidebook

> **Purpose**
>
> This document is the execution guide for migrating `alaya-chat-nexus-frontend` from an ICP-hosted Vite/React PWA into a production-grade iOS + Android application while preserving the existing Web application and reusing as much business logic as practical.
>
> **Primary coding agent:** OpenAI Codex  
> **Target mobile stack:** React Native + Expo + TypeScript  
> **Migration style:** incremental / strangler migration, not big-bang rewrite  
> **Primary rule:** preserve working backend contracts before redesigning them.

---

# 0. Executive Decision

The existing project MUST NOT be converted by wrapping the current website in a WebView as the final architecture.

The target architecture is:

```text
Univoice Monorepo
│
├── apps/
│   ├── web/                     # existing Vite/React PWA
│   └── mobile/                  # React Native + Expo
│
├── packages/
│   ├── domain/                  # pure TS domain models/types
│   ├── api-client/              # REST/SSE/MCP clients
│   ├── icp-client/              # canister/Principal abstractions
│   ├── auth-core/               # platform-neutral auth state/contracts
│   ├── chat-core/               # chat orchestration, transformations
│   ├── device-core/             # platform-neutral device domain
│   ├── ai-core/                 # AIO protocol / AI contracts
│   ├── creation-core/           # pixel/GIF transforms where portable
│   └── config/                  # shared configuration contracts
│
└── existing backend services
    ├── aio-base-backend         # ICP canister
    ├── univoice-chat            # REST + SSE
    ├── Memory Relationship Core
    ├── AIO MCP / WebChat
    ├── ElevenLabs
    └── Tencent IoT
```

The Web application remains supported during migration.

The mobile application is a new presentation/native-runtime layer over shared domain/services.

---

# 1. Current System Baseline

Codex MUST treat the existing implementation as the behavioral source of truth unless a migration decision in this document explicitly replaces it.

Current application:

```text
Vite + React 18 + TypeScript
React Router
TanStack React Query
React Context
Tailwind + shadcn/Radix
i18next
@dfinity/agent + auth-client
event-source-polyfill
mqtt
ElevenLabs React SDK
Solana / Phantom / WalletConnect / Plug
PWA manifest + Service Worker
ICP Asset Canister hosting
```

Major current capability groups:

```text
Authentication
├── Google OAuth
├── Email/password
├── Internet Identity / Principal
├── Plug wallet
└── Solana / Phantom

Chat
├── AIO WebChat
├── Univoice DM REST
├── Univoice DM SSE
└── ICP legacy social chat polling

AI / Relationship
├── AIOProtocolExecutor
├── MCP JSON-RPC
├── AI suggestions
└── Memory Relationship Core

Voice
└── ElevenLabs realtime voice conversation

IoT
├── BLE / BLUFI onboarding
├── Wi-Fi provisioning
├── ICP device registry
├── Tencent IoT MQTT
└── device message delivery

Creation
├── pixel art
├── GIF conversion
├── gallery
└── device rendering

Payments
└── Solana subscription / USDT

Web Runtime
├── localStorage
├── sessionStorage
├── browser Web Bluetooth
├── browser Media APIs
├── Service Worker
└── PWA install flow
```

---

# 2. Non-Negotiable Migration Principles

Codex MUST follow these rules throughout the migration.

## 2.1 Do not perform a big-bang rewrite

Never delete the Web implementation before a mobile replacement has passed acceptance tests.

Every migration phase must leave the repository buildable.

## 2.2 Preserve backend contracts first

Do not redesign ICP canister APIs, `univoice-chat`, Memory Core, MCP protocol, Tencent IoT topics, or device BLUFI protocol merely to make mobile code cleaner.

Wrap existing contracts behind adapters first.

Backend changes must be isolated and explicitly justified.

## 2.3 Separate domain logic from platform APIs

No shared package may directly reference:

```text
window
document
navigator
localStorage
sessionStorage
BluetoothDevice
BluetoothRemoteGATT*
ServiceWorker
React DOM
Expo APIs
Android APIs
iOS APIs
```

Shared packages should be runnable in plain Node/TypeScript tests.

## 2.4 Native capability behind interfaces

Use ports/adapters.

Example:

```ts
export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
```

Implement separately:

```text
WebSecureStorage
MobileSecureStorage
```

Apply the same pattern to:

```text
Auth callback handling
BLE
Audio
Push notifications
App lifecycle
Deep links
Wallet launching
Persistent storage
Network status
```

## 2.5 Do not expose long-lived secrets in the mobile bundle

Any current `VITE_*` secret that behaves like a private server credential must be classified.

Codex must produce a security inventory before moving it into Expo public config.

Potentially sensitive categories include:

```text
ElevenLabs private API credentials
Tencent STS credentials
Tencent IoT secrets
server Basic Auth credentials
private RPC/API credentials with billing privileges
```

Move secret-bearing operations to trusted backend endpoints where necessary.

## 2.6 Mobile is not a browser

Do not emulate browser APIs globally just to make legacy code compile.

Prefer explicit platform adapters.

Polyfills are acceptable only for protocol/data libraries that are truly platform independent.

---

# 3. Target Repository Structure

Codex should converge toward the following shape.

```text
repo/
├── apps/
│   ├── web/
│   │   └── alaya-chat-nexus-frontend/
│   │
│   └── mobile/
│       ├── app/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   ├── chat/
│       │   ├── devices/
│       │   ├── creation/
│       │   ├── gallery/
│       │   ├── profile/
│       │   └── auth/
│       │
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   ├── adapters/
│       │   │   ├── auth/
│       │   │   ├── bluetooth/
│       │   │   ├── audio/
│       │   │   ├── notifications/
│       │   │   ├── storage/
│       │   │   └── wallet/
│       │   ├── providers/
│       │   └── theme/
│       │
│       ├── app.config.ts
│       ├── eas.json
│       └── package.json
│
├── packages/
│   ├── domain/
│   ├── config/
│   ├── api-client/
│   ├── chat-core/
│   ├── ai-core/
│   ├── icp-client/
│   ├── auth-core/
│   ├── device-core/
│   └── creation-core/
│
├── src/
│   ├── aio-base-backend/
│   └── univoice-chat/
│
├── docs/
│   └── mobile-migration/
│       ├── architecture.md
│       ├── capability-matrix.md
│       ├── auth.md
│       ├── bluetooth.md
│       ├── voice.md
│       ├── release.md
│       └── migration-log.md
│
└── AGENTS.md
```

Do not force this exact physical move on day one.

Migration may begin by creating `packages/` beside the existing frontend and moving code incrementally.

---

# 4. Capability Classification

Before implementing mobile screens, Codex MUST classify every imported dependency and important service into one of four classes.

## Class A — Directly Shareable

Pure TypeScript logic.

Examples likely include:

```text
types/
AIOProtocolTypes.ts
message transformations
DTOs
validation
formatting
protocol serializers
pixel data transforms that do not use DOM Canvas
```

Target: move into shared packages with unit tests.

## Class B — Shareable Behind Adapter

Logic is mostly portable but currently touches browser APIs.

Examples:

```text
principal persistence
auth state
wallet abstractions
API credential storage
network configuration
audio state
```

Target: extract interface + web implementation + mobile implementation.

## Class C — Rewrite for Native

Browser-specific runtime.

Examples:

```text
Web Bluetooth
BLUFI GATT implementation
Google browser OAuth flow
Service Worker
PWA install prompt
browser media permission flow
DOM/CSS/Tailwind/Radix UI
browser Phantom integration
```

Target: preserve protocol/domain logic; rewrite platform transport/UI.

## Class D — Web-only / Remove from Mobile

Examples:

```text
PWAInstallPrompt
service worker initialization
browser environment diagnostic pages
ICP Asset Canister frontend deployment logic
Web-only CSP handling
```

Do not port these to mobile unless a concrete product requirement exists.

---

# 5. Phase 0 — Repository Reconnaissance

## Goal

Produce a verified migration map before modifying architecture.

## Codex Task

Inspect:

```text
src/alaya-chat-nexus-frontend/src/App.tsx
src/alaya-chat-nexus-frontend/src/main.tsx
src/alaya-chat-nexus-frontend/src/pages/
src/alaya-chat-nexus-frontend/src/hooks/
src/alaya-chat-nexus-frontend/src/services/
src/alaya-chat-nexus-frontend/src/services/api/
src/alaya-chat-nexus-frontend/src/lib/
src/alaya-chat-nexus-frontend/src/runtime/
src/alaya-chat-nexus-frontend/src/contexts/
src/alaya-chat-nexus-frontend/src/types/
src/alaya-chat-nexus-frontend/package.json
src/alaya-chat-nexus-frontend/vite.config.*
src/alaya-chat-nexus-frontend/public/
src/univoice-chat/
AGENTS.md
```

Search specifically for:

```text
window.
document.
navigator.
localStorage
sessionStorage
indexedDB
Bluetooth
mediaDevices
MediaRecorder
AudioContext
Notification
serviceWorker
EventSource
WebSocket
mqtt
Buffer
process.env
import.meta.env
@dfinity
@elevenlabs
phantom
walletconnect
plug
canvas
FileReader
Blob
URL.createObjectURL
```

## Required Outputs

Create:

```text
docs/mobile-migration/capability-matrix.md
docs/mobile-migration/dependency-audit.md
docs/mobile-migration/current-dataflows.md
```

`capability-matrix.md` must contain:

```text
Capability
Current files
Current API/dependency
Browser dependency
Mobile replacement
Shared code candidate
Migration risk
Required tests
Status
```

## Exit Criteria

Do NOT start Phase 1 until:

- all direct browser API usage is listed;
- all environment variables are classified as public / sensitive / server-only;
- all externally consumed backend endpoints are documented;
- current auth state machine is documented;
- current three-path chat routing is documented;
- BLUFI protocol code and transport code are separated conceptually;
- current voice lifecycle is documented.

---

# 6. Phase 1 — Introduce Shared Core Without Behavior Change

## Goal

Extract platform-neutral code while preserving the Web app.

## Initial shared packages

Create:

```text
packages/domain
packages/api-client
packages/chat-core
packages/ai-core
packages/device-core
packages/auth-core
packages/config
```

Do NOT move everything at once.

Start with leaf modules that have few browser dependencies.

## Package Rules

Every shared package:

```text
must compile independently;
must not import from apps/web or apps/mobile;
must not use DOM types unless explicitly required;
must expose a small public index.ts;
must have unit tests for non-trivial behavior.
```

## First extraction candidates

### Domain

Move/copy then migrate imports for:

```text
shared message types
user/profile types
device model types
AI protocol types
creation data types
relationship DTOs
```

### AI Core

Extract from:

```text
runtime/AIOProtocolTypes.ts
runtime/AIOProtocolExecutor.ts
services/alayaMcpService.ts
```

Separate:

```text
protocol construction
request/response parsing
execution orchestration
```

from:

```text
fetch implementation
environment config
browser storage
```

### Chat Core

Extract:

```text
contact routing rules
message mapping
AI suggestion formatting
session identifiers
read-state transformations
```

Keep actual network transports in adapters/API client.

### Device Core

The most important rule:

**Do not copy Web Bluetooth types into shared device code.**

Split:

```text
BLUFI frame encoder/decoder       -> shared
BLUFI state machine               -> shared where possible
sequence/ACK matching             -> shared
GATT discovery/write/notify       -> platform adapter
```

The existing persistent FF02 notification architecture must be preserved semantically.

## Exit Criteria

- existing Web app still builds;
- existing Web behavior remains unchanged;
- shared packages pass tests;
- no package contains hidden dependency on `window` or `navigator`.

---

# 7. Phase 2 — Bootstrap Mobile Application

## Goal

Create a native mobile shell with no risky feature migration yet.

Recommended:

```text
React Native
Expo
TypeScript
Expo Router
TanStack Query
i18next
secure native storage adapter
```

Use an Expo development build early, not only Expo Go, because this application will require native Bluetooth and potentially other custom native modules.

## First screens

Implement:

```text
Splash / bootstrap
Authentication entry
Home
Chat shell
Devices shell
Profile
Settings
```

Use placeholder feature states where backend/native integration is not yet migrated.

## Providers

Suggested composition:

```text
App bootstrap
└── ErrorBoundary
    └── QueryClientProvider
        └── AuthProvider
            └── DeviceProvider
                └── PresenceProvider
                    └── Expo Router
```

Do not reproduce the Web provider chain blindly.

## Design Migration

Do not try to port Tailwind/Radix DOM components line-by-line.

Recreate semantic design tokens:

```text
colors
spacing
radius
typography
surface hierarchy
status colors
```

Then build native UI components.

The mobile UI should preserve Univoice visual identity, not DOM implementation details.

## Exit Criteria

- Android dev build launches;
- iOS dev build launches;
- navigation works;
- shared package imports work;
- environment profiles work;
- no WebView required for primary screens.

---

# 8. Phase 3 — Configuration and Secrets Architecture

## Goal

Replace Vite-centric environment assumptions.

Create a typed config contract.

Example:

```ts
export interface UnivoiceConfig {
  environment: 'development' | 'staging' | 'production';

  icp: {
    host: string;
    backendCanisterId: string;
    iiUrl: string;
  };

  chat: {
    apiBaseUrl: string;
    sseBaseUrl: string;
  };

  aio: {
    webchatUrl: string;
    mcpApiUrl: string;
  };

  relationship: {
    baseUrl: string;
  };
}
```

Separate configuration into:

```text
Public mobile config
Server-side secrets
Runtime user credentials
Device-specific credentials
```

## Mandatory security audit

Review every existing:

```text
VITE_ELEVENLABS_*
VITE_TENCENT_STS_*
VITE_TENCENT_IOT_*
VITE_HELIUS_*
VITE_ALCHEMY_*
VITE_PHANTOM_*
chat Basic Auth credential
```

For each, document:

```text
Can ship in app? yes/no
Reason
Replacement
Rotation strategy
Backend endpoint if required
```

Any credential that grants privileged third-party access must not simply become `EXPO_PUBLIC_*`.

## Exit Criteria

`docs/mobile-migration/security-config-audit.md` exists and all credentials have an owner and strategy.

---

# 9. Phase 4 — Authentication Migration

## Goal

Create one mobile authentication/session model while preserving ICP Principal identity.

Current auth contains multiple identities:

```text
Google
Email/password
Internet Identity
ICP Principal
Plug
Solana wallet
Univoice DM credentials
```

Do not conflate them.

Create a canonical session model:

```ts
interface UnivoiceSession {
  userId?: string;
  principalId?: string;

  primaryLoginMethod:
    | 'email'
    | 'google'
    | 'internet-identity'
    | 'solana'
    | 'plug';

  chatAuthAvailable: boolean;

  wallet?: {
    chain: 'solana' | 'icp';
    address: string;
  };
}
```

Exact fields must be adapted to real backend behavior after code inspection.

## Storage

Replace:

```text
localStorage
sessionStorage
```

with an abstraction:

```text
SessionStorage
SecureCredentialStorage
CacheStorage
```

Use secure native storage for tokens/credentials.

Do not persist secrets in AsyncStorage-equivalent plaintext merely because Web used localStorage.

## Internet Identity

Do not assume the Web `AuthClient.login()` popup/postMessage flow can be used unchanged in native.

Implement a mobile-compatible browser authentication bridge.

Preferred shape:

```text
Mobile App
    │
    ├── create ephemeral session/delegation request
    │
    └── open system browser
             │
             ▼
       Univoice auth bridge
             │
             ▼
      Internet Identity
             │
             ▼
       delegation result
             │
             ▼
Universal Link / App Link
             │
             ▼
         Mobile App
```

Security requirements:

```text
state/nonce correlation
one-time callback
short-lived session material
strict callback host/path validation
no private delegation material in logs
```

Do not invent a new ICP identity scheme unless required.

## Google

Use an appropriate native OAuth flow.

Do not embed Google login inside an arbitrary WebView.

## Wallets

Create a wallet adapter:

```ts
interface WalletAdapter {
  connect(): Promise<WalletIdentity>;
  disconnect(): Promise<void>;
  signMessage?(...): Promise<...>;
  signTransaction?(...): Promise<...>;
}
```

Mobile wallet integration may use external-app linking / universal links depending on wallet support.

Do not let wallet transport leak into business services.

## Exit Criteria

Test matrix:

```text
fresh install
login
app restart
logout
expired credentials
cancelled browser login
deep-link callback
multiple login methods
network failure
same Principal cross-device
```

---

# 10. Phase 5 — Chat Migration

## Goal

Preserve the current three-path chat behavior first, then simplify only after parity.

Current routing:

```text
1. AIO WebChat
2. Univoice DM REST + SSE
3. ICP legacy social chat + polling fallback
```

Represent this explicitly.

Example:

```ts
type ChatTransportKind =
  | 'aio-webchat'
  | 'univoice-dm'
  | 'icp-legacy';
```

Create:

```ts
interface ChatTransport {
  listMessages(...): Promise<...>;
  sendMessage(...): Promise<...>;
  subscribe?(...): () => void;
  markRead?(...): Promise<void>;
}
```

Implement adapters:

```text
AioWebChatTransport
UnivoiceDmTransport
IcpLegacyChatTransport
```

Then create one `ChatCoordinator`.

## SSE

React Native networking behavior must be verified with the chosen SSE solution.

Do not assume `event-source-polyfill` browser semantics.

Requirements:

```text
reconnect
last-event handling where applicable
auth headers
principal header
duplicate event protection
app foreground/background transition
network switch
```

If SSE proves fragile for background mobile behavior, document the limitation; do not silently substitute polling everywhere.

## Mobile message outbox

Add an explicit sending state:

```text
localId
serverId?
state = queued | sending | sent | failed
retryCount
createdAt
```

This is recommended for mobile resilience.

Do not change server message semantics without backend coordination.

## Exit Criteria

Behavior tests for all three routes.

---

# 11. Phase 6 — Voice / ElevenLabs Migration

## Goal

Recreate voice session lifecycle using mobile-compatible APIs.

First extract state machine concepts from:

```text
ElevenLabsVoiceChat.tsx
elevenlabhook-stable.ts
ElevenLabsGlobalState
```

Do NOT port singleton + localStorage architecture literally.

Model voice session explicitly:

```text
idle
requesting_permission
connecting
connected
listening
thinking
speaking
reconnecting
ending
error
```

## Separate layers

```text
Voice UI
Voice Session Controller
ElevenLabs Transport
Audio Input Adapter
Audio Output Adapter
Permission Adapter
App Lifecycle Adapter
```

## Required mobile cases

```text
microphone permission denied
Bluetooth headset
audio route change
incoming phone call / interruption
app backgrounding
screen lock
network transition Wi-Fi <-> cellular
session reconnection
user stops session
AI/server disconnects session
```

## Security

Do not ship a privileged ElevenLabs secret if the current frontend key is private.

Prefer server-generated signed/session URLs where supported by the existing integration.

## Exit Criteria

Real-device iOS + Android voice test, not simulator-only.

---

# 12. Phase 7 — BLE / BLUFI Migration

## Goal

Preserve the proven BLUFI protocol behavior while replacing Web Bluetooth transport with native BLE.

This is a high-risk migration.

Do not start with UI.

First split the existing `realDeviceService.ts` into conceptual layers.

```text
BLUFI Protocol Core
├── frame definitions
├── encoder
├── decoder
├── sequence management
├── ACK matching
├── fragmentation/reassembly
├── Wi-Fi scan parser
└── state machine

BLE Transport
├── scan
├── connect
├── discover service
├── discover FF01
├── discover FF02
├── subscribe FF02
├── write FF01
└── disconnect

Device Provisioning Coordinator
└── orchestrates protocol + transport
```

## Critical invariant

The existing "listener-first" model MUST remain.

Correct mobile sequence:

```text
connect
→ discover GATT
→ subscribe FF02
→ establish persistent notification dispatcher
→ register operation handler
→ create ACK wait state
→ write FF01
→ receive FF02 notification
→ route frame
→ resolve ACK/data state
```

NEVER write a BLUFI command before notification subscription is active.

## Notification architecture

Preserve semantic equivalent of:

```text
one persistent FF02 subscription per connected device session
one central dispatcher
dynamic logical handlers
explicit cleanup
```

Do not register many native BLE listeners for each command.

## Native BLE library decision

Before choosing a library, Codex must compare candidates based on:

```text
Expo development-build compatibility
iOS CoreBluetooth support
Android BLE support
notification reliability
MTU handling
binary writes
reconnection
maintenance status
New Architecture compatibility
licensing
```

Document decision in:

```text
docs/mobile-migration/bluetooth-library-decision.md
```

## Test vectors

Before swapping transport, create BLUFI protocol tests from captured/known frames:

```text
ACK 0x49
Wi-Fi data 0x09
sequence match
sequence mismatch
fragmented scan payload
malformed frame
timeout
disconnect mid-operation
```

## Exit Criteria

Test on at least:

```text
one real iPhone
one real Android device
one actual ESP-based Univoice/Ucup device
```

Simulators are insufficient.

---

# 13. Phase 8 — Device Cloud / MQTT Migration

## Goal

Decide whether mobile should maintain direct Tencent MQTT connectivity or use Univoice backend as the cloud boundary.

Do not automatically port browser MQTT architecture.

Codex must produce an ADR comparing:

```text
A. Mobile -> Tencent IoT MQTT directly
B. Mobile -> Univoice backend -> Tencent IoT
C. Hybrid
```

Evaluate:

```text
credential exposure
battery
background restrictions
reconnect complexity
push notifications
China network behavior
multi-device consistency
auditing
server-side authorization
cost
latency
```

Default architectural preference:

```text
App -> Univoice Backend -> IoT Cloud
```

for privileged cloud operations, while:

```text
App -> BLE -> Device
```

remains direct for local onboarding/control.

Do not implement this preference blindly if current backend cannot support required semantics; document gap first.

## Device state model

Unify:

```text
device registry state
BLE connection state
cloud online state
provisioning state
selected device
last seen
capabilities
```

Do not make "online" a single ambiguous boolean.

---

# 14. Phase 9 — Pixel / GIF / Gallery Migration

## Goal

Reuse creation-domain logic but replace browser rendering/file APIs selectively.

Classify each function:

```text
pure pixel matrix transform        -> shared
palette operations                 -> shared
project API                        -> shared/API client
Canvas DOM rendering               -> mobile rewrite
FileReader                         -> adapter/rewrite
Blob/object URLs                   -> adapter/rewrite
GIF encoding                       -> benchmark / possibly native
```

Do not prematurely port expensive GIF processing to JS mobile runtime without profiling.

Measure:

```text
CPU time
peak memory
large project behavior
battery impact
UI responsiveness
```

Preserve backend project formats unless incompatible.

---

# 15. Phase 10 — Solana / Subscription Migration

## Goal

Preserve subscription semantics while replacing browser wallet integration.

Separate:

```text
subscription domain
transaction construction
wallet transport
wallet app launching
transaction signing
backend/payment recording
```

Security rules:

```text
do not store seed phrases
do not request raw private keys
validate returned transaction/account
verify chain/network
handle user cancellation
handle wallet unavailable
```

Do not assume Phantom browser APIs exist in React Native.

Keep payment receipt handling idempotent.

---

# 16. Phase 11 — Push Notifications and AI Presence

## Goal

Add a mobile-native channel for Univoice presence.

This is a new mobile capability, not a literal Web migration.

Target logical flow:

```text
Relationship Core / AI Runtime
        │
        ▼
Care / Presence Decision
        │
        ▼
Notification Service
        │
        ├── APNs
        └── FCM
              │
              ▼
        Univoice Mobile
```

Backend data model should minimally distinguish:

```text
user
installation/device
platform
push token
locale
timezone
notification permission
last token update
app version
```

Do not put AI decision logic in the phone notification handler.

Mobile should receive an already authorized presence event and render/navigate appropriately.

Deep links should map events to native screens.

---

# 17. Phase 12 — App Lifecycle / Offline Resilience

## Goal

Replace Web assumptions about always-running tabs.

Codex must audit every:

```text
setInterval
setTimeout
SSE
WebSocket
MQTT connection
voice connection
BLE connection
polling loop
```

Define behavior for:

```text
active
inactive
background
terminated
offline
reconnected
```

Do not promise background execution where iOS/Android do not allow it.

Prefer server push for asynchronous presence instead of keeping long-lived background sockets solely for reachability.

---

# 18. Phase 13 — Observability

Introduce structured logging boundaries.

Never log:

```text
password
wallet secret
private key
raw auth token
Internet Identity delegation secret
full third-party API secret
Wi-Fi password
sensitive voice payload
```

Recommended event families:

```text
auth.*
chat.*
voice.*
ble.*
device.provision.*
iot.*
payment.*
push.*
app.lifecycle.*
```

Every error should carry:

```text
stable error code
feature
operation
platform
recoverability
safe context
```

Avoid relying on arbitrary `console.log` in production.

---

# 19. Phase 14 — Testing Strategy

## Shared packages

Unit tests for:

```text
BLUFI codec
BLUFI sequence/ACK logic
chat routing
message transforms
AI protocol serialization
auth state transformations
pixel transforms
config validation
```

## Mobile integration tests

Cover:

```text
bootstrap
login callback
chat send/receive
reconnect
voice permissions
device onboarding
deep links
secure storage
payment callback
```

## Physical-device matrix

At minimum:

```text
current iOS phone
older supported iOS phone
current Android phone
representative China-market Android
actual BLE hardware
Bluetooth headset
```

Exact OS support range must be decided by product requirements.

## Regression

The Web application must keep:

```text
build
lint
unit tests
critical smoke tests
```

throughout migration.

---

# 20. Phase 15 — Release Engineering

Create explicit environments:

```text
development
staging
production
```

Do not point development builds at production by accident.

Add:

```text
app identifier strategy
Android applicationId
iOS bundleIdentifier
versioning
build numbering
signing
EAS profiles or equivalent CI
staging API config
production API config
```

Release gates:

```text
no unresolved secret exposure
privacy strings present
deep links verified
push verified
auth verified
BLE verified
voice verified
crash-free smoke test
backend compatibility verified
```

Keep ICP Web deployment independent from mobile release.

---

# 21. Feature Migration Priority

Recommended order:

```text
P0
├── project bootstrap
├── shared core
├── config/security
├── authentication
├── profile
└── basic chat

P1
├── realtime DM
├── AI WebChat/MCP
├── voice
├── BLE/BLUFI onboarding
└── device list/control

P2
├── Tencent IoT cloud integration
├── push notifications
├── Relationship/Presence deep links
├── creation/gallery
└── Solana subscription

P3
├── advanced offline behavior
├── background optimizations
├── widgets / live surfaces
└── additional native presence capabilities
```

Do not allow a lower-priority visual feature to block identity/chat/device architecture.

---

# 22. Migration Status File

Codex MUST maintain:

```text
docs/mobile-migration/migration-status.md
```

Format:

```md
# Mobile Migration Status

## Current Phase
Phase X

## Completed
- ...

## In Progress
- ...

## Blocked
- ...

## Architecture Decisions
- ADR-...

## Known Regressions
- ...

## Next Safe Task
- ...

## Verification
- web build:
- shared tests:
- android build:
- ios build:
```

Update this file after every meaningful migration task.

---

# 23. Architecture Decision Records

Create:

```text
docs/mobile-migration/adr/
```

Use one ADR whenever choosing between materially different architectures.

Mandatory ADRs:

```text
001-mobile-framework.md
002-monorepo-shared-packages.md
003-mobile-auth-and-ii.md
004-native-ble-library.md
005-mobile-realtime-chat.md
006-iot-cloud-boundary.md
007-voice-transport.md
008-mobile-wallet-integration.md
009-secret-management.md
```

ADR format:

```md
# ADR-NNN: Title

## Status
Proposed / Accepted / Superseded

## Context

## Options

## Decision

## Consequences

## Migration Impact

## Verification
```

---

# 24. Codex Operating Rules

This section is intended to be copied or referenced from repository `AGENTS.md`.

```md
## Univoice Mobile Migration Rules

Before changing code related to mobile migration:

1. Read `docs/mobile-migration/migration-status.md`.
2. Read the relevant ADRs.
3. Inspect the current implementation; do not infer behavior from filenames.
4. Search for all call sites before moving or changing a public API.
5. Prefer extraction + adapter over rewrite.
6. Keep the Web application working.
7. Never expose server credentials in mobile public configuration.
8. Never replace the BLUFI listener-first notification architecture with write-first behavior.
9. Never alter backend protocol semantics without explicitly documenting the change.
10. Add or update tests for extracted protocol/domain behavior.
11. After implementation, run the narrowest relevant tests first, then broader build/lint checks.
12. Update `docs/mobile-migration/migration-status.md`.
13. Report:
   - files changed,
   - behavior changed,
   - tests run,
   - unresolved risks,
   - recommended next task.

For a task that affects multiple subsystems, first write or update an execution plan before editing.
```

---

# 25. MASTER CODEX PROMPT

Use this prompt at the start of the migration project.

```text
You are the lead migration engineer for Univoice.

Your mission is to evolve the existing
`src/alaya-chat-nexus-frontend`
Vite/React/TypeScript PWA into a production-grade iOS and Android
React Native + Expo application without breaking the existing Web product.

This is an incremental migration, NOT a rewrite.

Read, in order:
1. repository AGENTS.md
2. alaya-chat-nexus-frontend README.md
3. UNIVOICE_MOBILE_CODEX_GUIDE.md
4. src/univoice-chat integration documentation
5. relevant source files
6. docs/mobile-migration/migration-status.md if it exists
7. relevant ADRs if they exist

Core constraints:

- Existing backend contracts are the source of truth.
- Keep the Web application functional during all phases.
- Move platform-neutral TypeScript logic into shared packages.
- Put browser and native behavior behind explicit adapters.
- Do not emulate browser APIs globally inside React Native merely to compile legacy code.
- Do not expose secrets in the mobile bundle.
- Internet Identity mobile auth requires an explicit native/browser bridge design.
- Preserve the BLUFI listener-first architecture:
  notification subscription must exist before any command that expects a response is written.
- Preserve current chat behavior:
  AIO WebChat,
  Univoice DM REST/SSE,
  ICP legacy fallback.
- Treat BLE, voice, authentication, wallets, push, app lifecycle, and secure storage as native capability migrations.
- Add tests before or while extracting protocol/state-machine behavior.
- Never make a broad backend redesign as an incidental side effect of frontend migration.

First task:
DO NOT implement the mobile app yet.

Perform repository reconnaissance and create:

- docs/mobile-migration/capability-matrix.md
- docs/mobile-migration/dependency-audit.md
- docs/mobile-migration/current-dataflows.md
- docs/mobile-migration/security-config-audit.md
- docs/mobile-migration/migration-status.md

Inventory every browser-specific dependency and every environment variable.

For each major module classify it:
A = directly shareable
B = shareable behind adapter
C = native rewrite
D = web-only

Then propose the smallest safe Phase 1 extraction.

Do not modify runtime behavior during reconnaissance.

At the end, report:
1. verified architecture
2. migration risks
3. security risks
4. recommended package boundaries
5. proposed first extraction PR
6. commands/tests that should be run
7. unanswered questions supported by concrete code references
```

---

# 26. PHASE 1 CODEX PROMPT — Shared Core

```text
Continue the Univoice mobile migration.

Read:
- AGENTS.md
- UNIVOICE_MOBILE_CODEX_GUIDE.md
- docs/mobile-migration/migration-status.md
- capability-matrix.md
- dependency-audit.md

Goal:
extract the first platform-neutral shared packages WITHOUT changing Web behavior.

Requirements:

1. Identify leaf modules with no or minimal DOM/browser dependency.
2. Create the minimal shared package structure needed for those modules.
3. Move or extract types/protocol/domain logic.
4. Update Web imports.
5. Do not migrate UI.
6. Do not change backend contracts.
7. Do not add broad compatibility/polyfill hacks.
8. Add unit tests for extracted non-trivial logic.
9. Verify the Web application still builds.
10. Update migration-status.md.

Pay special attention to:
- AIOProtocolTypes
- chat transformation/routing logic
- device domain types
- BLUFI codec/state-machine candidates
- config contracts

Before changing a public function:
search all call sites.

At completion report:
- extracted modules
- remaining browser dependencies
- tests/build results
- behavior changes, if any
- next safest extraction
```

---

# 27. PHASE 2 CODEX PROMPT — Mobile Bootstrap

```text
Create the first Univoice native mobile application.

Constraints:
- React Native + Expo + TypeScript
- use a development build architecture suitable for native modules
- keep existing Web app untouched except for shared-package integration
- no WebView as the primary app
- no BLE/voice/payment implementation yet

Implement:
- app bootstrap
- routing
- base design tokens
- QueryClient
- i18n
- auth provider interface
- device provider interface
- Home placeholder
- Chat placeholder
- Devices placeholder
- Profile placeholder
- development/staging/production config loader

The app must import at least one real shared domain package to prove monorepo integration.

Add build/run instructions.

Update migration-status.md and create/update ADRs as required.

Verify:
- TypeScript
- Android development build path
- iOS development build path
- Web build remains healthy
```

---

# 28. AUTH CODEX PROMPT

```text
Migrate Univoice authentication to mobile.

First inspect the real current implementation in:
- lib/auth.ts
- lib/ii.ts
- lib/identity.ts
- lib/principal.ts
- lib/icpChatCredentials.ts
- useGoogleAuth.ts
- userApi.ts
- wallet modules
- relevant backend auth endpoints

Do not code until you have written the current auth state/dataflow.

Goals:
- canonical cross-platform UnivoiceSession model
- platform-neutral auth-core
- secure mobile credential storage
- Google native-compatible login
- Internet Identity mobile delegation/browser bridge
- Principal preserved as backend identity
- clear distinction between login identity, Principal, DM credentials and wallets
- logout clears all appropriate identity state
- deep-link callback validation

Do not:
- copy localStorage/sessionStorage usage into mobile
- use arbitrary WebView OAuth
- expose private credentials in deep links/logs
- redesign backend user identity without evidence

Add tests for auth state transitions and callback parsing.

Create/update:
- ADR mobile auth
- auth migration documentation
- migration-status.md
```

---

# 29. CHAT CODEX PROMPT

```text
Migrate Univoice chat to mobile with behavioral parity.

Current modes to preserve:
1. AIO WebChat
2. Univoice DM REST + SSE
3. ICP legacy social chat fallback

First create a ChatTransport abstraction and a ChatCoordinator.

Do not merge the three transports into one backend during this task.

Requirements:
- shared message/domain models
- mobile conversation list/message UI
- optimistic/outbox send states
- reconnect behavior
- read state
- duplicate-event protection
- foreground/background handling
- network error recovery
- authentication headers/principal behavior preserved

Verify SSE support using the actual selected React Native implementation.
Do not assume the browser polyfill works.

Add integration tests around transport selection.

Update migration-status.md.
```

---

# 30. BLE / BLUFI CODEX PROMPT

```text
Migrate Univoice BLUFI device provisioning from Web Bluetooth to native BLE.

This is safety-critical for device provisioning behavior.

Read the complete existing:
- realDeviceService.ts
- deviceInitManager.ts
- useDeviceManagement.ts
- AddDevice.tsx
- device API code

Do not begin by rewriting AddDevice UI.

First extract/test protocol behavior.

Mandatory invariant:
FF02 notification subscription must be active BEFORE writing any BLUFI command that can produce an ACK/data response.

Preserve:
- persistent FF02 subscription per device session
- one central notification dispatcher
- 0x49 ACK routing
- Wi-Fi scan/data routing
- sequence correlation
- fragmentation/reassembly
- explicit cleanup/reconnect behavior

Architecture:
BLUFI Protocol Core
+ Native BLE Transport
+ Provisioning Coordinator
+ Mobile UI

Before selecting BLE library:
create ADR comparing realistic maintained libraries for this Expo/React Native architecture.

Use development builds/custom native module support if needed.
Do not constrain architecture to Expo Go.

Create protocol test vectors before transport replacement.

Test with real hardware on iOS and Android.

Update migration-status.md with exact unverified hardware items.
```

---

# 31. VOICE CODEX PROMPT

```text
Migrate Univoice ElevenLabs voice interaction to mobile.

Inspect current:
- ElevenLabsVoiceChat.tsx
- elevenlabhook-stable.ts
- ElevenLabsGlobalState
- related voice services/utilities

Extract the behavioral state machine before changing implementation.

Do not reproduce a browser singleton/localStorage design blindly.

Implement:
- VoiceSessionController
- ElevenLabs transport adapter
- microphone adapter
- audio output/route adapter
- lifecycle handling
- permission handling
- native UI

Cover:
- permission denied
- connect/disconnect
- interruption
- Bluetooth headset
- background
- network switch
- reconnection
- user stop

Audit credential handling.
If a private ElevenLabs key currently exists in frontend config, design a server-side signed/session bootstrap rather than shipping it in the app.

Test on real iOS and Android devices.
```

---

# 32. IOT CODEX PROMPT

```text
Design the mobile Tencent IoT integration boundary before coding it.

Inspect current:
- tencentIoTService.ts
- deviceMessageService.ts
- deviceMessageServiceInit.ts
- alayaMcpService.ts
- STS logic
- backend device services

Create an ADR comparing:
A. app talks directly to Tencent MQTT
B. app talks to Univoice backend, backend talks to Tencent IoT
C. hybrid

Evaluate:
- credential exposure
- authorization
- battery
- background restrictions
- reconnect
- push
- latency
- China deployment/network constraints
- operational observability

Do not copy cloud secrets into mobile config.

Only implement after ADR acceptance.

Preserve local BLE direct communication separately from cloud routing.
```

---

# 33. RELEASE READINESS CODEX PROMPT

```text
Perform Univoice mobile release-readiness review.

Do not add features.

Audit:
- iOS bundle configuration
- Android application configuration
- version/build numbers
- signing configuration
- environment separation
- deep/universal/app links
- auth callbacks
- microphone permissions
- Bluetooth permissions
- notification permissions
- privacy descriptions
- secure storage
- secrets
- crash/error handling
- push token registration
- account logout/deletion flow hooks
- production endpoints
- wallet callbacks
- network security
- real-device BLE
- real-device voice
- app lifecycle
- Web regression

Run all available tests/build checks.

Produce:
docs/mobile-migration/release-readiness.md

Classify every finding:
BLOCKER / HIGH / MEDIUM / LOW

Do not mark release ready while any BLOCKER remains.
```

---

# 34. CODE REVIEW PROMPT

Use after each significant Codex implementation.

```text
Review the current migration diff as a senior Univoice mobile architect.

Do NOT start by rewriting code.

Look for:

1. architectural drift from UNIVOICE_MOBILE_CODEX_GUIDE.md
2. accidental Web regressions
3. browser APIs leaking into shared packages/mobile
4. secrets exposed to mobile
5. backend contract changes
6. auth/Principal regressions
7. chat transport behavior changes
8. BLE listener-after-write race conditions
9. multiple competing FF02 notification listeners
10. lifecycle/background assumptions
11. improper secure storage
12. missing cleanup
13. duplicate SSE/event handling
14. stale closure/react lifecycle issues
15. missing timeout/retry bounds
16. error swallowing
17. untested extracted protocol logic
18. over-broad refactors unrelated to the phase
19. dependency/library maintenance risks
20. missing migration-status/ADR updates

Return findings ordered by severity.

For each finding include:
- severity
- file/symbol
- why it matters
- concrete failure scenario
- smallest safe fix
- test that would catch it

If no blocking issue exists, state that explicitly, then list residual risks.
```

---

# 35. Definition of Done for the Overall Migration

The migration is complete only when all are true:

```text
Web
[ ] existing Web app remains deployable to ICP
[ ] major Web regression tests pass

Mobile
[ ] production iOS build
[ ] production Android build
[ ] no WebView dependency for primary UX

Identity
[ ] Principal-preserving auth works
[ ] secure credential storage
[ ] login/logout/restart/deep-link tested

Chat
[ ] AIO WebChat works
[ ] Univoice DM REST/SSE works
[ ] legacy fallback decision completed
[ ] reconnect/outbox behavior verified

Voice
[ ] real-time voice works on iOS
[ ] real-time voice works on Android
[ ] interruption/audio route handled

Devices
[ ] BLE scan/connect
[ ] persistent notification subscription
[ ] BLUFI Wi-Fi scan
[ ] Wi-Fi credential provisioning
[ ] ACK sequence handling
[ ] backend device registration
[ ] reconnect/error recovery

IoT
[ ] cloud credential boundary is secure
[ ] online/device messaging works
[ ] background strategy is explicit

Creation
[ ] pixel/GIF core behavior supported or explicitly scoped
[ ] gallery works

Payments
[ ] mobile wallet flow
[ ] subscription flow
[ ] idempotent payment recording

Presence
[ ] push token lifecycle
[ ] notification/deep link flow
[ ] backend presence event integration

Security
[ ] no privileged frontend/mobile secrets
[ ] logs sanitized
[ ] environment separation verified

Release
[ ] TestFlight validation
[ ] Google Play internal testing validation
[ ] production config signed off
```

---

# 36. Final Architectural Intent

The migration should not end with:

```text
PWA
↓
native wrapper
```

It should end with:

```text
                       Univoice Mobile
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
     Chat                  Voice                Devices
       │                     │                     │
       └────────────── Shared Domain ──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
          Chat APIs      AI Runtime      ICP / Identity
              │              │              │
              └────── Relationship Core ────┘
                             │
                    Presence / Context
                             │
                ┌────────────┴────────────┐
                │                         │
             Mobile                    Physical
           Push/Lifecycle             Orb / Ucup
                                          │
                                     BLE / IoT
```

The mobile application is not merely a new UI.

It becomes the user's persistent Univoice presence endpoint and the local bridge between:

```text
User
AI
Relationship Core
Mobile context
Voice
Physical devices
```

That architectural goal should guide migration decisions whenever simple code reuse conflicts with product correctness.
