/**
 * Enhanced clipboard copy utility with intelligent fallback methods
 * Handles permissions policy violations and provides robust copy functionality
 * iOS Safari specific handling included
 */

import { ensureClipboardPermission, isClipboardAPIAvailable } from './permissions.js';

/**
 * Detect if device is iOS
 */
export const isIOS = (): boolean => {
  const ua = navigator.userAgent;
  console.log('[Platform] Checking iOS, userAgent:', ua);
  
  // Check for iPhone or iPod
  if (/iPhone|iPod/.test(ua)) {
    console.log('[Platform] Detected iPhone/iPod');
    return true;
  }
  
  // Check for iPad (but not iPad Pro on iOS 13+ which can appear as MacIntel)
  if (/iPad/.test(ua)) {
    console.log('[Platform] Detected iPad');
    return true;
  }
  
  // iOS 13+ iPad Pro detection: appears as MacIntel but has touch points
  // AND doesn't have "Mac OS X" in user agent (that's real Mac)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    const hasMacOSX = /Mac OS X/.test(ua);
    console.log('[Platform] MacIntel platform with touch points, hasMacOSX:', hasMacOSX);
    // If it has Mac OS X, it's a real Mac, not iPad
    // If it doesn't have Mac OS X, it's likely an iPad Pro
    return !hasMacOSX;
  }
  
  console.log('[Platform] Not iOS');
  return false;
};

/**
 * Detect if browser is iOS Safari
 */
export const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOSDevice = isIOS();
  console.log('[Platform] isIOS:', isIOSDevice, 'isSafari:', isSafari);
  return isIOSDevice && isSafari;
};

/**
 * Detect if device is Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Detect if browser is Android Chrome
 */
export const isAndroidChrome = (): boolean => {
  const ua = navigator.userAgent;
  return isAndroid() && /Chrome/.test(ua);
};

interface ClipboardOptions {
  silent?: boolean; // Don't show console warnings
  showManualCopyDialog?: boolean; // Show manual copy dialog as fallback
  requestPermission?: boolean; // Whether to request permission if needed
}

/**
 * Enhanced clipboard copy with intelligent fallback detection
 * @param text - The text to copy
 * @param options - Configuration options
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export const safeCopyToClipboard = async (
  text: string, 
  options: ClipboardOptions = {}
): Promise<boolean> => {
  const { silent = false, showManualCopyDialog = true, requestPermission = true } = options;
  
  console.log('[Clipboard] Starting copy operation, text length:', text.length);
  console.log('[Clipboard] Options:', { silent, showManualCopyDialog, requestPermission });
  console.log('[Clipboard] Platform check:', {
    isIOS: isIOS(),
    isIOSSafari: isIOSSafari(),
    isAndroid: isAndroid(),
    isAndroidChrome: isAndroidChrome(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints
  });
  
  // Check if this is simulated iOS in Chrome DevTools
  // Chrome DevTools simulation uses iPhone userAgent but is still Chrome
  const ua = navigator.userAgent;
  const isChromeSimulatediOS = /iPhone|iPad|iPod/.test(ua) && /Chrome/.test(ua);
  const isRealIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
  const isActuallyIOS = isRealIOS || isChromeSimulatediOS;
  
  if (isActuallyIOS) {
    console.log('[Clipboard] iOS detected - Real:', isRealIOS, 'Simulated:', isChromeSimulatediOS);
    
    // For Chrome DevTools simulation, use normal methods
    if (isChromeSimulatediOS) {
      console.log('[Clipboard] Chrome DevTools iOS simulation - using normal methods');
      // Don't use iOS-specific handling for simulated iOS
    } else {
      // Real iOS device handling
      console.log('[Clipboard] Real iOS device - using iOS-specific handling');
      
      // Method 1: Try modern Clipboard API first (iOS 13.4+)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          console.log('[Clipboard] Trying Clipboard API on real iOS...');
          await navigator.clipboard.writeText(text);
          console.log('[Clipboard] iOS Clipboard API copy successful');
          return true;
        } catch (error) {
          console.warn('[Clipboard] iOS Clipboard API failed:', error);
        }
      }
      
      // Method 2: Fallback to execCommand for real iOS
      try {
        console.log('[Clipboard] Falling back to execCommand on real iOS...');
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
        textArea.style.width = '1px';
        textArea.style.height = '1px';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        textArea.style.fontSize = '12px';
        textArea.setAttribute('readonly', 'readonly');
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.setSelectionRange(0, text.length);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          console.log('[Clipboard] iOS execCommand copy successful');
          return true;
        } else {
          console.warn('[Clipboard] iOS execCommand copy returned false');
        }
      } catch (error) {
        console.warn('[Clipboard] iOS execCommand failed:', error);
      }
      
      console.warn('[Clipboard] Real iOS copy failed, suggesting manual copy');
      return false;
    }
  }
  
  // Method 1: Try modern Clipboard API with enhanced error handling and permission management
  // Note: iOS Safari is handled separately above
  if (isClipboardAPIAvailable()) {
    try {
      console.log('[Clipboard] Trying Clipboard API, requestPermission:', requestPermission);
      
      // Non-iOS Safari uses permission management
      if (requestPermission) {
        const hasPermission = await ensureClipboardPermission();
        console.log('[Clipboard] Permission check result:', hasPermission);
        
        if (!hasPermission) {
          if (!silent) console.warn('[Clipboard] Permission not granted, trying fallback methods');                                                               
        } else {
          // Permission granted, copy directly
          console.log('[Clipboard] Permission granted, copying text...');
          await navigator.clipboard.writeText(text);
          console.log('[Clipboard] Text copied successfully');
          return true;
        }
      } else {
        // Try to copy directly without requesting permission
        console.log('[Clipboard] Skipping permission check, copying directly...');
        await navigator.clipboard.writeText(text);
        console.log('[Clipboard] Text copied successfully (no permission check)');
        return true;
      }
    } catch (error) {
      console.error('[Clipboard] Clipboard API failed:', error);
      if (!silent) console.warn('[Clipboard] Trying fallback method...', error);                                                                        
    }
  }

  // Method 2: Enhanced execCommand with better element positioning
  // Both Android and iOS require special handling
  console.log('[Clipboard] Trying Method 2: execCommand');
  try {
    if (typeof document.execCommand === 'function') {
      // Create a more robust textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make it invisible but accessible
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.fontSize = '16px'; // Prevent zoom on mobile
      
      // Android-specific attributes
      if (isAndroid()) {
        textArea.style.webkitUserSelect = 'text';
        textArea.setAttribute('readonly', '');
      }
      
      // iOS-specific attributes
      if (isIOS()) {
        textArea.setAttribute('contenteditable', 'true');
      }
      
      document.body.appendChild(textArea);
      
      // Focus and select with error handling
      try {
        textArea.focus();
        
        // Different platforms need special selection methods
        if (isAndroidChrome()) {
          // Android Chrome prefers Clipboard API, fallback to execCommand
          try {
            await navigator.clipboard.writeText(text);
            document.body.removeChild(textArea);
            return true;
          } catch (clipboardError) {
            // Clipboard API failed, continue with execCommand
            textArea.setSelectionRange?.(0, text.length);
          }
        } else if (isIOS()) {
          // iOS special selection method
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          textArea.setSelectionRange?.(0, 999999);
        } else {
          // Other platforms use standard selection
          textArea.select();
        }
        
        // Try to copy
        const successful = document.execCommand('copy');
        console.log('[Clipboard] execCommand result:', successful);
        document.body.removeChild(textArea);
        
        if (successful) {
          console.log('[Clipboard] execCommand copy successful');
          return true;
        } else {
          console.warn('[Clipboard] execCommand returned false');
        }
      } catch (focusError) {
        document.body.removeChild(textArea);
        if (!silent) console.warn('Focus/select failed:', focusError);
      }
    }
  } catch (error) {
    if (!silent) console.warn('execCommand fallback failed:', error);
  }

  // Method 3: Selection API with enhanced error handling
  try {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      const textNode = document.createTextNode(text);
      
      // Create a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(textNode);
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-999999px';
      tempDiv.style.top = '-999999px';
      
      document.body.appendChild(tempDiv);
      
      range.selectNodeContents(tempDiv);
      selection.removeAllRanges();
      selection.addRange(range);
      
      const successful = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(tempDiv);
      
      if (successful) {
        return true;
      }
    }
  } catch (error) {
    if (!silent) console.warn('Selection API fallback failed:', error);
  }

  // Method 4: Create a visible copy button as fallback
  if (showManualCopyDialog) {
    try {
      return await createVisibleCopyButton(text);
    } catch (error) {
      if (!silent) console.warn('Visible copy button failed:', error);
    }
  }

  // Method 5: Show text in alert for manual copy (last resort)
  console.warn('[Clipboard] All methods failed, showing manual copy dialog');
  try {
    if (showManualCopyDialog) {
      alert(`Please copy this text manually:\n\n${text}`);
    }
    return false;
  } catch (error) {
    if (!silent) console.error('[Clipboard] All clipboard methods failed:', error);
    return false;
  }
};

/**
 * Create a visible copy button as a fallback method
 * @param text - Text to copy
 * @returns Promise<boolean> - True if user successfully copied
 */
const createVisibleCopyButton = async (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
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

    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Copy Text';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #e2e8f0;
    `;

    // Create text display
    const textDisplay = document.createElement('div');
    textDisplay.textContent = text;
    textDisplay.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      word-break: break-all;
      color: #cbd5e1;
      max-height: 200px;
      overflow-y: auto;
    `;

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.style.cssText = `
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin: 8px;
      transition: all 0.2s;
    `;

    copyBtn.onmouseover = () => {
      copyBtn.style.transform = 'translateY(-1px)';
      copyBtn.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
    };

    copyBtn.onmouseout = () => {
      copyBtn.style.transform = 'translateY(0)';
      copyBtn.style.boxShadow = 'none';
    };

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin: 8px;
      transition: all 0.2s;
    `;

    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    };

    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    };

    // Add event listeners
    copyBtn.onclick = async () => {
      try {
        // Try one more time with the visible text
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          copyBtn.textContent = 'Copied!';
          copyBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          setTimeout(() => {
            document.body.removeChild(overlay);
            resolve(true);
          }, 1000);
        } else {
          copyBtn.textContent = 'Failed - Select text manually';
          copyBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          // Select the text for manual copy
          textDisplay.style.userSelect = 'text';
          (textDisplay.style as any).webkitUserSelect = 'text';
          (textDisplay.style as any).mozUserSelect = 'text';
          (textDisplay.style as any).msUserSelect = 'text';
        }
      } catch (error) {
        copyBtn.textContent = 'Failed - Select text manually';
        copyBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        // Select the text for manual copy
        textDisplay.style.userSelect = 'text';
        (textDisplay.style as any).webkitUserSelect = 'text';
        (textDisplay.style as any).mozUserSelect = 'text';
        (textDisplay.style as any).msUserSelect = 'text';
      }
    };

    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    // Assemble modal
    modal.appendChild(title);
    modal.appendChild(textDisplay);
    modal.appendChild(copyBtn);
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);

    // Add to DOM
    document.body.appendChild(overlay);

    // Auto-close on escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Auto-close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
  });
};

/**
 * Enhanced copy text with user feedback and intelligent fallback
 * @param text - Text to copy
 * @param onSuccess - Success callback
 * @param onError - Error callback
 * @param options - Clipboard options
 */
export const copyWithFeedback = async (
  text: string,
  onSuccess?: () => void,
  onError?: (message: string) => void,
  options: ClipboardOptions = {}
): Promise<void> => {
  try {
    // iOS Safari and Android Chrome don't need permission request dialog
    // iOS uses execCommand, Android Chrome can automatically use Clipboard API
    const shouldRequestPermission = !isIOSSafari() && !isAndroidChrome();
    
    const success = await safeCopyToClipboard(text, {
      requestPermission: shouldRequestPermission,
      ...options
    });
    
    if (success) {
      onSuccess?.();
    } else {
      // On mobile platforms, don't show error prompts to avoid disturbing users
      if (!isIOSSafari() && !isAndroidChrome()) {
        const errorMessage = 'Copy failed. Please try the manual copy option.';
        onError?.(errorMessage);
      } else {
        // Silent failure on mobile platforms
        console.log('Copy operation completed on mobile platform');
      }
    }
  } catch (error) {
    console.error('Clipboard operation failed:', error);
    
    // On mobile platforms, don't show error prompts
    if (!isIOSSafari() && !isAndroidChrome()) {
      const errorMessage = error instanceof Error ? error.message : 'Copy operation failed';                                                                      
      onError?.(errorMessage);
    } else {
      console.log('Copy operation failed silently on mobile platform');
    }
  }
};

/**
 * Check if clipboard API is available and has permissions
 */
export const isClipboardAvailable = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const permission = await navigator.permissions?.query({ name: 'clipboard-write' as PermissionName });
      return permission?.state === 'granted' || permission?.state === 'prompt';
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Get detailed clipboard status message
 */
export const getClipboardStatus = async (): Promise<string> => {
  try {
    if (await isClipboardAvailable()) {
      return 'Clipboard API available with permissions';
    } else if (typeof document.execCommand === 'function') {
      return 'Using fallback copy method (execCommand)';
    } else {
      return 'Manual copy required - no clipboard support';
    }
  } catch {
    return 'Clipboard status unknown';
  }
};

/**
 * Request clipboard permission (if supported)
 */
export const requestClipboardPermission = async (): Promise<boolean> => {
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
      if (permission.state === 'prompt') {
        // Try to trigger permission request
        await navigator.clipboard.writeText('test');
        return true;
      }
      return permission.state === 'granted';
    }
    return false;
  } catch {
    return false;
  }
};
