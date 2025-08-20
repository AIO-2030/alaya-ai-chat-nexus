/**
 * Environment Variable Debug Tool
 * This tool helps debug environment variable loading issues
 */

export const debugEnvironmentVariables = () => {
  console.log('🔍 === Environment Variables Debug ===');
  
  // Check all available environment variables
  const allEnvKeys = Object.keys(import.meta.env);
  console.log('📋 All available environment variables:', allEnvKeys);
  
  // Check canister-related variables
  const canisterKeys = allEnvKeys.filter(key => key.includes('CANISTER'));
  console.log('🏗️  Canister-related variables:', canisterKeys);
  
  // Check DFX-related variables
  const dfxKeys = allEnvKeys.filter(key => key.includes('DFX'));
  console.log('⚙️  DFX-related variables:', dfxKeys);
  
  // Check specific canister IDs
  const canisterIds = {
    'CANISTER_ID_AIO_BASE_BACKEND': {
      direct: import.meta.env.CANISTER_ID_AIO_BASE_BACKEND,
      vite: import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND,
    },
    'CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND': {
      direct: import.meta.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND,
      vite: import.meta.env.VITE_CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND,
    },
    'CANISTER_ID_AIO_BASE_FRONTEND': {
      direct: import.meta.env.CANISTER_ID_AIO_BASE_FRONTEND,
      vite: import.meta.env.VITE_CANISTER_ID_AIO_BASE_FRONTEND,
    },
  };
  
  console.log('🆔 Canister ID values:', canisterIds);
  
  // Check network configuration
  const networkConfig = {
    'DFX_NETWORK': {
      direct: import.meta.env.DFX_NETWORK,
      vite: import.meta.env.VITE_DFX_NETWORK,
    },
    'DFX_VERSION': {
      direct: import.meta.env.DFX_VERSION,
      vite: import.meta.env.VITE_DFX_VERSION,
    },
  };
  
  console.log('🌐 Network configuration:', networkConfig);
  
  // Test environment detection
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('4943');
  
  console.log('🏠 Environment detection:', {
    hostname,
    isLocal,
    expectedHost: isLocal ? 'http://localhost:4943' : 'https://ic0.app',
  });
  
  // Summary
  const hasCanisterIds = Object.values(canisterIds).some(id => id.direct || id.vite);
  const hasNetworkConfig = Object.values(networkConfig).some(config => config.direct || config.vite);
  
  console.log('📊 Summary:', {
    hasCanisterIds,
    hasNetworkConfig,
    totalVariables: allEnvKeys.length,
    canisterVariables: canisterKeys.length,
    dfxVariables: dfxKeys.length,
  });
  
  if (hasCanisterIds && hasNetworkConfig) {
    console.log('✅ Environment variables loaded successfully!');
  } else {
    console.log('❌ Some environment variables are missing!');
    if (!hasCanisterIds) {
      console.log('   - Canister IDs not found');
    }
    if (!hasNetworkConfig) {
      console.log('   - Network configuration not found');
    }
  }
  
  console.log('🔍 === End Debug ===');
  
  return {
    allEnvKeys,
    canisterKeys,
    dfxKeys,
    canisterIds,
    networkConfig,
    environment: {
      hostname,
      isLocal,
      expectedHost: isLocal ? 'http://localhost:4943' : 'https://ic0.app',
    },
    summary: {
      hasCanisterIds,
      hasNetworkConfig,
      totalVariables: allEnvKeys.length,
      canisterVariables: canisterKeys.length,
      dfxVariables: dfxKeys.length,
    },
  };
};

// Auto-run debug when imported
if (typeof window !== 'undefined') {
  // Run debug after a short delay to ensure everything is loaded
  setTimeout(() => {
    debugEnvironmentVariables();
  }, 1000);
}
