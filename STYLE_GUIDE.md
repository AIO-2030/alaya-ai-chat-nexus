# Univoice Style Guide
## Black & White Design System

### 设计理念

本项目采用极简的黑白设计风格，灵感来自 X (Twitter) 的设计原则：
- **简洁优先**: 去除不必要的装饰，专注内容
- **高对比度**: 黑白配色确保可读性和可访问性
- **清晰层次**: 通过间距、字重、边框建立视觉层次
- **响应式**: 适配所有设备尺寸

---

## 颜色系统

### 主色调

```css
--color-black: #000000     /* 纯黑 */
--color-white: #FFFFFF     /* 纯白 */
```

### 灰度阶梯 (9 级)

```css
--color-gray-50: #FAFAFA   /* 最浅灰 */
--color-gray-100: #F5F5F5
--color-gray-200: #EEEEEE
--color-gray-300: #E0E0E0
--color-gray-400: #BDBDBD
--color-gray-500: #9E9E9E  /* 中灰 */
--color-gray-600: #757575
--color-gray-700: #616161
--color-gray-800: #424242
--color-gray-900: #212121  /* 最深灰 */
```

### 语义化颜色

#### 背景色
```css
--bg-primary: var(--color-white)        /* 主背景 */
--bg-secondary: var(--color-gray-50)    /* 次级背景 */
--bg-tertiary: var(--color-gray-100)    /* 三级背景 */
--bg-elevated: var(--color-white)       /* 提升层（卡片） */
```

#### 文本色
```css
--text-primary: var(--color-black)      /* 主文本 */
--text-secondary: var(--color-gray-700) /* 次级文本 */
--text-tertiary: var(--color-gray-500)  /* 三级文本 */
--text-disabled: var(--color-gray-400)  /* 禁用状态 */
--text-inverse: var(--color-white)      /* 反色文本 */
```

#### 边框色
```css
--border-primary: var(--color-gray-200)   /* 主边框 */
--border-secondary: var(--color-gray-300) /* 次级边框 */
--border-focus: var(--color-black)        /* 焦点边框 */
```

#### 交互状态
```css
--interactive-hover: var(--color-gray-100)   /* 悬停状态 */
--interactive-active: var(--color-gray-200)  /* 激活状态 */
--interactive-selected: var(--color-black)   /* 选中状态 */
```

#### 状态颜色（仅在必要时使用）
```css
--status-success: #10B981  /* 成功 - 绿色 */
--status-error: #EF4444    /* 错误 - 红色 */
--status-warning: #F59E0B  /* 警告 - 橙色 */
--status-info: #3B82F6     /* 信息 - 蓝色 */
```

### 使用指南

#### ✅ 推荐做法
```css
.button {
  background-color: var(--color-black);
  color: var(--text-inverse);
}

.button:hover {
  background-color: var(--color-gray-900);
}
```

#### ❌ 避免做法
```css
/* 不要直接使用颜色值 */
.button {
  background-color: #000000;
  color: #FFFFFF;
}

/* 不要过度使用彩色 */
.button {
  background: linear-gradient(to right, #00ff00, #ff00ff);
}
```

---

## 排版系统

### 字体家族

```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', ...
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', ...
```

### 字体大小

```css
--text-xs: 0.75rem      /* 12px */
--text-sm: 0.875rem     /* 14px */
--text-base: 1rem       /* 16px */
--text-lg: 1.125rem     /* 18px */
--text-xl: 1.25rem      /* 20px */
--text-2xl: 1.5rem      /* 24px */
--text-3xl: 1.875rem    /* 30px */
--text-4xl: 2.25rem     /* 36px */
```

### 字体权重

```css
--font-normal: 400      /* 正常 */
--font-medium: 500      /* 中等 */
--font-semibold: 600    /* 半粗体 */
--font-bold: 700        /* 粗体 */
```

### 行高

```css
--leading-tight: 1.25   /* 紧凑 */
--leading-normal: 1.5   /* 正常 */
--leading-relaxed: 1.75 /* 宽松 */
```

### 排版层次示例

```css
/* H1 - 页面标题 */
.heading-1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

/* H2 - 章节标题 */
.heading-2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: var(--text-primary);
}

/* Body - 正文 */
.body {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--text-primary);
}

/* Caption - 说明文字 */
.caption {
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}
```

---

## 间距系统

```css
--spacing-xs: 0.25rem   /* 4px */
--spacing-sm: 0.5rem    /* 8px */
--spacing-md: 1rem      /* 16px */
--spacing-lg: 1.5rem    /* 24px */
--spacing-xl: 2rem      /* 32px */
--spacing-2xl: 3rem     /* 48px */
--spacing-3xl: 4rem     /* 64px */
```

### 间距使用原则

- **相关元素**: 使用小间距 (xs, sm)
- **段落内**: 使用中间距 (md)
- **章节间**: 使用大间距 (lg, xl)
- **页面区块**: 使用超大间距 (2xl, 3xl)

---

## 圆角系统

```css
--radius-none: 0
--radius-sm: 0.25rem    /* 4px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-2xl: 1.5rem    /* 24px */
--radius-full: 9999px   /* 完全圆角 */
```

### 使用指南

- **按钮**: `--radius-md` 或 `--radius-full`
- **输入框**: `--radius-md`
- **卡片**: `--radius-xl`
- **头像**: `--radius-full`
- **模态框**: `--radius-2xl`

---

## 阴影系统

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), ...
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), ...
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), ...
```

### 使用场景

- **悬停效果**: `--shadow-sm` → `--shadow-md`
- **卡片**: `--shadow-md`
- **模态框**: `--shadow-xl`
- **下拉菜单**: `--shadow-lg`

---

## 组件设计模式

### 按钮

#### 主按钮
```css
.button--primary {
  padding: var(--spacing-md) var(--spacing-xl);
  background-color: var(--color-black);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.button--primary:hover {
  background-color: var(--color-gray-900);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

#### 次要按钮
```css
.button--secondary {
  padding: var(--spacing-md) var(--spacing-xl);
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.button--secondary:hover {
  background-color: var(--interactive-hover);
  border-color: var(--border-secondary);
}
```

### 输入框

```css
.input {
  width: 100%;
  padding: var(--spacing-md);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--text-primary);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
}

.input::placeholder {
  color: var(--text-tertiary);
}
```

### 卡片

```css
.card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}
```

---

## 动画与过渡

### 过渡时长

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

### 常用动画

#### 淡入
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn var(--transition-base);
}
```

#### 滑入
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up {
  animation: slideUp var(--transition-base);
}
```

#### 旋转加载
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 0.6s linear infinite;
}
```

---

## 响应式设计

### 断点

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### 响应式模式示例

```css
/* 移动端优先 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-lg);
  }
}
```

---

## CSS Modules 命名规范

### BEM 风格

```css
/* Block */
.component { }

/* Element */
.component__element { }

/* Modifier */
.component--modifier { }
.component__element--modifier { }
```

### 示例

```css
/* Button Component */
.button { }
.button__icon { }
.button__text { }
.button--primary { }
.button--secondary { }
.button--disabled { }

/* Card Component */
.card { }
.card__header { }
.card__body { }
.card__footer { }
.card--elevated { }
```

---

## 可访问性

### 焦点状态

```css
*:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

### 屏幕阅读器专用

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 对比度要求

- **普通文本**: 最小 4.5:1
- **大号文本**: 最小 3:1
- **图标**: 最小 3:1

---

## 最佳实践

### ✅ 推荐

1. **始终使用 CSS 变量**
2. **保持组件样式独立**（CSS Modules）
3. **遵循 BEM 命名规范**
4. **移动端优先设计**
5. **确保可访问性**
6. **使用语义化 HTML**
7. **避免过度嵌套**（最多 3 层）

### ❌ 避免

1. **内联样式**（除非动态计算）
2. **!important**（尽量避免）
3. **硬编码颜色值**
4. **魔术数字**（使用变量）
5. **过度动画**（保持简洁）
6. **复杂的选择器**

---

## 工具与资源

### 推荐工具

- **Figma**: 设计稿
- **Chrome DevTools**: 调试
- **Lighthouse**: 可访问性检查
- **PostCSS**: CSS 处理

### 学习资源

- [X (Twitter) Design](https://twitter.com)
- [BEM Methodology](https://getbem.com)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 维护与更新

如需修改设计系统，请：

1. 更新 `src/styles/theme.css`
2. 更新此文档
3. 通知团队成员
4. 测试所有受影响的组件

---

**版本**: 1.0.0  
**最后更新**: 2026-01-26  
**维护者**: Univoice 开发团队
