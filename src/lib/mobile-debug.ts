/**
 * Mobile debugging helper (vConsole)
 * Enable via:
 *  - Env: VITE_ENABLE_MOBILE_DEBUG=true
 *  - LocalStorage: localStorage.setItem('mobile_debug', 'true')
 *  - Query: ?mobileDebug=true
 * Disable by removing the flag or setting to "false".
 */

const isMobileDevice = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  !window.matchMedia('(min-width: 1024px)').matches;

const shouldEnableDebug = () => {
  const envEnabled = import.meta.env.VITE_ENABLE_MOBILE_DEBUG === 'true';
  const lsEnabled =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('mobile_debug') === 'true';
  const queryEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mobileDebug') === 'true';

  return (envEnabled || lsEnabled || queryEnabled) && isMobileDevice();
};

const loadVConsole = async () => {
  // Avoid duplicate loads
  if ((window as any).__MOBILE_DEBUG_LOADED__) {
    return;
  }

  (window as any).__MOBILE_DEBUG_LOADED__ = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/vconsole@latest/dist/vconsole.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });

    // @ts-ignore VConsole is added globally by the script
    // eslint-disable-next-line no-new
    new (window as any).VConsole();
    console.log('[MobileDebug] vConsole enabled');
  } catch (error) {
    console.error('[MobileDebug] Failed to load vConsole:', error);
  }
};

if (typeof window !== 'undefined' && shouldEnableDebug()) {
  loadVConsole();
}
