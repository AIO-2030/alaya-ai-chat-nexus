# Univoice UI/UX 迁移指南
## 黑白风格设计系统

### 概述
本次 UI/UX 升级将项目从内联样式迁移到 CSS Modules + 主题变量的架构，采用 X (Twitter) 风格的黑白设计。

### 核心原则

1. **样式分离**: 样式定义与组件逻辑完全分离
2. **主题统一**: 使用 CSS 变量确保全局一致性
3. **交互优先**: 避免 CSS 覆盖导致的交互问题
4. **简洁优雅**: 黑白配色 + 高对比度 + 清晰层次

### 架构说明

```
src/
├── styles/
│   ├── theme.css                    # 主题变量（颜色、间距、字体等）
│   ├── index.css                    # 样式入口
│   ├── components/                  # 组件样式
│   │   ├── AppHeader.module.css
│   │   ├── BottomNavigation.module.css
│   │   └── ...
│   └── pages/                       # 页面样式
│       ├── Profile.module.css
│       ├── Chat.module.css
│       └── ...
```

### CSS 变量系统

#### 颜色变量
```css
/* 语义化颜色 */
--bg-primary          /* 主背景色 */
--bg-secondary        /* 次级背景色 */
--text-primary        /* 主文本色 */
--text-secondary      /* 次级文本色 */
--border-primary      /* 主边框色 */
--interactive-hover   /* 悬停状态 */
--interactive-active  /* 激活状态 */
```

#### 间距变量
```css
--spacing-xs    /* 4px */
--spacing-sm    /* 8px */
--spacing-md    /* 16px */
--spacing-lg    /* 24px */
--spacing-xl    /* 32px */
```

#### 字体变量
```css
--text-xs       /* 12px */
--text-sm       /* 14px */
--text-base     /* 16px */
--text-lg       /* 18px */
--text-xl       /* 20px */
```

### 迁移步骤

#### 1. 导入主题样式
在项目入口文件 (main.tsx 或 App.tsx) 中导入：
```typescript
import './styles/index.css';
```

#### 2. 创建组件样式文件
为每个组件创建对应的 `.module.css` 文件：
```css
/* ComponentName.module.css */
.component {
  background-color: var(--bg-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

#### 3. 在组件中使用
```typescript
import styles from './ComponentName.module.css';

export const ComponentName = () => {
  return (
    <div className={styles.component}>
      Content
    </div>
  );
};
```

#### 4. 命名规范
使用 BEM 风格的类名：
```css
.block { }
.block__element { }
.block--modifier { }
```

### 防止交互问题

#### ❌ 错误做法
```css
/* 会导致点击事件失效 */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 999;
}
```

#### ✅ 正确做法
```css
/* 确保交互元素在顶层 */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 999;
  pointer-events: none; /* 禁用遮罩层的指针事件 */
}

.overlay__interactive {
  pointer-events: auto; /* 重新启用交互元素的指针事件 */
}
```

### 黑白设计原则

#### 1. 颜色使用
- **主色**: 黑色 (#000000) 和白色 (#FFFFFF)
- **灰度**: 9 级灰度系统 (gray-50 ~ gray-900)
- **强调色**: 仅在必要时使用 (成功、错误、警告、信息)

#### 2. 层次感
- 使用不同的背景色层次区分区域
- 使用边框分隔内容
- 使用阴影提升重要元素

#### 3. 交互状态
- **Hover**: 背景变为 `--interactive-hover`
- **Active**: 背景变为 `--interactive-active`
- **Focus**: 黑色边框 + 外发光

#### 4. 字体层次
- **标题**: Bold (700) + 大字号
- **正文**: Regular (400) + 标准字号
- **辅助**: Medium (500) + 小字号

### 已完成迁移

- ✅ AppHeader 组件
- ✅ BottomNavigation 组件
- ✅ 主题系统建立

### 待迁移组件

#### 核心组件
- [ ] LoginScreen
- [ ] RegisterScreen
- [ ] EmailLoginScreen
- [ ] QRCodeScanner
- [ ] DeviceStatusIndicator

#### 页面
- [ ] Profile
- [ ] Chat
- [ ] Index
- [ ] Gallery
- [ ] Creation
- [ ] Shop
- [ ] Contracts
- [ ] MyDevices
- [ ] AddDevice

### 测试清单

迁移后需要测试以下内容：

1. **视觉一致性**
   - [ ] 颜色符合黑白主题
   - [ ] 间距统一
   - [ ] 字体大小和权重正确

2. **交互响应**
   - [ ] 所有按钮可点击
   - [ ] 悬停效果正常
   - [ ] 表单输入正常
   - [ ] 模态框交互正常

3. **响应式设计**
   - [ ] 移动端布局正确
   - [ ] 平板端布局正确
   - [ ] 桌面端布局正确

4. **可访问性**
   - [ ] 键盘导航正常
   - [ ] Focus 状态可见
   - [ ] 对比度符合 WCAG 标准

### 常见问题

#### Q: 如何处理现有的 Tailwind 类名？
A: 逐步迁移。优先迁移新组件，老组件可以继续使用 Tailwind，但新样式应该使用 CSS Modules。

#### Q: 如何处理动态样式？
A: 使用条件类名：
```typescript
className={`${styles.button} ${isActive ? styles['button--active'] : ''}`}
```

#### Q: 如何处理第三方组件的样式？
A: 使用全局样式覆盖，或通过组件的 className prop 传递自定义样式。

### 参考资源

- X (Twitter) 设计系统: https://twitter.com
- BEM 命名规范: https://getbem.com
- CSS Modules 文档: https://github.com/css-modules/css-modules

### 联系方式

如有问题或建议，请联系开发团队。
