import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import { componentTagger } from "lovable-tagger";

// Load environment variables
dotenv.config({ path: '../../.env' });

export default defineConfig(({ mode }) => ({
  build: {
    emptyOutDir: true,
    // PWA build optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          dfinity: ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/principal']
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
        connect-src 'self' 
          http://localhost:* https://localhost:*
          https://icp0.io https://*.icp0.io 
          https://icp-api.io 
          https://ic0.app https://*.ic0.app
          https://accounts.google.com https://www.googleapis.com
          https://api.elevenlabs.io https://*.elevenlabs.io
          wss://api.elevenlabs.io wss://*.elevenlabs.io
          blob: ws: wss:;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https://lh3.googleusercontent.com;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        frame-ancestors 'none';
        worker-src 'self' blob:;
        media-src 'self' blob:;
        camera 'self' 'unsafe-inline';
      `.replace(/\s+/g, ' ').trim(),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
      'Access-Control-Allow-Credentials': 'true'
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
  ].filter(Boolean),
  define: {
    // Define NODE_ENV for client-side access
    'process.env.NODE_ENV': JSON.stringify(mode),
    // Explicitly define environment variables for client-side access
    'import.meta.env.CANISTER_ID_AIO_BASE_BACKEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_BACKEND),
    'import.meta.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND': JSON.stringify(process.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND),
    'import.meta.env.CANISTER_ID_AIO_BASE_FRONTEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_FRONTEND),
    'import.meta.env.DFX_NETWORK': JSON.stringify(process.env.DFX_NETWORK),
    'import.meta.env.DFX_VERSION': JSON.stringify(process.env.DFX_VERSION),
    // Add VITE_ prefixed versions for compatibility
    'import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_BACKEND),
    'import.meta.env.VITE_CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND': JSON.stringify(process.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND),
    'import.meta.env.VITE_CANISTER_ID_AIO_BASE_FRONTEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_FRONTEND),
    'import.meta.env.VITE_DFX_NETWORK': JSON.stringify(process.env.DFX_NETWORK),
    'import.meta.env.VITE_DFX_VERSION': JSON.stringify(process.env.DFX_VERSION),
  },
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ['@dfinity/agent', 'react', 'react-dom'],
  },
}));