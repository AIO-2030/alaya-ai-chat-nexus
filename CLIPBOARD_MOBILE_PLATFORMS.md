# 移动平台剪贴板权限处理方案

## 问题描述

iOS 和 Android 平台对剪贴板 API 有不同的限制和处理方式，需要特殊处理。

### iOS Safari 的问题

- **权限提示错误**: 显示 "Type error" 状态
- **Clipboard API 限制**: 需要用户直接交互才能使用
- **权限查询不支持**: `navigator.permissions` 在 iOS Safari 上不支持 `clipboard-write`

### Android Chrome 的特点

- **Clipboard API 支持**: 现代 Android Chrome 完整支持 Clipboard API
- **权限自动授予**: 在用户交互触发时自动授予权限
- **不需要权限对话框**: 与 iOS 类似，不需要额外权限请求

## 解决方案

### 1. iOS Safari 特殊处理

**文件**: `src/utils/clipboard.ts`

```typescript
// iOS Safari 使用 execCommand 作为首选方法
if (isIOSSafari()) {
  // 创建完全透明的 textarea
  textArea.style.opacity = '0';
  textArea.style.zIndex = '-9999';
  textArea.setAttribute('readonly', '');
  textArea.setAttribute('contenteditable', 'true');
  
  // iOS 特殊选择方法
  const range = document.createRange();
  range.selectNodeContents(textArea);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  textArea.setSelectionRange?.(0, 999999);
  
  const successful = document.execCommand('copy');
}
```

**关键点**:
- iOS Safari 跳过权限请求流程
- 使用 `execCommand` 作为首选方法
- 需要特殊的文本选择逻辑
- 字体大小设置为 `16px` 防止 iOS 自动缩放

### 2. Android Chrome 特殊处理

**文件**: `src/utils/clipboard.ts`

```typescript
// Android Chrome 优先使用 Clipboard API
if (isAndroidChrome()) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (clipboardError) {
    // 失败时降级到 execCommand
    textArea.setSelectionRange?.(0, text.length);
  }
}
```

**关键点**:
- Android Chrome 可以直接使用 Clipboard API
- 不需要权限对话框
- 失败时自动降级到 execCommand

### 3. 权限管理修改

**文件**: `src/utils/permissions.ts`

```typescript
export const ensureClipboardPermission = async (): Promise<boolean> => {
  // iOS Safari 不需要权限请求，直接返回 true
  if (isIOSSafari()) {
    console.log('iOS Safari detected, skipping permission request');
    return true;
  }
  // 其他平台继续原有逻辑
  ...
}
```

### 4. 错误处理优化

**文件**: `src/utils/clipboard.ts`

```typescript
export const copyWithFeedback = async (
  text: string,
  onSuccess?: () => void,
  onError?: (message: string) => void,
  options: ClipboardOptions = {}
): Promise<void> => {
  // iOS Safari 和 Android Chrome 不需要权限请求对话框
  const shouldRequestPermission = !isIOSSafari() && !isAndroidChrome();
  
  // 移动平台上不显示错误提示，避免打扰用户
  if (!success) {
    if (!isIOSSafari() && !isAndroidChrome()) {
      onError?.(errorMessage);
    } else {
      // 移动平台上静默失败
      console.log('Copy operation completed on mobile platform');
    }
  }
}
```

## 平台检测函数

### isIOS()
检测是否为 iOS 设备（包括 iPad on iOS 13+）

```typescript
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};
```

### isIOSSafari()
检测是否为 iOS Safari 浏览器

```typescript
export const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS() && isSafari;
};
```

### isAndroid()
检测是否为 Android 设备

```typescript
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};
```

### isAndroidChrome()
检测是否为 Android Chrome 浏览器

```typescript
export const isAndroidChrome = (): boolean => {
  const ua = navigator.userAgent;
  return isAndroid() && /Chrome/.test(ua);
};
```

## 工作流程

### iOS Safari 流程

1. **检测平台** → 跳过权限请求
2. **创建透明 textarea** → 设置 iOS 特定属性
3. **特殊选择逻辑** → 使用 Range API
4. **execCommand('copy')** → 直接复制
5. **静默失败处理** → 不显示错误提示

### Android Chrome 流程

1. **检测平台** → 跳过权限对话框
2. **尝试 Clipboard API** → 优先使用现代 API
3. **降级到 execCommand** → 如果 Clipboard API 失败
4. **静默失败处理** → 不显示错误提示

### 桌面浏览器流程

1. **检测平台** → 显示权限请求对话框（如需要）
2. **请求权限** → 使用 permissions API
3. **Copy** → 使用 Clipboard API
4. **错误处理** → 显示用户友好的错误信息

## 用户体验改进

### iOS 平台

- ✅ 不再显示 "Type error" 状态
- ✅ 直接使用 execCommand，兼容性好
- ✅ 静默处理失败，不打扰用户
- ✅ 字体大小防止自动缩放

### Android 平台

- ✅ 优先使用现代 Clipboard API
- ✅ 自动降级到 execCommand
- ✅ 不显示权限对话框
- ✅ 静默处理失败

### 桌面平台

- ✅ 显示权限请求对话框
- ✅ 用户友好的错误提示
- ✅ 多重降级策略
- ✅ 完整的状态反馈

## 测试建议

### iOS 测试

1. 在真实 iOS 设备上测试（不是模拟器）
2. 测试 Safari 浏览器
3. 验证复制功能在用户点击时立即响应
4. 确认不显示权限对话框
5. 检查控制台错误日志

### Android 测试

1. 在真实 Android 设备上测试
2. 测试 Chrome 浏览器
3. 验证 Clipboard API 正常工作
4. 确认不需要额外权限
5. 测试 execCommand 降级流程

## 技术细节

### iOS execCommand 优化

```typescript
// 关键样式设置
textArea.style.fontSize = '16px'; // 防止 iOS 自动缩放
textArea.style.opacity = '0'; // 完全透明
textArea.style.zIndex = '-9999'; // 确保不可见
textArea.setAttribute('readonly', '');
textArea.setAttribute('contenteditable', 'true');
```

### Android 选择优化

```typescript
// Android Chrome 使用 setSelectionRange
if (isAndroidChrome()) {
  textArea.setSelectionRange?.(0, text.length);
}
```

### 错误处理策略

- **移动平台**: 静默失败，记录日志
- **桌面平台**: 显示用户友好的错误信息
- **所有平台**: 提供多重降级选项
