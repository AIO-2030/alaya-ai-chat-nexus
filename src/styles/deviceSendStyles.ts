/**
 * DeviceSend 页面样式配置
 * 将内联样式提取到独立配置文件，便于维护和复用
 */

// 系统字体族
export const SYSTEM_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// 基础字体平滑样式
export const fontSmoothing = {
  WebkitFontSmoothing: 'antialiased' as const,
  MozOsxFontSmoothing: 'grayscale' as const,
};

// 字体平滑 + 字体族
export const fontSmoothingWithFamily = {
  ...fontSmoothing,
  fontFamily: SYSTEM_FONT_FAMILY,
};

// 字体平滑 + 文本渲染优化 + 字体族
export const optimizedTextRendering = {
  ...fontSmoothing,
  textRendering: 'optimizeLegibility' as const,
  fontFamily: SYSTEM_FONT_FAMILY,
};

// 点击高亮透明（用于按钮等交互元素）
export const transparentTapHighlight = {
  WebkitTapHighlightColor: 'transparent' as const,
};

// 背面可见性优化（用于性能优化）
export const hiddenBackface = {
  WebkitBackfaceVisibility: 'hidden' as const,
  backfaceVisibility: 'hidden' as const,
};

// 变换优化（用于硬件加速）
export const transformOptimization = {
  WebkitTransform: 'translateZ(0)' as const,
  transform: 'translateZ(0)' as const,
};

// 组合样式：按钮样式（包含点击高亮和字体优化）
export const buttonStyles = {
  ...transparentTapHighlight,
  ...fontSmoothing,
  fontFamily: SYSTEM_FONT_FAMILY,
};

// 组合样式：文本容器样式（包含字体优化和文本渲染）
export const textContainerStyles = {
  ...fontSmoothing,
  fontFamily: SYSTEM_FONT_FAMILY,
};

// 组合样式：标题样式（包含所有文本优化）
export const headingStyles = {
  ...optimizedTextRendering,
};

// 组合样式：性能优化容器（包含背面可见性和变换优化）
export const performanceOptimizedContainer = {
  ...fontSmoothing,
  ...hiddenBackface,
};

// 组合样式：图片优化（包含变换优化）
export const imageOptimization = {
  ...transformOptimization,
};
