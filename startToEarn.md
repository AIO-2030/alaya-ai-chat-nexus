

## 概述
实现一个"Start to Earn"任务系统，用户连接钱包后可以查看任务列表，完成任务获得token奖励。

---

## 1. 后端实现 (aio-base-backend)

### 1.1 创建 start_to_earn.rs 文件

**文件路径**: `src/aio-base-backend/src/start_to_earn.rs`

**需要实现的结构和功能**:

#### 1.1.1 任务定义结构 (TaskDefinition)
```rust
// 总体任务定义的schema结构，包含token激励机制
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TaskDefinition {
    pub task_id: String,                    // 任务唯一标识
    pub task_name: String,                  // 任务名称
    pub description: String,                // 任务描述
    pub reward_amount: u64,                 // 奖励token数量
    pub reward_type: RewardType,            // 奖励类型（Token/Credit）
    pub task_type: TaskType,                 // 任务类型
    pub created_at: u64,                     // 创建时间
    pub updated_at: u64,                     // 更新时间
    pub metadata: Option<String>,            // 元数据（JSON格式）
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum RewardType {
    Token,   // AIO Token
    Credit,  // Credit
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum TaskType {
    InviteFriend,      // 邀请好友
    OrderAI,           //订阅AI
    CreateVoice,       //创建你的声音
}
```

#### 1.1.2 任务流水结构 (TaskRecord)
```rust
// 根据principal_id分流水存储的任务流水
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TaskRecord {
    pub record_id: u64,                     // 流水记录ID
    pub principal_id: String,                // 用户Principal ID
    pub task_id: String,                     // 关联的任务ID
    pub status: TaskStatus,                  // 任务状态：init, completed, claimed
    pub reward_amount: u64,                  // 可claim的token数量
    pub completed_at: Option<u64>,          // 完成时间
    pub claimed_at: Option<u64>,            // 领取时间
    pub created_at: u64,                     // 创建时间
    pub updated_at: u64,                     // 更新时间
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum TaskStatus {
    Init,        // 初始化状态
    Completed,   // 已完成（可领取）
    Claimed,     // 已领取
}
```

#### 1.1.3 存储结构
使用 `stable_mem_storage.rs` 中的模式：
- `TASK_DEFINITIONS`: `StableBTreeMap<String, TaskDefinition, Memory>` - 存储任务定义
- `TASK_RECORDS`: `StableBTreeMap<u64, TaskRecord, Memory>` - 存储任务流水
- `USER_TASK_INDEX`: `StableBTreeMap<UserTaskKey, Vec<u64>, Memory>` - 用户任务索引

#### 1.1.4 核心功能函数
```rust
// 1. 创建任务定义（管理员功能）
pub fn create_task_definition(task: TaskDefinition) -> Result<String, String>

// 2. 获取所有任务定义
pub fn get_all_task_definitions() -> Vec<TaskDefinition>

// 3. 根据principal_id获取用户的任务列表（包含状态和奖励）
pub fn get_user_tasks(principal_id: String) -> Vec<UserTaskView>

// 4. 初始化用户任务（当用户首次连接钱包时）
pub fn init_user_task(principal_id: String, task_id: String) -> Result<u64, String>

// 5. 完成任务（更新状态为completed）
pub fn complete_task(principal_id: String, task_id: String) -> Result<u64, String>

// 6. 领取奖励（更新状态为claimed，并调用token_economy进行转账）
pub fn claim_task_reward(principal_id: String, record_id: u64) -> Result<u64, String>

// 7. 获取用户可领取的奖励总额
pub fn get_claimable_rewards(principal_id: String) -> u64
```

#### 1.1.5 UserTaskView 结构（用于前端展示）
```rust
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserTaskView {
    pub task_id: String,
    pub task_name: String,
    pub description: String,
    pub status: TaskStatus,
    pub reward_amount: u64,
    pub record_id: Option<u64>,  // 如果有记录则返回record_id用于claim
}
```

### 1.2 更新 lib.rs

**在 `src/aio-base-backend/src/lib.rs` 中添加**:

```rust
// 在文件顶部添加模块声明
mod start_to_earn;

// 在文件末尾添加API函数
#[ic_cdk::update]
fn create_task_definition(task: start_to_earn::TaskDefinition) -> Result<String, String> {
    ic_cdk::println!("CALL[create_task_definition] Input: task_id={}", task.task_id);
    let result = start_to_earn::create_task_definition(task);
    ic_cdk::println!("CALL[create_task_definition] Output: {:?}", result);
    result
}

#[ic_cdk::query]
fn get_all_task_definitions() -> Vec<start_to_earn::TaskDefinition> {
    ic_cdk::println!("CALL[get_all_task_definitions] Input: none");
    let result = start_to_earn::get_all_task_definitions();
    ic_cdk::println!("CALL[get_all_task_definitions] Output: count={}", result.len());
    result
}

#[ic_cdk::query]
fn get_user_tasks(principal_id: String) -> Vec<start_to_earn::UserTaskView> {
    ic_cdk::println!("CALL[get_user_tasks] Input: principal_id={}", principal_id);
    let result = start_to_earn::get_user_tasks(principal_id);
    ic_cdk::println!("CALL[get_user_tasks] Output: count={}", result.len());
    result
}

#[ic_cdk::update]
fn init_user_task(principal_id: String, task_id: String) -> Result<u64, String> {
    ic_cdk::println!("CALL[init_user_task] Input: principal_id={}, task_id={}", principal_id, task_id);
    let result = start_to_earn::init_user_task(principal_id, task_id);
    ic_cdk::println!("CALL[init_user_task] Output: {:?}", result);
    result
}

#[ic_cdk::update]
fn complete_task(principal_id: String, task_id: String) -> Result<u64, String> {
    ic_cdk::println!("CALL[complete_task] Input: principal_id={}, task_id={}", principal_id, task_id);
    let result = start_to_earn::complete_task(principal_id, task_id);
    ic_cdk::println!("CALL[complete_task] Output: {:?}", result);
    result
}

#[ic_cdk::update]
fn claim_task_reward(principal_id: String, record_id: u64) -> Result<u64, String> {
    ic_cdk::println!("CALL[claim_task_reward] Input: principal_id={}, record_id={}", principal_id, record_id);
    let result = start_to_earn::claim_task_reward(principal_id, record_id);
    ic_cdk::println!("CALL[claim_task_reward] Output: {:?}", result);
    result
}

#[ic_cdk::query]
fn get_claimable_rewards(principal_id: String) -> u64 {
    ic_cdk::println!("CALL[get_claimable_rewards] Input: principal_id={}", principal_id);
    let result = start_to_earn::get_claimable_rewards(principal_id);
    ic_cdk::println!("CALL[get_claimable_rewards] Output: {}", result);
    result
}
```

### 1.3 更新 stable_mem_storage.rs

**在 `src/aio-base-backend/src/stable_mem_storage.rs` 中添加存储**:

```rust
// 在文件顶部添加导入
use crate::start_to_earn::{TaskDefinition, TaskRecord, UserTaskKey};

// 在 thread_local! 块中添加
pub static TASK_DEFINITIONS: RefCell<StableBTreeMap<String, TaskDefinition, Memory>> = RefCell::new(
    StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(60)))  // 使用新的MemoryId
    )
);

pub static TASK_RECORDS: RefCell<StableBTreeMap<u64, TaskRecord, Memory>> = RefCell::new(
    StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(61)))
    )
);

pub static USER_TASK_INDEX: RefCell<StableBTreeMap<UserTaskKey, Vec<u64>, Memory>> = RefCell::new(
    StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(62)))
    )
);
```

### 1.4 更新 aio-base-backend.did

**在 `src/aio-base-backend/aio-base-backend.did` 中添加类型定义和API**:

```did
// ==== Start to Earn Types ====

type RewardType = variant {
  Token;
  Credit;
};

type TaskType = variant {
  ConnectWallet;
  FirstMCP;
  FirstAgent;
  DailyLogin;
  Custom: text;
};

type TaskStatus = variant {
  Init;
  Completed;
  Claimed;
};

type TaskDefinition = record {
  task_id: text;
  task_name: text;
  description: text;
  reward_amount: nat64;
  reward_type: RewardType;
  task_type: TaskType;
  requirements: vec text;
  is_active: bool;
  created_at: nat64;
  updated_at: nat64;
  metadata: opt text;
};

type TaskRecord = record {
  record_id: nat64;
  principal_id: text;
  task_id: text;
  status: TaskStatus;
  reward_amount: nat64;
  completed_at: opt nat64;
  claimed_at: opt nat64;
  created_at: nat64;
  updated_at: nat64;
  metadata: opt text;
};

type UserTaskView = record {
  task_id: text;
  task_name: text;
  description: text;
  status: TaskStatus;
  reward_amount: nat64;
  record_id: opt nat64;
};

// ==== Start to Earn API ====
service : {
  // ... 现有API ...
  
  "create_task_definition": (TaskDefinition) -> (variant { Ok: text; Err: text });
  "get_all_task_definitions": () -> (vec TaskDefinition) query;
  "get_user_tasks": (text) -> (vec UserTaskView) query;
  "init_user_task": (text, text) -> (variant { Ok: nat64; Err: text });
  "complete_task": (text, text) -> (variant { Ok: nat64; Err: text });
  "claim_task_reward": (text, nat64) -> (variant { Ok: nat64; Err: text });
  "get_claimable_rewards": (text) -> (nat64) query;
}
```

---

## 2. 前端实现 (alaya-chat-nexus-frontend)

### 2.1 更新 Profile.tsx

**在 `src/alaya-chat-nexus-frontend/src/pages/Profile.tsx` 中**:

#### 2.1.1 添加状态和导入
```typescript
// 在导入部分添加
import { get_user_tasks, claim_task_reward } from '../services/api/userApi';

// 添加任务相关状态
const [tasks, setTasks] = useState<UserTaskView[]>([]);
const [isLoadingTasks, setIsLoadingTasks] = useState(false);
const [claimingRecordId, setClaimingRecordId] = useState<number | null>(null);
```

#### 2.1.2 定义类型
```typescript
interface UserTaskView {
  task_id: string;
  task_name: string;
  description: string;
  status: 'Init' | 'Completed' | 'Claimed';
  reward_amount: number;
  record_id?: number;
}
```

#### 2.1.3 添加获取任务列表的函数
```typescript
// 在组件内添加
const fetchUserTasks = async () => {
  if (!user?.principalId || !isSolanaConnected) return;
  
  setIsLoadingTasks(true);
  try {
    const taskList = await get_user_tasks(user.principalId);
    setTasks(taskList);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    toast({
      title: t('common.error') || 'Error',
      description: 'Failed to load tasks',
      variant: 'destructive',
    });
  } finally {
    setIsLoadingTasks(false);
  }
};

// 在钱包连接成功后调用
useEffect(() => {
  if (isSolanaConnected && user?.principalId) {
    fetchUserTasks();
  }
}, [isSolanaConnected, user?.principalId]);
```

#### 2.1.4 添加领取奖励的函数
```typescript
const handleClaimReward = async (recordId: number) => {
  if (!user?.principalId) return;
  
  setClaimingRecordId(recordId);
  try {
    const claimedAmount = await claim_task_reward(user.principalId, recordId);
    toast({
      title: t('common.rewardClaimed') || 'Reward Claimed',
      description: `Successfully claimed ${claimedAmount} tokens`,
    });
    // 刷新任务列表
    await fetchUserTasks();
    // 刷新token余额
    if (solanaAddress) {
      await fetchTokenBalance(solanaAddress);
    }
  } catch (error: any) {
    console.error('Failed to claim reward:', error);
    toast({
      title: t('common.claimFailed') || 'Claim Failed',
      description: error.message || 'Failed to claim reward',
      variant: 'destructive',
    });
  } finally {
    setClaimingRecordId(null);
  }
};
```

#### 2.1.5 在UI中添加任务列表组件
```typescript
// 在钱包连接成功后的部分（大约在第630行之后）添加任务列表
{isSolanaConnected && (
  <div className="mt-6 pt-6 border-t border-white/10">
    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
      {t('common.startToEarn') || 'Start to Earn'}
      <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
    </h3>
    
    {isLoadingTasks ? (
      <div className="text-center py-8">
        <span className="text-white/60">Loading tasks...</span>
      </div>
    ) : tasks.length === 0 ? (
      <div className="text-center py-8">
        <span className="text-white/60">No tasks available</span>
      </div>
    ) : (
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.task_id}
            className="p-4 bg-white/5 border border-white/10 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">{task.task_name}</h4>
                <p className="text-white/60 text-sm mb-2">{task.description}</p>
                <div className="flex items-center gap-4">
                  <span className="text-white/80 text-sm">
                    Reward: <span className="text-yellow-400 font-semibold">
                      {task.reward_amount.toLocaleString()} tokens
                    </span>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    task.status === 'Completed' 
                      ? 'bg-green-400/20 text-green-400'
                      : task.status === 'Claimed'
                      ? 'bg-gray-400/20 text-gray-400'
                      : 'bg-blue-400/20 text-blue-400'
                  }`}>
                    {task.status === 'Init' && 'In Progress'}
                    {task.status === 'Completed' && 'Ready to Claim'}
                    {task.status === 'Claimed' && 'Claimed'}
                  </span>
                </div>
              </div>
              {task.status === 'Completed' && task.record_id && (
                <button
                  onClick={() => handleClaimReward(task.record_id!)}
                  disabled={claimingRecordId === task.record_id}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingRecordId === task.record_id ? 'Claiming...' : 'Claim'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### 2.2 更新 userApi.ts

**在 `src/alaya-chat-nexus-frontend/src/services/api/userApi.ts` 中添加**:

```typescript
// 添加类型定义
export interface UserTaskView {
  task_id: string;
  task_name: string;
  description: string;
  status: 'Init' | 'Completed' | 'Claimed';
  reward_amount: number;
  record_id?: number;
}

// 添加API函数
export const get_user_tasks = async (principalId: string): Promise<UserTaskView[]> => {
  const actor = await getActor();
  const result = await actor.get_user_tasks(principalId);
  return result;
};

export const claim_task_reward = async (principalId: string, recordId: number): Promise<number> => {
  const actor = await getActor();
  const result = await actor.claim_task_reward(principalId, recordId);
  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
};
```

### 2.3 更新 i18n.ts

**在 `src/alaya-chat-nexus-frontend/src/i18n.ts` 中添加翻译**:

```typescript
// 在 common 部分添加
common: {
  // ... 现有翻译 ...
  startToEarn: 'Start to Earn',
  rewardClaimed: 'Reward Claimed',
  claimFailed: 'Claim Failed',
  // ... 其他翻译 ...
}
```

---

## 3. 实现注意事项

### 3.1 后端注意事项
1. **Storable实现**: 需要为 `TaskDefinition`, `TaskRecord`, `UserTaskKey` 实现 `ic_stable_structures::Storable` trait
2. **内存管理**: 确保使用新的 `MemoryId`，不与现有模块冲突
3. **Token转账**: `claim_task_reward` 函数需要调用 `token_economy::transfer_tokens` 或相关函数进行实际转账
4. **任务初始化**: 当用户首次连接钱包时，可以自动初始化"连接钱包"任务
5. **任务完成逻辑**: 需要根据任务类型实现不同的完成检测逻辑（例如：检测是否创建了MCP、Agent等）

### 3.2 前端注意事项
1. **国际化**: 所有UI文本都需要通过i18n系统
2. **错误处理**: 所有API调用都需要适当的错误处理和用户提示
3. **状态同步**: 领取奖励后需要刷新任务列表和token余额
4. **加载状态**: 显示适当的加载指示器

### 3.3 测试建议
1. 创建测试任务定义
2. 测试任务初始化、完成、领取流程
3. 测试多用户场景
4. 测试边界情况（重复领取、无效任务等）

---

## 4. 实现顺序建议

1. **后端基础结构** (start_to_earn.rs)
   - 定义数据结构
   - 实现Storable traits
   - 实现基础CRUD函数

2. **后端API集成** (lib.rs)
   - 添加模块声明
   - 实现API函数
   - 更新stable_mem_storage

3. **DID文件更新** (aio-base-backend.did)
   - 添加类型定义
   - 添加API声明

4. **前端API层** (userApi.ts)
   - 添加API调用函数
   - 添加类型定义

5. **前端UI** (Profile.tsx)
   - 添加状态管理
   - 实现任务列表UI
   - 实现领取功能

6. **国际化** (i18n.ts)
   - 添加翻译文本

7. **测试和优化**
   - 端到端测试
   - 性能优化
   - 错误处理完善
