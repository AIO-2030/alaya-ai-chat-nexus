/**
 * Environment configuration and utilities for Internet Computer development
 * This module provides standardized environment detection and configuration
 * that can be shared across different API modules.
 */

// Environment detection utilities
export const isLocalNet = (): boolean => {
  const host = window.location.hostname;
  console.log('[environment] host', host);
  // Use string contains matching because host might be in format like "umunu-kh777-77774-qaaca-cai.localhost"
  return host.includes('localhost') || host.includes('127.0.0.1') || host.includes('4943');
};

export const isProduction = (): boolean => {
  return !isLocalNet();
};

export const isDevelopment = (): boolean => {
  return isLocalNet();
};

// Canister ID management
export const getCanisterId = (canisterName: string): string => {
  // Try to get from environment variable first - check both formats
  const envKey = `CANISTER_ID_${canisterName.toUpperCase()}`;
  const viteKey = `VITE_${envKey}`;
  
  // Try CANISTER_ prefix first (from vite-plugin-environment)
  let envCanisterId = import.meta.env[envKey];
  
  // If not found, try VITE_ prefix (from define in vite.config.js)
  if (!envCanisterId) {
    envCanisterId = import.meta.env[viteKey];
  }
  
  if (envCanisterId) {
    console.log(`[Environment] Using canister ID for ${canisterName} from environment:`, envCanisterId);
    return envCanisterId;
  }
  
  // Fallback to default canister IDs
  const defaultCanisterIds: Record<string, string> = {
    'AIO_BASE_BACKEND': 'rrkah-fqaaa-aaaaa-aaaaq-cai',
    'ALAYA_CHAT_NEXUS_FRONTEND': 'umunu-kh777-77774-qaaca-cai',
    'AIO_BASE_FRONTEND': 'uzt4z-lp777-77774-qaabq-cai',
  };
  
  const defaultId = defaultCanisterIds[canisterName.toUpperCase()];
  if (defaultId) {
    console.log(`[Environment] Using default canister ID for ${canisterName}:`, defaultId);
    return defaultId;
  }
  
  console.warn(`[Environment] No canister ID found for ${canisterName}, using fallback`);
  return 'rrkah-fqaaa-aaaaa-aaaaq-cai';
};

// Host configuration
export const getHost = (): string => {
  if (isLocalNet()) {
    return 'http://localhost:4943';
  }
  return 'https://ic0.app';
};

export const getIdentityProviderHost = (): string => {
  if (isLocalNet()) {
    return 'http://localhost:4943';
  }
  return 'https://identity.ic0.app';
};

// Network configuration
export const getNetwork = (): string => {
  // Try both formats
  const network = import.meta.env.DFX_NETWORK || import.meta.env.VITE_DFX_NETWORK || (isLocalNet() ? 'local' : 'ic');
  return network;
};

export const getDfxVersion = (): string => {
  // Try both formats
  const version = import.meta.env.DFX_VERSION || import.meta.env.VITE_DFX_VERSION || 'unknown';
  return version;
};

// Environment information
export const getEnvironmentInfo = () => ({
  isLocalNet: isLocalNet(),
  isProduction: isProduction(),
  isDevelopment: isDevelopment(),
  network: getNetwork(),
  dfxVersion: getDfxVersion(),
  host: getHost(),
  identityProviderHost: getIdentityProviderHost(),
});

// Log environment configuration
export const logEnvironmentConfig = (canisterName: string): void => {
  const envInfo = getEnvironmentInfo();
  const canisterId = getCanisterId(canisterName);
  
  console.log(`[Environment] Configuration for ${canisterName}:`, {
    ...envInfo,
    canisterId,
  });
};

// Environment-specific configurations
export const getEnvironmentConfig = (canisterName: string) => ({
  canisterId: getCanisterId(canisterName),
  host: getHost(),
  isLocalNet: isLocalNet(),
  network: getNetwork(),
});

// Utility functions for common canister names
export const getAioBaseBackendCanisterId = (): string => getCanisterId('AIO_BASE_BACKEND');
export const getAlayaChatNexusFrontendCanisterId = (): string => getCanisterId('ALAYA_CHAT_NEXUS_FRONTEND');
export const getAioBaseFrontendCanisterId = (): string => getCanisterId('AIO_BASE_FRONTEND');

// Export all canister IDs for convenience
export const CANISTER_IDS = {
  AIO_BASE_BACKEND: getAioBaseBackendCanisterId(),
  ALAYA_CHAT_NEXUS_FRONTEND: getAlayaChatNexusFrontendCanisterId(),
  AIO_BASE_FRONTEND: getAioBaseFrontendCanisterId(),
};

// Export host configuration
export const HOST_CONFIG = {
  LOCAL: 'http://localhost:4943',
  PRODUCTION: 'https://ic0.app',
  IDENTITY_PROVIDER_LOCAL: 'http://localhost:4943',
  IDENTITY_PROVIDER_PRODUCTION: 'https://identity.ic0.app',
};
