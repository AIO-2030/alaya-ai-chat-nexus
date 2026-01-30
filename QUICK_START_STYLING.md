# 快速开始：使用新的黑白样式系统

## 5 分钟上手指南

### 1. 了解架构

```
src/styles/
├── theme.css                    # 主题变量（颜色、间距等）
├── index.css                    # 样式入口（已自动导入）
├── components/                  # 组件样式
│   └── ComponentName.module.css
└── pages/                       # 页面样式
    └── PageName.module.css
```

### 2. 创建组件样式

**创建文件**: `src/styles/components/MyComponent.module.css`

```css
/**
 * MyComponent Styles
 * Black & White Design
 */

.component {
  padding: var(--spacing-md);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
}

.component__title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.component__button {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-black);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.component__button:hover {
  background-color: var(--color-gray-900);
}
```

### 3. 在组件中使用

```typescript
import React from 'react';
import styles from '../styles/components/MyComponent.module.css';

export const MyComponent = () => {
  return (
    <div className={styles.component}>
      <h2 className={styles.component__title}>Hello World</h2>
      <button className={styles.component__button}>
        Click Me
      </button>
    </div>
  );
};
```

### 4. 常用变量速查

#### 颜色
```css
var(--color-black)          /* 纯黑 */
var(--color-white)          /* 纯白 */
var(--bg-primary)           /* 主背景 */
var(--text-primary)         /* 主文本 */
var(--border-primary)       /* 主边框 */
var(--interactive-hover)    /* 悬停状态 */
```

#### 间距
```css
var(--spacing-xs)   /* 4px */
var(--spacing-sm)   /* 8px */
var(--spacing-md)   /* 16px */
var(--spacing-lg)   /* 24px */
var(--spacing-xl)   /* 32px */
```

#### 圆角
```css
var(--radius-md)    /* 8px - 按钮、输入框 */
var(--radius-lg)    /* 12px - 卡片 */
var(--radius-full)  /* 完全圆角 - 头像、药丸按钮 */
```

### 5. 响应式设计模板

```css
/* 移动端（默认） */
.component {
  padding: var(--spacing-md);
}

/* 平板及以上 */
@media (min-width: 768px) {
  .component {
    padding: var(--spacing-lg);
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-xl);
  }
}
```

### 6. 按钮样式模板

```css
/* 主按钮 */
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
}

/* 次要按钮 */
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
}
```

### 7. 卡片样式模板

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

### 8. 表单输入模板

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

## 常见问题

### Q: 如何处理动态类名？

```typescript
// 单个修饰符
<div className={`${styles.card} ${isActive ? styles['card--active'] : ''}`}>

// 多个修饰符
<div className={[
  styles.card,
  isActive && styles['card--active'],
  isLarge && styles['card--large']
].filter(Boolean).join(' ')}>
```

### Q: 如何覆盖第三方组件样式？

```typescript
// 如果组件支持 className prop
<ThirdPartyComponent className={styles.custom__wrapper} />

// 如果需要全局覆盖，使用 :global
.component :global(.third-party-class) {
  /* 样式覆盖 */
}
```

### Q: 如何避免 CSS 覆盖导致交互失效？

```css
/* 问题：遮罩层阻挡点击 */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 999;
}

/* 解决：禁用遮罩的指针事件 */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 999;
  pointer-events: none; /* 关键！ */
}

/* 交互元素重新启用 */
.overlay__button {
  pointer-events: auto;
}
```

## 迁移现有组件

### Step 1: 创建样式文件
```bash
touch src/styles/components/MyComponent.module.css
```

### Step 2: 提取样式
将组件中的 `className="..."` 内容转换为 CSS Module

### Step 3: 导入并应用
```typescript
import styles from '../styles/components/MyComponent.module.css';
```

### Step 4: 测试
- 检查视觉效果
- 测试交互（点击、悬停、焦点）
- 测试响应式布局

## 资源链接

- 📘 [完整样式规范](./STYLE_GUIDE.md)
- 📝 [迁移指南](./UI_UX_MIGRATION_GUIDE.md)
- 📊 [完成总结](./UI_UX_UPGRADE_SUMMARY.md)

---

**开始使用新样式系统，打造优雅的黑白界面！** ✨
