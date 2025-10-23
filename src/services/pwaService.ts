// PWA Service - Manage Service Worker and PWA functionality
class PWAService {
  private static instance: PWAService;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;

  private constructor() {}

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // Initialize PWA service
  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[PWA] Service Worker not supported in this browser');
      return false;
    }

    try {
      console.log('[PWA] Registering Service Worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered successfully:', this.registration);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('[PWA] Service Worker update found');
        this.handleUpdate();
      });

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker controller changed');
        window.location.reload();
      });

      return true;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return false;
    }
  }

  // Handle Service Worker updates
  private handleUpdate(): void {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('[PWA] New Service Worker installed, update available');
        this.showUpdateNotification();
      }
    });
  }

  // Show update notification
  private showUpdateNotification(): void {
    // You can customize this notification
    if (confirm('A new version of the app is available. Would you like to update?')) {
      this.updateServiceWorker();
    }
  }

  // Update Service Worker
  public updateServiceWorker(): void {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // Check if app is installed
  public isAppInstalled(): boolean {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check if running on iOS and added to home screen
    if ((window.navigator as any).standalone === true) {
      return true;
    }

    // Check if running on Android and added to home screen
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return true;
    }

    return false;
  }

  // Check if app can be installed
  public canInstall(): boolean {
    return 'BeforeInstallPromptEvent' in window;
  }

  // Get Service Worker registration
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Send message to Service Worker
  public async sendMessageToSW(message: any): Promise<void> {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }

  // Cache URLs
  public async cacheUrls(urls: string[]): Promise<void> {
    await this.sendMessageToSW({
      type: 'CACHE_URLS',
      urls
    });
  }

  // Request background sync
  public async requestBackgroundSync(tag: string): Promise<void> {
    if (this.registration && 'sync' in this.registration) {
      try {
        await (this.registration as any).sync.register(tag);
        console.log('[PWA] Background sync registered:', tag);
      } catch (error) {
        console.error('[PWA] Background sync registration failed:', error);
      }
    }
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Show notification
  public async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
      console.warn('[PWA] Notification permission not granted');
      return;
    }

    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // Get app info
  public getAppInfo() {
    return {
      isSupported: this.isSupported,
      isInstalled: this.isAppInstalled(),
      canInstall: this.canInstall(),
      hasServiceWorker: !!this.registration,
      isOnline: navigator.onLine,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }

  // Cleanup
  public cleanup(): void {
    // Cleanup any event listeners or resources
    console.log('[PWA] Cleaning up PWA service');
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();
export default pwaService;
