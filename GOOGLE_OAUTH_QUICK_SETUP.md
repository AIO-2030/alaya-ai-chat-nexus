# Google OAuth 快速设置指南

## 当前状态
✅ 应用正在使用模拟 Google 登录，功能正常
⚠️ 如需使用真实的 Google OAuth，请按以下步骤配置

## 快速设置步骤

### 1. 获取 Google OAuth 客户端 ID

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API：
   - 转到 "API 和服务" > "库"
   - 搜索 "Google+ API" 并启用

4. 创建 OAuth 2.0 凭据：
   - 转到 "API 和服务" > "凭据"
   - 点击 "创建凭据" > "OAuth 2.0 客户端 ID"
   - 选择 "Web 应用程序"
   - 添加授权重定向 URI：`http://localhost:3000/auth/callback`

5. 复制客户端 ID（格式：`123456789-abcdef.apps.googleusercontent.com`）

### 2. 配置环境变量

创建 `.env.local` 文件：
```bash
cp env.example .env.local
```

编辑 `.env.local`，添加您的客户端 ID：
```env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
```

### 3. 重启开发服务器

```bash
npm run dev
```

## 验证配置

配置成功后，您应该看到：
- ✅ 控制台不再显示 "Google Client ID not configured"
- ✅ 点击 "Sign in with Google" 会打开真实的 Google 登录页面
- ✅ 用户可以使用真实的 Google 账户登录

## 故障排除

### 如果仍然显示模拟登录：
1. 检查 `.env.local` 文件是否存在
2. 确认 `VITE_GOOGLE_CLIENT_ID` 已正确设置
3. 重启开发服务器
4. 清除浏览器缓存

### 如果出现 CSP 错误：
- CSP 已配置支持 Google API，如果仍有问题，请检查网络连接

### 如果 Google 登录失败：
1. 确认 Google Cloud Console 中的重定向 URI 配置正确
2. 检查客户端 ID 是否正确复制
3. 确认 Google+ API 已启用

## 当前功能状态

- ✅ **模拟登录**: 正常工作，用户可以使用
- ✅ **应用功能**: 完全正常，不受 Google Auth 影响
- ✅ **错误处理**: 优雅的回退机制
- ⚠️ **真实 Google 登录**: 需要配置客户端 ID

## 生产环境部署

部署到生产环境时：
1. 在 Google Cloud Console 中添加生产域名到授权重定向 URI
2. 更新环境变量中的客户端 ID
3. 确保使用 HTTPS（Google OAuth 要求）

---

**注意**: 当前模拟登录功能完全可用，用户可以获得完整的应用体验。真实 Google OAuth 是可选的增强功能。 