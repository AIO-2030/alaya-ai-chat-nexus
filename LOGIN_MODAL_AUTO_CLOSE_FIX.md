# 登录弹窗自动关闭问题修复

## 问题描述
用户报告当后端请求成功后，日志显示 `[UserApi] Synced user info to canister, index: 0n`，但登录弹窗没有主动关闭，需要手动关闭。

## 问题分析
通过代码审查发现，问题出现在 `AppHeader.tsx` 组件的登录弹窗状态管理上：

1. **状态更新延迟**: 登录成功后，`user` 状态更新可能有延迟
2. **错误处理缺失**: 登录方法缺少适当的错误处理
3. **弹窗关闭逻辑不完整**: 只依赖手动调用 `setShowLoginModal(false)`

## 解决方案

### 1. 添加自动关闭逻辑
在 `AppHeader.tsx` 中添加了 `useEffect` 来监听 `user` 状态变化：

```typescript
// Auto-close login modal when user is authenticated
React.useEffect(() => {
  if (user && showLoginModal) {
    console.log('[AppHeader] User authenticated, auto-closing login modal');
    setShowLoginModal(false);
  }
}, [user, showLoginModal]);
```

### 2. 改进错误处理
为登录方法添加了 try-catch 错误处理：

```typescript
const handleWalletLogin = async () => {
  try {
    const result = await loginWithWallet();
    console.log('[AppHeader] Wallet login successful, closing modal');
    setShowLoginModal(false);
    return result;
  } catch (error) {
    console.error('[AppHeader] Wallet login failed:', error);
    // Don't close modal on error, let user try again
    throw error;
  }
};
```

### 3. 双重保障机制
现在登录弹窗的关闭有两种保障：
- **手动关闭**: 登录成功后立即调用 `setShowLoginModal(false)`
- **自动关闭**: `useEffect` 监听 `user` 状态变化，自动关闭弹窗

## 修复后的工作流程

1. 用户点击登录按钮
2. 登录弹窗显示 (`setShowLoginModal(true)`)
3. 用户完成登录流程
4. 后端同步用户信息成功
5. `user` 状态更新为已认证用户
6. `useEffect` 检测到状态变化，自动关闭弹窗
7. 登录弹窗消失，用户进入已认证状态

## 日志输出
修复后，您应该能看到以下日志：
```
[AppHeader] User authenticated, auto-closing login modal
[UserApi] Synced user info to canister, index: 0n
```

## 文件修改
- `src/components/AppHeader.tsx` - 添加自动关闭逻辑和错误处理

## 测试验证
1. 启动应用
2. 点击登录按钮
3. 完成登录流程
4. 验证登录弹窗是否自动关闭
5. 检查浏览器控制台的日志输出

## 预期结果
- 登录成功后，弹窗应该自动关闭
- 不需要手动关闭弹窗
- 用户状态正确更新
- 应用进入已认证状态
