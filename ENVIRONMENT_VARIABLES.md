# 环境变量配置说明

## 概述
本项目使用环境变量来配置不同环境下的canister ID和网络设置。环境变量配置支持本地开发和线上环境的自动切换。

## 环境变量来源

### 1. 根目录 .env 文件
项目根目录的 `.env` 文件包含以下关键配置：

```bash
# DFX CANISTER ENVIRONMENT VARIABLES
DFX_VERSION='0.28.0'
DFX_NETWORK='local'
CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND='umunu-kh777-77774-qaaca-cai'
CANISTER_ID_AIO_BASE_FRONTEND='uzt4z-lp777-77774-qaabq-cai'
CANISTER_ID_AIO_BASE_BACKEND='uxrrr-q7777-77774-qaaaq-cai'
CANISTER_ID='umunu-kh777-77774-qaaca-cai'
# END DFX CANISTER ENVIRONMENT VARIABLES
```

### 2. Vite 环境变量插件
`vite.config.js` 中配置了 `vite-plugin-environment` 插件：

```javascript
plugins: [
  // ... 其他插件
  environment("all", { prefix: "CANISTER_" }),  // 自动加载 CANISTER_* 变量
  environment("all", { prefix: "DFX_" }),      // 自动加载 DFX_* 变量
]
```

## 环境变量使用

### 在 userApi.ts 中的使用

```typescript
const getCanisterId = (): string => {
  // 自动读取 CANISTER_ID_AIO_BASE_BACKEND 环境变量
  const envCanisterId = import.meta.env.CANISTER_ID_AIO_BASE_BACKEND;
  if (envCanisterId) {
    console.log('[UserApi] Using canister ID from environment:', envCanisterId);
    return envCanisterId;
  }
  
  // 回退到默认值
  return 'rrkah-fqaaa-aaaaa-aaaaq-cai';
};
```

### 环境检测逻辑

```typescript
const isLocalNet = (): boolean => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('4943');
};

const getHost = (): string => {
  if (isLocalNet()) {
    return 'http://localhost:4943';  // 本地开发环境
  }
  return 'https://ic0.app';          // 线上环境
};
```

## 环境配置

### 本地开发环境
- **网络**: `local`
- **Host**: `http://localhost:4943`
- **Canister ID**: 从 `.env` 文件读取
- **特殊配置**: 调用 `agent.fetchRootKey()` 获取根密钥

### 线上环境
- **网络**: `ic` (Internet Computer 主网)
- **Host**: `https://ic0.app`
- **Canister ID**: 从环境变量或默认值读取
- **标准配置**: 使用标准的 IC 网络配置

## 环境变量列表

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CANISTER_ID_AIO_BASE_BACKEND` | `uxrrr-q7777-77774-qaaaq-cai` | 后端服务canister ID |
| `CANISTER_ID_ALAYA_CHAT_NEXUS_FRONTEND` | `umunu-kh777-77774-qaaca-cai` | 前端应用canister ID |
| `CANISTER_ID_AIO_BASE_FRONTEND` | `uzt4z-lp777-77774-qaabq-cai` | 基础前端canister ID |
| `DFX_NETWORK` | `local` | DFX网络环境 |
| `DFX_VERSION` | `0.28.0` | DFX工具版本 |

## 配置验证

### 1. 检查环境变量是否正确加载
在浏览器控制台中运行：

```javascript
console.log('Environment variables:', {
  canisterId: import.meta.env.CANISTER_ID_AIO_BASE_BACKEND,
  network: import.meta.env.DFX_NETWORK,
  version: import.meta.env.DFX_VERSION
});
```

### 2. 检查网络连接
在浏览器控制台中运行：

```javascript
// 检查本地环境
fetch('http://localhost:4943/api/v2/status')
  .then(response => console.log('Local network accessible:', response.ok))
  .catch(error => console.log('Local network error:', error));

// 检查线上环境
fetch('https://ic0.app/api/v2/status')
  .then(response => console.log('IC network accessible:', response.ok))
  .catch(error => console.log('IC network error:', error));
```

## 故障排除

### 问题1: 环境变量未定义
**症状**: `import.meta.env.CANISTER_ID_AIO_BASE_BACKEND` 返回 `undefined`

**解决方案**:
1. 确认根目录 `.env` 文件存在
2. 检查 `vite.config.js` 中的 `dotenv.config()` 路径
3. 重启开发服务器

### 问题2: 网络连接失败
**症状**: CSP错误或网络请求失败

**解决方案**:
1. 检查CSP配置是否正确
2. 确认网络环境（本地/线上）
3. 验证canister ID是否正确

### 问题3: 环境切换不工作
**症状**: 始终使用默认配置

**解决方案**:
1. 检查 `isLocalNet()` 函数的逻辑
2. 确认 `window.location.hostname` 的值
3. 验证环境检测逻辑

## 最佳实践

### 1. 环境变量命名
- 使用 `CANISTER_ID_` 前缀
- 使用大写字母和下划线
- 避免使用特殊字符

### 2. 配置管理
- 将敏感信息放在 `.env` 文件中
- 将 `.env` 文件添加到 `.gitignore`
- 提供 `.env.example` 作为模板

### 3. 错误处理
- 总是提供默认值作为回退
- 记录环境配置信息用于调试
- 实现优雅的错误处理机制

## 更新日志

- **2024-01-XX**: 初始环境变量配置
- **2024-01-XX**: 添加自动环境检测
- **2024-01-XX**: 集成vite-plugin-environment
- **2024-01-XX**: 修复环境变量读取问题
