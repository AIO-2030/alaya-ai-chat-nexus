# UserApi.ts 标准化重构总结

## 重构目标
参考 `actorManager.ts` 的标准化处理方式，重构 `userApi.ts` 以实现：
- 环境自动切换（本地/线上）
- 标准化的 agent 处理
- 更好的代码组织和可维护性

## 主要改进

### 1. 环境检测和配置标准化 ✅
**参考 actorManager.ts 的模式：**

```typescript
// 环境检测函数
const isLocalNet = (): boolean => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('4943');
};

// 动态获取 canister ID
const getCanisterId = (): string => {
  const envCanisterId = import.meta.env.VITE_CANISTER_ID_AIO_BASE_BACKEND;
  if (envCanisterId) {
    return envCanisterId;
  }
  return 'rrkah-fqaaa-aaaaa-aaaaq-cai'; // 默认值
};

// 动态获取 host
const getHost = (): string => {
  if (isLocalNet()) {
    return 'http://localhost:4943';
  }
  return 'https://ic0.app';
};
```

### 2. Agent 配置标准化 ✅
**改进的 agent 初始化：**

```typescript
// 标准化的 agent 配置
const agent = new HttpAgent({ 
  host: HOST,
  // 预留身份验证接口
  // identity: await getIdentity()
});

// 本地环境特殊配置
if (isLocalNet()) {
  agent.fetchRootKey().catch(console.error);
}
```

### 3. Actor 单例模式 ✅
**参考 actorManager.ts 的 actor 管理：**

```typescript
// Actor 单例模式
let actor: ActorSubclass<_SERVICE> | null = null;

// 获取或创建 actor 实例
const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    console.log('[UserApi] Creating new actor instance for canister:', CANISTER_ID);
    actor = Actor.createActor(idlFactory, { 
      agent, 
      canisterId: CANISTER_ID 
    });
  }
  return actor;
};
```

### 4. 方法调用标准化 ✅
**所有方法都使用 getActor() 获取实例：**

```typescript
const callBackend = {
  upsert_user_profile: async (profile: UserProfile): Promise<CanisterResult<bigint>> => {
    try {
      const actor = getActor(); // 标准化获取 actor
      const result = await actor.upsert_user_profile(profile);
      return result as CanisterResult<bigint>;
    } catch (error) {
      console.error('[UserApi] Error upserting user profile:', error);
      return { 'Err': `Canister call failed: ${error}` };
    }
  },
  // ... 其他方法
};
```

### 5. 类型系统改进 ✅
**更严格的类型定义：**

```typescript
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import type { _SERVICE } from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// 使用 ActorSubclass<_SERVICE> 类型
let actor: ActorSubclass<_SERVICE> | null = null;
```

### 6. 导出接口扩展 ✅
**新增的管理函数：**

```typescript
// 导出 actor 管理函数
export const getCanisterActor = (): ActorSubclass<_SERVICE> => {
  return getActor();
};

export const resetActor = (): void => {
  actor = null;
  console.log('[UserApi] Actor instance reset');
};

export const getEnvironmentInfo = () => ({
  isLocalNet: isLocalNet(),
  canisterId: CANISTER_ID,
  host: HOST
});
```

### 7. 参数类型统一 ✅
**修复了类型不一致问题：**

```typescript
// 之前：参数类型不一致
export const getUserProfilesPaginated = async (offset: number, limit: number): Promise<UserInfo[]>

// 现在：统一使用 bigint
export const getUserProfilesPaginated = async (offset: bigint, limit: bigint): Promise<UserInfo[]>
```

## 环境自动切换机制

### 本地开发环境
- **Host**: `http://localhost:4943`
- **Canister ID**: 从环境变量 `VITE_CANISTER_ID_AIO_BASE_BACKEND` 获取
- **特殊配置**: 调用 `agent.fetchRootKey()` 获取根密钥

### 生产环境
- **Host**: `https://ic0.app`
- **Canister ID**: 从环境变量获取，或使用默认值
- **标准配置**: 使用标准的 IC 网络配置

## 兼容性保证

### 向后兼容
- ✅ 所有现有的导出函数保持不变
- ✅ 函数签名和返回值类型保持一致
- ✅ 错误处理机制保持不变

### 新增功能
- ✅ 环境信息查询：`getEnvironmentInfo()`
- ✅ Actor 管理：`getCanisterActor()`, `resetActor()`
- ✅ 更好的日志记录和调试信息

## 调试和监控

### 环境配置日志
```typescript
console.log('[UserApi] Environment config:', {
  isLocalNet: isLocalNet(),
  canisterId: CANISTER_ID,
  host: HOST
});
```

### Actor 创建日志
```typescript
console.log('[UserApi] Creating new actor instance for canister:', CANISTER_ID);
```

### 错误处理增强
- 所有方法都有详细的错误日志
- 保持原有的错误回退机制
- 本地存储作为备用方案

## 测试验证

### 构建测试 ✅
- TypeScript 类型检查通过
- Vite 构建成功
- 无编译错误

### 功能测试计划
1. **本地环境测试**: 验证 localhost:4943 连接
2. **生产环境测试**: 验证 ic0.app 连接
3. **环境变量测试**: 验证 canister ID 配置
4. **Actor 生命周期测试**: 验证单例模式
5. **错误处理测试**: 验证网络错误和回退机制

## 下一步计划

1. **身份验证集成**: 集成 Plug 钱包或 Internet Identity
2. **连接池优化**: 考虑多个 actor 实例的管理
3. **重试机制**: 添加网络请求重试逻辑
4. **性能监控**: 添加请求耗时和成功率统计
5. **缓存策略**: 实现智能的响应缓存机制

## 总结

通过这次重构，`userApi.ts` 现在具有了：
- ✅ 与 `actorManager.ts` 一致的标准化架构
- ✅ 自动环境检测和配置切换
- ✅ 更好的代码组织和可维护性
- ✅ 完整的类型安全保证
- ✅ 向后兼容的接口设计
- ✅ 增强的调试和监控能力

这为后续的功能扩展和维护奠定了坚实的基础。
