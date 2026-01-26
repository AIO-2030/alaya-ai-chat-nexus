# Frontend Claim Integration Prompt - 任务奖励系统前端集成指南

本文档是给 Cursor 的提示词，用于在前端集成任务奖励和 Claim 功能。

## 概述

后端已经实现了完整的任务激励系统，包括：
1. 三个任务：注册设备(register_device)、AI订阅(ai_subscription)、语音克隆(voice_clone)
2. Merkle Tree 快照生成（用于链上claim）
3. Claim Ticket API（生成 Merkle proof）

前端需要集成以下功能：
1. 用户登录后显示任务状态
2. 用户完成任务后调用后端API标记完成
3. 支付成功后触发AI订阅任务完成
4. Claim 页面：连接 Phantom 钱包，获取 ticket，提交 Solana 链上 claim

## 1. Backend API 集成

### 1.1 用户任务状态 API

**获取或初始化用户任务**
```typescript
// API: get_or_init_user_tasks(wallet: string) -> UserTaskState

interface UserTaskDetail {
  taskid: string;  // "register_device" | "ai_subscription" | "voice_clone"
  status: "NotStarted" | "InProgress" | "Completed" | "RewardPrepared" | "TicketIssued" | "Claimed";
  completed_at?: bigint;  // timestamp in nanoseconds
  reward_amount: bigint;  // PMUG tokens (smallest unit)
  evidence?: string;
  prepared_epoch?: bigint;
}

interface UserTaskState {
  wallet: string;  // Solana wallet address (base58)
  tasks: UserTaskDetail[];
  updated_at: bigint;
}

// 调用示例
const taskState = await canister.get_or_init_user_tasks(walletAddress);
console.log('User tasks:', taskState);
```

**推荐集成点**：用户登录后，在任务中心页面调用此API获取任务状态并展示。

### 1.2 完成任务 API

**完成注册设备任务**
```typescript
// API: complete_task(wallet: string, taskid: string, evidence?: string, ts: bigint) -> Result<(), string>

// 用户注册设备后调用
const result = await canister.complete_task(
  walletAddress,
  "register_device",
  deviceId,  // optional evidence
  BigInt(Date.now() * 1_000_000)  // timestamp in nanoseconds
);

if (result.Ok !== undefined) {
  console.log('Device registration task completed!');
  // 显示成功提示，刷新任务状态
}
```

**完成语音克隆任务**
```typescript
// 用户完成语音克隆后调用
const result = await canister.complete_task(
  walletAddress,
  "voice_clone",
  voiceCloneId,  // optional evidence
  BigInt(Date.now() * 1_000_000)
);
```

**推荐集成点**：
- 注册设备：在设备注册成功页面/回调中调用
- 语音克隆：在语音克隆完成页面/回调中调用

### 1.3 记录支付 API（AI订阅自动完成）

```typescript
// API: record_payment(wallet: string, amount_paid: bigint, tx_ref: string, ts: bigint, payfor: string) -> Result<(), string>

// 用户完成AI订阅支付后调用
const result = await canister.record_payment(
  walletAddress,
  amountPaid,      // 支付金额
  orderId,         // 订单号或交易ID
  BigInt(Date.now() * 1_000_000),
  "AI_ORDER"       // 支付类型
);

// 此调用会自动完成 ai_subscription 任务
```

**推荐集成点**：在支付成功回调中调用，无需额外调用 complete_task。

### 1.4 Claim Ticket API

```typescript
// API: get_claim_ticket(wallet: string) -> Result<ClaimTicket, string>

interface ClaimTicket {
  epoch: bigint;
  index: number;
  wallet: string;
  amount: bigint;         // 总奖励金额
  proof: Uint8Array[];    // Merkle proof (每个元素32字节)
  root: Uint8Array;       // Merkle root (32字节)
}

// 获取 claim ticket
const ticketResult = await canister.get_claim_ticket(walletAddress);

if (ticketResult.Ok) {
  const ticket = ticketResult.Ok;
  console.log('Claim ticket:', ticket);
  // 继续链上claim流程
} else {
  console.error('Failed to get claim ticket:', ticketResult.Err);
  // 显示错误：可能是没有可claim的奖励或ticket已发放
}
```

### 1.5 标记 Claim 结果 API

```typescript
// API: mark_claim_result(wallet: string, epoch: bigint, status: ClaimResultStatus, tx_sig?: string) -> Result<(), string>

type ClaimResultStatus = "Success" | "Failed" | "Pending";

// 链上claim成功后调用
const result = await canister.mark_claim_result(
  walletAddress,
  ticket.epoch,
  "Success",
  txSignature  // Solana 交易签名
);
```

## 2. Claim 页面实现时序

### 2.1 PC 端 (Phantom 插件)

**完整流程：**

```typescript
// Step 1: 连接 Phantom 钱包
import { PhantomProvider } from '@solana/wallet-adapter-phantom';

const connectWallet = async () => {
  if ('phantom' in window) {
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) {
      const resp = await provider.connect();
      const walletAddress = resp.publicKey.toString();
      console.log('Connected wallet:', walletAddress);
      return walletAddress;
    }
  }
  throw new Error('Phantom wallet not found');
};

// Step 2: 检查是否有可claim的奖励
const checkClaimable = async (walletAddress: string) => {
  // 获取任务状态
  const taskState = await canister.get_or_init_user_tasks(walletAddress);
  
  // 检查是否有 RewardPrepared 状态的任务
  const hasClaimable = taskState.tasks.some(
    t => t.status === 'RewardPrepared'
  );
  
  return hasClaimable;
};

// Step 3: 获取 Claim Ticket
const getClaimTicket = async (walletAddress: string) => {
  const ticketResult = await canister.get_claim_ticket(walletAddress);
  
  if (ticketResult.Ok) {
    return ticketResult.Ok;
  } else {
    throw new Error(ticketResult.Err);
  }
};

// Step 4: 调用 Solana Claim 合约
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';

const submitClaimToSolana = async (
  ticket: ClaimTicket,
  walletAddress: string
) => {
  // 连接 Solana
  const connection = new Connection('https://api.mainnet-beta.solana.com');  // 或 devnet/testnet
  const provider = window.phantom?.solana;
  
  // 初始化 Anchor Program (需要 IDL)
  // const program = new Program(IDL, PROGRAM_ID, anchorProvider);
  
  // 构建claim交易
  // 注意：epoch, index, amount, proof, root 需要正确编码
  const claimTx = await program.methods
    .claim(
      ticket.epoch,
      ticket.index,
      ticket.amount,
      ticket.proof,  // Vec<[u8; 32]>
      ticket.root    // [u8; 32]
    )
    .accounts({
      distributor: DISTRIBUTOR_ADDRESS,
      claimStatus: deriveClaimStatusPDA(ticket.epoch, ticket.wallet),
      claimer: new PublicKey(walletAddress),
      // ... other accounts
    })
    .rpc();
  
  console.log('Claim transaction signature:', claimTx);
  return claimTx;
};

// Step 5: 回写 Canister
const markClaimSuccess = async (
  walletAddress: string,
  epoch: bigint,
  txSignature: string
) => {
  await canister.mark_claim_result(
    walletAddress,
    epoch,
    "Success",
    txSignature
  );
};

// 完整Claim流程
const executeClaim = async () => {
  try {
    // 1. 连接钱包
    setStatus('connecting');
    const wallet = await connectWallet();
    
    // 2. 检查是否可claim
    setStatus('checking');
    const canClaim = await checkClaimable(wallet);
    if (!canClaim) {
      throw new Error('No claimable rewards');
    }
    
    // 3. 获取ticket
    setStatus('fetching-ticket');
    const ticket = await getClaimTicket(wallet);
    
    // 4. 提交链上交易
    setStatus('submitting-tx');
    const txSig = await submitClaimToSolana(ticket, wallet);
    
    // 5. 等待确认
    setStatus('confirming');
    await connection.confirmTransaction(txSig);
    
    // 6. 回写后端
    setStatus('updating-backend');
    await markClaimSuccess(wallet, ticket.epoch, txSig);
    
    // 7. 成功
    setStatus('success');
    showSuccessMessage(`Successfully claimed ${ticket.amount} PMUG!`);
    
  } catch (error) {
    setStatus('failed');
    console.error('Claim failed:', error);
    showErrorMessage(error.message);
    
    // 如果有ticket但claim失败，回写失败状态
    if (ticket) {
      await canister.mark_claim_result(
        wallet,
        ticket.epoch,
        "Failed",
        null
      );
    }
  }
};
```

### 2.2 UI 状态管理

```typescript
type ClaimStatus = 
  | 'idle'            // 初始状态
  | 'connecting'      // 连接钱包中
  | 'checking'        // 检查是否可claim
  | 'ready'           // 准备好claim，显示claim按钮
  | 'no-rewards'      // 没有可claim的奖励
  | 'root-not-uploaded'  // root未上链（不显示claim按钮）
  | 'fetching-ticket' // 获取ticket中
  | 'ticket-ready'    // ticket已获取，等待用户确认
  | 'submitting-tx'   // 提交交易中
  | 'confirming'      // 等待交易确认
  | 'updating-backend'// 更新后端状态
  | 'success'         // Claim成功
  | 'failed';         // Claim失败

// 推荐的UI状态映射
const statusMessages = {
  idle: '连接钱包开始Claim',
  connecting: '正在连接Phantom钱包...',
  checking: '检查奖励状态...',
  ready: '你有可领取的奖励！',
  'no-rewards': '暂无可领取的奖励',
  'root-not-uploaded': '奖励快照还未上链，请稍后再试',
  'fetching-ticket': '正在生成Claim凭证...',
  'ticket-ready': '凭证已准备好，点击确认领取',
  'submitting-tx': '正在提交链上交易...',
  confirming: '等待交易确认...',
  'updating-backend': '更新记录中...',
  success: '领取成功！',
  failed: 'Claim失败，请重试',
};
```

## 3. 数据结构对齐

### 3.1 Merkle Proof 格式

**重要：Merkle proof 编码必须与 Solana 合约一致**

```typescript
// Backend返回的proof格式
interface ClaimTicket {
  proof: Uint8Array[];  // 每个元素是32字节的hash
  root: Uint8Array;     // 32字节的root hash
}

// 转换为 Solana 合约需要的格式
const convertProofForSolana = (ticket: ClaimTicket) => {
  // proof: Vec<[u8; 32]>
  const proofArray = ticket.proof.map(p => Array.from(p));
  
  // root: [u8; 32]
  const rootArray = Array.from(ticket.root);
  
  return { proofArray, rootArray };
};

// 如果需要hex格式
const proofHex = ticket.proof.map(p => 
  Buffer.from(p).toString('hex')
);
const rootHex = Buffer.from(ticket.root).toString('hex');
```

### 3.2 金额单位

```typescript
// Backend 返回的 amount 是 PMUG 的最小单位
// 如果 PMUG 有 6 位小数，则：
const displayAmount = Number(ticket.amount) / 1_000_000;
console.log(`Claimable: ${displayAmount} PMUG`);

// 注意：链上 claim 时，amount 需要传入最小单位
```

### 3.3 Wallet Address 格式

```typescript
// Solana wallet address 必须是 base58 编码的字符串
// Phantom 返回的 publicKey 已经是正确格式
const walletAddress = publicKey.toString();  // base58

// 后端会验证：
// 1. base58 解码后长度必须是 32 字节
// 2. 如果格式不正确会返回错误
```

## 4. Root 上链检测

**关键问题：只有当 epoch 的 root 已上传到 Solana 合约后，用户才能 claim**

```typescript
// 检查 root 是否已上链
const checkRootUploaded = async (epoch: bigint, root: Uint8Array) => {
  // 查询 Solana 合约的 Distributor account
  const distributorAccount = await program.account.merkleDistributor.fetch(
    DISTRIBUTOR_ADDRESS
  );
  
  // 检查此 epoch 的 root 是否匹配
  const epochData = distributorAccount.epochs[Number(epoch)];
  
  if (!epochData) {
    return false;  // epoch 未上传
  }
  
  const rootMatch = Buffer.from(epochData.root).equals(Buffer.from(root));
  return rootMatch;
};

// UI 逻辑
if (!await checkRootUploaded(ticket.epoch, ticket.root)) {
  setStatus('root-not-uploaded');
  return;  // 不显示 claim 按钮
}

setStatus('ready');  // 显示 claim 按钮
```

**推荐：在后端添加一个 epoch 状态字段，标记 root 是否已上链，前端可直接查询。**

## 5. 错误处理

```typescript
// 常见错误及处理

const handleClaimError = (error: any) => {
  if (error.message.includes('No claimable rewards')) {
    // 没有可claim的奖励
    return '您暂时没有可领取的奖励，请先完成任务';
  }
  
  if (error.message.includes('Ticket already issued')) {
    // Ticket已发放
    return '您的Claim凭证已生成，请不要重复领取';
  }
  
  if (error.message.includes('Invalid wallet')) {
    // 钱包地址格式错误
    return '钱包地址格式不正确，请重新连接';
  }
  
  if (error.message.includes('Epoch') && error.message.includes('not found')) {
    // Epoch不存在
    return '奖励快照尚未生成，请稍后再试';
  }
  
  // Solana 交易错误
  if (error.message.includes('insufficient funds')) {
    return '钱包余额不足，无法支付交易费用';
  }
  
  if (error.message.includes('already claimed')) {
    // 链上已claim（防重复claim的最终防线）
    return '此奖励已被领取';
  }
  
  return '领取失败，请重试';
};
```

## 6. 移动端注意事项

**本文档只针对 PC 端 Phantom 插件集成**

移动端集成需要：
1. 使用 WalletConnect 或 Phantom Mobile SDK
2. 深链接跳转到 Phantom App
3. 交易签名后跳回应用

移动端流程类似，但钱包连接方式不同，需要单独实现。

## 7. 测试检查清单

- [ ] 用户登录后能看到任务列表和状态
- [ ] 完成注册设备任务后，任务状态变为 Completed
- [ ] 支付成功后，AI订阅任务自动完成
- [ ] 完成语音克隆任务后，任务状态变为 Completed
- [ ] Admin 执行 build_epoch_snapshot 后，任务状态变为 RewardPrepared
- [ ] 用户能成功获取 Claim Ticket
- [ ] Ticket 包含正确的 proof 和 root
- [ ] Root 未上链时，不显示 claim 按钮
- [ ] Root 上链后，能成功提交 claim 交易
- [ ] Claim 成功后，任务状态变为 Claimed
- [ ] Claim 失败后，任务状态回滚到 RewardPrepared
- [ ] 不能重复领取同一个 epoch 的奖励

## 8. 安全注意事项

1. **永远不要在前端存储私钥**：使用 Phantom 钱包签名
2. **验证钱包地址**：确保连接的钱包地址与用户绑定的地址一致
3. **交易确认**：等待链上交易确认后再更新UI
4. **防重放攻击**：后端已实现 ticket 状态检查，链上有 ClaimStatus PDA 防重复
5. **金额显示**：正确转换最小单位到显示单位
6. **错误提示**：给用户清晰的错误信息

## 9. 性能优化建议

1. **缓存任务状态**：避免频繁查询后端
2. **乐观更新**：任务完成后立即更新UI，后台异步调用API
3. **连接池**：复用 Solana connection
4. **批量查询**：如果有多个钱包，批量查询任务状态

## 10. 附录：完整类型定义

```typescript
// TypeScript 类型定义（可放在 types.ts）

export interface TaskContractItem {
  taskid: string;
  rewards: bigint;
  valid: boolean;
}

export type TaskStatus = 
  | "NotStarted" 
  | "InProgress" 
  | "Completed" 
  | "RewardPrepared" 
  | "TicketIssued" 
  | "Claimed";

export interface UserTaskDetail {
  taskid: string;
  status: TaskStatus;
  completed_at?: bigint;
  reward_amount: bigint;
  evidence?: string;
  prepared_epoch?: bigint;
}

export interface UserTaskState {
  wallet: string;
  tasks: UserTaskDetail[];
  updated_at: bigint;
}

export interface ClaimTicket {
  epoch: bigint;
  index: number;
  wallet: string;
  amount: bigint;
  proof: Uint8Array[];
  root: Uint8Array;
}

export type ClaimResultStatus = "Success" | "Failed" | "Pending";

export interface MerkleSnapshotMeta {
  epoch: bigint;
  root: Uint8Array;
  leaves_count: number;
  created_at: bigint;
}
```

---

## 总结

本文档提供了完整的前端集成指南，涵盖：
- 所有 Backend API 的调用方式
- PC 端 Phantom 钱包集成流程
- 完整的 Claim 时序和状态管理
- 数据格式对齐和错误处理
- 测试检查清单和安全建议

按照本指南实现后，前端应该能够完整支持任务激励和 Claim 功能。
