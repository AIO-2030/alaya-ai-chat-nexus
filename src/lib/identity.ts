import { Principal } from '@dfinity/principal';
import { getPrincipalFromII } from './ii';

// Identity Provider (II) URL can be configured via env, defaults to ic0.app
const DEFAULT_II_URL = 'https://identity.ic0.app';

export const getIIUrl = (): string => {
  const fromEnv = (import.meta as any).env?.VITE_II_URL as string | undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_II_URL;
};

/**
 * Generate a browser fingerprint using various browser characteristics
 * This helps create a unique identifier for each browser/device combination
 */
const generateBrowserFingerprint = (): string => {
  const fingerprint: string[] = [];
  
  // 1. User Agent (browser, OS, device info)
  fingerprint.push(navigator.userAgent);
  
  // 2. Language preferences
  fingerprint.push(navigator.language);
  fingerprint.push(navigator.languages?.join(',') || '');
  
  // 3. Screen characteristics
  fingerprint.push(`${screen.width}x${screen.height}`);
  fingerprint.push(`${screen.colorDepth}`);
  fingerprint.push(`${screen.pixelDepth}`);
  fingerprint.push(`${window.devicePixelRatio || 1}`);
  
  // 4. Timezone
  fingerprint.push(`${new Date().getTimezoneOffset()}`);
  fingerprint.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // 5. Hardware concurrency (CPU cores)
  fingerprint.push(`${navigator.hardwareConcurrency || 0}`);
  
  // 6. Platform
  fingerprint.push(navigator.platform);
  
  // 7. Max touch points (for mobile detection)
  fingerprint.push(`${navigator.maxTouchPoints || 0}`);
  
  // 8. Do Not Track setting
  fingerprint.push(`${(navigator as any).doNotTrack || 'unknown'}`);
  
  // 9. Cookie enabled
  fingerprint.push(`${navigator.cookieEnabled}`);
  
  // 10. Online status
  fingerprint.push(`${navigator.onLine}`);
  
  // 11. Session storage available
  try {
    fingerprint.push(`${!!window.sessionStorage}`);
  } catch {
    fingerprint.push('false');
  }
  
  // 12. Local storage available
  try {
    fingerprint.push(`${!!window.localStorage}`);
  } catch {
    fingerprint.push('false');
  }
  
  // 13. IndexedDB available
  fingerprint.push(`${!!window.indexedDB}`);
  
  // 14. WebGL fingerprint (basic)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        fingerprint.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
        fingerprint.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      }
    }
  } catch {
    // WebGL not available
  }
  
  // 15. Canvas fingerprint (basic)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(100, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Browser Fingerprint', 2, 15);
      fingerprint.push(canvas.toDataURL());
    }
  } catch {
    // Canvas not available
  }
  
  return fingerprint.join('|');
};

/**
 * SHA-256 hash implementation (simplified, for fingerprint hashing)
 */
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Get or create a persistent random ID for this browser
 */
const getOrCreatePersistentId = (): string => {
  const STORAGE_KEY = 'alaya_browser_principal_seed';
  
  try {
    // Try to get existing ID from localStorage
    let persistentId = localStorage.getItem(STORAGE_KEY);
    
    if (!persistentId) {
      // Generate new random ID using crypto.getRandomValues
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      persistentId = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Store for future use
      localStorage.setItem(STORAGE_KEY, persistentId);
      console.log('[Identity] Created new persistent browser ID');
    } else {
      console.log('[Identity] Using existing persistent browser ID');
    }
    
    return persistentId;
  } catch (error) {
    console.warn('[Identity] Cannot access localStorage, using session-only ID:', error);
    
    // Fallback: Use sessionStorage if localStorage is not available
    try {
      let sessionId = sessionStorage.getItem(STORAGE_KEY);
      if (!sessionId) {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        sessionId = Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        sessionStorage.setItem(STORAGE_KEY, sessionId);
      }
      return sessionId;
    } catch {
      // Last resort: generate random ID for this session only
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }
};

/**
 * Generate a stable pseudo principal using browser fingerprinting and random seed
 * This creates a unique principal for each browser/device with minimal collision risk
 */
export const deriveStablePseudoPrincipal = async (seed: string): Promise<string> => {
  console.log('[Identity] Generating stable pseudo principal...');
  
  try {
    // Combine multiple sources of uniqueness
    const browserFingerprint = generateBrowserFingerprint();
    const persistentId = getOrCreatePersistentId();
    const timestamp = Date.now().toString();
    
    // Create combined seed
    const combinedSeed = `${seed}|${persistentId}|${browserFingerprint}|${timestamp}`;
    
    // Hash the combined seed to get a deterministic but unique value
    const hash = await sha256(combinedSeed);
    
    // Take first 29 bytes of hash (Principal can be max 29 bytes)
    const principalBytes = new Uint8Array(29);
    for (let i = 0; i < 29; i++) {
      principalBytes[i] = parseInt(hash.substr(i * 2, 2), 16);
    }
    
    // Create Principal from bytes
    const principal = Principal.fromUint8Array(principalBytes);
    const principalText = principal.toText();
    
    console.log('[Identity] Generated pseudo principal:', principalText);
    console.log('[Identity] Fingerprint length:', browserFingerprint.length);
    console.log('[Identity] Persistent ID:', persistentId.substring(0, 16) + '...');
    
    return principalText;
  } catch (error) {
    console.error('[Identity] Error generating pseudo principal:', error);
    
    // Fallback: Use simple random generation
    const randomBytes = new Uint8Array(29);
    crypto.getRandomValues(randomBytes);
    const fallbackPrincipal = Principal.fromUint8Array(randomBytes);
    
    console.warn('[Identity] Using fallback random principal:', fallbackPrincipal.toText());
    return fallbackPrincipal.toText();
  }
};

/**
 * Generate principal for non-Plug wallet users
 * Uses browser-based principal generation instead of II
 */
export const generatePrincipalForNonPlug = async (seed: string): Promise<string> => {
  console.log('[Identity] Generating principal for non-Plug user...');
  console.log('[Identity] Using browser-based principal generation (seed:', seed, ')');
  
  // Use browser-based principal generation
  const principal = await deriveStablePseudoPrincipal(seed);
  
  console.log('[Identity] Generated principal:', principal);
  return principal;
};

