import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'

// Import environment test to debug environment variable loading
import './lib/test-env'
// Import environment debug tool
import './lib/environment-debug'

createRoot(document.getElementById("root")!).render(<App />);
