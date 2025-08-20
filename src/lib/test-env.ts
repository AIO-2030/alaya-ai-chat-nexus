/**
 * Test file to verify environment variable loading
 * This will help debug why environment variables are not being read correctly
 */

// Test direct environment variable access
console.log('=== Environment Variable Test ===');

// Test import.meta.env access
console.log('import.meta.env:', {
  VITE_CANISTER_ID_AIO_BASE_BACKEND: import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND,
  CANISTER_ID_AIO_BASE_BACKEND: import.meta.env.CANISTER_ID_AIO_BASE_BACKEND,
  DFX_NETWORK: import.meta.env.DFX_NETWORK,
  DFX_VERSION: import.meta.env.DFX_VERSION,
});

// Test all environment variables
console.log('All import.meta.env keys:', Object.keys(import.meta.env));

// Test specific canister IDs
console.log('Canister IDs:', {
  AIO_BASE_BACKEND: import.meta.env.CANISTER_ID_AIO_BASE_BACKEND,
  ALAYA_CHAT_NEXUS_FRONTEND: import.meta.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND,
  AIO_BASE_FRONTEND: import.meta.env.CANISTER_ID_AIO_BASE_FRONTEND,
});

// Test if the environment plugin is working
const testCanisterId = import.meta.env.CANISTER_ID_AIO_BASE_BACKEND;
if (testCanisterId) {
  console.log('✅ Environment variable loaded successfully:', testCanisterId);
} else {
  console.log('❌ Environment variable not loaded');
  console.log('Available keys:', Object.keys(import.meta.env).filter(key => key.includes('CANISTER')));
}

export const testEnvironmentVariables = () => {
  return {
    canisterId: import.meta.env.CANISTER_ID_AIO_BASE_BACKEND,
    network: import.meta.env.DFX_NETWORK,
    version: import.meta.env.DFX_VERSION,
    allKeys: Object.keys(import.meta.env),
    canisterKeys: Object.keys(import.meta.env).filter(key => key.includes('CANISTER')),
  };
};
