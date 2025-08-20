# 环境变量读取问题解决方案

## 问题描述
用户报告环境变量无法从`.env`文件中正确读取，导致`userApi.ts`中的canister ID和网络配置无法获取。

## 问题分析
1. **路径配置错误**: `vite.config.js`中的`.env`文件路径配置不正确
2. **环境变量暴露不完整**: `vite-plugin-environment`可能没有正确暴露所有环境变量
3. **双重配置缺失**: 缺少`define`配置来确保环境变量在客户端可用

## 解决方案

### 1. 修复vite.config.js配置
```javascript
// 确保.env文件路径正确
dotenv.config({ path: '../../.env' });

// 添加define配置，显式暴露环境变量
define: {
  'import.meta.env.CANISTER_ID_AIO_BASE_BACKEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_BACKEND),
  'import.meta.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND': JSON.stringify(process.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND),
  'import.meta.env.CANISTER_ID_AIO_BASE_FRONTEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_FRONTEND),
  'import.meta.env.DFX_NETWORK': JSON.stringify(process.env.DFX_NETWORK),
  'import.meta.env.DFX_VERSION': JSON.stringify(process.env.DFX_VERSION),
  // 添加VITE_前缀版本以兼容性
  'import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_BACKEND),
  'import.meta.env.VITE_CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND': JSON.stringify(process.env.CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND),
  'import.meta.env.VITE_CANISTER_ID_AIO_BASE_FRONTEND': JSON.stringify(process.env.CANISTER_ID_AIO_BASE_FRONTEND),
  'import.meta.env.VITE_DFX_NETWORK': JSON.stringify(process.env.DFX_NETWORK),
  'import.meta.env.VITE_DFX_VERSION': JSON.stringify(process.env.DFX_VERSION),
}
```

### 2. 更新environment.ts模块
```typescript
export const getCanisterId = (canisterName: string): string => {
  // 尝试两种格式的环境变量
  const envKey = `CANISTER_ID_${canisterName.toUpperCase()}`;
  const viteKey = `VITE_${envKey}`;
  
  // 首先尝试CANISTER_前缀（来自vite-plugin-environment）
  let envCanisterId = import.meta.env[envKey];
  
  // 如果没找到，尝试VITE_前缀（来自vite.config.js的define）
  if (!envCanisterId) {
    envCanisterId = import.meta.env[viteKey];
  }
  
  if (envCanisterId) {
    console.log(`[Environment] Using canister ID for ${canisterName} from environment:`, envCanisterId);
    return envCanisterId;
  }
  
  // 回退到默认值
  // ...
};
```

### 3. 创建调试工具
- **test-env.ts**: 基本的环境变量测试
- **environment-debug.ts**: 详细的环境变量调试工具
- **EnvironmentTest.tsx**: 可视化的环境变量测试页面

## 测试方法

### 1. 访问测试页面
访问 `/env-test` 路由来查看环境变量状态

### 2. 查看浏览器控制台
打开开发者工具，查看控制台输出：
```
🔍 === Environment Variables Debug ===
📋 All available environment variables: [...]
🏗️ Canister-related variables: [...]
⚙️ DFX-related variables: [...]
🆔 Canister ID values: {...}
🌐 Network configuration: {...}
```

### 3. 验证环境变量
确保以下环境变量被正确加载：
- `CANISTER_ID_AIO_BASE_BACKEND`
- `CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND`
- `CANISTER_ID_AIO_BASE_FRONTEND`
- `DFX_NETWORK`
- `DFX_VERSION`

## 预期结果
- 环境变量应该从`.env`文件中正确读取
- `userApi.ts`应该能够获取到正确的canister ID和网络配置
- 应用应该能够自动在本地和生产环境之间切换

## 故障排除
如果环境变量仍然无法读取：

1. **检查.env文件路径**: 确保`.env`文件在`../../.env`位置
2. **检查环境变量格式**: 确保环境变量没有多余的空格或引号
3. **重启开发服务器**: 环境变量更改后需要重启服务器
4. **检查构建输出**: 查看构建日志中是否有环境变量注入信息

## 文件修改清单
- `vite.config.js` - 添加define配置和环境变量路径
- `src/lib/environment.ts` - 更新环境变量读取逻辑
- `src/lib/test-env.ts` - 创建基本测试工具
- `src/lib/environment-debug.ts` - 创建详细调试工具
- `src/pages/EnvironmentTest.tsx` - 创建测试页面
- `src/main.tsx` - 导入调试工具
- `src/App.tsx` - 添加测试路由

## 下一步
1. 启动开发服务器测试环境变量读取
2. 访问`/env-test`页面验证配置
3. 检查浏览器控制台的调试输出
4. 确认`userApi.ts`能够正确获取环境变量
