# 手动WiFi输入功能实现

## 问题背景

原有的WiFi扫描流程在超时时会直接失败，用户体验不佳。需要在WiFi扫描超时时提供手动输入WiFi信息的选项，让用户能够继续完成设备配置。

## 解决方案

### 1. 保持原有流程不变

**原有流程**：
1. 设备扫描WiFi → 返回WiFi列表
2. 用户选择WiFi → 触发`handleWifiSelected` → 显示密码输入对话框
3. 用户输入密码 → 调用`handleWifiPasswordSubmit` → 完成WiFi配置

**新增流程**：
1. 设备扫描WiFi超时 → 自动进入手动输入模式
2. 用户手动输入WiFi名称和安全类型 → 触发`handleManualWifiSubmit`
3. 创建WiFi网络对象 → 触发`handleWifiSelected` → 使用原有的密码输入对话框
4. 用户输入密码 → 调用`handleWifiPasswordSubmit` → 完成WiFi配置

### 2. 实现细节

#### 2.1 设备初始化管理器更新

**新增步骤**：
```typescript
export enum DeviceInitStep {
  // ... 其他步骤
  WIFI_MANUAL_INPUT = 'wifi_manual_input',  // 新增手动输入步骤
  // ... 其他步骤
}
```

**错误处理优化**：
```typescript
private async requestWiFiNetworksFromDevice(): Promise<void> {
  try {
    // ... WiFi扫描逻辑
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'WiFi scan request failed';
    
    // 检查是否是超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('Scan command response timeout')) {
      console.log('WiFi scan timed out, offering manual input option');
      this.state.error = null; // 清除错误，提供替代方案
      this.state.step = DeviceInitStep.WIFI_MANUAL_INPUT;
      return; // 不抛出错误，继续手动输入
    }
    
    // 其他错误仍然抛出
    this.state.error = errorMessage;
    throw error;
  }
}
```

#### 2.2 手动WiFi输入方法

**新增方法**：
```typescript
// 在DeviceInitManager中
async selectManualWiFi(ssid: string, password: string, security: string = 'WPA2'): Promise<void> {
  // 创建手动WiFi网络对象
  const manualWifiNetwork: WiFiNetwork = {
    id: `manual_${Date.now()}`,
    name: ssid,
    password: password,
    security: security,
    strength: -50,
    frequency: 2400,
    channel: 6
  };

  this.state.selectedWifi = manualWifiNetwork;
  this.state.step = DeviceInitStep.WIFI_CONFIG;
}
```

#### 2.3 UI组件更新

**手动WiFi输入对话框**：
- 只输入WiFi名称(SSID)和安全类型
- 不包含密码输入（复用原有密码输入对话框）
- 支持Enter键快速提交

**步骤UI**：
- WiFi扫描步骤：添加"手动输入WiFi"按钮
- WiFi选择步骤：添加"手动输入WiFi"按钮
- 手动输入步骤：简化的输入界面

### 3. 用户体验优化

#### 3.1 无缝切换
- 扫描超时时自动进入手动输入模式
- 用户也可以主动选择手动输入
- 手动输入后使用相同的密码输入流程

#### 3.2 一致性
- 手动输入和扫描结果使用相同的密码输入对话框
- 保持相同的UI风格和交互模式
- 统一的错误处理和状态管理

#### 3.3 灵活性
- 支持所有WiFi安全类型（Open, WEP, WPA, WPA2, WPA3）
- 支持键盘快捷键（Enter键提交）
- 支持取消操作

### 4. 技术实现

#### 4.1 状态管理
```typescript
// 手动WiFi输入状态
const [showManualWifiDialog, setShowManualWifiDialog] = useState(false);
const [manualWifiSSID, setManualWifiSSID] = useState('');
const [manualWifiSecurity, setManualWifiSecurity] = useState('WPA2');
```

#### 4.2 处理函数
```typescript
const handleManualWifiSubmit = async () => {
  if (!manualWifiSSID.trim()) return;
  
  // 创建WiFi网络对象（不包含密码）
  const manualWifiNetwork = {
    id: `manual_${Date.now()}`,
    name: manualWifiSSID,
    security: manualWifiSecurity,
    strength: -50,
    frequency: 2400,
    channel: 6
  };
  
  // 使用原有的密码输入流程
  setSelectedWifi(manualWifiNetwork);
  setShowManualWifiDialog(false);
  setShowPasswordDialog(true);
};
```

### 5. 文件修改清单

1. **deviceInitManager.ts**
   - 新增`WIFI_MANUAL_INPUT`步骤
   - 修改`requestWiFiNetworksFromDevice`错误处理
   - 新增`selectManualWiFi`方法
   - 更新步骤描述和完成检查

2. **useDeviceManagement.ts**
   - 新增`selectManualWiFi`方法导出
   - 添加方法类型定义

3. **AddDevice.tsx**
   - 新增手动WiFi输入状态
   - 新增`handleManualWifiSubmit`处理函数
   - 新增手动WiFi输入UI组件
   - 在WiFi扫描和选择步骤添加手动输入按钮
   - 更新步骤进度显示

### 6. 测试场景

1. **正常流程**：设备扫描成功 → 选择WiFi → 输入密码 → 完成配置
2. **超时流程**：设备扫描超时 → 自动进入手动输入 → 输入WiFi名称 → 输入密码 → 完成配置
3. **主动手动输入**：在扫描或选择步骤点击"手动输入" → 输入WiFi名称 → 输入密码 → 完成配置

### 7. 优势

1. **向后兼容**：不影响原有流程
2. **用户体验**：超时时提供替代方案
3. **代码复用**：复用原有密码输入逻辑
4. **一致性**：保持UI和交互的一致性
5. **灵活性**：支持多种输入方式

这个实现确保了在WiFi扫描超时时用户仍然能够完成设备配置，同时保持了原有流程的完整性和一致性。
