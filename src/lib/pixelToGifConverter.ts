/**
 * 像素图转GIF工具函数
 * 将静态像素图转换为单帧GIF格式
 */

export interface PixelToGifOptions {
  width: number;
  height: number;
  palette: string[];
  pixels: number[][];
  title?: string;
  duration?: number; // GIF帧持续时间，默认100ms
}

export interface GifResult {
  gifUrl: string;
  thumbnailUrl: string;
  title: string;
  duration: number;
  width: number;
  height: number;
  sourceType: 'pixel';
  sourceId?: string;
  palette?: string[];  // Color palette for restoration
  pixels?: number[][]; // Pixel data for restoration
}

/**
 * 将像素图数据转换为单帧GIF
 * @param options 像素图选项
 * @returns Promise<GifResult>
 */
export async function convertPixelToGif(options: PixelToGifOptions): Promise<GifResult> {
  const { width, height, palette, pixels, title = 'Pixel Art', duration = 100 } = options;
  
  try {
    // 创建canvas来绘制像素图
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('无法创建canvas上下文');
    }

    // 设置canvas尺寸
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;

    // 绘制像素图
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[y] && pixels[y][x] !== undefined) {
          const colorIndex = pixels[y][x];
          const color = palette[colorIndex] || '#000000';
          
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // 将canvas转换为blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('无法将canvas转换为blob'));
        }
      }, 'image/png');
    });

    // 创建GIF URL
    const gifUrl = URL.createObjectURL(blob);
    
    // 创建缩略图URL（使用相同的图片）
    const thumbnailUrl = gifUrl;

    return {
      gifUrl,
      thumbnailUrl,
      title,
      duration,
      width,
      height,
      sourceType: 'pixel' as const,
      palette,  // Include palette for restoration
      pixels    // Include pixels for restoration
    };
  } catch (error) {
    console.error('转换像素图为GIF失败:', error);
    throw error;
  }
}

/**
 * 从PixelProcessingResult转换为GIF
 * @param pixelResult 像素处理结果
 * @param title 标题
 * @returns Promise<GifResult>
 */
export async function convertPixelResultToGif(
  pixelResult: { canvas: HTMLCanvasElement; palette?: string[] }, 
  title: string
): Promise<GifResult> {
  const canvas = pixelResult.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法获取canvas上下文');
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels: number[][] = [];
  
  // 转换RGBA数据为颜色索引
  for (let y = 0; y < canvas.height; y++) {
    const row: number[] = [];
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      
      // 转换为十六进制颜色
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // 在调色板中查找颜色索引
      let colorIndex = 0;
      if (pixelResult.palette) {
        colorIndex = pixelResult.palette.findIndex(color => color === hex);
        if (colorIndex === -1) colorIndex = 0;
      }
      
      row.push(a === 0 ? -1 : colorIndex); // -1表示透明像素
    }
    pixels.push(row);
  }

  const result = await convertPixelToGif({
    width: canvas.width,
    height: canvas.height,
    palette: pixelResult.palette || ['#000000'],
    pixels,
    title
  });
  
  // Include pixels data in the result
  return {
    ...result,
    palette: pixelResult.palette || ['#000000'],
    pixels
  };
}

/**
 * 从UserCreationItem转换为GIF
 * @param item 用户创作项目
 * @returns Promise<GifResult>
 */
export async function convertUserCreationToGif(item: {
  id: string;
  title: string;
  pixelArt?: {
    width: number;
    height: number;
    palette: string[];
    pixels: number[][];
  };
}): Promise<GifResult> {
  if (!item.pixelArt) {
    throw new Error('项目没有像素图数据');
  }

  return convertPixelToGif({
    width: item.pixelArt.width,
    height: item.pixelArt.height,
    palette: item.pixelArt.palette,
    pixels: item.pixelArt.pixels,
    title: item.title
  });
}
