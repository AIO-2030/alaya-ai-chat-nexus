/**
 * Pixel Art Processing Library
 * 
 * This module provides utilities for converting images to pixel art style
 * with support for different pixel grid formats (32x32, 32x16)
 */

export type PixelFormat = '32x32' | '32x16';

export interface PixelProcessingOptions {
  format: PixelFormat;
  colorReduction?: number; // Number of colors to reduce to (default: 16)
  dithering?: boolean; // Apply dithering for better quality (default: false)
  smoothing?: boolean; // Apply smoothing before pixelization (default: true)
}

export interface PixelProcessingResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  originalDimensions: { width: number; height: number };
  pixelDimensions: { width: number; height: number };
}

/**
 * Main pixel processing class
 */
export class PixelProcessor {
  private static instance: PixelProcessor;

  static getInstance(): PixelProcessor {
    if (!PixelProcessor.instance) {
      PixelProcessor.instance = new PixelProcessor();
    }
    return PixelProcessor.instance;
  }

  /**
   * Convert an image to pixel art style
   */
  async processImage(
    imageSource: HTMLImageElement | File | string,
    options: PixelProcessingOptions
  ): Promise<PixelProcessingResult> {
    const img = await this.loadImage(imageSource);
    const { format, colorReduction = 16, dithering = false, smoothing = true } = options;
    
    // Get pixel dimensions based on format
    const pixelDimensions = this.getPixelDimensions(format);
    
    // Create temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Set canvas to original image size first
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);
    
    // Apply smoothing if enabled
    if (smoothing) {
      this.applySmoothing(tempCtx, img.width, img.height);
    }
    
    // Create final canvas with pixel dimensions
    const pixelCanvas = document.createElement('canvas');
    const pixelCtx = pixelCanvas.getContext('2d')!;
    pixelCanvas.width = pixelDimensions.width;
    pixelCanvas.height = pixelDimensions.height;
    
    // Disable image smoothing for pixelated effect
    pixelCtx.imageSmoothingEnabled = false;
    
    // Scale down to pixel size
    pixelCtx.drawImage(tempCanvas, 0, 0, pixelDimensions.width, pixelDimensions.height);
    
    // Apply color reduction
    if (colorReduction < 256) {
      this.applyColorReduction(pixelCtx, pixelDimensions.width, pixelDimensions.height, colorReduction);
    }
    
    // Apply dithering if enabled
    if (dithering) {
      this.applyDithering(pixelCtx, pixelDimensions.width, pixelDimensions.height);
    }
    
    return {
      canvas: pixelCanvas,
      dataUrl: pixelCanvas.toDataURL('image/png'),
      originalDimensions: { width: img.width, height: img.height },
      pixelDimensions
    };
  }

  /**
   * Convert emoji/text to pixel art
   */
  async processEmoji(
    emoji: string,
    options: PixelProcessingOptions
  ): Promise<PixelProcessingResult> {
    const pixelDimensions = this.getPixelDimensions(options.format);
    
    // Create temporary canvas to render emoji
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Set high resolution for better quality
    const scale = 4;
    tempCanvas.width = pixelDimensions.width * scale;
    tempCanvas.height = pixelDimensions.height * scale;
    
    // Configure text rendering
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.font = `${tempCanvas.height * 0.7}px Arial`;
    
    // Fill background with transparent
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw emoji
    tempCtx.fillText(
      emoji, 
      tempCanvas.width / 2, 
      tempCanvas.height / 2
    );
    
    // Create image from canvas
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    
    return new Promise((resolve) => {
      img.onload = async () => {
        const result = await this.processImage(img, options);
        resolve(result);
      };
    });
  }

  /**
   * Create a display canvas that scales up the pixel art for better visibility
   */
  createDisplayCanvas(
    pixelResult: PixelProcessingResult, 
    displaySize: { width: number; height: number }
  ): HTMLCanvasElement {
    const displayCanvas = document.createElement('canvas');
    const displayCtx = displayCanvas.getContext('2d')!;
    
    displayCanvas.width = displaySize.width;
    displayCanvas.height = displaySize.height;
    
    // Disable smoothing to maintain pixel art look
    displayCtx.imageSmoothingEnabled = false;
    
    // Scale up the pixel art
    displayCtx.drawImage(
      pixelResult.canvas,
      0, 0,
      pixelResult.pixelDimensions.width,
      pixelResult.pixelDimensions.height,
      0, 0,
      displaySize.width,
      displaySize.height
    );
    
    return displayCanvas;
  }

  /**
   * Load image from various sources
   */
  private async loadImage(source: HTMLImageElement | File | string): Promise<HTMLImageElement> {
    if (source instanceof HTMLImageElement) {
      return source;
    }
    
    const img = new Image();
    
    if (source instanceof File) {
      const dataUrl = await this.fileToDataUrl(source);
      img.src = dataUrl;
    } else {
      img.src = source;
    }
    
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  /**
   * Convert File to data URL
   */
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get pixel dimensions based on format
   */
  private getPixelDimensions(format: PixelFormat): { width: number; height: number } {
    switch (format) {
      case '32x32':
        return { width: 32, height: 32 };
      case '32x16':
        return { width: 32, height: 16 };
      default:
        return { width: 32, height: 32 };
    }
  }

  /**
   * Apply smoothing filter to reduce noise
   */
  private applySmoothing(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple box blur
    const tempData = new Uint8ClampedArray(data);
    const kernelSize = 3;
    const half = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const kidx = (ny * width + nx) * 4;
              r += tempData[kidx];
              g += tempData[kidx + 1];
              b += tempData[kidx + 2];
              a += tempData[kidx + 3];
              count++;
            }
          }
        }
        
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply color reduction using color quantization
   */
  private applyColorReduction(
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    colorCount: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple color quantization by reducing color depth
    const factor = 256 / colorCount;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] / factor) * factor;     // Red
      data[i + 1] = Math.floor(data[i + 1] / factor) * factor; // Green
      data[i + 2] = Math.floor(data[i + 2] / factor) * factor; // Blue
      // Alpha channel remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply Floyd-Steinberg dithering
   */
  private applyDithering(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        for (let channel = 0; channel < 3; channel++) {
          const oldPixel = data[idx + channel];
          const newPixel = oldPixel < 128 ? 0 : 255;
          data[idx + channel] = newPixel;
          
          const error = oldPixel - newPixel;
          
          // Distribute error to neighboring pixels
          if (x + 1 < width) {
            data[idx + 4 + channel] += error * 7 / 16;
          }
          if (y + 1 < height) {
            if (x > 0) {
              data[idx + (width - 1) * 4 + channel] += error * 3 / 16;
            }
            data[idx + width * 4 + channel] += error * 5 / 16;
            if (x + 1 < width) {
              data[idx + (width + 1) * 4 + channel] += error * 1 / 16;
            }
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Utility functions for easy access
 */
export const pixelProcessor = PixelProcessor.getInstance();

/**
 * Quick function to pixelize an emoji
 */
export const pixelizeEmoji = async (
  emoji: string, 
  format: PixelFormat = '32x32',
  options?: Partial<PixelProcessingOptions>
): Promise<PixelProcessingResult> => {
  return pixelProcessor.processEmoji(emoji, {
    format,
    colorReduction: 16,
    dithering: false,
    smoothing: true,
    ...options
  });
};

/**
 * Quick function to pixelize an image
 */
export const pixelizeImage = async (
  imageSource: HTMLImageElement | File | string,
  format: PixelFormat = '32x32',
  options?: Partial<PixelProcessingOptions>
): Promise<PixelProcessingResult> => {
  return pixelProcessor.processImage(imageSource, {
    format,
    colorReduction: 16,
    dithering: false,
    smoothing: true,
    ...options
  });
};

/**
 * Create a pixel art preview component
 */
export const createPixelPreview = (
  pixelResult: PixelProcessingResult,
  containerSize: { width: number; height: number }
): HTMLCanvasElement => {
  return pixelProcessor.createDisplayCanvas(pixelResult, containerSize);
};
