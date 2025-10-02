# Pixel Image Generate API 文档

## 概述

`pixel_image_generate` 接口是基于 JSON-RPC 2.0 协议通过 stdio 进行通信的像素风格表情包图片生成服务。该接口支持基于用户自然语言输入生成高质量的像素风格图片。

## 接口规范

- **方法名**: `pixel_image_generate`
- **协议**: JSON-RPC 2.0 over stdio
- **功能**: 基于用户自然语言输入生成像素风格表情包图片

## 请求参数

| 参数名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
| `user_input` | string | ✅ | - | 用户的自然语言输入，支持多语言 |
| `negative_prompt` | string | ❌ | `""` | 负面提示词，默认为空字符串 |
| `num_inference_steps` | integer | ❌ | `20` | 推理步数，范围 1-100 |
| `guidance_scale` | number | ❌ | `7.5` | 引导比例，范围 0-20 |
| `seed` | integer | ❌ | - | 随机种子，用于结果复现 |
| `image_size` | string | ❌ | `"1024x1024"` | 图片尺寸，格式为 "宽度x高度" |

### 参数示例

```json
{
  "user_input": "一只可爱的小猫，像素风格",
  "negative_prompt": "模糊，低质量",
  "num_inference_steps": 25,
  "guidance_scale": 8.0,
  "seed": 42,
  "image_size": "512x512"
}
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "image_size": "512x512",
    "generation_params": {
      "user_input": "一只可爱的小猫，像素风格",
      "negative_prompt": "模糊，低质量",
      "num_inference_steps": 25,
      "guidance_scale": 8.0,
      "seed": 42,
      "image_size": "512x512"
    },
    "generation_time_ms": 1500
  }
}
```

### 失败响应

```json
{
  "success": false,
  "error": "user_input 参数不能为空"
}
```

## TypeScript 类型定义

```typescript
interface PixelImageGenerateParams {
  user_input: string; // 用户的自然语言输入，支持多语言
  negative_prompt?: string; // 负面提示词，默认为空字符串
  num_inference_steps?: number; // 推理步数，默认20
  guidance_scale?: number; // 引导比例，默认7.5
  seed?: number; // 随机种子
  image_size?: string; // 图片尺寸，默认'1024x1024'
}

interface PixelImageGenerateResponse {
  success: boolean;
  data?: {
    image_base64: string; // Base64编码的图片数据
    image_size: string; // 实际生成的图片尺寸
    generation_params: {
      user_input: string;
      negative_prompt: string;
      num_inference_steps: number;
      guidance_scale: number;
      seed?: number;
      image_size: string;
    };
    generation_time_ms: number; // 生成耗时（毫秒）
  };
  error?: string;
}
```

## 使用方法

### 1. 基础使用

```typescript
import { alayaMcpService } from '../services/alayaMcpService';

// 基本调用
const result = await alayaMcpService.pixelImageGenerate({
  user_input: '一只可爱的小猫，像素风格',
  image_size: '512x512'
});

if (result.success) {
  console.log('图片生成成功！');
  console.log('Base64数据:', result.data?.image_base64);
} else {
  console.error('生成失败:', result.error);
}
```

### 2. 高级参数使用

```typescript
const result = await alayaMcpService.pixelImageGenerate({
  user_input: '一个像素风格的机器人，蓝色主题，未来感',
  negative_prompt: '模糊，低质量，变形',
  num_inference_steps: 30,
  guidance_scale: 8.5,
  seed: 42,
  image_size: '1024x1024'
});
```

### 3. 批量生成

```typescript
const requests = [
  { user_input: '像素风格的太阳', image_size: '256x256' },
  { user_input: '像素风格的月亮', image_size: '256x256' },
  { user_input: '像素风格的星星', image_size: '256x256' }
];

const results = await alayaMcpService.batchPixelImageGenerate(requests, 2);
```

### 4. 重试机制

```typescript
const result = await alayaMcpService.pixelImageGenerateWithRetry(
  { user_input: '像素风格的龙' },
  3, // 最大重试3次
  2000 // 重试间隔2秒
);
```

### 5. 图片保存

```typescript
if (result.success && result.data?.image_base64) {
  const saveResult = await alayaMcpService.saveImageToFile(
    result.data.image_base64,
    './images/', // 保存目录
    'my_pixel_art.png' // 文件名
  );
  
  if (saveResult.success) {
    console.log('图片已保存:', saveResult.filePath);
  }
}
```

### 6. 健康检查

```typescript
const health = await alayaMcpService.healthCheck();
if (health.healthy) {
  console.log('服务正常，响应时间:', health.responseTime + 'ms');
} else {
  console.error('服务异常:', health.error);
}
```

## 错误处理

### 常见错误类型

1. **参数验证错误**
   - `user_input 参数不能为空`
   - `num_inference_steps 必须在 1-100 之间`
   - `guidance_scale 必须在 0-20 之间`
   - `image_size 格式错误，应为 "宽度x高度"，如 "1024x1024"`

2. **服务错误**
   - `MCP返回数据格式错误`
   - `MCP返回数据中缺少图片数据`
   - `图片生成失败`

3. **网络错误**
   - `重试 3 次后仍然失败: [具体错误信息]`

### 错误处理最佳实践

```typescript
try {
  const result = await alayaMcpService.pixelImageGenerate(params);
  
  if (result.success) {
    // 处理成功结果
    console.log('生成成功:', result.data);
  } else {
    // 处理业务错误
    console.error('生成失败:', result.error);
    
    // 根据错误类型进行不同处理
    if (result.error?.includes('参数不能为空')) {
      // 提示用户输入内容
    } else if (result.error?.includes('必须在')) {
      // 提示用户调整参数范围
    } else {
      // 其他错误处理
    }
  }
} catch (error) {
  // 处理异常
  console.error('发生异常:', error);
}
```

## 性能优化建议

### 1. 参数调优

- **推理步数**: 20-30 步通常能获得良好的质量和速度平衡
- **引导比例**: 7.0-8.5 适合大多数场景
- **图片尺寸**: 根据需求选择合适的尺寸，避免过大的尺寸

### 2. 批量处理

```typescript
// 使用批量处理提高效率
const results = await alayaMcpService.batchPixelImageGenerate(requests, 3);
```

### 3. 缓存策略

```typescript
// 使用相同的 seed 值可以复现结果
const result1 = await alayaMcpService.pixelImageGenerate({
  user_input: '像素风格的小猫',
  seed: 42
});

const result2 = await alayaMcpService.pixelImageGenerate({
  user_input: '像素风格的小猫',
  seed: 42
});
// result1 和 result2 的图片内容应该相同
```

## 环境配置

### 浏览器环境

```typescript
// 在浏览器中，图片会通过下载方式保存
const saveResult = await alayaMcpService.saveImageToFile(
  base64Data,
  undefined, // 不指定路径
  'my_image.png'
);
```

### Node.js 环境

```typescript
// 在 Node.js 中，图片会保存到指定路径
const saveResult = await alayaMcpService.saveImageToFile(
  base64Data,
  './output/images/',
  'my_image.png'
);
```

## 最佳实践

1. **输入优化**: 使用清晰、具体的描述词
2. **参数调优**: 根据需求调整推理步数和引导比例
3. **错误处理**: 实现完整的错误处理机制
4. **性能考虑**: 使用批量处理和重试机制
5. **资源管理**: 及时清理不需要的图片数据

## 示例项目

完整的使用示例请参考：
- `src/examples/pixelImageGenerateExample.ts` - 基础使用示例
- `src/services/alayaMcpService.ts` - 完整实现代码

## 更新日志

- **v1.0.0** - 初始版本，支持基础像素图片生成功能
- **v1.1.0** - 添加批量生成和重试机制
- **v1.2.0** - 添加图片保存和健康检查功能
