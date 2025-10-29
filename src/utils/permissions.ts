/**
 * Permission management utility
 * Handles Clipboard API and other browser permissions
 */

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  unavailable: boolean;
  error?: string;
}

/**
 * Request Clipboard write permission
 */
export const requestClipboardPermission = async (): Promise<PermissionStatus> => {
  try {
    // Check if Permissions API is supported
    if (!navigator.permissions) {
      return {
        granted: false,
        denied: false,
        prompt: false,
        unavailable: true,
        error: 'Permissions API not supported'
      };
    }

    // Check current permission status
    const permission = await navigator.permissions.query({ 
      name: 'clipboard-write' as PermissionName 
    });

    const status: PermissionStatus = {
      granted: permission.state === 'granted',
      denied: permission.state === 'denied',
      prompt: permission.state === 'prompt',
      unavailable: false
    };

    // If permission state is prompt, try to trigger permission request
    if (permission.state === 'prompt') {
      try {
        // Try to write a test text to trigger permission request
        await navigator.clipboard.writeText('permission_test');
        // If successful, recheck permission status
        const newPermission = await navigator.permissions.query({ 
          name: 'clipboard-write' as PermissionName 
        });
        status.granted = newPermission.state === 'granted';
        status.denied = newPermission.state === 'denied';
        status.prompt = newPermission.state === 'prompt';
      } catch (error) {
        console.warn('Failed to trigger clipboard permission request:', error);
        status.error = 'Permission request failed';
      }
    }

    return status;
  } catch (error) {
    console.error('Error checking clipboard permission:', error);
    return {
      granted: false,
      denied: false,
      prompt: false,
      unavailable: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Check if Clipboard API is available
 */
export const isClipboardAPIAvailable = (): boolean => {
  return !!(navigator.clipboard && window.isSecureContext);
};

/**
 * Get permission status message
 */
export const getPermissionStatusMessage = (status: PermissionStatus): string => {
  if (status.unavailable) {
    return status.error || 'Clipboard API unavailable';
  }
  if (status.granted) {
    return 'Clipboard access granted';
  }
  if (status.denied) {
    return 'Clipboard access denied';
  }
  if (status.prompt) {
    return 'Clipboard permission pending';
  }
  return 'Unknown permission status';
};

/**
 * Show permission request dialog
 */
export const showPermissionDialog = (status: PermissionStatus): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create permission request dialog
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      max-width: 90%;
      width: 400px;
      text-align: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Clipboard Permission Required';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #e2e8f0;
    `;

    const message = document.createElement('p');
    message.innerHTML = `
      This app needs access to your clipboard to copy text.<br/>
      <br/>
      <strong>Status:</strong> ${getPermissionStatusMessage(status)}<br/>
      <br/>
      Please allow clipboard access when prompted by your browser.
    `;
    message.style.cssText = `
      margin: 16px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #cbd5e1;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
    `;

    const allowBtn = document.createElement('button');
    allowBtn.textContent = 'Request Permission';
    allowBtn.style.cssText = `
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;

    // Event handlers
    allowBtn.onclick = async () => {
      try {
        allowBtn.textContent = 'Requesting...';
        allowBtn.disabled = true;
        
        const newStatus = await requestClipboardPermission();
        
        if (newStatus.granted) {
          allowBtn.textContent = 'Permission Granted!';
          allowBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          setTimeout(() => {
            document.body.removeChild(overlay);
            resolve(true);
          }, 1000);
        } else {
          allowBtn.textContent = 'Permission Denied';
          allowBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          message.innerHTML = `
            Permission was not granted.<br/>
            <br/>
            You may need to:<br/>
            • Check your browser settings<br/>
            • Allow clipboard access for this site<br/>
            • Try refreshing the page
          `;
        }
      } catch (error) {
        console.error('Permission request failed:', error);
        allowBtn.textContent = 'Request Failed';
        allowBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      }
    };

    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    // Assemble dialog
    buttonContainer.appendChild(allowBtn);
    buttonContainer.appendChild(cancelBtn);
    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);

    // Add to page
    document.body.appendChild(overlay);

    // Close on ESC key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on outside click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };
  });
};

/**
 * Detect if browser is iOS Safari
 */
const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
};

/**
 * Smart permission management: automatically check and request permission
 */
export const ensureClipboardPermission = async (): Promise<boolean> => {
  // iOS Safari doesn't need permission request, return true directly
  if (isIOSSafari()) {
    console.log('iOS Safari detected, skipping permission request');
    return true;
  }

  // First check if Clipboard API is available
  if (!isClipboardAPIAvailable()) {
    console.warn('Clipboard API not available');
    return false;
  }

  // Check current permission status
  const status = await requestClipboardPermission();
  
  // If already granted, return directly
  if (status.granted) {
    return true;
  }

  // If denied or prompt needed, show permission dialog
  if (status.denied || status.prompt || status.unavailable) {
    return await showPermissionDialog(status);
  }

  return false;
};
