# Internet Identity 移动端安全最佳实践实现

## 概述

根据 [DFINITY 论坛的安全最佳实践](https://forum.dfinity.org/t/new-security-best-practice-on-integrating-ii-for-mobile-apps/39157)，本文档说明移动端 II 集成的安全措施实现。

## 实施的安全措施

### 1. **显式 Redirect URI 配置**

```typescript
// 在移动端登录时，显式配置 redirect URI
const redirectUri = currentOrigin + currentPath;

// 安全检查：验证 redirect URI 来自同一 origin（防止开放重定向攻击）
if (!redirectUri.startsWith(currentOrigin)) {
  throw new Error('Invalid redirect URI');
}
```

**目的**：防止开放重定向（Open Redirect）攻击，确保重定向只在同一 origin 内发生。

### 2. **回调 URL 验证**

```typescript
// 检测 II 回调参数的模式
const isPotentialIICallback = hasCode || hasHash || 
  urlParams.has('state') || 
  urlParams.has('error') ||
  window.location.search.includes('identity.ic0.app');

// 验证安全上下文（HTTPS）
if (!window.isSecureContext) {
  throw new Error('II authentication requires secure context (HTTPS)');
}
```

**目的**：
- 识别合法的 II 回调
- 确保在安全上下文中进行认证（防止中间人攻击）

### 3. **Identity 验证**

```typescript
// 在认证后验证 identity 存在
if (redirectAuthed) {
  const identity = client.getIdentity();
  if (!identity) {
    throw new Error('Authentication incomplete');
  }
  // ... 继续处理
}
```

**目的**：确保认证过程完整，不仅认证成功，还要能获取到有效的 identity。

### 4. **URL 参数清理**

```typescript
// 认证完成后立即清理 URL 中的敏感参数
window.history.replaceState({}, document.title, window.location.pathname);
```

**目的**：
- 防止敏感信息泄露（如认证 code、state 等）
- 保持 URL 干净，提升用户体验

### 5. **安全日志记录**

```typescript
// 记录可疑活动
console.warn('[II] Security warning: Callback params present but not authenticated');

// 记录 origin 验证（帮助检测钓鱼攻击）
console.log('[II] Security: Callback origin verified:', window.location.origin);
```

**目的**：
- 帮助调试安全问题
- 检测潜在的网络钓鱼或中间人攻击

### 6. **移动端 Redirect 模式**

```typescript
// 移动设备使用 redirect 模式而不是 popup
const isMobile = isIOSDevice || isAndroidDevice;
const useRedirect = isMobile;

if (useRedirect) {
  // 使用系统浏览器进行重定向，而不是嵌入式 webview
  client.login({
    identityProvider: iiUrl,
    // ... 配置
  });
}
```

**目的**：
- 避免移动端 popup 被阻止
- 使用系统浏览器（更安全，不是嵌入的 webview）

## 安全考虑

### ✅ 已实现

1. **Redirect URI 验证**：确保重定向在可控范围内
2. **HTTPS 要求**：强制安全上下文
3. **Identity 验证**：确保认证完整
4. **URL 清理**：防止信息泄露
5. **回调模式检测**：识别合法的 II 回调
6. **安全日志**：辅助调试和监控

### ⚠️ 注意事项

1. **原生应用集成**：如果是原生应用（React Native 等），需要确保：
   - 使用系统浏览器而不是应用内 webview
   - 配置正确的 URL scheme 来处理回调
   - 验证回调的 URL scheme 和 bundle ID

2. **WebView 警告**：根据论坛讨论，不应使用嵌入式浏览器（webview）进行 II 认证，因为：
   - WebView 可能无法访问系统级 passkey
   - 增加被中间人攻击的风险
   - 可能误导用户添加不安全的设备

3. **新设备添加流程**：避免误导用户添加新设备，确保：
   - 用户明确知道他们在做什么
   - 验证码是在可信设备上生成的
   - 使用独立的系统浏览器

## 参考资源

- [DFINITY 移动端 II 集成安全最佳实践](https://forum.dfinity.org/t/new-security-best-practice-on-integrating-ii-for-mobile-apps/39157)
- [AuthClient 文档](https://github.com/dfinity/internet-identity)

## 实现位置

主要文件：
- `src/lib/ii.ts`：II 认证和安全检查
- `src/lib/auth.ts`：认证流程整合和回调处理

