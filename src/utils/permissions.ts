/**
 * 权限管理工具
 * 处理 Clipboard API 和其他浏览器权限
 */

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  unavailable: boolean;
  error?: string;
}

/**
 * 请求 Clipboard 写入权限
 */
export const requestClipboardPermission = async (): Promise<PermissionStatus> => {
  try {
    // 检查是否支持权限 API
    if (!navigator.permissions) {
      return {
        granted: false,
        denied: false,
        prompt: false,
        unavailable: true,
        error: 'Permissions API not supported'
      };
    }

    // 检查当前权限状态
    const permission = await navigator.permissions.query({ 
      name: 'clipboard-write' as PermissionName 
    });

    const status: PermissionStatus = {
      granted: permission.state === 'granted',
      denied: permission.state === 'denied',
      prompt: permission.state === 'prompt',
      unavailable: false
    };

    // 如果权限状态是 prompt，尝试触发权限请求
    if (permission.state === 'prompt') {
      try {
        // 尝试写入一个测试文本来触发权限请求
        await navigator.clipboard.writeText('permission_test');
        // 如果成功，重新检查权限状态
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
 * 检查 Clipboard API 是否可用
 */
export const isClipboardAPIAvailable = (): boolean => {
  return !!(navigator.clipboard && window.isSecureContext);
};

/**
 * 获取权限状态描述
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
 * 显示权限请求对话框
 */
export const showPermissionDialog = (status: PermissionStatus): Promise<boolean> => {
  return new Promise((resolve) => {
    // 创建权限请求对话框
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

    // 事件处理
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

    // 组装对话框
    buttonContainer.appendChild(allowBtn);
    buttonContainer.appendChild(cancelBtn);
    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);

    // 添加到页面
    document.body.appendChild(overlay);

    // ESC 键关闭
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // 点击外部关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };
  });
};

/**
 * 智能权限管理：自动检查并请求权限
 */
export const ensureClipboardPermission = async (): Promise<boolean> => {
  // 首先检查 Clipboard API 是否可用
  if (!isClipboardAPIAvailable()) {
    console.warn('Clipboard API not available');
    return false;
  }

  // 检查当前权限状态
  const status = await requestClipboardPermission();
  
  // 如果已经授权，直接返回
  if (status.granted) {
    return true;
  }

  // 如果被拒绝或需要提示，显示权限对话框
  if (status.denied || status.prompt || status.unavailable) {
    return await showPermissionDialog(status);
  }

  return false;
};
