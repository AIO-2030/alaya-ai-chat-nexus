// vite.config.js
import { fileURLToPath, URL } from "url";
import react from "file:///Users/senyang/project/node_modules/@vitejs/plugin-react-swc/index.js";
import { defineConfig } from "file:///Users/senyang/project/node_modules/vite/dist/node/index.js";
import environment from "file:///Users/senyang/project/node_modules/vite-plugin-environment/dist/index.js";
import dotenv from "file:///Users/senyang/project/node_modules/dotenv/lib/main.js";
import { componentTagger } from "file:///Users/senyang/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///Users/senyang/project/src/alaya-chat-nexus-frontend/vite.config.js";
dotenv.config({ path: "../../.env" });
var vite_config_default = defineConfig(({ mode }) => ({
  build: {
    emptyOutDir: true,
    // PWA build optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
          dfinity: ["@dfinity/agent", "@dfinity/auth-client", "@dfinity/principal"]
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis"
      }
    }
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true
      }
    },
    middlewareMode: false,
    fs: {
      strict: false
    },
    headers: {
      "Content-Security-Policy": `
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
        media-src 'self' blob: mediastream:;
      `.replace(/\s+/g, " ").trim(),
      "Permissions-Policy": "camera=(self), microphone=(self), clipboard-read=(self), clipboard-write=(self)",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Origin, Accept",
      "Access-Control-Allow-Credentials": "true"
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" })
  ].filter(Boolean),
  define: {
    // Define NODE_ENV for client-side access
    "process.env.NODE_ENV": JSON.stringify(mode),
    // Explicitly define environment variables for client-side access
    "import.meta.env.CANISTER_ID_AIO_BASE_BACKEND": JSON.stringify(process.env.CANISTER_ID_AIO_BASE_BACKEND),
    "import.meta.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND": JSON.stringify(process.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND),
    "import.meta.env.CANISTER_ID_AIO_BASE_FRONTEND": JSON.stringify(process.env.CANISTER_ID_AIO_BASE_FRONTEND),
    "import.meta.env.DFX_NETWORK": JSON.stringify(process.env.DFX_NETWORK),
    "import.meta.env.DFX_VERSION": JSON.stringify(process.env.DFX_VERSION),
    // Add VITE_ prefixed versions for compatibility
    "import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND": JSON.stringify(process.env.CANISTER_ID_AIO_BASE_BACKEND),
    "import.meta.env.VITE_CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND": JSON.stringify(process.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND),
    "import.meta.env.VITE_CANISTER_ID_AIO_BASE_FRONTEND": JSON.stringify(process.env.CANISTER_ID_AIO_BASE_FRONTEND),
    "import.meta.env.VITE_DFX_NETWORK": JSON.stringify(process.env.DFX_NETWORK),
    "import.meta.env.VITE_DFX_VERSION": JSON.stringify(process.env.DFX_VERSION)
  },
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", __vite_injected_original_import_meta_url)
        )
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
      }
    ],
    dedupe: ["@dfinity/agent", "react", "react-dom"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc2VueWFuZy9wcm9qZWN0L3NyYy9hbGF5YS1jaGF0LW5leHVzLWZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc2VueWFuZy9wcm9qZWN0L3NyYy9hbGF5YS1jaGF0LW5leHVzLWZyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9zZW55YW5nL3Byb2plY3Qvc3JjL2FsYXlhLWNoYXQtbmV4dXMtZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICd1cmwnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0LXN3Yyc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBlbnZpcm9ubWVudCBmcm9tICd2aXRlLXBsdWdpbi1lbnZpcm9ubWVudCc7XG5pbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudic7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbmRvdGVudi5jb25maWcoeyBwYXRoOiAnLi4vLi4vLmVudicgfSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIGJ1aWxkOiB7XG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgLy8gUFdBIGJ1aWxkIG9wdGltaXphdGlvbnNcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgIHJvdXRlcjogWydyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgdWk6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsICdAcmFkaXgtdWkvcmVhY3QtdGFicyddLFxuICAgICAgICAgIGRmaW5pdHk6IFsnQGRmaW5pdHkvYWdlbnQnLCAnQGRmaW5pdHkvYXV0aC1jbGllbnQnLCAnQGRmaW5pdHkvcHJpbmNpcGFsJ11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgIGRlZmluZToge1xuICAgICAgICBnbG9iYWw6IFwiZ2xvYmFsVGhpc1wiLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBwcm94eToge1xuICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6NDk0M1wiLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gICAgbWlkZGxld2FyZU1vZGU6IGZhbHNlLFxuICAgIGZzOiB7XG4gICAgICBzdHJpY3Q6IGZhbHNlLFxuICAgIH0sXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0NvbnRlbnQtU2VjdXJpdHktUG9saWN5JzogYFxuICAgICAgICBkZWZhdWx0LXNyYyAnc2VsZic7XG4gICAgICAgIHNjcmlwdC1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJyAndW5zYWZlLWV2YWwnIGJsb2I6O1xuICAgICAgICBjb25uZWN0LXNyYyAnc2VsZicgXG4gICAgICAgICAgaHR0cDovL2xvY2FsaG9zdDoqIGh0dHBzOi8vbG9jYWxob3N0OipcbiAgICAgICAgICBodHRwczovL2ljcDAuaW8gaHR0cHM6Ly8qLmljcDAuaW8gXG4gICAgICAgICAgaHR0cHM6Ly9pY3AtYXBpLmlvIFxuICAgICAgICAgIGh0dHBzOi8vaWMwLmFwcCBodHRwczovLyouaWMwLmFwcFxuICAgICAgICAgIGh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbVxuICAgICAgICAgIGh0dHBzOi8vYXBpLmVsZXZlbmxhYnMuaW8gaHR0cHM6Ly8qLmVsZXZlbmxhYnMuaW9cbiAgICAgICAgICB3c3M6Ly9hcGkuZWxldmVubGFicy5pbyB3c3M6Ly8qLmVsZXZlbmxhYnMuaW9cbiAgICAgICAgICBibG9iOiB3czogd3NzOjtcbiAgICAgICAgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZSc7XG4gICAgICAgIGltZy1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbTtcbiAgICAgICAgZm9udC1zcmMgJ3NlbGYnO1xuICAgICAgICBvYmplY3Qtc3JjICdub25lJztcbiAgICAgICAgYmFzZS11cmkgJ3NlbGYnO1xuICAgICAgICBmcmFtZS1hbmNlc3RvcnMgJ25vbmUnO1xuICAgICAgICB3b3JrZXItc3JjICdzZWxmJyBibG9iOjtcbiAgICAgICAgbWVkaWEtc3JjICdzZWxmJyBibG9iOiBtZWRpYXN0cmVhbTo7XG4gICAgICBgLnJlcGxhY2UoL1xccysvZywgJyAnKS50cmltKCksXG4gICAgICAnUGVybWlzc2lvbnMtUG9saWN5JzogJ2NhbWVyYT0oc2VsZiksIG1pY3JvcGhvbmU9KHNlbGYpLCBjbGlwYm9hcmQtcmVhZD0oc2VsZiksIGNsaXBib2FyZC13cml0ZT0oc2VsZiknLFxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnLFxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCBYLVJlcXVlc3RlZC1XaXRoLCBPcmlnaW4sIEFjY2VwdCcsXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiAndHJ1ZSdcbiAgICB9XG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgZW52aXJvbm1lbnQoXCJhbGxcIiwgeyBwcmVmaXg6IFwiQ0FOSVNURVJfXCIgfSksXG4gICAgZW52aXJvbm1lbnQoXCJhbGxcIiwgeyBwcmVmaXg6IFwiREZYX1wiIH0pLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgZGVmaW5lOiB7XG4gICAgLy8gRGVmaW5lIE5PREVfRU5WIGZvciBjbGllbnQtc2lkZSBhY2Nlc3NcbiAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShtb2RlKSxcbiAgICAvLyBFeHBsaWNpdGx5IGRlZmluZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGNsaWVudC1zaWRlIGFjY2Vzc1xuICAgICdpbXBvcnQubWV0YS5lbnYuQ0FOSVNURVJfSURfQUlPX0JBU0VfQkFDS0VORCc6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LkNBTklTVEVSX0lEX0FJT19CQVNFX0JBQ0tFTkQpLFxuICAgICdpbXBvcnQubWV0YS5lbnYuQ0FOSVNURVJfSURfQUxBWUFfQ0hBVF9ORVhVU19GUk9OVEVORCc6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LkNBTklTVEVSX0lEX0FMQVlBX0NIQVRfTkVYVVNfRlJPTlRFTkQpLFxuICAgICdpbXBvcnQubWV0YS5lbnYuQ0FOSVNURVJfSURfQUlPX0JBU0VfRlJPTlRFTkQnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5DQU5JU1RFUl9JRF9BSU9fQkFTRV9GUk9OVEVORCksXG4gICAgJ2ltcG9ydC5tZXRhLmVudi5ERlhfTkVUV09SSyc6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LkRGWF9ORVRXT1JLKSxcbiAgICAnaW1wb3J0Lm1ldGEuZW52LkRGWF9WRVJTSU9OJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuREZYX1ZFUlNJT04pLFxuICAgIC8vIEFkZCBWSVRFXyBwcmVmaXhlZCB2ZXJzaW9ucyBmb3IgY29tcGF0aWJpbGl0eVxuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9DQU5JU1RFUl9JRF9BSU9fQkFTRV9CQUNLRU5EJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuQ0FOSVNURVJfSURfQUlPX0JBU0VfQkFDS0VORCksXG4gICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX0NBTklTVEVSX0lEX0FMQVlBX0NIQVRfTkVYVVNfRlJPTlRFTkQnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5DQU5JU1RFUl9JRF9BTEFZQV9DSEFUX05FWFVTX0ZST05URU5EKSxcbiAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfQ0FOSVNURVJfSURfQUlPX0JBU0VfRlJPTlRFTkQnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5DQU5JU1RFUl9JRF9BSU9fQkFTRV9GUk9OVEVORCksXG4gICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX0RGWF9ORVRXT1JLJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuREZYX05FVFdPUkspLFxuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9ERlhfVkVSU0lPTic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52LkRGWF9WRVJTSU9OKSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiBbXG4gICAgICB7XG4gICAgICAgIGZpbmQ6IFwiZGVjbGFyYXRpb25zXCIsXG4gICAgICAgIHJlcGxhY2VtZW50OiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICAgIG5ldyBVUkwoXCIuLi9kZWNsYXJhdGlvbnNcIiwgaW1wb3J0Lm1ldGEudXJsKVxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogXCJAXCIsXG4gICAgICAgIHJlcGxhY2VtZW50OiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBkZWR1cGU6IFsnQGRmaW5pdHkvYWdlbnQnLCAncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gIH0sXG59KSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUE4VSxTQUFTLGVBQWUsV0FBVztBQUNqWCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxZQUFZO0FBQ25CLFNBQVMsdUJBQXVCO0FBTGdMLElBQU0sMkNBQTJDO0FBUWpRLE9BQU8sT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXBDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsT0FBTztBQUFBLElBQ0wsYUFBYTtBQUFBO0FBQUEsSUFFYixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDN0IsUUFBUSxDQUFDLGtCQUFrQjtBQUFBLFVBQzNCLElBQUksQ0FBQywwQkFBMEIsaUNBQWlDLHNCQUFzQjtBQUFBLFVBQ3RGLFNBQVMsQ0FBQyxrQkFBa0Isd0JBQXdCLG9CQUFvQjtBQUFBLFFBQzFFO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixnQkFBZ0I7QUFBQSxNQUNkLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGdCQUFnQjtBQUFBLElBQ2hCLElBQUk7QUFBQSxNQUNGLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCwyQkFBMkI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBb0J6QixRQUFRLFFBQVEsR0FBRyxFQUFFLEtBQUs7QUFBQSxNQUM1QixzQkFBc0I7QUFBQSxNQUN0QiwrQkFBK0I7QUFBQSxNQUMvQixnQ0FBZ0M7QUFBQSxNQUNoQyxnQ0FBZ0M7QUFBQSxNQUNoQyxvQ0FBb0M7QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQWlCLGdCQUFnQjtBQUFBLElBQzFDLFlBQVksT0FBTyxFQUFFLFFBQVEsWUFBWSxDQUFDO0FBQUEsSUFDMUMsWUFBWSxPQUFPLEVBQUUsUUFBUSxPQUFPLENBQUM7QUFBQSxFQUN2QyxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFFBQVE7QUFBQTtBQUFBLElBRU4sd0JBQXdCLEtBQUssVUFBVSxJQUFJO0FBQUE7QUFBQSxJQUUzQyxnREFBZ0QsS0FBSyxVQUFVLFFBQVEsSUFBSSw0QkFBNEI7QUFBQSxJQUN2Ryx5REFBeUQsS0FBSyxVQUFVLFFBQVEsSUFBSSxxQ0FBcUM7QUFBQSxJQUN6SCxpREFBaUQsS0FBSyxVQUFVLFFBQVEsSUFBSSw2QkFBNkI7QUFBQSxJQUN6RywrQkFBK0IsS0FBSyxVQUFVLFFBQVEsSUFBSSxXQUFXO0FBQUEsSUFDckUsK0JBQStCLEtBQUssVUFBVSxRQUFRLElBQUksV0FBVztBQUFBO0FBQUEsSUFFckUscURBQXFELEtBQUssVUFBVSxRQUFRLElBQUksNEJBQTRCO0FBQUEsSUFDNUcsOERBQThELEtBQUssVUFBVSxRQUFRLElBQUkscUNBQXFDO0FBQUEsSUFDOUgsc0RBQXNELEtBQUssVUFBVSxRQUFRLElBQUksNkJBQTZCO0FBQUEsSUFDOUcsb0NBQW9DLEtBQUssVUFBVSxRQUFRLElBQUksV0FBVztBQUFBLElBQzFFLG9DQUFvQyxLQUFLLFVBQVUsUUFBUSxJQUFJLFdBQVc7QUFBQSxFQUM1RTtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0w7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxVQUNYLElBQUksSUFBSSxtQkFBbUIsd0NBQWU7QUFBQSxRQUM1QztBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLE1BQzlEO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUSxDQUFDLGtCQUFrQixTQUFTLFdBQVc7QUFBQSxFQUNqRDtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
