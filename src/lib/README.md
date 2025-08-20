# Environment Configuration Module

## Overview
The `environment.ts` module provides standardized environment detection and configuration utilities that can be shared across different API modules. This eliminates code duplication and ensures consistent environment handling throughout the application.

## Features

### ✅ Environment Detection
- **Local Development**: Automatically detects localhost, 127.0.0.1, and port 4943
- **Production**: Detects when running on production servers
- **Network**: Identifies DFX network (local vs ic)

### ✅ Canister ID Management
- **Dynamic Loading**: Automatically loads canister IDs from environment variables
- **Fallback Values**: Provides sensible defaults when environment variables are missing
- **Centralized Configuration**: All canister IDs managed in one place

### ✅ Host Configuration
- **Automatic Switching**: Automatically switches between local and production hosts
- **Identity Provider**: Configures identity provider URLs based on environment
- **Standardized URLs**: Consistent URL patterns across environments

## Usage

### Basic Import
```typescript
import { 
  getCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';
```

### Environment Detection
```typescript
// Check current environment
if (isLocalNet()) {
  console.log('Running in local development mode');
} else {
  console.log('Running in production mode');
}

// Get network information
const network = getNetwork(); // 'local' or 'ic'
const dfxVersion = getDfxVersion();
```

### Canister ID Management
```typescript
// Get canister ID for specific service
const canisterId = getCanisterId('AIO_BASE_BACKEND');

// Use predefined getters for common canisters
const backendId = getAioBaseBackendCanisterId();
const frontendId = getAlayaChatNexusFrontendCanisterId();

// Access all canister IDs
import { CANISTER_IDS } from '../../lib/environment';
console.log(CANISTER_IDS.AIO_BASE_BACKEND);
```

### Host Configuration
```typescript
// Get appropriate host for current environment
const host = getHost(); // 'http://localhost:4943' or 'https://ic0.app'

// Get identity provider host
const identityHost = getIdentityProviderHost();

// Access predefined host configurations
import { HOST_CONFIG } from '../../lib/environment';
console.log(HOST_CONFIG.LOCAL);      // 'http://localhost:4943'
console.log(HOST_CONFIG.PRODUCTION); // 'https://ic0.app'
```

### Complete Environment Information
```typescript
// Get all environment information
const envInfo = getEnvironmentInfo();
console.log(envInfo);
// Output:
// {
//   isLocalNet: true,
//   isProduction: false,
//   isDevelopment: true,
//   network: 'local',
//   dfxVersion: '0.28.0',
//   host: 'http://localhost:4943',
//   identityProviderHost: 'http://localhost:4943'
// }

// Get environment config for specific canister
const config = getEnvironmentConfig('AIO_BASE_BACKEND');
console.log(config);
// Output:
// {
//   canisterId: 'uxrrr-q7777-77774-qaaaq-cai',
//   host: 'http://localhost:4943',
//   isLocalNet: true,
//   network: 'local'
// }
```

### Logging and Debugging
```typescript
// Log environment configuration for specific canister
logEnvironmentConfig('AIO_BASE_BACKEND');
// Output: [Environment] Configuration for AIO_BASE_BACKEND: { ... }
```

## API Reference

### Environment Detection Functions
- `isLocalNet()`: Returns `true` if running in local development
- `isProduction()`: Returns `true` if running in production
- `isDevelopment()`: Returns `true` if running in development

### Canister ID Functions
- `getCanisterId(canisterName)`: Gets canister ID by name
- `getAioBaseBackendCanisterId()`: Gets AIO base backend canister ID
- `getAlayaChatNexusFrontendCanisterId()`: Gets frontend canister ID
- `getAioBaseFrontendCanisterId()`: Gets base frontend canister ID

### Host Configuration Functions
- `getHost()`: Gets appropriate host for current environment
- `getIdentityProviderHost()`: Gets identity provider host
- `getNetwork()`: Gets DFX network name
- `getDfxVersion()`: Gets DFX version

### Utility Functions
- `getEnvironmentInfo()`: Gets complete environment information
- `getEnvironmentConfig(canisterName)`: Gets environment config for specific canister
- `logEnvironmentConfig(canisterName)`: Logs environment configuration

### Constants
- `CANISTER_IDS`: Object containing all canister IDs
- `HOST_CONFIG`: Object containing all host configurations

## Example Implementation

### Before (Duplicated Code)
```typescript
// In userApi.ts
const isLocalNet = (): boolean => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('4943');
};

const getCanisterId = (): string => {
  const envCanisterId = import.meta.env.CANISTER_ID_AIO_BASE_BACKEND;
  if (envCanisterId) return envCanisterId;
  return 'rrkah-fqaaa-aaaaa-aaaaq-cai';
};

const getHost = (): string => {
  if (isLocalNet()) return 'http://localhost:4943';
  return 'https://ic0.app';
};
```

### After (Using Shared Module)
```typescript
// In userApi.ts
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

logEnvironmentConfig('AIO_BASE_BACKEND');
```

## Benefits

### ✅ Code Reusability
- Single source of truth for environment configuration
- No more duplicated environment detection logic
- Consistent behavior across all API modules

### ✅ Maintainability
- Centralized configuration management
- Easy to update environment logic in one place
- Reduced risk of configuration inconsistencies

### ✅ Debugging
- Standardized logging across all modules
- Easy to trace environment-related issues
- Consistent error messages and debugging information

### ✅ Flexibility
- Easy to add new environment variables
- Simple to extend for new canisters
- Configurable fallback values

## Best Practices

### 1. Always Import from Shared Module
```typescript
// ✅ Good
import { getCanisterId, getHost } from '../../lib/environment';

// ❌ Bad
const isLocalNet = () => window.location.hostname === 'localhost';
```

### 2. Use Descriptive Canister Names
```typescript
// ✅ Good
const canisterId = getCanisterId('AIO_BASE_BACKEND');

// ❌ Bad
const canisterId = getCanisterId('BACKEND');
```

### 3. Log Environment Configuration
```typescript
// ✅ Good
logEnvironmentConfig('YOUR_CANISTER_NAME');

// ❌ Bad
// No logging
```

### 4. Handle Missing Environment Variables Gracefully
The module automatically provides fallback values, but you can add additional error handling if needed:

```typescript
const canisterId = getCanisterId('YOUR_CANISTER');
if (!canisterId) {
  throw new Error('Canister ID not configured');
}
```

## Migration Guide

### Step 1: Import Environment Module
```typescript
import { 
  getCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';
```

### Step 2: Replace Local Functions
```typescript
// Replace this:
const isLocalNet = () => { /* local implementation */ };
const getCanisterId = () => { /* local implementation */ };
const getHost = () => { /* local implementation */ };

// With this:
// (functions are now imported from environment module)
```

### Step 3: Update Configuration
```typescript
// Replace this:
const CANISTER_ID = getCanisterId();
const HOST = getHost();

// With this:
const CANISTER_ID = getCanisterId('YOUR_CANISTER_NAME');
const HOST = getHost();
```

### Step 4: Add Logging
```typescript
// Add this line after configuration:
logEnvironmentConfig('YOUR_CANISTER_NAME');
```

## Troubleshooting

### Environment Variables Not Loading
1. Check that `.env` file exists in project root
2. Verify `vite.config.js` has correct `dotenv.config()` path
3. Ensure environment variable names match expected format

### Canister ID Not Found
1. Check `.env` file for correct variable names
2. Verify `vite-plugin-environment` configuration
3. Check console for fallback value usage

### Host Configuration Issues
1. Verify `isLocalNet()` function logic
2. Check `window.location.hostname` value
3. Ensure correct host URLs in configuration

## Future Enhancements

### Planned Features
- [ ] Environment variable validation
- [ ] Configuration schema validation
- [ ] Environment-specific feature flags
- [ ] Performance monitoring integration
- [ ] Configuration hot-reloading

### Contributing
When adding new environment variables or canister configurations:
1. Update the `environment.ts` module
2. Add appropriate fallback values
3. Update this documentation
4. Test in both local and production environments
