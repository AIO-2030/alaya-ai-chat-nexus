# AGENTS.md

# Univoice Repository Instructions for Coding Agents

This file defines repository-level operating rules for Codex and other coding agents working on Univoice.

These instructions apply to the entire repository unless a deeper `AGENTS.md` provides more specific rules for a subdirectory.

---

## 1. Project Context

Univoice is an AI social, relationship-intelligence, voice, and IoT platform.

The current repository includes a Web/PWA frontend originally deployed to the Internet Computer (ICP), backend canisters, Univoice chat services, AI runtime integrations, voice capabilities, IoT device provisioning/control, wallet/payment integrations, and content creation features.

The current major frontend is:

```text
src/alaya-chat-nexus-frontend/
```

It is currently a:

```text
Vite
React 18
TypeScript
React Router
TanStack React Query
Tailwind / shadcn / Radix
i18next
ICP-enabled
PWA
```

application.

Its important capabilities include:

```text
Authentication
├── Google OAuth
├── Email/password
├── Internet Identity
├── ICP Principal
├── Plug
└── Solana / Phantom

Chat
├── AIO WebChat
├── Univoice DM REST
├── Univoice DM SSE
└── ICP legacy social chat

AI
├── AIOProtocolExecutor
├── MCP JSON-RPC
├── AI suggestions
└── Memory Relationship Core

Voice
└── ElevenLabs realtime voice

Device
├── BLE
├── BLUFI
├── Wi-Fi provisioning
├── ICP device registry
├── Tencent IoT MQTT
└── device message delivery

Creation
├── pixel art
├── GIF
├── gallery
└── IoT content delivery

Payments
└── Solana subscription / USDT
```

The current frontend is deployed as an ICP Asset Canister.

---

# 2. Primary Migration Objective

The repository is undergoing an incremental migration from the existing ICP-hosted Web/PWA application to a production-grade iOS and Android application.

Target mobile stack:

```text
React Native
Expo
TypeScript
Expo Router
TanStack Query
i18next
native secure storage
native BLE
native audio
native deep links
native push notifications
```

The target architecture is NOT:

```text
Existing Web App
      ↓
    WebView
```

The intended architecture is:

```text
                  Univoice Mobile
                        │
        ┌───────────────┼────────────────┐
        │               │                │
      Chat            Voice           Devices
        │               │                │
        └──────── Shared Domain ─────────┘
                        │
         ┌──────────────┼───────────────┐
         │              │               │
      Chat API       AI Runtime      ICP / Identity
         │              │               │
         └──── Relationship Core ────────┘
                        │
                 AI Presence / Context
                        │
                ┌───────┴────────┐
                │                │
             Mobile           Orb / Ucup
                │                │
             Push            BLE / IoT
```

The existing Web application MUST remain operational throughout migration.

---

# 3. Required Reading Before Mobile Migration Work

Before performing any task related to mobile migration, read:

```text
AGENTS.md
UNIVOICE_MOBILE_CODEX_GUIDE.md
docs/mobile-migration/migration-status.md
```

If they exist, also read relevant ADRs under:

```text
docs/mobile-migration/adr/
```

Then inspect the actual implementation related to the requested feature.

Do not infer implementation from documentation alone.

Documentation explains intent.
Source code defines current behavior.

---

# 4. Core Engineering Rules

## 4.1 Never perform a big-bang rewrite

Do not replace the existing Web application in one operation.

Preferred migration pattern:

```text
inspect
→ isolate behavior
→ extract shared logic
→ add adapter
→ create mobile implementation
→ test
→ switch consumer
→ remove old code only when proven safe
```

The repository should remain buildable after every meaningful change.

---

## 4.2 Keep Web behavior working

Unless the task explicitly changes Web behavior:

```text
src/alaya-chat-nexus-frontend/
```

must continue to compile and operate.

Do not break Web merely to simplify mobile architecture.

Any migration PR/task must report whether Web behavior changed.

---

## 4.3 Preserve backend contracts

Do not casually change:

```text
aio-base-backend Candid APIs
univoice-chat REST endpoints
univoice-chat SSE behavior
Memory Relationship Core contracts
AIO MCP JSON-RPC
AIO WebChat protocols
Tencent IoT MQTT topics
BLUFI protocol semantics
Solana payment semantics
```

Prefer frontend/client adapters over backend redesign.

If a backend change is genuinely required:

1. document why;
2. identify all consumers;
3. preserve backward compatibility where practical;
4. add migration notes;
5. update relevant ADR.

---

# 5. Shared Code Rules

Shared packages must be platform-neutral.

Target shared package areas include:

```text
packages/domain
packages/api-client
packages/chat-core
packages/ai-core
packages/icp-client
packages/auth-core
packages/device-core
packages/creation-core
packages/config
```

Shared code MUST NOT depend directly on:

```text
window
document
navigator
localStorage
sessionStorage
ServiceWorker
BluetoothDevice
BluetoothRemoteGATT*
React DOM
browser-only File APIs
Expo runtime APIs
Android APIs
iOS APIs
```

If logic needs one of those capabilities, create an interface.

Example:

```ts
export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
```

Then implement:

```text
WebStorageAdapter
MobileStorageAdapter
```

Use this same pattern for:

```text
authentication
secure credentials
Bluetooth
audio
push
app lifecycle
deep links
wallets
network status
file handling
```

Do not add global browser polyfills just to make legacy code compile in React Native.

---

# 6. Existing Frontend Architecture

Important current locations:

```text
src/alaya-chat-nexus-frontend/src/main.tsx
src/alaya-chat-nexus-frontend/src/App.tsx

src/alaya-chat-nexus-frontend/src/pages/
src/alaya-chat-nexus-frontend/src/components/
src/alaya-chat-nexus-frontend/src/hooks/
src/alaya-chat-nexus-frontend/src/services/
src/alaya-chat-nexus-frontend/src/services/api/
src/alaya-chat-nexus-frontend/src/lib/
src/alaya-chat-nexus-frontend/src/runtime/
src/alaya-chat-nexus-frontend/src/contexts/
src/alaya-chat-nexus-frontend/src/types/
```

Important backend/service locations may include:

```text
src/aio-base-backend/
src/univoice-chat/
```

Before modifying any public function or service:

```text
search all call sites first
```

Do not rename/move public APIs without understanding all consumers.

---

# 7. Current Chat Routing Is Intentional

The current `/chat` flow has three distinct routes.

```text
contactPrincipalId === 'aio_webchat_ai'
    → AIO WebChat

hasUnivoiceChatAuth()
    → Univoice DM REST + SSE

otherwise
    → ICP legacy social chat
```

Do not simplify this routing during migration unless explicitly requested.

Target abstraction:

```ts
type ChatTransportKind =
  | 'aio-webchat'
  | 'univoice-dm'
  | 'icp-legacy';
```

Preferred architecture:

```text
Chat UI
  ↓
ChatCoordinator
  ↓
ChatTransport
  ├── AioWebChatTransport
  ├── UnivoiceDmTransport
  └── IcpLegacyChatTransport
```

Behavior parity comes before transport consolidation.

---

# 8. SSE Rules

Existing Univoice DM relies on SSE.

When migrating to React Native:

Do not assume browser `event-source-polyfill` behavior automatically works.

Verify:

```text
custom headers
authentication
X-ICP-Principal-Id
reconnection
duplicate events
network transition
foreground/background transitions
disconnect cleanup
```

Do not silently replace SSE with frequent polling without documenting the change.

---

# 9. ICP / Principal / Internet Identity Rules

ICP Principal is an important backend identity.

Do not replace it with Google ID, email address, wallet address, or a random mobile UUID.

Existing concepts must remain distinct:

```text
login identity
Univoice user
ICP Principal
Univoice chat credentials
wallet identity
```

Mobile authentication must use an explicit mobile-compatible flow.

Do not assume browser popup/postMessage-based Internet Identity flows can be reused unchanged.

Preferred conceptual flow:

```text
Mobile App
   ↓
ephemeral auth/session request
   ↓
system browser
   ↓
Univoice auth bridge
   ↓
Internet Identity
   ↓
delegation result
   ↓
Universal Link / App Link
   ↓
Mobile App
```

Security requirements:

```text
state / nonce correlation
one-time callback
strict callback validation
short-lived credentials
no secret material in logs
```

---

# 10. Storage Rules

Existing Web code may use:

```text
localStorage
sessionStorage
```

Do not directly map both to one mobile plaintext storage system.

Separate:

```text
SecureCredentialStorage
SessionStorage
CacheStorage
UserPreferenceStorage
```

Credentials and tokens should use secure native storage.

Do not store:

```text
wallet private keys
seed phrases
Wi-Fi passwords
private auth tokens
delegation secrets
server secrets
```

in ordinary persisted storage.

---

# 11. Secrets and Environment Configuration

Existing Vite variables must be classified before mobile migration.

Search all:

```text
VITE_*
```

Especially audit:

```text
VITE_ELEVENLABS_*
VITE_TENCENT_STS_*
VITE_TENCENT_IOT_*
VITE_HELIUS_*
VITE_ALCHEMY_*
VITE_PHANTOM_*
VITE_GOOGLE_*
VITE_UNIVOICE_CHAT_*
VITE_MEMORY_RELATIONSHIP_CORE_*
```

Do NOT rename private Web credentials to:

```text
EXPO_PUBLIC_*
```

and ship them in the mobile application.

Classify each configuration item as:

```text
public app config
runtime user credential
device credential
server-only secret
```

Privileged operations should move behind trusted backend APIs when necessary.

---

# 12. BLE / BLUFI — Critical Invariant

The current BLUFI implementation solved an important BLE race condition.

This behavior MUST NOT regress.

Current required semantic model:

```text
FF02
persistent notification subscription
        ↓
one unified dispatcher
        ↓
frame routing
        ├── ACK
        └── data
```

The most important rule:

# SUBSCRIBE BEFORE WRITE

Correct sequence:

```text
connect BLE
→ discover services
→ discover FF01 / FF02
→ subscribe to FF02
→ install persistent dispatcher
→ register logical handler
→ prepare ACK wait state
→ write command to FF01
→ receive notification on FF02
→ dispatch
→ resolve operation
```

Never do:

```text
write
→ then subscribe
```

for commands that can generate immediate responses.

The native implementation must preserve:

```text
one persistent FF02 subscription per device session
one central dispatcher
dynamic logical handlers
0x49 ACK routing
0x09/data routing
sequence correlation
fragment handling
cleanup on disconnect
re-establishment after reconnect
```

Do not create a new native event listener per command.

---

# 13. BLUFI Architecture Target

Separate protocol from transport.

```text
BLUFI Protocol Core
├── frame encoder
├── frame decoder
├── sequence handling
├── ACK matching
├── fragmentation
├── Wi-Fi scan parser
└── protocol state

Native BLE Transport
├── scan
├── connect
├── service discovery
├── characteristic discovery
├── notification subscription
├── binary write
└── disconnect

Provisioning Coordinator
└── protocol orchestration

Mobile UI
└── user workflow
```

Web Bluetooth types must not enter the shared protocol core.

---

# 14. BLE Library Selection

Do not select a BLE library casually.

Before adopting one, evaluate:

```text
Expo development-build support
iOS CoreBluetooth
Android BLE
notification reliability
binary writes
MTU behavior
reconnection
maintenance status
React Native New Architecture support
license
```

Document the decision in an ADR.

Expo Go must NOT constrain architecture.

Native development builds/custom native modules are allowed and expected.

---

# 15. Device Provisioning Flow

Current onboarding semantics:

```text
1. scan nearby BLE device
2. select/connect
3. device scans Wi-Fi
4. device returns Wi-Fi networks via BLUFI
5. user selects Wi-Fi
6. credentials sent through BLE
7. device connects
8. device record submitted to backend canister
9. cloud/device state initialized
```

Preserve behavior first.

UI redesign is secondary.

---

# 16. Tencent IoT Rules

Current Web application talks to Tencent IoT MQTT / STS.

Do not automatically port this architecture directly into mobile.

Before implementation, evaluate:

```text
App -> Tencent MQTT
App -> Univoice Backend -> Tencent IoT
Hybrid
```

Consider:

```text
credential exposure
authorization
battery
background limitations
push notifications
reconnect complexity
latency
China network environment
observability
multi-device consistency
```

Preferred long-term direction for privileged cloud operations is generally:

```text
Mobile App
    ↓
Univoice Backend
    ↓
Tencent IoT
```

while local provisioning/control may remain:

```text
Mobile App
    ↓ BLE
Device
```

Do not implement this preference if repository/backend evidence contradicts it; document the gap.

---

# 17. Voice / ElevenLabs Rules

Current browser implementation includes:

```text
ElevenLabsVoiceChat
useElevenLabsStable
ElevenLabsGlobalState
```

Do not port the browser singleton/localStorage implementation literally.

Target state model:

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

Separate:

```text
Voice UI
VoiceSessionController
ElevenLabs transport
Audio input
Audio output
Permission adapter
App lifecycle adapter
```

Test:

```text
microphone denied
Bluetooth headset
audio route change
network transition
incoming interruption
background
screen lock
reconnect
user stop
server disconnect
```

Real-device testing is required.

---

# 18. ElevenLabs Secret Rule

If the existing frontend exposes a private ElevenLabs API key:

do not ship that key in the mobile bundle.

Prefer a trusted backend operation for:

```text
signed URL
session bootstrap
short-lived token
```

depending on the actual API currently used.

---

# 19. App Lifecycle Rules

Mobile apps do not behave like browser tabs.

Audit all:

```text
setInterval
setTimeout
SSE
WebSocket
MQTT
voice connection
BLE connection
polling
```

Every long-running activity must define behavior for:

```text
foreground
inactive
background
terminated
offline
reconnected
```

Do not rely on unlimited background execution.

Use push notifications for asynchronous reachability where appropriate.

---

# 20. Push / AI Presence

Push notifications are a native Univoice presence channel.

Preferred flow:

```text
Relationship Core / AI Runtime
        ↓
Presence / Care Decision
        ↓
Notification Service
        ↓
APNs / FCM
        ↓
Mobile App
```

The mobile notification handler should not independently make AI care decisions.

It should receive an already-authorized notification/presence event.

Deep links should route events into appropriate native screens.

---

# 21. Pixel / GIF / Gallery Rules

Classify creation code.

Likely shareable:

```text
pixel matrix transforms
palette transforms
project DTOs
project API
metadata validation
```

Likely native-specific:

```text
DOM Canvas
FileReader
browser Blob/ObjectURL assumptions
browser upload UI
```

GIF encoding must be profiled before deciding whether to keep it in mobile JS.

Measure:

```text
CPU
memory
UI blocking
large content behavior
battery impact
```

---

# 22. Solana / Wallet Rules

Do not assume browser Phantom APIs exist on mobile.

Separate:

```text
subscription domain
transaction construction
wallet adapter
wallet app launch
signing
payment receipt
backend recording
```

Never:

```text
store seed phrase
request raw private key
log signed secrets
```

Handle:

```text
wallet unavailable
user cancellation
wrong network
wrong account
invalid callback
duplicate payment callback
```

Payment recording should be idempotent.

---

# 23. PWA Features

These are Web-only unless explicitly requested for mobile:

```text
PWAInstallPrompt
manifest installation behavior
Service Worker
Web CSP for ICP Asset Canister
browser environment diagnostics
ICP Asset Canister frontend deployment
```

Do not reproduce them in React Native.

---

# 24. React Native UI Migration

Do not mechanically translate:

```text
HTML
CSS
Tailwind
Radix
shadcn DOM components
```

into native components line by line.

First preserve design tokens:

```text
colors
typography
spacing
radius
surface hierarchy
icons
interaction semantics
```

Then rebuild native UI.

The objective is visual/behavioral continuity, not DOM continuity.

---

# 25. Recommended Mobile App Structure

Target:

```text
apps/mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── auth/
│   ├── chat/
│   ├── devices/
│   ├── gallery/
│   ├── creation/
│   ├── profile/
│   └── settings/
│
└── src/
    ├── components/
    ├── features/
    ├── adapters/
    │   ├── auth/
    │   ├── bluetooth/
    │   ├── storage/
    │   ├── audio/
    │   ├── notifications/
    │   ├── lifecycle/
    │   └── wallet/
    ├── providers/
    └── theme/
```

Avoid giant global `services/` directories in the new mobile app where feature-oriented organization is clearer.

---

# 26. Testing Rules

Every migration task should run the narrowest relevant checks first.

Examples:

```text
unit test for modified module
package TypeScript check
feature integration test
Web build
mobile TypeScript/build check
```

For shared protocol logic, tests are mandatory where practical.

High-priority tests:

```text
BLUFI frame parsing
BLUFI ACK correlation
BLUFI sequence mismatch
fragmentation
chat transport selection
message transforms
auth callback parsing
session state transitions
AI protocol serialization
config validation
```

Do not claim hardware functionality is verified based only on unit tests.

---

# 27. Real Hardware Verification

The following require physical devices:

```text
BLE scan/connect
BLUFI provisioning
Wi-Fi handoff
microphone behavior
Bluetooth headset
audio routing
push behavior
wallet callback behavior in real apps
background transitions
```

For BLE/BLUFI acceptance, use:

```text
real iPhone
real Android phone
real Univoice/Ucup ESP-based device
```

Simulators are insufficient.

---

# 28. Error Handling

Do not swallow errors.

Prefer stable domain error codes.

Example:

```ts
type UnivoiceError = {
  code: string;
  feature: string;
  operation: string;
  recoverable: boolean;
  message: string;
  cause?: unknown;
};
```

UI should receive meaningful recoverability information.

Do not surface private implementation details or secrets to users.

---

# 29. Logging Rules

Never log:

```text
passwords
Wi-Fi credentials
seed phrases
private keys
auth tokens
Internet Identity secret/delegation material
third-party API secrets
private Basic Auth credentials
raw sensitive voice payloads
```

Recommended event families:

```text
auth.*
chat.*
voice.*
ble.*
device.*
iot.*
payment.*
push.*
app.lifecycle.*
```

Production behavior should not depend on uncontrolled `console.log`.

---

# 30. Dependency Rules

Before adding a major dependency:

1. search whether the repository already has an equivalent;
2. determine why current tools are insufficient;
3. verify active maintenance;
4. check licensing;
5. check React Native / Expo / New Architecture compatibility if mobile-related;
6. avoid adding large frameworks for one small helper;
7. record significant architectural choices in ADR.

Do not upgrade unrelated dependencies during feature migration unless required.

---

# 31. Scope Discipline

Do not refactor unrelated areas because they "look old."

Migration work should prefer:

```text
small safe diff
explicit behavior
clear adapter boundary
tests
documented follow-up
```

over:

```text
large cleanup
mass rename
mass formatting
framework replacement
unrequested architecture redesign
```

Keep every task reviewable.

---

# 32. Documentation Requirements

Maintain:

```text
docs/mobile-migration/migration-status.md
```

After every meaningful migration task.

Required structure:

```md
# Mobile Migration Status

## Current Phase

## Completed

## In Progress

## Blocked

## Architecture Decisions

## Known Regressions

## Next Safe Task

## Verification
- web build:
- shared tests:
- android:
- ios:
```

Do not mark untested hardware behavior as completed.

---

# 33. ADR Requirements

Use:

```text
docs/mobile-migration/adr/
```

Mandatory decisions include:

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

Use:

```md
# ADR-NNN: Title

## Status

## Context

## Options

## Decision

## Consequences

## Migration Impact

## Verification
```

---

# 34. Agent Workflow

For any non-trivial task:

## Step 1 — Read context

Read:

```text
AGENTS.md
relevant feature documentation
migration guide
migration-status.md
relevant ADR
```

## Step 2 — Inspect source

Search:

```text
definition
call sites
tests
environment config
backend contract
related adapters
```

## Step 3 — State the execution plan

For multi-file or architectural work, create/update a plan before editing.

## Step 4 — Make the smallest coherent change

Avoid mixing unrelated work.

## Step 5 — Verify

Run relevant tests/builds.

## Step 6 — Review your own diff

Look for:

```text
behavior regression
secret exposure
browser/native boundary leaks
cleanup bugs
race conditions
missing tests
unnecessary changes
```

## Step 7 — Update migration documentation

Update `migration-status.md` and ADR if architecture changed.

## Step 8 — Report

Always report:

```text
files changed
behavior changed
tests run
tests not run
known risks
next recommended task
```

---

# 35. Mandatory Pre-Change Searches

When touching mobile migration code, search the repository for:

```text
window.
document.
navigator.
localStorage
sessionStorage
Bluetooth
mediaDevices
MediaRecorder
AudioContext
Notification
serviceWorker
EventSource
WebSocket
mqtt
@dfinity
@elevenlabs
phantom
walletconnect
plug
FileReader
Blob
createObjectURL
import.meta.env
VITE_
```

Use results to identify hidden platform dependencies.

---

# 36. Mobile Migration Phase Order

Default sequence:

```text
Phase 0
Repository reconnaissance

Phase 1
Shared core extraction

Phase 2
Mobile bootstrap

Phase 3
Config and secret architecture

Phase 4
Authentication

Phase 5
Chat

Phase 6
Voice

Phase 7
BLE / BLUFI

Phase 8
IoT cloud

Phase 9
Creation / Gallery

Phase 10
Wallet / Subscription

Phase 11
Push / AI Presence

Phase 12
Lifecycle / Offline

Phase 13
Observability

Phase 14
Testing

Phase 15
Release engineering
```

Do not skip directly to complex native features without prerequisite platform boundaries.

---

# 37. Phase 0 Rule

If:

```text
docs/mobile-migration/capability-matrix.md
docs/mobile-migration/dependency-audit.md
docs/mobile-migration/current-dataflows.md
docs/mobile-migration/security-config-audit.md
```

do not exist yet:

do not begin broad mobile migration implementation.

Create the reconnaissance artifacts first.

---

# 38. Do Not Trust Documentation Blindly

The repository README contains historical and current implementation notes.

Some sections may describe:

```text
planned features
future enhancements
previous implementation state
mock behavior
browser-specific behavior
```

Before acting on any documented behavior:

inspect current source.

If documentation and code differ:

```text
do not silently choose one
```

Report the discrepancy.

Use current code as behavioral evidence unless product intent explicitly overrides it.

---

# 39. Known High-Risk Areas

Treat these as high-risk:

```text
Internet Identity mobile delegation
auth credential storage
SSE reconnect behavior
ElevenLabs realtime audio
BLE notification timing
BLUFI ACK sequence
Wi-Fi credentials
Tencent IoT secrets
background socket assumptions
Solana wallet callbacks
payment idempotency
ICP Principal mapping
```

Prefer explicit tests and isolated changes.

---

# 40. Code Review Checklist

Before finishing a migration task, check:

```text
[ ] Web still works
[ ] no new server secret shipped to client
[ ] no browser API leaked into shared package
[ ] no backend contract changed accidentally
[ ] auth identities remain distinct
[ ] Principal handling preserved
[ ] SSE cleanup/reconnect handled
[ ] BLUFI subscribe-before-write preserved
[ ] only one persistent FF02 stream per session
[ ] BLE cleanup handled
[ ] voice cleanup handled
[ ] app lifecycle considered
[ ] storage security appropriate
[ ] errors are not swallowed
[ ] tests cover extracted behavior
[ ] migration-status updated
[ ] ADR updated if architecture changed
```

---

# 41. Completion Criteria

Do not claim the mobile migration is complete until:

```text
Web
[ ] Web app still deploys to ICP

Mobile
[ ] iOS production build
[ ] Android production build
[ ] primary UX does not depend on WebView

Identity
[ ] login works
[ ] Principal preserved
[ ] restart works
[ ] logout works
[ ] secure storage works
[ ] callback validation works

Chat
[ ] AIO WebChat
[ ] Univoice DM REST
[ ] Univoice DM realtime behavior
[ ] fallback behavior decided/tested

Voice
[ ] iOS real device
[ ] Android real device
[ ] interruption handling
[ ] audio routing

BLE
[ ] scan
[ ] connect
[ ] FF02 persistent notification
[ ] Wi-Fi scan
[ ] provisioning
[ ] ACK matching
[ ] backend device registration
[ ] reconnect/error recovery

IoT
[ ] secure credential architecture
[ ] device state
[ ] message delivery

Creation
[ ] supported mobile creation flows
[ ] gallery

Payment
[ ] wallet connection
[ ] signing
[ ] subscription
[ ] idempotent backend record

Presence
[ ] push token lifecycle
[ ] notification delivery
[ ] deep-link navigation

Security
[ ] secret audit complete
[ ] logs sanitized

Release
[ ] TestFlight verified
[ ] Google Play internal test verified
```

---

# 42. Default Codex Task Behavior

When the user gives a broad instruction such as:

```text
continue the mobile migration
```

do NOT guess the next large feature.

Instead:

1. read `migration-status.md`;
2. identify `Next Safe Task`;
3. inspect relevant code;
4. execute only the smallest coherent next phase;
5. verify it;
6. update status.

When blocked by uncertainty that can be resolved by repository inspection:

inspect first.

Do not ask the user unnecessarily.

If uncertainty is product/business intent rather than code fact:

document the decision point and implement the safest reversible default.

---

# 43. Final Architectural Principle

Whenever code reuse conflicts with product correctness, choose correct mobile architecture.

Univoice Mobile is not intended to be merely:

```text
Web UI on a phone
```

It should become the user's persistent Univoice presence endpoint and the local bridge among:

```text
User
AI
Relationship Core
Voice
Mobile context
Push
BLE
Orb / Ucup
IoT
```

All migration decisions should move the repository toward that architecture without destabilizing the existing product.
