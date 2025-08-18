# User Profile Integration Guide

## 概述
本文档说明如何完成前端 `userApi.ts` 与后端 canister 的集成。

## 已完成的工作

### 1. 后端 Canister 实现
- ✅ 在 `society_profile_types.rs` 中实现了完整的用户档案存储结构
- ✅ 在 `stable_mem_storage.rs` 中添加了内存管理
- ✅ 在 `lib.rs` 中添加了所有必要的 API 函数
- ✅ 在 `aio-base-backend.did` 中添加了 Candid 接口定义

### 2. 前端 API 实现
- ✅ 在 `userApi.ts` 中实现了与后端 canister 的交互逻辑
- ✅ 添加了类型转换函数（前端 UserInfo ↔ 后端 UserProfile）
- ✅ 实现了错误处理和本地存储回退机制
- ✅ 添加了所有必要的 API 函数

## 需要完成的步骤

### 1. 生成 Candid 声明文件
在 `alaya-ai-chat-nexus` 目录中运行：
```bash
# 安装 dfx（如果还没有安装）
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# 生成声明文件
dfx generate aio-base-backend
```

### 2. 更新 userApi.ts 中的 canister 引用
将 mock canister 替换为真实的 canister actor：

```typescript
// 替换 mock canister
import { idlFactory } from '../../../declarations/aio-base-backend/aio_base_backend.did';

const canister = Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID });
```

### 3. 配置环境变量
在 `.env` 文件中添加：
```env
VITE_CANISTER_ID=your_canister_id_here
VITE_INTERNET_IDENTITY_HOST=https://ic0.app
```

### 4. 部署后端 Canister
在 `aio-base-backend` 目录中运行：
```bash
dfx deploy
```

## API 功能说明

### 核心功能
- **syncUserInfo**: 同步用户信息到后端
- **getUserInfoByPrincipal**: 通过 Principal ID 获取用户信息
- **upsertNickname**: 更新用户昵称
- **deleteUserProfile**: 删除用户档案

### 扩展功能
- **getUserProfileByEmail**: 通过邮箱查找用户
- **getUserProfileByUserId**: 通过用户 ID 查找用户
- **getUserProfilesPaginated**: 分页获取用户列表
- **getTotalUserProfiles**: 获取用户总数

## 错误处理
- 所有 API 调用都有完整的错误处理
- 当后端调用失败时，自动回退到本地存储
- 详细的日志记录便于调试

## 类型安全
- 完整的 TypeScript 类型定义
- 前端和后端类型自动转换
- 编译时类型检查

## 测试建议
1. 先测试本地存储回退功能
2. 部署后端 canister 后测试真实 API 调用
3. 测试各种错误情况下的回退机制
4. 验证类型转换的正确性

## 注意事项
- 确保后端 canister 已正确部署
- 检查网络连接和 Internet Identity 配置
- 验证 Candid 接口版本匹配
- 测试大数据量下的性能表现
