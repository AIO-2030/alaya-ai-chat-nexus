import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'

// Import environment test to debug environment variable loading
import './lib/test-env'
// Import environment debug tool
import './lib/environment-debug'

// Initialize PWA service
import { pwaService } from './services/pwaService'

// Initialize PWA when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const pwaInitialized = await pwaService.initialize();
    if (pwaInitialized) {
      console.log('[Main] PWA service initialized successfully');
    } else {
      console.warn('[Main] PWA service initialization failed');
    }
  } catch (error) {
    console.error('[Main] Error initializing PWA service:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
