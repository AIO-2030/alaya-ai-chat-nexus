# Google OAuth 集成指南

## 概述

本项目已集成完整的 Google OAuth 认证系统，包含以下功能：

- 🔐 完整的 Google OAuth 2.0 认证流程
- 🎯 独立的 `useGoogleAuth` hook
- 🔄 Token 自动刷新
- 💾 用户状态持久化
- 🛡️ 错误处理和重试机制

## 文件结构

```
src/
├── hooks/
│   └── useGoogleAuth.ts          # Google OAuth hook
├── components/
│   └── GoogleAuthProvider.tsx    # Google API 初始化组件
└── lib/
    └── auth.ts                   # 更新后的认证逻辑
```

## 设置步骤

### 1. 获取 Google OAuth 客户端 ID

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 在 "凭据" 页面创建 OAuth 2.0 客户端 ID
5. 配置授权重定向 URI：`http://localhost:3000/auth/callback`

### 2. 配置环境变量

复制 `env.example` 为 `.env.local` 并填入你的客户端 ID：

```bash
cp env.example .env.local
```

编辑 `.env.local`：

```env
REACT_APP_GOOGLE_CLIENT_ID=your_actual_client_id_here
```

### 3. 安装依赖

```bash
npm install @google-cloud/local-auth googleapis
```

## 使用方法

### 在组件中使用

```tsx
import { useAuth } from '../lib/auth';

const MyComponent = () => {
  const { 
    user, 
    loading, 
    error, 
    loginWithGoogle, 
    logout,
    isAuthenticated 
  } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      console.log('登录成功！');
    } catch (error) {
      console.error('登录失败:', error);
    }
  };

  return (
    <div>
      {loading && <div>加载中...</div>}
      {error && <div>错误: {error}</div>}
      
      {isAuthenticated() ? (
        <div>
          <p>欢迎, {user?.name}!</p>
          <button onClick={logout}>登出</button>
        </div>
      ) : (
        <button onClick={handleGoogleLogin}>
          使用 Google 登录
        </button>
      )}
    </div>
  );
};
```

### 直接使用 Google OAuth Hook

```tsx
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const GoogleLoginComponent = () => {
  const {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    refreshToken,
    validateUser,
    isAuthenticated
  } = useGoogleAuth();

  // 高级功能示例
  const handleTokenRefresh = async () => {
    const newToken = await refreshToken();
    if (newToken) {
      console.log('Token 已刷新');
    }
  };

  const handleUserValidation = async () => {
    const isValid = await validateUser();
    if (!isValid) {
      console.log('用户会话已过期');
    }
  };

  return (
    <div>
      {/* 组件内容 */}
    </div>
  );
};
```

## API 参考

### useGoogleAuth Hook

#### 返回值

| 属性 | 类型 | 描述 |
|------|------|------|
| `user` | `GoogleUser \| null` | 当前用户信息 |
| `loading` | `boolean` | 加载状态 |
| `error` | `string \| null` | 错误信息 |
| `loginWithGoogle` | `() => Promise<GoogleUser>` | Google 登录方法 |
| `logout` | `() => Promise<void>` | 登出方法 |
| `refreshToken` | `() => Promise<string \| null>` | 刷新访问令牌 |
| `validateUser` | `() => Promise<boolean>` | 验证用户状态 |
| `isAuthenticated` | `() => boolean` | 检查是否已认证 |

#### GoogleUser 接口

```typescript
interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  accessToken?: string;
  loginMethod: 'google';
}
```

### GoogleAuthProvider 组件

#### Props

| 属性 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `children` | `ReactNode` | ✅ | 子组件 |
| `clientId` | `string` | ❌ | Google 客户端 ID |
| `onAuthReady` | `() => void` | ❌ | 认证就绪回调 |
| `onAuthError` | `(error: string) => void` | ❌ | 错误回调 |

## 错误处理

### 常见错误及解决方案

1. **"Google API not loaded"**
   - 检查网络连接
   - 确保 Google API 脚本正确加载

2. **"Failed to initialize Google Auth"**
   - 验证客户端 ID 是否正确
   - 检查重定向 URI 配置

3. **"Backend validation failed"**
   - 检查后端 API 是否正常运行
   - 验证 API 端点配置

## 安全注意事项

1. **客户端 ID 安全**
   - 不要在客户端代码中暴露客户端密钥
   - 使用环境变量管理敏感信息

2. **Token 管理**
   - 定期刷新访问令牌
   - 在用户登出时清除所有令牌

3. **用户数据保护**
   - 只请求必要的权限范围
   - 安全存储用户信息

## 故障排除

### 开发环境问题

1. **CORS 错误**
   ```bash
   # 在 package.json 中添加代理配置
   "proxy": "http://localhost:3000"
   ```

2. **环境变量未生效**
   ```bash
   # 重启开发服务器
   npm run dev
   ```

3. **Google API 加载失败**
   - 检查网络连接
   - 验证 Google Cloud Console 配置

## 生产环境部署

1. **更新重定向 URI**
   - 在 Google Cloud Console 中添加生产域名
   - 更新环境变量中的客户端 ID

2. **HTTPS 要求**
   - 确保生产环境使用 HTTPS
   - Google OAuth 要求安全连接

3. **错误监控**
   - 集成错误监控服务
   - 监控认证失败率

## 更新日志

- **v1.0.0**: 初始实现
  - 完整的 Google OAuth 2.0 集成
  - 独立的 hook 封装
  - 自动 token 刷新
  - 错误处理和重试机制 