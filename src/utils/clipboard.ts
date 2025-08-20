/**
 * Enhanced clipboard copy utility with intelligent fallback methods
 * Handles permissions policy violations and provides robust copy functionality
 */

import { ensureClipboardPermission, isClipboardAPIAvailable } from './permissions.js';

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
  
  // Method 1: Try modern Clipboard API with enhanced error handling and permission management
  if (isClipboardAPIAvailable()) {
    try {
      // 如果需要，请求权限
      if (requestPermission) {
        const hasPermission = await ensureClipboardPermission();
        if (!hasPermission) {
          if (!silent) console.warn('Clipboard permission not granted, trying fallback methods');
        } else {
          // 权限已获得，直接复制
          await navigator.clipboard.writeText(text);
          return true;
        }
      } else {
        // 直接尝试复制，不请求权限
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      if (!silent) console.warn('Clipboard API failed, trying fallback method:', error);
    }
  }

  // Method 2: Enhanced execCommand with better element positioning
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
      textArea.style.fontSize = '16px'; // Prevent zoom on iOS
      
      document.body.appendChild(textArea);
      
      // Focus and select with error handling
      try {
        textArea.focus();
        textArea.select();
        
        // Try to copy
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          return true;
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
  try {
    if (showManualCopyDialog) {
      alert(`Please copy this text manually:\n\n${text}`);
    }
    return false;
  } catch (error) {
    if (!silent) console.error('All clipboard methods failed:', error);
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
    const success = await safeCopyToClipboard(text, {
      requestPermission: true,
      ...options
    });
    
    if (success) {
      onSuccess?.();
    } else {
      const errorMessage = 'Copy failed. Please try the manual copy option.';
      onError?.(errorMessage);
    }
  } catch (error) {
    console.error('Clipboard operation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Copy operation failed';
    onError?.(errorMessage);
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
