import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import { componentTagger } from "lovable-tagger";

dotenv.config({ path: '../../.env' });

export default defineConfig(({ mode }) => ({
  build: {
    emptyOutDir: true,
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