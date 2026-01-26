# 任务奖励系统前端实现总结

## 已完成的工作

### 1. API 服务层 ✅

**文件**: `src/services/api/taskRewardsApi.ts`

实现了完整的任务奖励 API 封装：
- `getTaskContract()` - 获取任务合约
- `getOrInitUserTasks()` - 获取或初始化用户任务
- `completeTask()` - 完成任务
- `recordPayment()` - 记录支付
- `getClaimTicket()` - 获取 claim ticket
- `markClaimResult()` - 标记 claim 结果
- `getEpochMeta()` - 获取 epoch 元数据
- `listAllEpochs()` - 列出所有 epochs

**类型定义**：
- `TaskContractItem`
- `UserTaskState`
- `UserTaskDetail`
- `TaskStatus`
- `ClaimTicket`
- `ClaimResultStatus`
- `MerkleSnapshotMeta`

### 2. Profile 页面修改 ✅

**文件**: `src/pages/Profile.tsx`

修改内容：
- 将原来的 token balance 显示部分改为 "Start to Earn" 入口按钮
- 添加了导航到任务奖励页面的功能
- 保留了 token balance 显示（在按钮下方）

**UI 改进**：
- 使用渐变背景和图标
- 添加了悬停效果
- 响应式设计

### 3. 任务奖励页面 ✅

**文件**: `src/pages/TaskRewards.tsx`

实现了完整的任务奖励页面，包括：

**功能**：
1. **任务列表显示**
   - 显示所有任务（注册设备、AI订阅、语音克隆）
   - 任务状态可视化（NotStarted, InProgress, Completed, RewardPrepared, TicketIssued, Claimed）
   - 奖励金额显示
   - 完成时间显示

2. **Claim 功能**
   - 检查可领取奖励
   - 获取 claim ticket
   - 提交链上交易（待实现 Solana 合约集成）
   - 标记 claim 结果
   - 状态管理和错误处理

3. **钱包集成**
   - 检查 Solana 钱包连接状态
   - 未连接时显示连接提示
   - 已连接时显示任务和奖励信息

**UI 特性**：
- 渐变背景和动画效果
- 任务状态图标和颜色编码
- 加载状态指示
- 错误提示
- 成功/失败反馈

### 4. 路由配置 ✅

**文件**: `src/App.tsx`

添加了 `/task-rewards` 路由，指向 `TaskRewards` 组件。

## 待完成的工作

### 1. Solana 合约集成 ⚠️

**当前状态**：Claim 功能中的 Solana 交易提交是模拟的

**需要实现**：
1. 安装 Solana 依赖：
   ```bash
   npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
   ```

2. 创建 Solana 合约 IDL 文件
   - 从部署的合约获取 IDL
   - 放置在 `src/lib/solana/` 目录

3. 实现 `submitClaimToSolana` 函数：
   ```typescript
   // 在 TaskRewards.tsx 中实现
   const submitClaimToSolana = async (
     ticket: ClaimTicket,
     walletAddress: string
   ) => {
     // 1. 连接 Solana
     const connection = new Connection('https://api.mainnet-beta.solana.com');
     const provider = window.phantom?.solana;
     
     // 2. 初始化 Anchor Program
     const program = new Program(IDL, PROGRAM_ID, provider);
     
     // 3. 构建 claim 交易
     const tx = await program.methods
       .claim(
         ticket.epoch,
         ticket.index,
         ticket.amount,
         ticket.proof.map(p => Array.from(p)),
         Array.from(ticket.root)
       )
       .accounts({
         distributor: DISTRIBUTOR_ADDRESS,
         claimStatus: deriveClaimStatusPDA(ticket.epoch, ticket.wallet),
         claimer: new PublicKey(walletAddress),
         // ... other accounts
       })
       .rpc();
     
     return tx;
   };
   ```

4. 配置常量：
   ```typescript
   // src/lib/solana/config.ts
   export const DISTRIBUTOR_PROGRAM_ID = 'your-program-id';
   export const DISTRIBUTOR_ADDRESS = 'your-distributor-pda';
   export const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
   ```

### 2. Root 上链检测 ⚠️

**需要实现**：检查 epoch root 是否已上链

```typescript
const checkRootUploaded = async (epoch: bigint, root: Uint8Array) => {
  const program = new Program(IDL, PROGRAM_ID, provider);
  const epochData = await program.account.epochData.fetch(
    deriveEpochDataPDA(epoch)
  );
  
  return epochData && 
         Buffer.from(epochData.root).equals(Buffer.from(root));
};
```

### 3. 任务完成集成 ⚠️

**需要集成点**：

1. **注册设备任务**：
   - 在 `AddDevice.tsx` 或设备注册成功回调中调用：
   ```typescript
   await completeTask(
     walletAddress,
     'register_device',
     deviceId,
     BigInt(Date.now() * 1_000_000)
   );
   ```

2. **AI 订阅任务**：
   - 在支付成功回调中调用 `recordPayment()`（已自动完成）

3. **语音克隆任务**：
   - 在语音克隆完成页面调用：
   ```typescript
   await completeTask(
     walletAddress,
     'voice_clone',
     voiceCloneId,
     BigInt(Date.now() * 1_000_000)
   );
   ```

### 4. 错误处理增强 ⚠️

**需要添加**：
- 更详细的错误消息
- 重试机制
- 网络错误处理
- 交易超时处理

### 5. 测试 ⚠️

**需要测试**：
- [ ] API 调用测试
- [ ] UI 交互测试
- [ ] Claim 流程端到端测试
- [ ] 错误场景测试

## 文件结构

```
src/alaya-chat-nexus-frontend/
├── src/
│   ├── pages/
│   │   ├── Profile.tsx              # 已修改：添加 Start to Earn 入口
│   │   └── TaskRewards.tsx           # 新建：任务奖励页面
│   ├── services/
│   │   └── api/
│   │       └── taskRewardsApi.ts     # 新建：任务奖励 API
│   └── App.tsx                       # 已修改：添加路由
└── TASK_REWARDS_IMPLEMENTATION.md    # 本文档
```

## 使用说明

### 用户流程

1. **连接钱包**
   - 用户在 Profile 页面连接 Phantom 钱包

2. **查看任务**
   - 点击 "Start to Earn" 按钮
   - 进入任务奖励页面
   - 查看所有任务和状态

3. **完成任务**
   - 注册设备 → 自动完成 `register_device` 任务
   - 支付 AI 订阅 → 自动完成 `ai_subscription` 任务
   - 完成语音克隆 → 自动完成 `voice_clone` 任务

4. **领取奖励**
   - 等待 admin 执行 epoch 结算
   - 任务状态变为 `RewardPrepared`
   - 点击 "Claim Rewards" 按钮
   - 确认交易
   - 等待链上确认
   - 奖励到账

## 下一步行动

1. **立即执行**：
   - 部署 Solana Merkle Distributor 合约（参考 `src/aio-base-backend/scripts/SOLANA_CONTRACT_IMPLEMENTATION_PROMPT.md`）
   - 获取 Program ID 和 Distributor PDA 地址
   - 配置前端常量

2. **集成 Solana 合约**：
   - 安装依赖
   - 添加 IDL 文件
   - 实现 `submitClaimToSolana` 函数
   - 实现 root 上链检测

3. **任务完成集成**：
   - 在设备注册流程中调用 `completeTask`
   - 在语音克隆流程中调用 `completeTask`
   - 在支付流程中调用 `recordPayment`（如未集成）

4. **测试和优化**：
   - 端到端测试
   - UI/UX 优化
   - 性能优化
   - 错误处理完善

## 注意事项

1. **Solana 合约必须与后端 Merkle Tree 规范一致**
   - Leaf hash: `SHA256(epoch || index || wallet || amount)`
   - Parent hash: `SHA256(min(left, right) || max(left, right))`

2. **金额单位**
   - 后端返回的是 PMUG 最小单位（6 位小数）
   - 显示时需要除以 1,000,000

3. **钱包地址格式**
   - 使用 Solana base58 编码的地址
   - 后端会验证格式（32 字节）

4. **错误处理**
   - 所有 API 调用都应该有错误处理
   - 给用户清晰的错误提示
   - 记录错误日志便于调试

## 参考文档

- 后端实现：`src/aio-base-backend/src/task_rewards.rs`
- 前端集成指南：`doc/frontend-claim-integration-prompt.md`
- Solana 合约实现：`src/aio-base-backend/scripts/SOLANA_CONTRACT_IMPLEMENTATION_PROMPT.md`
