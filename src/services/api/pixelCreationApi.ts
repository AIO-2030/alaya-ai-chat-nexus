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

    // Create a temporary image element to load the GIF
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load GIF'));
      img.src = gifUrl;
    });

    // For now, we'll create a simple single-frame animation
    // In a real implementation, you would parse the GIF frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        error: 'Failed to create canvas context'
      };
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Draw the GIF frame to canvas
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    // Get image data and generate palette
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const quantizer = new ColorQuantizer();
    let palette = quantizer.quantize(imageData, maxColors);
    
    // Ensure we have a background color
    if (!palette.includes('#000000')) {
      palette.unshift('#000000');
    }
    
    // Limit palette size
    if (palette.length > maxColors) {
      palette = palette.slice(0, maxColors);
    }
    
    // Convert to pixel grid
    const pixels = mapToPixels(imageData, palette, targetWidth, targetHeight);
    
    // Create pixel animation data
    const animationData: PixelAnimationData = {
      title,
      width: targetWidth,
      height: targetHeight,
      palette,
      frame_delay: frameDelay,
      loop_count: loopCount,
      frames: [
        {
          pixels,
          duration: frameDelay
        }
      ],
      format: 'pixel_animation',
      version: '1.0',
      timestamp: Date.now()
    };

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
