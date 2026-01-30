# 页面迁移指南 - 黑白渐变背景

## 概述

所有页面需要从彩色渐变背景迁移到黑白灰渐变背景，并移除所有彩色动画元素。

## 快速迁移步骤

### 1. 导入样式

在每个页面文件顶部添加：

```typescript
import pageBaseStyles from '../styles/pages/PageBase.module.css';
import styles from '../styles/pages/[PageName].module.css'; // 如果存在
```

### 2. 替换背景容器

**替换前：**
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
  {/* 彩色动画元素 */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
    {/* ... 更多彩色元素 */}
  </div>
  
  {/* Neural network pattern */}
  <div className="absolute inset-0 opacity-20">
    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"></div>
    {/* ... 更多彩色点 */}
  </div>
  
  <div className="relative z-10 p-4">
    {/* 内容 */}
  </div>
</div>
```

**替换后：**
```tsx
<div className={pageBaseStyles.page__base}>
  <div className={pageBaseStyles.page__base__container}>
    {/* 内容 */}
  </div>
</div>
```

### 3. 移除所有彩色元素

删除以下类型的元素：
- `bg-cyan-400/10`, `bg-purple-400/10`, `bg-blue-400/5` 等彩色背景
- `bg-cyan-400`, `bg-purple-400`, `bg-blue-400` 等彩色点
- SVG 渐变线条（gradient1, gradient2 等）
- 所有 `animate-pulse`, `animate-ping` 的彩色动画

### 4. 更新文本颜色

**替换前：**
```tsx
<h1 className="text-white">Title</h1>
<p className="text-white/60">Subtitle</p>
```

**替换后：**
```tsx
<h1 className={styles.title}>Title</h1>
<p className={styles.subtitle}>Subtitle</p>
```

在 CSS 中：
```css
.title {
  color: var(--text-inverse);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
```

### 5. 更新卡片样式

**替换前：**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10">
```

**替换后：**
```tsx
<div className={styles.card}>
```

在 CSS 中：
```css
.card {
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
```

## 待迁移页面清单

### ✅ 已完成
- [x] Index.tsx
- [x] Profile.tsx (部分)
- [x] Chat.tsx (部分)

### 🔄 进行中
- [ ] Chat.tsx (需要完成内部样式迁移)

### ⏳ 待迁移
- [ ] Gallery.tsx
- [ ] MyDevices.tsx
- [ ] Creation.tsx
- [ ] Contracts.tsx
- [ ] Shop.tsx
- [ ] AddDevice.tsx
- [ ] DeviceSend.tsx
- [ ] TaskRewards.tsx
- [ ] ElevenLabsChat.tsx

## 通用样式类

### PageBase.module.css

所有页面都可以使用 `PageBase.module.css` 中的通用样式：

```css
.page__base              /* 主容器，包含渐变背景和纹理 */
.page__base__container   /* 内容容器 */
.page__base__loading     /* 加载状态 */
```

## 检查清单

迁移完成后，检查：

- [ ] 移除了所有彩色背景元素
- [ ] 移除了所有彩色动画点
- [ ] 移除了 SVG 渐变线条
- [ ] 使用了 `pageBaseStyles.page__base` 作为主容器
- [ ] 文本颜色适配深色背景（白色/浅灰色）
- [ ] 卡片使用毛玻璃效果
- [ ] 无 lint 错误
- [ ] 页面在不同设备上正常显示

## 常见问题

### Q: 如何保持原有的视觉效果？

A: 使用毛玻璃效果（backdrop-filter）和阴影来创建层次感，而不是彩色元素。

### Q: 文本看不清怎么办？

A: 使用 `text-shadow` 增加文本对比度，或使用更浅的文本颜色。

### Q: 卡片背景太透明？

A: 增加 `rgba(255, 255, 255, 0.9)` 的透明度值，或使用纯白背景。

## 参考

- `src/styles/pages/PageBase.module.css` - 通用页面样式
- `src/styles/pages/Index.module.css` - 参考实现
- `src/pages/Index.tsx` - 参考实现
