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
    - Mock persistence for `UserInfo`; replace with real canister actor later

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


