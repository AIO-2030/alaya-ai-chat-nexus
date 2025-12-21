import { Actor, HttpAgent, ActorSubclass, Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { AnonymousIdentity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { 
  _SERVICE,
  PixelArtSource,
  Project,
  Version,
  ProjectId,
  VersionId,
  PixelRow
} from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';
import { PixelArtInfo, PixelAnimationData, PixelFrame } from './chatApi';
import { parseGIF, decompressFrames } from 'gifuct-js';
// @ts-ignore - omggif doesn't have type definitions
import { GifReader } from 'omggif';

// Declare SuperGif type for libgif.js
declare global {
  interface Window {
    SuperGif: any;
  }
}

// Import environment configuration
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

// Import principal management
import { getPrincipalId } from '../../lib/principal';

// Canister configuration
const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

// Log environment configuration
logEnvironmentConfig('AIO_BASE_BACKEND');

// AuthClient instance
let authClient: AuthClient | null = null;

// Initialize AuthClient
const initAuthClient = async (): Promise<AuthClient> => {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  return authClient;
};

// Create authenticated actor using existing principal
const createActor = async (): Promise<ActorSubclass<_SERVICE>> => {
  // Use anonymous identity since we're using principalId for authentication
  // The backend will authenticate based on the caller's principal
  const identity = new AnonymousIdentity();
  
  const agent = new HttpAgent({ 
    host: HOST,
    identity
  });

  // Fetch root key in development
  if (isLocalNet()) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
};

// Types for frontend use
export interface PixelArtData {
  title?: string;
  description?: string;
  width: number;
  height: number;
  palette: string[];
  pixels: number[][]; // 2D array for easier frontend handling
  tags?: string[];
}

export interface CreateProjectRequest {
  pixelArt: PixelArtData;
  message?: string;
}

export interface SaveVersionRequest {
  projectId: string;
  pixelArt: PixelArtData;
  message?: string;
  ifMatchVersion?: string;
}

export interface ProjectListItem {
  projectId: string;
  title: string;
  description?: string;
  owner: string;
  createdAt: bigint;
  updatedAt: bigint;
  currentVersion: {
    versionId: string;
    createdAt: bigint;
    editor: string;
    message?: string;
  };
}

// Convert frontend pixel data to backend format
const convertToBackendFormat = (pixelArt: PixelArtData): PixelArtSource => {
  // Convert 2D array to PixelRow format (array of Uint16Arrays)
  const pixelRows: PixelRow[] = pixelArt.pixels.map(row => 
    new Uint16Array(row)
  );

  return {
    width: pixelArt.width,
    height: pixelArt.height,
    palette: pixelArt.palette,
    pixels: pixelRows,
    frames: [], // No animation support in initial version
    metadata: pixelArt.title || pixelArt.description || pixelArt.tags ? [{
      title: pixelArt.title ? [pixelArt.title] : [],
      description: pixelArt.description ? [pixelArt.description] : [],
      tags: pixelArt.tags ? [pixelArt.tags] : []
    }] : []
  };
};

// Convert backend format to frontend format
const convertFromBackendFormat = (source: PixelArtSource): PixelArtData => {
  // Convert PixelRow format back to 2D array
  const pixels: number[][] = source.pixels.map(row => Array.from(row));
  
  const metadata = source.metadata && source.metadata.length > 0 ? source.metadata[0] : null;
  
  return {
    width: source.width,
    height: source.height,
    palette: source.palette,
    pixels,
    title: metadata?.title && metadata.title.length > 0 ? metadata.title[0] : undefined,
    description: metadata?.description && metadata.description.length > 0 ? metadata.description[0] : undefined,
    tags: metadata?.tags && metadata.tags.length > 0 ? metadata.tags[0] : undefined
  };
};

// Image to pixel art conversion utilities
export interface ImageImportOptions {
  targetWidth?: number;
  targetHeight?: number;
  maxColors?: number;
  enableDithering?: boolean;
  preserveAspectRatio?: boolean;
  scaleMode?: 'fit' | 'fill' | 'stretch'; // New option for scaling behavior
}

// Color quantization using median cut algorithm
class ColorQuantizer {
  private colors: [number, number, number, number][] = []; // [r, g, b, count]

  quantize(imageData: ImageData, maxColors: number): string[] {
    const pixels = this.extractPixels(imageData);
    const quantizedColors = this.medianCut(pixels, maxColors);
    
    // Convert to hex strings and sort by frequency
    return quantizedColors
      .sort((a, b) => b[3] - a[3])
      .map(([r, g, b]) => `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`);
  }

  private extractPixels(imageData: ImageData): [number, number, number][] {
    const pixels: [number, number, number][] = [];
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip transparent pixels
      if (a > 128) {
        pixels.push([r, g, b]);
      }
    }
    
    return pixels;
  }

  private medianCut(pixels: [number, number, number][], maxColors: number): [number, number, number, number][] {
    if (pixels.length === 0) return [];
    if (maxColors === 1 || pixels.length === 1) {
      return [this.averageColor(pixels)];
    }

    // Find the channel with the greatest range
    const ranges = this.getColorRanges(pixels);
    const maxRange = Math.max(ranges.r, ranges.g, ranges.b);
    let sortChannel: 0 | 1 | 2;
    
    if (maxRange === ranges.r) sortChannel = 0;
    else if (maxRange === ranges.g) sortChannel = 1;
    else sortChannel = 2;

    // Sort pixels by the channel with greatest range
    pixels.sort((a, b) => a[sortChannel] - b[sortChannel]);

    // Split at median
    const median = Math.floor(pixels.length / 2);
    const left = pixels.slice(0, median);
    const right = pixels.slice(median);

    // Recursively quantize each half
    const leftColors = this.medianCut(left, Math.floor(maxColors / 2));
    const rightColors = this.medianCut(right, Math.ceil(maxColors / 2));

    return [...leftColors, ...rightColors];
  }

  private getColorRanges(pixels: [number, number, number][]): { r: number; g: number; b: number } {
    const minMax = pixels.reduce(
      (acc, [r, g, b]) => ({
        rMin: Math.min(acc.rMin, r),
        rMax: Math.max(acc.rMax, r),
        gMin: Math.min(acc.gMin, g),
        gMax: Math.max(acc.gMax, g),
        bMin: Math.min(acc.bMin, b),
        bMax: Math.max(acc.bMax, b),
      }),
      { rMin: 255, rMax: 0, gMin: 255, gMax: 0, bMin: 255, bMax: 0 }
    );

    return {
      r: minMax.rMax - minMax.rMin,
      g: minMax.gMax - minMax.gMin,
      b: minMax.bMax - minMax.bMin,
    };
  }

  private averageColor(pixels: [number, number, number][]): [number, number, number, number] {
    if (pixels.length === 0) return [0, 0, 0, 0];
    
    const sum = pixels.reduce(
      ([rSum, gSum, bSum], [r, g, b]) => [rSum + r, gSum + g, bSum + b],
      [0, 0, 0]
    );
    
    return [
      sum[0] / pixels.length,
      sum[1] / pixels.length,
      sum[2] / pixels.length,
      pixels.length
    ];
  }
}

// Find closest color in palette
const findClosestColor = (r: number, g: number, b: number, palette: string[]): number => {
  let minDistance = Infinity;
  let closestIndex = 0;

  palette.forEach((color, index) => {
    const hex = color.replace('#', '');
    const pr = parseInt(hex.substr(0, 2), 16);
    const pg = parseInt(hex.substr(2, 2), 16);
    const pb = parseInt(hex.substr(4, 2), 16);

    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

// Apply Floyd-Steinberg dithering
const applyDithering = (
  imageData: ImageData, 
  palette: string[], 
  width: number, 
  height: number
): number[][] => {
  const pixels: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const data = new Float32Array(imageData.data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const oldR = data[index];
      const oldG = data[index + 1];
      const oldB = data[index + 2];
      const alpha = data[index + 3];

      if (alpha < 128) {
        pixels[y][x] = 0; // Transparent
        continue;
      }

      // Find closest color
      const paletteIndex = findClosestColor(oldR, oldG, oldB, palette);
      pixels[y][x] = paletteIndex;

      // Get the actual palette color
      const hex = palette[paletteIndex].replace('#', '');
      const newR = parseInt(hex.substr(0, 2), 16);
      const newG = parseInt(hex.substr(2, 2), 16);
      const newB = parseInt(hex.substr(4, 2), 16);

      // Calculate error
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      // Distribute error to neighboring pixels (Floyd-Steinberg)
      if (x + 1 < width) {
        const idx = (y * width + x + 1) * 4;
        data[idx] += errR * 7 / 16;
        data[idx + 1] += errG * 7 / 16;
        data[idx + 2] += errB * 7 / 16;
      }
      
      if (y + 1 < height) {
        if (x - 1 >= 0) {
          const idx = ((y + 1) * width + x - 1) * 4;
          data[idx] += errR * 3 / 16;
          data[idx + 1] += errG * 3 / 16;
          data[idx + 2] += errB * 3 / 16;
        }
        
        const idx = ((y + 1) * width + x) * 4;
        data[idx] += errR * 5 / 16;
        data[idx + 1] += errG * 5 / 16;
        data[idx + 2] += errB * 5 / 16;
        
        if (x + 1 < width) {
          const idx = ((y + 1) * width + x + 1) * 4;
          data[idx] += errR * 1 / 16;
          data[idx + 1] += errG * 1 / 16;
          data[idx + 2] += errB * 1 / 16;
        }
      }
    }
  }

  return pixels;
};

// Simple nearest neighbor mapping without dithering
const mapToPixels = (imageData: ImageData, palette: string[], width: number, height: number): number[][] => {
  const pixels: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3];

      if (alpha < 128) {
        pixels[y][x] = 0; // Transparent/background color
      } else {
        pixels[y][x] = findClosestColor(r, g, b, palette);
      }
    }
  }

  return pixels;
};

// Main image to pixel art conversion function
export const convertImageToPixelArt = async (
  file: File, 
  options: ImageImportOptions = {}
): Promise<{ success: boolean; pixelArt?: PixelArtData; error?: string }> => {
  try {
    const {
      targetWidth = 32,
      targetHeight = 32,
      maxColors = 16,
      enableDithering = false,
      preserveAspectRatio = true,
      scaleMode = 'fill' // Default to 'fill' to maximize usage of canvas
    } = options;

    // Create image element
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return {
        success: false,
        error: 'Failed to create canvas context'
      };
    }

    // Load image
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });

    // Calculate final dimensions based on scale mode
    let finalWidth = targetWidth;
    let finalHeight = targetHeight;

    if (preserveAspectRatio) {
      const scaleX = targetWidth / img.width;
      const scaleY = targetHeight / img.height;
      let scale: number = 1; // Initialize with default value

      switch (scaleMode) {
        case 'fit':
          // Fit entirely within bounds (original behavior)
          scale = Math.min(scaleX, scaleY);
          break;
        case 'fill':
          // Fill the entire canvas, may crop (maximize canvas usage)
          scale = Math.max(scaleX, scaleY);
          break;
        case 'stretch':
          // Ignore aspect ratio, stretch to exact size
          finalWidth = targetWidth;
          finalHeight = targetHeight;
          break;
        default:
          scale = Math.min(scaleX, scaleY);
      }

      if (scaleMode !== 'stretch') {
        finalWidth = Math.round(img.width * scale);
        finalHeight = Math.round(img.height * scale);
        
        // Ensure minimum 1x1
        finalWidth = Math.max(1, finalWidth);
        finalHeight = Math.max(1, finalHeight);
      }
    }

    // Create a target size canvas first
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Fill with transparent/white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Use nearest neighbor scaling for pixelated effect
    ctx.imageSmoothingEnabled = false;

    if (scaleMode === 'fill' && preserveAspectRatio) {
      // For fill mode, we may need to crop the image to fit exactly in the canvas
      const scaleX = targetWidth / img.width;
      const scaleY = targetHeight / img.height;
      const scale = Math.max(scaleX, scaleY);
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Calculate crop area to center the image
      const cropX = (scaledWidth - targetWidth) / 2;
      const cropY = (scaledHeight - targetHeight) / 2;
      
      // Draw with cropping
      ctx.drawImage(
        img, 
        0, 0, img.width, img.height, // source rectangle (full image)
        -cropX, -cropY, scaledWidth, scaledHeight // destination rectangle (may extend beyond canvas)
      );
    } else {
      // For fit and stretch modes, center the image on canvas
      const offsetX = Math.floor((targetWidth - finalWidth) / 2);
      const offsetY = Math.floor((targetHeight - finalHeight) / 2);
      ctx.drawImage(img, offsetX, offsetY, finalWidth, finalHeight);
    }

    // Get image data from the full target canvas
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    // Generate color palette
    const quantizer = new ColorQuantizer();
    let palette = quantizer.quantize(imageData, maxColors);

    // Ensure we have a background color (transparent/white)
    if (!palette.includes('#ffffff')) {
      palette.unshift('#ffffff');
    }

    // Limit palette size
    if (palette.length > maxColors) {
      palette = palette.slice(0, maxColors);
    }

    // Convert to pixel grid using target dimensions
    const pixels = enableDithering 
      ? applyDithering(imageData, palette, targetWidth, targetHeight)
      : mapToPixels(imageData, palette, targetWidth, targetHeight);

    // Clean up object URL
    URL.revokeObjectURL(img.src);

    // Create pixel art data
    const pixelArt: PixelArtData = {
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      description: `Converted from ${file.name}`,
      width: targetWidth,
      height: targetHeight,
      palette,
      pixels,
      tags: ['imported', 'converted']
    };

    return {
      success: true,
      pixelArt
    };

  } catch (error) {
    console.error('Failed to convert image to pixel art:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during conversion'
    };
  }
};

// Convert PixelArtData to PixelArtInfo with device format
export const convertPixelArtDataToInfo = (pixelArt: PixelArtData): PixelArtInfo => {
  // Generate chat format (base64 image)
  const chatFormat = generateChatFormat(pixelArt);
  
  // Generate device format (JSON string) - optimized for IOT devices
  const deviceFormat = JSON.stringify({
    title: pixelArt.title,
    width: pixelArt.width,
    height: pixelArt.height,
    palette: pixelArt.palette,
    // For IOT devices, use compressed pixel data format
    pixels: pixelArt.pixels,
    format: 'iot_device',
    version: '1.0',
    timestamp: Date.now()
  });

  return {
    chatFormat,
    deviceFormat,
    width: pixelArt.width,
    height: pixelArt.height,
    palette: pixelArt.palette,
    sourceType: 'conversion',
    sourceId: undefined
  };
};

// Generate chat format (base64 image) from pixel art data
const generateChatFormat = (pixelArt: PixelArtData): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = pixelArt.width;
  canvas.height = pixelArt.height;

  // Draw pixels using palette colors
  for (let y = 0; y < pixelArt.height; y++) {
    for (let x = 0; x < pixelArt.width; x++) {
      const colorIndex = pixelArt.pixels[y][x];
      if (colorIndex >= 0 && colorIndex < pixelArt.palette.length) {
        ctx.fillStyle = pixelArt.palette[colorIndex];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas.toDataURL('image/png');
};

// Frame metadata for analysis
interface FrameMetadata {
  index: number;
  delay: number;
  disposalMethod: number;
  hasTransparency: boolean;
  imageDescriptorOffset: number;
  imageWidth?: number;
  imageHeight?: number;
  imageLeft?: number;
  imageTop?: number;
}

// Helper function to parse GIF binary data and extract frame metadata
const parseGifFrameMetadata = (gifData: Uint8Array): FrameMetadata[] => {
  const frames: FrameMetadata[] = [];
  let frameIndex = 0;
  let i = 0;
  
  while (i < gifData.length - 1) {
    // Look for Graphic Control Extension (0x21 0xF9)
    if (gifData[i] === 0x21 && gifData[i + 1] === 0xF9) {
      const blockSize = gifData[i + 2];
      if (blockSize === 4 && i + 6 < gifData.length) {
        // Parse Graphic Control Extension
        const packedFields = gifData[i + 3];
        const disposalMethod = (packedFields >> 2) & 0x07;
        const hasTransparency = (packedFields & 0x01) === 1;
        
        // Frame delay is at i+4 and i+5 (little-endian), in 1/100th seconds
        const delayLow = gifData[i + 4];
        const delayHigh = gifData[i + 5];
        const delay = (delayHigh << 8) | delayLow;
        
        // Find the next Image Descriptor (0x2C) to get image info
        let imageDescOffset = i + blockSize + 3;
        while (imageDescOffset < gifData.length - 10) {
          if (gifData[imageDescOffset] === 0x2C) {
            // Parse Image Descriptor
            const left = (gifData[imageDescOffset + 3] << 8) | gifData[imageDescOffset + 2];
            const top = (gifData[imageDescOffset + 5] << 8) | gifData[imageDescOffset + 4];
            const width = (gifData[imageDescOffset + 7] << 8) | gifData[imageDescOffset + 6];
            const height = (gifData[imageDescOffset + 9] << 8) | gifData[imageDescOffset + 8];
            
            frames.push({
              index: frameIndex++,
              delay: delay > 0 ? delay * 10 : 100, // Convert to milliseconds
              disposalMethod,
              hasTransparency,
              imageDescriptorOffset: imageDescOffset,
              imageWidth: width,
              imageHeight: height,
              imageLeft: left,
              imageTop: top
            });
            break;
          }
          imageDescOffset++;
        }
        
        i += blockSize + 3; // Skip block size, extension code, and block
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  // If no frames found with Graphic Control Extensions, try to find Image Descriptors
  if (frames.length === 0) {
    i = 0;
    while (i < gifData.length - 10) {
      if (gifData[i] === 0x2C) {
        const width = (gifData[i + 7] << 8) | gifData[i + 6];
        const height = (gifData[i + 9] << 8) | gifData[i + 8];
        if (width > 0 && width < 10000 && height > 0 && height < 10000) {
          frames.push({
            index: frameIndex++,
            delay: 100, // Default delay
            disposalMethod: 0,
            hasTransparency: false,
            imageDescriptorOffset: i,
            imageWidth: width,
            imageHeight: height
          });
          i += 10;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
  }
  
  return frames;
};

// Helper function to parse GIF binary data and extract frame delays (backward compatibility)
const parseGifFrameDelays = (gifData: Uint8Array): number[] => {
  const metadata = parseGifFrameMetadata(gifData);
  return metadata.map(f => f.delay);
};

// Helper function to count GIF frames more accurately
// We count Graphic Control Extensions (0x21 0xF9) which are more reliable indicators of frames
const countGifFrames = (gifData: Uint8Array): number => {
  let count = 0;
  let i = 0;
  
  // Count Graphic Control Extensions, which are more reliable than Image Descriptors
  // because they appear before each frame (except possibly the first)
  while (i < gifData.length - 1) {
    // Graphic Control Extension (0x21 0xF9)
    if (gifData[i] === 0x21 && gifData[i + 1] === 0xF9) {
      count++;
      // Skip the extension block
      const blockSize = gifData[i + 2] || 0;
      i += blockSize + 3;
    } else {
      i++;
    }
  }
  
  // If we found Graphic Control Extensions, add 1 for the first frame (which may not have one)
  // Otherwise, count Image Descriptors (0x2C) but limit to reasonable number
  if (count > 0) {
    return count + 1; // Add 1 for first frame
  }
  
  // Fallback: count Image Descriptors, but be more careful
  count = 0;
  i = 0;
  while (i < gifData.length - 10) {
    // Image Descriptor starts with 0x2C and should be followed by valid coordinates
    if (gifData[i] === 0x2C) {
      // Verify it's likely an Image Descriptor by checking the next bytes are reasonable
      // Image Descriptor has: 0x2C, left(2), top(2), width(2), height(2), flags(1)
      const width = (gifData[i + 5] << 8) | gifData[i + 4];
      const height = (gifData[i + 7] << 8) | gifData[i + 6];
      // Reasonable check: width and height should be > 0 and < 10000
      if (width > 0 && width < 10000 && height > 0 && height < 10000) {
        count++;
        // Skip to next potential descriptor (rough estimate)
        i += 10;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return Math.max(count, 1); // At least 1 frame
};

// Helper function to load libgif.js dynamically
const loadLibGif = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if SuperGif is already available in window
    if (typeof window !== 'undefined' && (window as any).SuperGif) {
      resolve((window as any).SuperGif);
      return;
    }
    
    // Try to import libgif - it may export SuperGif directly or as default
    // @ts-ignore - libgif doesn't have type definitions
    import('libgif').then((libgif: any) => {
      // libgif may export SuperGif in different ways
      const SuperGif = (libgif as any).SuperGif || 
                       (libgif as any).default?.SuperGif || 
                       (libgif as any).default ||
                       libgif;
      
      if (SuperGif && typeof SuperGif === 'function') {
        if (typeof window !== 'undefined') {
          (window as any).SuperGif = SuperGif;
        }
        resolve(SuperGif);
      } else {
        // Try to find SuperGif in the module
        const moduleKeys = Object.keys(libgif);
        console.log('[loadLibGif] libgif module keys:', moduleKeys);
        reject(new Error('SuperGif constructor not found in libgif module'));
      }
    }).catch((importError) => {
      console.warn('[loadLibGif] Failed to import libgif from npm, trying CDN:', importError);
      // If import fails, try loading from CDN
      loadLibGifFromCDN().then(resolve).catch(reject);
    });
  });
};

// Helper function to load libgif.js from CDN
const loadLibGifFromCDN = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window object not available'));
      return;
    }
    
    // Check if already loaded
    if ((window as any).SuperGif) {
      resolve((window as any).SuperGif);
      return;
    }
    
    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="libgif"]') as HTMLScriptElement;
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if ((window as any).SuperGif) {
          clearInterval(checkInterval);
          resolve((window as any).SuperGif);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if ((window as any).SuperGif) {
          resolve((window as any).SuperGif);
        } else {
          reject(new Error('libgif.js load timeout'));
        }
      }, 10000);
      return;
    }
    
    // Load from CDN (using jsdelivr)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/buzzfeed/libgif-js@master/libgif.js';
    script.onload = () => {
      if ((window as any).SuperGif) {
        resolve((window as any).SuperGif);
      } else {
        reject(new Error('SuperGif not found after loading script'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load libgif.js from CDN'));
    };
    document.head.appendChild(script);
  });
};

// Helper function to extract frames using multiple independent img elements
// Each img loads the GIF separately and we capture at calculated times
const extractFramesWithMultipleImgs = async (
  arrayBuffer: ArrayBuffer,
  gifUrl: string,
  targetWidth: number,
  targetHeight: number,
  frameIndices: number[],
  cumulativeTimes: number[],
  frameDelays: number[],
  frameDuration: number,
  totalDuration: number
): Promise<Array<{ imageData: ImageData; duration: number }>> => {
  const frames: Array<{ imageData: ImageData; duration: number }> = [];
  const blob = new Blob([arrayBuffer], { type: 'image/gif' });
  const objectUrl = URL.createObjectURL(blob);
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${targetWidth}px`;
  container.style.height = `${targetHeight}px`;
  document.body.appendChild(container);
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }
  
  try {
    // Extract each frame using a separate img element
    // Strategy: Load each img independently and wait for the specific time point
    for (let i = 0; i < frameIndices.length; i++) {
      const frameIndex = frameIndices[i];
      const targetTime = cumulativeTimes[frameIndex] || (frameIndex * 100);
      
      console.log(`[extractFramesWithMultipleImgs] Extracting frame ${frameIndex} at time ${targetTime}ms...`);
      
      const frameImg = document.createElement('img');
      frameImg.crossOrigin = 'anonymous';
      frameImg.style.position = 'absolute';
      frameImg.style.left = '-9999px';
      frameImg.style.top = '-9999px';
      frameImg.style.width = `${targetWidth}px`;
      frameImg.style.height = `${targetHeight}px`;
      container.appendChild(frameImg);
      
      // Load and wait for the specific time
      await new Promise<void>((resolve, reject) => {
        let loadStartTime: number | null = null;
        let checkCount = 0;
        const maxChecks = Math.ceil((totalDuration + 2000) / 16); // Check every 16ms for total duration + 2s buffer
        
        frameImg.onload = () => {
          loadStartTime = performance.now();
          console.log(`[extractFramesWithMultipleImgs] Frame ${frameIndex} img loaded, starting time tracking...`);
        };
        
        frameImg.onerror = (error) => {
          console.error(`[extractFramesWithMultipleImgs] Failed to load GIF for frame ${frameIndex}:`, error);
          reject(new Error(`Failed to load GIF for frame ${frameIndex}`));
        };
        
        // Use the blob URL directly (don't add query parameters to blob URLs)
        frameImg.src = objectUrl;
        
        const checkAndCapture = () => {
          checkCount++;
          
          if (loadStartTime === null) {
            if (checkCount < 100) { // Wait up to ~1.6s for load
              requestAnimationFrame(checkAndCapture);
            } else {
              reject(new Error(`Frame ${frameIndex} load timeout`));
            }
            return;
          }
          
          const elapsed = performance.now() - loadStartTime;
          
            // For frame 0, wait longer to ensure GIF is fully rendered
            if (frameIndex === 0) {
              // Wait for multiple animation cycles to ensure frame is visible
              const waitTime = Math.max(200, totalDuration * 0.1); // At least 200ms or 10% of duration
              setTimeout(() => {
                // Try multiple times to capture a non-black frame
                let attempts = 0;
                const maxAttempts = 5;
                
                const tryCapture = () => {
                  ctx.clearRect(0, 0, targetWidth, targetHeight);
                  ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);
                  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                  
                  // Analyze frame
                  let hash = 0;
                  let nonBlack = 0;
                  const sampleSize = Math.min(10000, imageData.data.length);
                  for (let j = 0; j < sampleSize; j += 4) {
                    const r = imageData.data[j];
                    const g = imageData.data[j + 1];
                    const b = imageData.data[j + 2];
                    if (r > 0 || g > 0 || b > 0) {
                      nonBlack++;
                    }
                    hash = ((hash << 5) - hash) + r + g + b;
                    hash = hash & hash;
                  }
                  
                  // If we got a non-black frame or max attempts reached, use it
                  if (nonBlack > 0 || attempts >= maxAttempts - 1) {
                    frames.push({ imageData, duration: frameDuration });
                    console.log(`[extractFramesWithMultipleImgs] Extracted frame ${frameIndex}, hash: ${hash.toString(16)}, nonBlack: ${nonBlack}, attempts: ${attempts + 1}`);
                    
                    if (frameImg.parentNode) {
                      container.removeChild(frameImg);
                    }
                    resolve();
                  } else {
                    // Try again after a short delay
                    attempts++;
                    setTimeout(tryCapture, 50);
                  }
                };
                
                tryCapture();
              }, waitTime);
              return;
            }
          
          // For other frames, wait until we reach the target time
          // Account for GIF looping
          const timeInLoop = elapsed % totalDuration;
          const timeDiff = Math.abs(timeInLoop - targetTime);
          
          if (timeDiff < 50 || (timeInLoop > targetTime && timeInLoop < targetTime + 100)) {
            // Wait a bit longer to ensure frame is fully rendered
            setTimeout(() => {
              // Try multiple times to capture a non-black frame
              let attempts = 0;
              const maxAttempts = 5;
              
              const tryCapture = () => {
                ctx.clearRect(0, 0, targetWidth, targetHeight);
                ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                
                // Analyze frame
                let hash = 0;
                let nonBlack = 0;
                const sampleSize = Math.min(10000, imageData.data.length);
                for (let j = 0; j < sampleSize; j += 4) {
                  const r = imageData.data[j];
                  const g = imageData.data[j + 1];
                  const b = imageData.data[j + 2];
                  if (r > 0 || g > 0 || b > 0) {
                    nonBlack++;
                  }
                  hash = ((hash << 5) - hash) + r + g + b;
                  hash = hash & hash;
                }
                
                // If we got a non-black frame or max attempts reached, use it
                if (nonBlack > 0 || attempts >= maxAttempts - 1) {
                  frames.push({ imageData, duration: frameDuration });
                  
                  // Compare with previous frame
                  let isDifferent = true;
                  if (frames.length > 1) {
                    const prevFrame = frames[frames.length - 2];
                    let prevHash = 0;
                    for (let k = 0; k < sampleSize; k += 4) {
                      prevHash = ((prevHash << 5) - prevHash) + prevFrame.imageData.data[k] + prevFrame.imageData.data[k + 1] + prevFrame.imageData.data[k + 2];
                      prevHash = prevHash & prevHash;
                    }
                    isDifferent = hash !== prevHash;
                  }
                  
                  console.log(`[extractFramesWithMultipleImgs] Extracted frame ${frameIndex} at ${timeInLoop.toFixed(0)}ms (target: ${targetTime}ms), hash: ${hash.toString(16)}, nonBlack: ${nonBlack}, isDifferent: ${isDifferent}, attempts: ${attempts + 1}`);
                  
                  if (!isDifferent) {
                    console.warn(`[extractFramesWithMultipleImgs] WARNING: Frame ${frameIndex} is identical to previous frame!`);
                  }
                  
                  if (nonBlack === 0) {
                    console.error(`[extractFramesWithMultipleImgs] ERROR: Frame ${frameIndex} is completely black after ${attempts + 1} attempts!`);
                  }
                  
                  if (frameImg.parentNode) {
                    container.removeChild(frameImg);
                  }
                  resolve();
                } else {
                  // Try again after a short delay
                  attempts++;
                  setTimeout(tryCapture, 50);
                }
              };
              
              tryCapture();
            }, 100); // Increased delay to ensure frame is rendered
            return;
          }
          
          // Continue checking
          if (checkCount < maxChecks) {
            requestAnimationFrame(checkAndCapture);
          } else {
            // Timeout: capture current frame
            console.warn(`[extractFramesWithMultipleImgs] Timeout for frame ${frameIndex}, capturing at ${timeInLoop.toFixed(0)}ms`);
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            frames.push({ imageData, duration: frameDuration });
            
            if (frameImg.parentNode) {
              container.removeChild(frameImg);
            }
            resolve();
          }
        };
        
        requestAnimationFrame(checkAndCapture);
      });
    }
  } finally {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    URL.revokeObjectURL(objectUrl);
  }
  
  return frames;
};

// Helper function to manually extract frames from GIF using libgif.js for precise frame control
// This is a fallback when gifuct-js fails to parse the GIF
const extractFramesManually = async (
  arrayBuffer: ArrayBuffer,
  gifUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Array<{ imageData: ImageData; duration: number }>> => {
  const frames: Array<{ imageData: ImageData; duration: number }> = [];
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Parse frame metadata to get frame delays and positions
  const frameMetadata = parseGifFrameMetadata(uint8Array);
  const frameDelays = parseGifFrameDelays(uint8Array);
  const frameCount = Math.max(countGifFrames(uint8Array), frameMetadata.length, frameDelays.length, 1);
  
  console.log('[extractFramesManually] Frame metadata:', {
    frameCount,
    metadataCount: frameMetadata.length,
    delaysCount: frameDelays.length
  });
  
  if (frameCount === 0) {
    return frames;
  }
  
  const MAX_FRAMES = 6;
  let frameIndices: number[] = [];
  
  if (frameCount <= MAX_FRAMES) {
    frameIndices = Array.from({ length: frameCount }, (_, i) => i);
  } else {
    // Evenly sample frames
    frameIndices = [0];
    const remainingFrames = MAX_FRAMES - 2;
    if (remainingFrames > 0) {
      const interval = (frameCount - 1) / (remainingFrames + 1);
      for (let i = 1; i <= remainingFrames; i++) {
        const index = Math.round(interval * i);
        if (index > 0 && index < frameCount - 1) {
          frameIndices.push(index);
        }
      }
    }
    if (frameCount > 1) {
      frameIndices.push(frameCount - 1);
    }
    frameIndices = Array.from(new Set(frameIndices)).sort((a, b) => a - b).slice(0, MAX_FRAMES);
  }
  
  console.log('[extractFramesManually] Selected frame indices:', frameIndices);
  
  // Create canvas for processing
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }
  
  // Calculate cumulative times
  const defaultDelay = 100;
  const cumulativeTimes: number[] = [];
  let currentTime = 0;
  for (let i = 0; i < frameCount; i++) {
    cumulativeTimes.push(currentTime);
    currentTime += (frameDelays[i] || defaultDelay);
  }
  
  // Calculate total animation duration
  const totalDuration = cumulativeTimes[frameCount - 1] + (frameDelays[frameCount - 1] || defaultDelay);
  console.log('[extractFramesManually] Total animation duration:', totalDuration, 'ms');
  
  // Calculate frame duration based on total duration and number of frames
  // This ensures smooth animation playback with evenly distributed frames
  const frameDuration = Math.round(totalDuration / frameIndices.length);
  console.log('[extractFramesManually] Frame duration calculation:', {
    totalDuration,
    selectedFrameCount: frameIndices.length,
    frameDuration: frameDuration + 'ms per frame'
  });
  
  // Create blob URL
  const blob = new Blob([arrayBuffer], { type: 'image/gif' });
  const objectUrl = URL.createObjectURL(blob);
  
  // Create a hidden container for img elements
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${targetWidth}px`;
  container.style.height = `${targetHeight}px`;
  document.body.appendChild(container);
  
  try {
    // Load libgif.js
    console.log('[extractFramesManually] Loading libgif.js...');
    const SuperGif = await loadLibGif();
    console.log('[extractFramesManually] libgif.js loaded successfully');
    
    // Create img element for libgif
    // libgif.js requires specific attributes
    const gifImg = document.createElement('img');
    gifImg.crossOrigin = 'anonymous';
    // Set rel:animated_src attribute (required by libgif)
    gifImg.setAttribute('rel:animated_src', objectUrl);
    gifImg.setAttribute('rel:auto_play', '0'); // Don't auto-play
    gifImg.style.width = `${targetWidth}px`;
    gifImg.style.height = `${targetHeight}px`;
    container.appendChild(gifImg);
    
    console.log('[extractFramesManually] Created img element, setting src...');
    
    // First, wait for the img to load
    await new Promise<void>((resolve, reject) => {
      gifImg.onload = () => {
        console.log('[extractFramesManually] GIF img element loaded');
        resolve();
      };
      gifImg.onerror = () => {
        reject(new Error('Failed to load GIF image'));
      };
      gifImg.src = objectUrl;
    });
    
    // Initialize SuperGif after img is loaded
    console.log('[extractFramesManually] Initializing SuperGif...');
    const gif = new SuperGif({ gif: gifImg });
    
    // Wait for libgif to process the GIF
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      let checkAttempts = 0;
      const maxAttempts = 100; // Check for up to 10 seconds (100 * 100ms)
      
      // Set up load callback
      try {
        gif.load(() => {
          if (!resolved) {
            resolved = true;
            console.log('[extractFramesManually] GIF loaded with libgif.js (via load callback)');
            resolve();
          }
        });
      } catch (loadError) {
        console.error('[extractFramesManually] Error calling gif.load():', loadError);
        // Continue anyway, we'll check manually
      }
      
      // Also check manually if load callback doesn't fire
      const checkReady = () => {
        checkAttempts++;
        try {
          const frameCount = gif.get_length ? gif.get_length() : 0;
          if (frameCount > 0) {
            if (!resolved) {
              resolved = true;
              console.log('[extractFramesManually] GIF ready (manual check), frame count:', frameCount);
              resolve();
            }
            return;
          }
        } catch (e) {
          // Ignore errors during check
        }
        
        if (!resolved && checkAttempts < maxAttempts) {
          setTimeout(checkReady, 100);
        } else if (!resolved) {
          resolved = true;
          console.error('[extractFramesManually] GIF load timeout after manual checks');
          reject(new Error('GIF load timeout - libgif failed to process the GIF'));
        }
      };
      
      // Start checking after a short delay
      setTimeout(checkReady, 200);
      
      // Final timeout after 15 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try {
            const frameCount = gif.get_length ? gif.get_length() : -1;
            console.error('[extractFramesManually] GIF load timeout. Frame count:', frameCount);
            reject(new Error(`GIF load timeout after 15 seconds. Frame count: ${frameCount}`));
          } catch (e) {
            reject(new Error('GIF load timeout after 15 seconds'));
          }
        }
      }, 15000);
    });
    
    // Get total frame count
    let totalFrames = 0;
    try {
      totalFrames = gif.get_length();
      console.log('[extractFramesManually] GIF frame count from libgif:', totalFrames);
    } catch (e) {
      console.error('[extractFramesManually] Error getting frame length:', e);
      // Try alternative method
      if (typeof gif.get_length === 'function') {
        totalFrames = gif.get_length();
      } else if (gif.frames && Array.isArray(gif.frames)) {
        totalFrames = gif.frames.length;
      }
      console.log('[extractFramesManually] Frame count (fallback):', totalFrames);
    }
    
    if (totalFrames === 0) {
      throw new Error('GIF has no frames or libgif failed to parse frames');
    }
    
    // Update frame indices if needed (use actual frame count from libgif)
    if (totalFrames > 0 && totalFrames !== frameCount) {
      console.log('[extractFramesManually] Frame count mismatch, using libgif count:', totalFrames);
      // Recalculate frame indices based on actual frame count
      if (totalFrames <= MAX_FRAMES) {
        frameIndices = Array.from({ length: totalFrames }, (_, i) => i);
      } else {
        frameIndices = [0];
        const remainingFrames = MAX_FRAMES - 2;
        if (remainingFrames > 0) {
          const interval = (totalFrames - 1) / (remainingFrames + 1);
          for (let i = 1; i <= remainingFrames; i++) {
            const index = Math.round(interval * i);
            if (index > 0 && index < totalFrames - 1) {
              frameIndices.push(index);
            }
          }
        }
        if (totalFrames > 1) {
          frameIndices.push(totalFrames - 1);
        }
        frameIndices = Array.from(new Set(frameIndices)).sort((a, b) => a - b).slice(0, MAX_FRAMES);
      }
      console.log('[extractFramesManually] Updated frame indices:', frameIndices);
    }
    
    // Dynamic wait strategy based on total duration
    // For short GIFs (< 2s), we can wait for the full loop
    // For longer GIFs, we optimize by starting from the beginning and capturing sequentially
    const isShortGif = totalDuration < 2000;
    const maxWaitTime = isShortGif ? totalDuration + 500 : Math.min(totalDuration * 1.5, 5000);
    const checkInterval = isShortGif ? 16 : 50; // More frequent checks for short GIFs
    
    console.log('[extractFramesManually] Extraction strategy:', {
      isShortGif,
      maxWaitTime,
      checkInterval,
      totalDuration
    });
    
    // Create canvas for capturing frames
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    // Extract each frame using libgif's move_to() method
    for (let i = 0; i < frameIndices.length; i++) {
      const frameIndex = frameIndices[i];
      const targetTime = cumulativeTimes[frameIndex] || (frameIndex * defaultDelay);
      // Use calculated frame duration instead of original frame delay for smooth animation
      const duration = frameDuration;
      
      console.log(`[extractFramesManually] Extracting frame ${frameIndex} using libgif.move_to()...`);
      
      // Move to the target frame using libgif
      gif.move_to(frameIndex);
      
      // Wait a bit for the frame to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify we're on the correct frame
      const currentFrame = gif.get_current_frame();
      if (currentFrame !== frameIndex) {
        console.warn(`[extractFramesManually] Frame mismatch: requested ${frameIndex}, got ${currentFrame}, retrying...`);
        gif.move_to(frameIndex);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Capture the frame from the img element
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(gifImg, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      
      // Analyze frame
      let hash = 0;
      const sampleSize = Math.min(10000, imageData.data.length);
      let nonBlackPixels = 0;
      const totalPixels = imageData.data.length / 4;
      const samplePixels: number[] = [];
      const colorCounts: Map<string, number> = new Map();
      
      for (let j = 0; j < sampleSize; j += 4) {
        const r = imageData.data[j];
        const g = imageData.data[j + 1];
        const b = imageData.data[j + 2];
        const a = imageData.data[j + 3];
        
        if (r > 0 || g > 0 || b > 0) {
          nonBlackPixels++;
        }
        
        const colorKey = `${r},${g},${b}`;
        colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
        
        if (samplePixels.length < 60) {
          samplePixels.push(r, g, b);
        }
        
        hash = ((hash << 5) - hash) + r + g + b + a;
        hash = hash & hash;
      }
      
      const topColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color, count]) => ({ color, count }));
      
      // Check if different from previous frames
      const isDifferent = frames.length === 0 || frames.every((f) => {
        let prevHash = 0;
        for (let k = 0; k < sampleSize; k += 4) {
          prevHash = ((prevHash << 5) - prevHash) + f.imageData.data[k] + f.imageData.data[k + 1] + f.imageData.data[k + 2] + f.imageData.data[k + 3];
          prevHash = prevHash & prevHash;
        }
        return prevHash !== hash;
      });
      
      frames.push({ imageData, duration });
      
      console.log(`[extractFramesManually] Extracted frame ${frameIndex} using libgif, duration: ${duration}ms`);
      console.log(`[extractFramesManually] Frame ${frameIndex} pixel analysis:`, {
        hash: hash.toString(16),
        totalPixels,
        nonBlackPixels,
        blackPixelPercentage: ((totalPixels - nonBlackPixels) / totalPixels * 100).toFixed(2) + '%',
        uniqueColors: colorCounts.size,
        topColors,
        samplePixels: samplePixels.slice(0, 9),
        isDifferent,
        currentFrame: gif.get_current_frame()
      });
      
      // Compare with previous frame
      if (frames.length > 1) {
        const prevFrame = frames[frames.length - 2];
        let diffCount = 0;
        const compareSize = Math.min(1000, imageData.data.length, prevFrame.imageData.data.length);
        for (let k = 0; k < compareSize; k += 4) {
          if (imageData.data[k] !== prevFrame.imageData.data[k] ||
              imageData.data[k + 1] !== prevFrame.imageData.data[k + 1] ||
              imageData.data[k + 2] !== prevFrame.imageData.data[k + 2] ||
              imageData.data[k + 3] !== prevFrame.imageData.data[k + 3]) {
            diffCount++;
          }
        }
        const diffPercentage = (diffCount / (compareSize / 4) * 100).toFixed(2);
        console.log(`[extractFramesManually] Frame ${frameIndex} vs previous: ${diffCount} different pixels (${diffPercentage}%)`);
        
        if (diffCount === 0) {
          console.error(`[extractFramesManually] ERROR: Frame ${frameIndex} is IDENTICAL to previous frame!`);
        }
      }
      
      if (!isDifferent && frames.length > 1) {
        console.warn(`[extractFramesManually] WARNING: Frame ${frameIndex} appears identical to a previous frame!`);
      }
    }
    
    // Clean up
    gif.pause(); // Stop animation
    if (gifImg.parentNode) {
      container.removeChild(gifImg);
    }
  } catch (error) {
    console.error('[extractFramesManually] Error using libgif.js:', error);
    console.log('[extractFramesManually] Falling back to improved manual extraction method...');
    
    // Fallback: Use improved manual method with multiple independent img elements
    // Each img element will be loaded separately to try to capture different frames
    try {
      return await extractFramesWithMultipleImgs(arrayBuffer, gifUrl, targetWidth, targetHeight, frameIndices, cumulativeTimes, frameDelays, frameDuration, totalDuration);
    } catch (fallbackError) {
      throw new Error(`Failed to extract frames: libgif error: ${error instanceof Error ? error.message : String(error)}, fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  } finally {
    // Clean up
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    URL.revokeObjectURL(objectUrl);
  }
  
  return frames;
};

// Helper function to detect file format from ArrayBuffer
const detectFileFormat = (arrayBuffer: ArrayBuffer): 'gif' | 'webp' | 'unknown' => {
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Check for GIF signature (GIF87a or GIF89a)
  if (uint8Array.length >= 6) {
    const gifSignature = String.fromCharCode(...uint8Array.slice(0, 6));
    if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
      return 'gif';
    }
  }
  
  // Check for WebP signature (RIFF...WEBP)
  if (uint8Array.length >= 12) {
    const riffSignature = String.fromCharCode(...uint8Array.slice(0, 4));
    const webpSignature = String.fromCharCode(...uint8Array.slice(8, 12));
    if (riffSignature === 'RIFF' && webpSignature === 'WEBP') {
      return 'webp';
    }
  }
  
  return 'unknown';
};

// Helper function to parse WebP animation chunks from binary data
// WebP animation format: RIFF...WEBPVP8X...ANIM...ANMF (frame chunks)
const parseWebPAnimationChunks = (arrayBuffer: ArrayBuffer): { frames: Array<{ offset: number; size: number; delay: number }> } => {
  const uint8Array = new Uint8Array(arrayBuffer);
  const frames: Array<{ offset: number; size: number; delay: number }> = [];
  
  // Look for ANIM chunk (animation header)
  // Then find ANMF chunks (animation frames)
  let i = 0;
  while (i < uint8Array.length - 8) {
    // Look for ANMF chunk (Animation Frame)
    if (i + 8 < uint8Array.length) {
      const chunkType = String.fromCharCode(...uint8Array.slice(i, i + 4));
      if (chunkType === 'ANMF') {
        // ANMF chunk structure:
        // - 4 bytes: 'ANMF'
        // - 4 bytes: chunk size (little-endian)
        // - 4 bytes: x position
        // - 4 bytes: y position
        // - 2 bytes: width
        // - 2 bytes: height
        // - 1 byte: duration (in milliseconds, if flag set)
        // - ... frame data
        
        const chunkSize = (uint8Array[i + 7] << 24) | (uint8Array[i + 6] << 16) | (uint8Array[i + 5] << 8) | uint8Array[i + 4];
        
        if (i + 16 < uint8Array.length) {
          // Try to extract delay (this is complex, WebP format is not straightforward)
          // For now, use default delay
          const delay = 100; // Default 100ms
          
          frames.push({
            offset: i + 16, // Skip ANMF header
            size: chunkSize - 12, // Subtract header size
            delay
          });
        }
        
        i += 8 + chunkSize;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return { frames };
};

// Helper function to extract frames from WebP animation
// Note: Browsers have limited support for WebP animation frame extraction
// This method tries multiple approaches to capture different frames
const extractWebPFrames = async (
  arrayBuffer: ArrayBuffer,
  gifUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Array<{ imageData: ImageData; duration: number }>> => {
  const frames: Array<{ imageData: ImageData; duration: number }> = [];
  
  console.log('[extractWebPFrames] Extracting frames from WebP animation...');
  
  // Create blob and load as image
  const blob = new Blob([arrayBuffer], { type: 'image/webp' });
  const objectUrl = URL.createObjectURL(blob);
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${targetWidth}px`;
  container.style.height = `${targetHeight}px`;
  document.body.appendChild(container);
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }
  
  // Define constants outside try block so they're accessible in the check after try-finally
  const MAX_FRAMES = 6;
  const estimatedDuration = 2000; // Default 2 seconds for WebP animations
  const frameDuration = Math.round(estimatedDuration / MAX_FRAMES);
  
  try {
    // First, load the image to get dimensions
    const testImg = document.createElement('img');
    testImg.crossOrigin = 'anonymous';
    testImg.src = objectUrl;
    
    await new Promise<void>((resolve, reject) => {
      testImg.onload = () => {
        console.log('[extractWebPFrames] WebP image loaded, dimensions:', testImg.naturalWidth, 'x', testImg.naturalHeight);
        resolve();
      };
      testImg.onerror = () => reject(new Error('Failed to load WebP image'));
    });
    
    // Strategy: Use multiple independent img elements, each loading the WebP separately
    // This ensures each img starts its animation from the beginning
    // We'll capture at calculated times relative to when each img starts loading
    
    // Calculate target times for each frame (evenly distributed)
    const targetTimes: number[] = [];
    for (let i = 0; i < MAX_FRAMES; i++) {
      targetTimes.push((i * estimatedDuration) / MAX_FRAMES);
    }
    
    console.log('[extractWebPFrames] Target times for frames:', targetTimes);
    
    // Extract each frame using a separate img element
    for (let i = 0; i < MAX_FRAMES; i++) {
      const targetTime = targetTimes[i];
      
      const frameImg = document.createElement('img');
      frameImg.crossOrigin = 'anonymous';
      frameImg.style.position = 'absolute';
      frameImg.style.left = '-9999px';
      frameImg.style.top = '-9999px';
      frameImg.style.width = `${targetWidth}px`;
      frameImg.style.height = `${targetHeight}px`;
      container.appendChild(frameImg);
      
      await new Promise<void>((resolve) => {
        let loadStartTime: number | null = null;
        let checkCount = 0;
        const maxChecks = Math.ceil((estimatedDuration + 1000) / 16); // Check every 16ms
        
        frameImg.onload = () => {
          loadStartTime = performance.now();
          console.log(`[extractWebPFrames] Frame ${i} img loaded, starting animation tracking...`);
        };
        
        frameImg.onerror = () => {
          console.error(`[extractWebPFrames] Failed to load frame ${i}`);
          // Capture a blank frame as fallback
          const blankImageData = ctx.createImageData(targetWidth, targetHeight);
          frames.push({ imageData: blankImageData, duration: frameDuration });
          resolve();
        };
        
        frameImg.src = objectUrl;
        
        const checkAndCapture = () => {
          checkCount++;
          
          if (loadStartTime === null) {
            if (checkCount < 100) { // Wait up to ~1.6s for load
              requestAnimationFrame(checkAndCapture);
            } else {
              console.error(`[extractWebPFrames] Frame ${i} load timeout`);
              const blankImageData = ctx.createImageData(targetWidth, targetHeight);
              frames.push({ imageData: blankImageData, duration: frameDuration });
              resolve();
            }
            return;
          }
          
          const elapsed = performance.now() - loadStartTime;
          
          // Account for animation looping
          const timeInLoop = elapsed % estimatedDuration;
          const timeDiff = Math.abs(timeInLoop - targetTime);
          
          // If we're close to the target time, capture
          if (timeDiff < 50 || (timeInLoop > targetTime && timeInLoop < targetTime + 100)) {
            // Wait a bit more to ensure frame is fully rendered
            setTimeout(() => {
              ctx.clearRect(0, 0, targetWidth, targetHeight);
              ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);
              const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
              
              // Analyze frame
              let hash = 0;
              let nonBlack = 0;
              const sampleSize = Math.min(10000, imageData.data.length);
              for (let j = 0; j < sampleSize; j += 4) {
                const r = imageData.data[j];
                const g = imageData.data[j + 1];
                const b = imageData.data[j + 2];
                if (r > 0 || g > 0 || b > 0) {
                  nonBlack++;
                }
                hash = ((hash << 5) - hash) + r + g + b;
                hash = hash & hash;
              }
              
              frames.push({ imageData, duration: frameDuration });
              
              // Compare with previous frame
              let isDifferent = true;
              if (frames.length > 1) {
                const prevFrame = frames[frames.length - 2];
                let prevHash = 0;
                for (let k = 0; k < sampleSize; k += 4) {
                  prevHash = ((prevHash << 5) - prevHash) + prevFrame.imageData.data[k] + prevFrame.imageData.data[k + 1] + prevFrame.imageData.data[k + 2];
                  prevHash = prevHash & prevHash;
                }
                isDifferent = hash !== prevHash;
              }
              
              console.log(`[extractWebPFrames] Extracted frame ${i} at ${timeInLoop.toFixed(0)}ms (target: ${targetTime.toFixed(0)}ms), hash: ${hash.toString(16)}, nonBlack: ${nonBlack}, isDifferent: ${isDifferent}`);
              
              if (!isDifferent && frames.length > 1) {
                console.warn(`[extractWebPFrames] WARNING: Frame ${i} is identical to previous frame!`);
                console.warn(`[extractWebPFrames] This may indicate the WebP animation is static or all frames are the same.`);
              }
              
              if (frameImg.parentNode) {
                container.removeChild(frameImg);
              }
              resolve();
            }, 100); // Wait 100ms to ensure frame is rendered
            return;
          }
          
          // Continue checking
          if (checkCount < maxChecks) {
            requestAnimationFrame(checkAndCapture);
          } else {
            // Timeout: capture current frame
            console.warn(`[extractWebPFrames] Timeout for frame ${i}, capturing at ${timeInLoop.toFixed(0)}ms`);
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            frames.push({ imageData, duration: frameDuration });
            
            if (frameImg.parentNode) {
              container.removeChild(frameImg);
            }
            resolve();
          }
        };
        
        // Start checking after image loads
        requestAnimationFrame(checkAndCapture);
      });
    }
  } finally {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    URL.revokeObjectURL(objectUrl);
  }
  
  // Check if all frames are identical
  if (frames.length > 1) {
    const firstHash = (() => {
      let hash = 0;
      const sampleSize = Math.min(10000, frames[0].imageData.data.length);
      for (let k = 0; k < sampleSize; k += 4) {
        hash = ((hash << 5) - hash) + frames[0].imageData.data[k] + frames[0].imageData.data[k + 1] + frames[0].imageData.data[k + 2];
        hash = hash & hash;
      }
      return hash;
    })();
    
    const allSame = frames.every((frame, index) => {
      if (index === 0) return true;
      let hash = 0;
      const sampleSize = Math.min(10000, frame.imageData.data.length);
      for (let k = 0; k < sampleSize; k += 4) {
        hash = ((hash << 5) - hash) + frame.imageData.data[k] + frame.imageData.data[k + 1] + frame.imageData.data[k + 2];
        hash = hash & hash;
      }
      return hash === firstHash;
    });
    
    if (allSame) {
      console.warn('[extractWebPFrames] All extracted frames are identical. This may indicate:');
      console.warn('  1. The WebP animation is static (all frames are the same)');
      console.warn('  2. Browser limitations in WebP animation playback control');
      console.warn('  3. The animation loops too quickly to capture different frames');
      console.warn('[extractWebPFrames] Using only the first frame to avoid duplicate data.');
      
      // Return only the first frame with the total duration
      const totalDuration = frameDuration * frames.length;
      return [{
        imageData: frames[0].imageData,
        duration: totalDuration
      }];
    }
  }
  
  return frames;
};

// Helper function to extract all frames from a GIF using gifuct-js
// This directly parses the GIF binary data to extract each frame's pixel data
const extractGifFrames = async (
  gifUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Array<{ imageData: ImageData; duration: number }>> => {
  const frames: Array<{ imageData: ImageData; duration: number }> = [];
  
  try {
    // Fetch the file as ArrayBuffer
    console.log('[extractGifFrames] Fetching file from:', gifUrl);
    const response = await fetch(gifUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log('[extractGifFrames] Fetched file, size:', arrayBuffer.byteLength, 'bytes');
    
    // Detect file format
    const fileFormat = detectFileFormat(arrayBuffer);
    console.log('[extractGifFrames] Detected file format:', fileFormat);
    
    // If it's WebP, use WebP extraction method
    if (fileFormat === 'webp') {
      console.log('[extractGifFrames] File is WebP animation, using WebP extraction...');
      return await extractWebPFrames(arrayBuffer, gifUrl, targetWidth, targetHeight);
    }
    
    // If format is unknown, try WebP extraction as fallback
    if (fileFormat === 'unknown') {
      console.warn('[extractGifFrames] Unknown file format, trying WebP extraction as fallback...');
      try {
        return await extractWebPFrames(arrayBuffer, gifUrl, targetWidth, targetHeight);
      } catch (webpError) {
        console.warn('[extractGifFrames] WebP extraction failed:', webpError);
      }
    }
    
    // Parse GIF using gifuct-js
    let gif: any;
    let rawFrames: any[];
    try {
      gif = parseGIF(arrayBuffer);
      console.log('[extractGifFrames] Parsed GIF structure:', {
        hasWidth: 'width' in gif,
        hasHeight: 'height' in gif,
        hasGlobalColorTable: 'globalColorTable' in gif,
        hasFrames: 'frames' in gif,
        gifKeys: Object.keys(gif),
        header: (gif as any).header,
        gifValues: Object.keys(gif).reduce((acc: any, key) => {
          const value = (gif as any)[key];
          if (Array.isArray(value)) {
            acc[key] = `Array(${value.length})`;
            if (value.length > 0 && typeof value[0] === 'object') {
              acc[`${key}_firstItemKeys`] = Object.keys(value[0] || {});
            }
          } else if (typeof value === 'object' && value !== null) {
            acc[key] = `Object(${Object.keys(value).length} keys)`;
            if (key === 'header') {
              acc[`${key}_keys`] = Object.keys(value);
            }
          } else {
            acc[key] = typeof value;
          }
          return acc;
        }, {})
      });
      
      // Check if gif has frames property (some versions of gifuct-js may structure differently)
      if ((gif as any).frames && Array.isArray((gif as any).frames)) {
        console.log('[extractGifFrames] GIF has frames property, count:', (gif as any).frames.length);
        if ((gif as any).frames.length > 0) {
          console.log('[extractGifFrames] First frame in frames array:', Object.keys((gif as any).frames[0] || {}));
        }
      }
      
      // Check if there are any other properties that might contain frame data
      const gifObj = gif as any;
      for (const key of Object.keys(gifObj)) {
        if (Array.isArray(gifObj[key]) && gifObj[key].length > 0) {
          console.log(`[extractGifFrames] Found array property '${key}' with ${gifObj[key].length} items`);
        }
      }
      
      // Try both buildPatch=true and buildPatch=false
      // First try with buildPatch=false to get full frame pixels
      try {
        rawFrames = decompressFrames(gif, false);
        console.log('[extractGifFrames] Decompressed frames (buildPatch=false):', {
          frameCount: rawFrames.length
        });
      } catch (err1) {
        console.warn('[extractGifFrames] Error with buildPatch=false:', err1);
        rawFrames = [];
      }
      
      // If no frames with buildPatch=false, try buildPatch=true
      if (!rawFrames || rawFrames.length === 0) {
        console.log('[extractGifFrames] Trying with buildPatch=true...');
        try {
          rawFrames = decompressFrames(gif, true);
          console.log('[extractGifFrames] Decompressed frames (buildPatch=true):', {
            frameCount: rawFrames.length,
            firstFrame: rawFrames[0] ? {
              hasPatch: 'patch' in rawFrames[0],
              hasDims: 'dims' in rawFrames[0],
              hasDelay: 'delay' in rawFrames[0],
              frameKeys: Object.keys(rawFrames[0] || {})
            } : null
          });
        } catch (err2) {
          console.error('[extractGifFrames] Error with buildPatch=true:', err2);
          rawFrames = [];
        }
      }
      
      if (rawFrames && rawFrames.length > 0) {
        console.log('[extractGifFrames] First frame structure:', {
          hasPixels: 'pixels' in rawFrames[0],
          hasPatch: 'patch' in rawFrames[0],
          hasDims: 'dims' in rawFrames[0],
          hasDelay: 'delay' in rawFrames[0],
          hasColorTable: 'colorTable' in rawFrames[0],
          frameKeys: Object.keys(rawFrames[0] || {})
        });
      }
    } catch (parseError) {
      console.error('[extractGifFrames] Error parsing GIF:', parseError);
      console.error('[extractGifFrames] Parse error details:', {
        message: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined
      });
      throw new Error(`Failed to parse GIF: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    if (!rawFrames || rawFrames.length === 0) {
      // Log more details about the GIF structure to help debug
      console.warn('[extractGifFrames] No frames extracted by gifuct-js. Trying omggif...');
      
      // Try omggif as alternative parser
      try {
        console.log('[extractGifFrames] Attempting to parse GIF with omggif...');
        // @ts-ignore - omggif uses GifReader class
        const gifReader = new GifReader(new Uint8Array(arrayBuffer));
        
        const numFrames = gifReader.numFrames();
        const width = gifReader.width;
        const height = gifReader.height;
        
        console.log('[extractGifFrames] omggif parse result:', {
          width,
          height,
          numFrames
        });
        
        if (numFrames > 0) {
          // Convert omggif frames to our format
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            throw new Error('Failed to create canvas context');
          }
          
          const MAX_FRAMES = 6;
          const frameIndices: number[] = [];
          if (numFrames <= MAX_FRAMES) {
            frameIndices.push(...Array.from({ length: numFrames }, (_, i) => i));
          } else {
            frameIndices.push(0);
            const remainingFrames = MAX_FRAMES - 2;
            if (remainingFrames > 0) {
              const interval = (numFrames - 1) / (remainingFrames + 1);
              for (let i = 1; i <= remainingFrames; i++) {
                const index = Math.round(interval * i);
                if (index > 0 && index < numFrames - 1) {
                  frameIndices.push(index);
                }
              }
            }
            if (numFrames > 1) {
              frameIndices.push(numFrames - 1);
            }
          }
          
          // Calculate frame duration (default 100ms per frame if not available)
          const frameDuration = Math.round(100 * (numFrames > 0 ? numFrames : 1) / frameIndices.length);
          
          // Extract each selected frame
          for (const frameIndex of frameIndices) {
            if (frameIndex >= numFrames) continue;
            
            // Decode frame to RGBA
            const frameImage = new Uint8Array(width * height * 4);
            gifReader.decodeAndBlitFrameRGBA(frameIndex, frameImage);
            
            // Create ImageData and scale to target size
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
              throw new Error('Failed to create temp canvas context');
            }
            
            // Put frame data into temp canvas
            const tempImageData = tempCtx.createImageData(width, height);
            tempImageData.data.set(frameImage);
            tempCtx.putImageData(tempImageData, 0, 0);
            
            // Scale to target size
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            
            frames.push({
              imageData,
              duration: frameDuration
            });
            
            console.log(`[extractGifFrames] Extracted frame ${frameIndex}/${numFrames} using omggif`);
          }
          
          if (frames.length > 0) {
            console.log(`[extractGifFrames] Successfully extracted ${frames.length} frames using omggif`);
            return frames;
          }
        }
      } catch (omggifError) {
        console.warn('[extractGifFrames] omggif parsing failed:', omggifError);
      }
      
      // Try to manually parse GIF frames from the binary data
      console.log('[extractGifFrames] Attempting manual GIF frame extraction from binary data...');
      try {
        const manualFrames = await extractFramesManually(arrayBuffer, gifUrl, targetWidth, targetHeight);
        if (manualFrames && manualFrames.length > 0) {
          console.log('[extractGifFrames] Successfully extracted', manualFrames.length, 'frames manually');
          return manualFrames;
        }
      } catch (manualError) {
        console.error('[extractGifFrames] Manual extraction failed:', manualError);
      }
      
      // Fallback: Use browser Image API to extract at least the first frame
      console.log('[extractGifFrames] Falling back to browser Image API for single frame...');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load GIF with Image API'));
        img.src = gifUrl;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        frames.push({
          imageData,
          duration: 100
        });
        console.log('[extractGifFrames] Extracted first frame using Image API fallback');
        return frames;
      }
      
      throw new Error('No frames found in GIF. The GIF may be corrupted or in an unsupported format.');
    }
    
    // Get GIF dimensions from first frame or use default
    const gifWidth = (gif as any).width || (rawFrames[0]?.dims ? rawFrames[0].dims.left + rawFrames[0].dims.width : 480);
    const gifHeight = (gif as any).height || (rawFrames[0]?.dims ? rawFrames[0].dims.top + rawFrames[0].dims.height : 480);
    const globalColorTable = (gif as any).globalColorTable || [];
    
    console.log('[extractGifFrames] Parsed GIF:', {
      width: gifWidth,
      height: gifHeight,
      frameCount: rawFrames.length,
      globalColorTable: globalColorTable.length > 0 ? 'present' : 'absent'
    });
    
    // Create canvas for processing
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    const MAX_FRAMES = 6;
    const rawFrameCount = rawFrames.length;
    
    // Calculate which frames to extract with intelligent selection
    let frameIndices: number[] = [];
    
    if (rawFrameCount <= MAX_FRAMES) {
      // Use all frames if count is within limit
      frameIndices = Array.from({ length: rawFrameCount }, (_, i) => i);
    } else {
      // Strategy: Evenly sample frames across the animation
      // Always include first and last frames
      frameIndices = [0];
      
      // Evenly distribute remaining frames
      const remainingFrames = MAX_FRAMES - 2; // Reserve slots for first and last
      if (remainingFrames > 0) {
        const interval = (rawFrameCount - 1) / (remainingFrames + 1);
        for (let i = 1; i <= remainingFrames; i++) {
          const index = Math.round(interval * i);
          if (index > 0 && index < rawFrameCount - 1) {
            frameIndices.push(index);
          }
        }
      }
      
      if (rawFrameCount > 1) {
        frameIndices.push(rawFrameCount - 1); // Always include last frame
      }
      
      // Remove duplicates and sort, then limit to MAX_FRAMES
      frameIndices = Array.from(new Set(frameIndices)).sort((a, b) => a - b).slice(0, MAX_FRAMES);
    }
    
    console.log('[extractGifFrames] Frame sampling:', {
      rawFrameCount,
      sampledFrames: frameIndices.length,
      frameIndices
    });
    
    // Create a full-size canvas to reconstruct each frame
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = gifWidth;
    fullCanvas.height = gifHeight;
    const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
    if (!fullCtx) {
      throw new Error('Failed to create full canvas context');
    }
    
    // Store previous frame state for disposal method 3 (restore to previous)
    let previousFrameImageData: ImageData | null = null;
    
    // Process each selected frame
    for (let i = 0; i < frameIndices.length; i++) {
      const frameIndex = frameIndices[i];
      const rawFrame = rawFrames[frameIndex];
      
      // Get frame delay (in milliseconds)
      const delay = rawFrame.delay !== undefined ? rawFrame.delay * 10 : 100; // Convert centiseconds to milliseconds
      
      // Get color table for this frame (local or global)
      const colorTable = rawFrame.colorTable || globalColorTable;
      
      // Get frame dimensions and position
      const frameWidth = rawFrame.dims.width;
      const frameHeight = rawFrame.dims.height;
      const frameLeft = rawFrame.dims.left;
      const frameTop = rawFrame.dims.top;
      
      // Handle disposal method from previous frame
      if (frameIndex > 0) {
        const prevFrame = rawFrames[frameIndex - 1];
        const prevDisposalType = prevFrame.disposalType || 0;
        
        if (prevDisposalType === 2) {
          // Restore to background - clear the area of the previous frame
          fullCtx.fillStyle = '#000000';
          const prevLeft = prevFrame.dims.left;
          const prevTop = prevFrame.dims.top;
          const prevWidth = prevFrame.dims.width;
          const prevHeight = prevFrame.dims.height;
          fullCtx.fillRect(prevLeft, prevTop, prevWidth, prevHeight);
        } else if (prevDisposalType === 3) {
          // Restore to previous - restore the frame before the previous one
          if (previousFrameImageData) {
            fullCtx.putImageData(previousFrameImageData, 0, 0);
          }
        }
        // disposalType 0 or 1: keep the current frame (do nothing)
      } else {
        // First frame: clear canvas
        fullCtx.fillStyle = '#000000';
        fullCtx.fillRect(0, 0, gifWidth, gifHeight);
      }
      
      // Save current state before drawing new frame (for disposal method 3)
      if (rawFrame.disposalType === 3) {
        previousFrameImageData = fullCtx.getImageData(0, 0, gifWidth, gifHeight);
      }
      
      // Create ImageData for this frame patch
      const frameImageData = fullCtx.createImageData(frameWidth, frameHeight);
      
      // Get pixels - should be Uint8ClampedArray when buildPatch=false
      if (!rawFrame.pixels) {
        console.error(`[extractGifFrames] Frame ${frameIndex} has no pixels property:`, Object.keys(rawFrame));
        throw new Error(`Frame ${frameIndex} has no pixels data. Available keys: ${Object.keys(rawFrame).join(', ')}`);
      }
      
      const pixels = rawFrame.pixels; // Uint8ClampedArray of color indices
      
      if (pixels.length !== frameWidth * frameHeight) {
        console.warn(`[extractGifFrames] Frame ${frameIndex} pixel count mismatch: expected ${frameWidth * frameHeight}, got ${pixels.length}`);
      }
      
      // Convert indexed color pixels to RGBA
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const pixelIndex = y * frameWidth + x;
          if (pixelIndex >= pixels.length) {
            console.warn(`[extractGifFrames] Pixel index ${pixelIndex} out of bounds for frame ${frameIndex}`);
            continue;
          }
          const colorIndex = pixels[pixelIndex];
          
          // Get color from color table
          let r = 0, g = 0, b = 0, a = 255;
          
          if (colorTable && colorIndex < colorTable.length) {
            const color = colorTable[colorIndex];
            r = color[0];
            g = color[1];
            b = color[2];
            a = 255;
          }
          
          // Check for transparency
          if (rawFrame.transparentIndex !== undefined && colorIndex === rawFrame.transparentIndex) {
            a = 0;
          }
          
          // Set pixel in ImageData
          const dataIndex = (y * frameWidth + x) * 4;
          frameImageData.data[dataIndex] = r;
          frameImageData.data[dataIndex + 1] = g;
          frameImageData.data[dataIndex + 2] = b;
          frameImageData.data[dataIndex + 3] = a;
        }
      }
      
      // Draw the frame patch onto the full canvas at the correct position
      fullCtx.putImageData(frameImageData, frameLeft, frameTop);
      
      // Get the full frame ImageData
      const fullFrameImageData = fullCtx.getImageData(0, 0, gifWidth, gifHeight);
      
      // Scale to target size
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      
      // Create a temporary canvas for scaling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = gifWidth;
      tempCanvas.height = gifHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(fullFrameImageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
      }
      
      // Get the scaled ImageData
      const scaledImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      
      // Calculate a hash of the frame to verify it's different from previous frames
      const calculateFrameHash = (imageData: ImageData): string => {
        // Calculate a hash from all pixels
        let hash = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          hash = ((hash << 5) - hash) + imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2] + imageData.data[i + 3];
          hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
      };
      
      const frameHash = calculateFrameHash(scaledImageData);
      const isDifferent = frames.length === 0 || frames.every((f) => {
        const prevHash = calculateFrameHash(f.imageData);
        return prevHash !== frameHash;
      });
      
      frames.push({
        imageData: scaledImageData,
        duration: delay
      });
      
      console.log(`[extractGifFrames] Extracted frame ${frameIndex}/${rawFrameCount - 1}, duration: ${delay}ms, hash: ${frameHash}, isDifferent: ${isDifferent}`);
      
      // Log a sample of pixel data for comparison
      const samplePixels = Array.from(scaledImageData.data.slice(0, 20)); // First 20 bytes (5 pixels)
      console.log(`[extractGifFrames] Frame ${frameIndex} sample pixels (first 5):`, samplePixels);
    }
    
    console.log('[extractGifFrames] Extracted frames:', {
      count: frames.length,
      durations: frames.map(f => f.duration),
      frameIndices: frameIndices
    });
    
    if (frames.length === 0) {
      throw new Error('No frames were successfully extracted');
    }
    
    return frames;
  } catch (error) {
    console.error('[extractGifFrames] Error:', error);
    console.error('[extractGifFrames] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Fallback: extract single frame using Image API
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load GIF'));
      img.src = gifUrl;
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      frames.push({
        imageData,
        duration: 100
      });
    }
    
    return frames;
  }
};

// Convert GIF to pixel animation data for IOT devices
export const convertGifToPixelAnimation = async (
  gifUrl: string,
  title: string,
  options: {
    targetWidth?: number;
    targetHeight?: number;
    maxColors?: number;
    frameDelay?: number;
    loopCount?: number;
  } = {}
): Promise<{ success: boolean; animationData?: PixelAnimationData; error?: string }> => {
  try {
    const {
      targetWidth = 8,
      targetHeight = 8,
      maxColors = 16,
      frameDelay = 200,
      loopCount = 3
    } = options;

    console.log('[convertGifToPixelAnimation] Starting conversion:', {
      gifUrl,
      targetWidth,
      targetHeight,
      maxColors
    });

    // Extract all frames from the GIF
    const gifFrames = await extractGifFrames(gifUrl, targetWidth, targetHeight);
    console.log('[convertGifToPixelAnimation] Extracted frames:', gifFrames.length);
    
    if (gifFrames.length === 0) {
      return {
        success: false,
        error: 'No frames extracted from GIF'
      };
    }
    
    // Generate a unified palette from all frames
    const quantizer = new ColorQuantizer();
    let unifiedPalette: string[] = [];
    
    // Collect colors from all frames to create a unified palette
    for (const frame of gifFrames) {
      const framePalette = quantizer.quantize(frame.imageData, maxColors);
      // Merge palettes (simple approach: combine and deduplicate)
      for (const color of framePalette) {
        if (!unifiedPalette.includes(color)) {
          unifiedPalette.push(color);
        }
      }
    }
    
    // Ensure we have a background color
    if (!unifiedPalette.includes('#000000')) {
      unifiedPalette.unshift('#000000');
    }
    
    // Limit palette size (prioritize first colors)
    if (unifiedPalette.length > maxColors) {
      unifiedPalette = unifiedPalette.slice(0, maxColors);
    }
    
    console.log('[convertGifToPixelAnimation] Generated unified palette:', {
      paletteSize: unifiedPalette.length,
      colors: unifiedPalette
    });
    
    // Convert each frame to pixel grid using the unified palette
    const frames: PixelFrame[] = [];
    for (let i = 0; i < gifFrames.length; i++) {
      const frame = gifFrames[i];
      const pixels = mapToPixels(frame.imageData, unifiedPalette, targetWidth, targetHeight);
      frames.push({
        pixels,
        duration: frame.duration || frameDelay
      });
      console.log(`[convertGifToPixelAnimation] Processed frame ${i + 1}/${gifFrames.length}, duration: ${frame.duration}ms`);
    }
    
    // Create pixel animation data with all frames
    const animationData: PixelAnimationData = {
      title,
      width: targetWidth,
      height: targetHeight,
      palette: unifiedPalette,
      frame_delay: frameDelay, // Default frame delay (individual frames have their own durations)
      loop_count: loopCount,
      frames,
      format: 'pixel_animation',
      version: '1.0',
      timestamp: Date.now()
    };

    console.log('[convertGifToPixelAnimation] Created animation data:', {
      frameCount: frames.length,
      paletteSize: unifiedPalette.length,
      totalDuration: frames.reduce((sum, f) => sum + f.duration, 0)
    });

    return {
      success: true,
      animationData
    };

  } catch (error) {
    console.error('Failed to convert GIF to pixel animation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during conversion'
    };
  }
};

// Create a simple pixel animation from pixel art data
export const createPixelAnimationFromArt = (
  pixelArt: PixelArtData,
  title: string,
  options: {
    frameDelay?: number;
    loopCount?: number;
    frameCount?: number;
  } = {}
): PixelAnimationData => {
  const {
    frameDelay = 200,
    loopCount = 3,
    frameCount = 1
  } = options;

  const frames: PixelFrame[] = [];
  
  // Create frames (for now, just duplicate the same frame)
  for (let i = 0; i < frameCount; i++) {
    frames.push({
      pixels: pixelArt.pixels,
      duration: frameDelay
    });
  }

  return {
    title,
    width: pixelArt.width,
    height: pixelArt.height,
    palette: pixelArt.palette,
    frame_delay: frameDelay,
    loop_count: loopCount,
    frames,
    format: 'pixel_animation',
    version: '1.0',
    timestamp: Date.now()
  };
};

// API Functions
export class PixelCreationApi {
  
  /**
   * Create a new pixel art project
   */
  static async createProject(request: CreateProjectRequest): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const backendSource = convertToBackendFormat(request.pixelArt);
      
      const result = await actor.create_pixel_project(
        principalId,
        backendSource, 
        request.message ? [request.message] : []
      );
      
      if ('Ok' in result) {
        return {
          success: true,
          projectId: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to create pixel art project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save a new version to an existing project
   */
  static async saveVersion(request: SaveVersionRequest): Promise<{ success: boolean; versionId?: string; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const backendSource = convertToBackendFormat(request.pixelArt);
      
      const result = await actor.save_pixel_version(
        principalId,
        request.projectId,
        backendSource,
        request.message ? [request.message] : [],
        request.ifMatchVersion ? [request.ifMatchVersion] : []
      );
      
      if ('Ok' in result) {
        return {
          success: true,
          versionId: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to save pixel art version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a project by ID
   */
  static async getProject(projectId: string): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const actor = await createActor();
      const result = await actor.get_pixel_project(projectId);
      
      if (result && result.length > 0) {
        return {
          success: true,
          project: result[0]
        };
      } else {
        return {
          success: false,
          error: 'Project not found'
        };
      }
    } catch (error) {
      console.error('Failed to get pixel art project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current version source data for a project
   */
  static async getCurrentSource(projectId: string): Promise<{ success: boolean; pixelArt?: PixelArtData; error?: string }> {
    try {
      const actor = await createActor();
      const result = await actor.get_pixel_current_source(projectId);
      
      if (result && result.length > 0) {
        const source = result[0];
        if (source) {
          const pixelArt = convertFromBackendFormat(source);
          return {
            success: true,
            pixelArt
          };
        }
      }
      
      return {
        success: false,
        error: 'Project source not found'
      };
    } catch (error) {
      console.error('Failed to get current source:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's projects with pagination
   */
  static async getUserProjects(offset: number = 0, limit: number = 20): Promise<{ success: boolean; projects?: ProjectListItem[]; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const principal = Principal.fromText(principalId);
      const projects = await actor.list_pixel_projects_by_owner(
        principal,
        offset,
        limit
      );
      
      const projectList: ProjectListItem[] = projects.map(project => {
        const metadata = project.current_version.source.metadata && project.current_version.source.metadata.length > 0 
          ? project.current_version.source.metadata[0] 
          : null;
        
        return {
          projectId: project.project_id,
          title: (metadata?.title && metadata.title.length > 0
                 ? metadata.title[0] 
                 : 'Untitled') as string,
          description: metadata?.description && metadata.description.length > 0
                       ? metadata.description[0] 
                       : undefined,
          owner: project.owner.toString(),
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          currentVersion: {
            versionId: project.current_version.version_id,
            createdAt: project.current_version.created_at,
            editor: project.current_version.editor.toString(),
            message: project.current_version.message && project.current_version.message.length > 0 
                    ? project.current_version.message[0] 
                    : undefined
          }
        };
      });
      
      return {
        success: true,
        projects: projectList
      };
    } catch (error) {
      console.error('Failed to get user projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export project for IoT devices
   */
  static async exportForDevice(projectId: string, versionId?: string): Promise<{ success: boolean; exportData?: any; error?: string }> {
    try {
      const actor = await createActor();
      const versionParam = versionId ? [versionId] : [];
      const result = await actor.export_pixel_for_device(projectId, versionId ? [versionId] : []);
      
      if ('Ok' in result) {
        const exportData = JSON.parse(result.Ok);
        return {
          success: true,
          exportData
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to export for device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const result = await actor.delete_pixel_project(principalId, projectId);
      
      if ('Ok' in result) {
        return {
          success: true,
          message: typeof result.Ok === 'string' ? result.Ok : 'Project deleted successfully'
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get total project count
   */
  static async getTotalProjectCount(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const actor = await createActor();
      const count = await actor.get_total_pixel_project_count();
      
      return {
        success: true,
        count: Number(count)
      };
    } catch (error) {
      console.error('Failed to get total project count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }


  /**
   * Check if user is authenticated (has a principalId)
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const principalId = getPrincipalId();
      return !!principalId;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Login user (no longer needed since we use existing principalId)
   */
  static async login(): Promise<{ success: boolean; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (principalId) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'No principal ID found. Please login through the main authentication system first.' 
        };
      }
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const client = await initAuthClient();
      await client.logout();
      authClient = null;
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }
}

export default PixelCreationApi;
