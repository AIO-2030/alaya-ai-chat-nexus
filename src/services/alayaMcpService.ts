// ALAYA MCP Service - Multi-MCP service support for ALAYA network communication
import { exec_step } from '../runtime/AIOProtocolExecutor';
import { AIOProtocolStepInfo } from '../runtime/AIOProtocolTypes';
import { AIOService } from '../lib/aio';

// MCP Service Configuration
interface McpServiceConfig {
  mcpName: string;
  methods: string[];
}

// Method to MCP Service Mapping
interface MethodMcpMapping {
  [methodKey: string]: string; // methodKey -> mcpName
}

// Multi-MCP Configuration
interface MultiMcpConfig {
  services: {
    [mcpName: string]: McpServiceConfig;
  };
  methodMapping: MethodMcpMapping;
}

// Tencent Cloud STS types
export interface STSToken {
  credentials: {
    token: string;        // Session token
    tmpSecretId: string;  // Temporary Secret ID
    tmpSecretKey: string; // Temporary Secret Key
  };
  expiredTime: number;    // Expiration timestamp in seconds
  expiration: string;     // Expiration time in ISO8601 format
  requestId: string;      // Request ID
}

export interface STSRequestParams {
  durationSeconds?: number;
  policy?: string;
  roleSessionName?: string;
  roleArn?: string;
}

// Tencent IoT types
export interface TencentIoTConfig {
  productId: string;
  deviceName: string;
  region: string;
  brokerUrl: string;
  clientId: string;
}

export interface TencentDeviceStatus {
  deviceId: string;
  deviceName: string;
  isOnline: boolean;
  lastSeen: number;
  mqttConnected: boolean;
  ipAddress?: string;
  signalStrength?: number;
  batteryLevel?: number;
}

export interface MQTTMessage {
  topic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}

// MCP Request/Response types
interface McpRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, unknown>;
  id: number;
}

interface McpResponse {
  jsonrpc: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

// PixelMug specific types
interface PixelImageParams {
  product_id: string;
  device_name: string;
  image_data: string; // Base64 encoded image or pixel matrix
  target_width?: number;
  target_height?: number;
  use_cos?: boolean;
  ttl_sec?: number;
}

interface GifAnimationParams {
  product_id: string;
  device_name: string;
  gif_data: string; // Base64 encoded GIF or frame array
  frame_delay?: number;
  loop_count?: number;
  target_width?: number;
  target_height?: number;
  use_cos?: boolean;
  ttl_sec?: number;
}

interface ConvertImageParams {
  image_data: string; // Base64 encoded image
  target_width?: number;
  target_height?: number;
  resize_method?: 'nearest' | 'bilinear' | 'bicubic';
}

export interface PixelImageGenerateParams {
  user_input: string; // User's natural language input, supports multiple languages
  negative_prompt?: string; // Negative prompt, defaults to empty string
  num_inference_steps?: number; // Number of inference steps, default 20
  guidance_scale?: number; // Guidance scale, default 7.5
  seed?: number; // Random seed
  image_size?: string; // Image size, default '1024x1024'
}

export interface PixelImageGenerateResponse {
  success: boolean;
  data?: {
    image_base64: string; // Base64 encoded image data
    image_size: string; // Actually generated image size
    generation_params: {
      user_input: string;
      negative_prompt: string;
      num_inference_steps: number;
      guidance_scale: number;
      seed?: number;
      image_size: string;
    };
    generation_time_ms: number; // Generation time taken (milliseconds)
  };
  error?: string;
}

class AlayaMcpService {
  private static instance: AlayaMcpService;
  private config: MultiMcpConfig;

  constructor() {
    this.config = {
      services: {
        mcp_pixelmug: {
          mcpName: 'mcp_pixelmug',
          methods: ['help', 'issue_sts', 'send_pixel_image', 'send_gif_animation', 'convert_image_to_pixels', 'get_device_status']
        },
        mcp_image: {
          mcpName: 'mcp_image',
          methods: ['pixel_image_generate']
        }
      },
      methodMapping: {
        help: 'mcp_pixelmug',
        issueSts: 'mcp_pixelmug',
        sendPixelImage: 'mcp_pixelmug',
        sendGifAnimation: 'mcp_pixelmug',
        convertImageToPixels: 'mcp_pixelmug',
        pixelImageGenerate: 'mcp_image',
        getDeviceStatus: 'mcp_pixelmug'
      }
    };
  }

  static getInstance(): AlayaMcpService {
    if (!AlayaMcpService.instance) {
      AlayaMcpService.instance = new AlayaMcpService();
    }
    return AlayaMcpService.instance;
  }

  /**
   * Add a new MCP service configuration
   * @param mcpName MCP service name
   * @param methods Array of method names supported by this service
   */
  addMcpService(mcpName: string, methods: string[]): void {
    this.config.services[mcpName] = {
      mcpName,
      methods
    };
    console.log(`[AlayaMcpService] Added MCP service: ${mcpName} with methods:`, methods);
  }

  /**
   * Map a method key to an MCP service
   * @param methodKey Method key (e.g., 'pixelImageGenerate')
   * @param mcpName MCP service name (e.g., 'mcp_image')
   */
  mapMethodToMcpService(methodKey: string, mcpName: string): void {
    if (!this.config.services[mcpName]) {
      throw new Error(`MCP service ${mcpName} not found. Please add it first using addMcpService().`);
    }
    
    this.config.methodMapping[methodKey] = mcpName;
    console.log(`[AlayaMcpService] Mapped method ${methodKey} to MCP service ${mcpName}`);
  }

  /**
   * Get all available MCP services
   * @returns Object containing all MCP service configurations
   */
  getMcpServices(): { [mcpName: string]: McpServiceConfig } {
    return { ...this.config.services };
  }

  /**
   * Get method mapping configuration
   * @returns Object containing method to MCP service mappings
   */
  getMethodMapping(): MethodMcpMapping {
    return { ...this.config.methodMapping };
  }

  /**
   * Check if a method key is configured
   * @param methodKey Method key to check
   * @returns True if method is configured, false otherwise
   */
  isMethodConfigured(methodKey: string): boolean {
    return methodKey in this.config.methodMapping;
  }

  /**
   * Get MCP service name for a given method
   * @param methodKey Method key (e.g., 'pixelImageGenerate', 'help')
   * @returns MCP service name
   */
  private getMcpServiceForMethod(methodKey: string): string {
    const mcpName = this.config.methodMapping[methodKey];
    if (!mcpName) {
      throw new Error(`No MCP service configured for method: ${methodKey}`);
    }
    return mcpName;
  }

  /**
   * Get actual method name for a given method key
   * @param methodKey Method key (e.g., 'pixelImageGenerate')
   * @returns Actual method name (e.g., 'pixel_image_generate')
   */
  private getActualMethodName(methodKey: string): string {
    const methodMapping: { [key: string]: string } = {
      help: 'help',
      issueSts: 'issue_sts',
      sendPixelImage: 'send_pixel_image',
      sendGifAnimation: 'send_gif_animation',
      convertImageToPixels: 'convert_image_to_pixels',
      pixelImageGenerate: 'pixel_image_generate',
      getDeviceStatus: 'get_device_status'
    };
    
    return methodMapping[methodKey] || methodKey;
  }

  /**
   * Generic MCP call method - Dynamically calls appropriate MCP service based on method
   * @param methodKey Method key (e.g., 'pixelImageGenerate', 'help')
   * @param params Method parameters
   * @param contextName Context name (for logging)
   * @returns Promise with success status and data
   */
  private async callMcpMethod(
    methodKey: string, 
    params: Record<string, unknown>, 
    contextName: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const mcpServiceName = this.getMcpServiceForMethod(methodKey);
      const actualMethodName = this.getActualMethodName(methodKey);
      
      console.log(`[AlayaMcpService] Calling MCP method: ${actualMethodName} via ${mcpServiceName}`, { params });

      const result = await exec_step(
        '', // apiEndpoint - will be determined by exec_step
        `${contextName}_${Date.now()}`, // contextId
        params, // currentValue
        actualMethodName, // operation
        0, // callIndex
        {
          mcp: `${mcpServiceName}::${actualMethodName}`,
          action: actualMethodName,
          inputSchema: this.getInputSchemaForMethod(actualMethodName)
        } // stepInfo
      );

      if (result.success) {
        console.log(`[AlayaMcpService] MCP method ${actualMethodName} via ${mcpServiceName} executed successfully`);
        return { success: true, data: result.data };
      } else {
        console.error(`[AlayaMcpService] MCP method ${actualMethodName} via ${mcpServiceName} failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[AlayaMcpService] Error calling MCP method ${methodKey}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get corresponding input schema based on method name
   * @param method MCP method name
   * @returns Input schema definition
   */
  private getInputSchemaForMethod(method: string): Record<string, unknown> {
    const schemas: Record<string, Record<string, unknown>> = {
      'help': {
        type: 'object',
        properties: {},
        required: []
      },
      'issue_sts': {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          device_name: { type: 'string' }
        },
        required: ['product_id', 'device_name']
      },
      'send_pixel_image': {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          device_name: { type: 'string' },
          image_data: { type: 'string' },
          target_width: { type: 'number' },
          target_height: { type: 'number' },
          use_cos: { type: 'boolean' },
          ttl_sec: { type: 'number' }
        },
        required: ['product_id', 'device_name', 'image_data']
      },
      'send_gif_animation': {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          device_name: { type: 'string' },
          gif_data: { type: 'string' },
          frame_delay: { type: 'number' },
          loop_count: { type: 'number' },
          target_width: { type: 'number' },
          target_height: { type: 'number' },
          use_cos: { type: 'boolean' },
          ttl_sec: { type: 'number' }
        },
        required: ['product_id', 'device_name', 'gif_data']
      },
      'convert_image_to_pixels': {
        type: 'object',
        properties: {
          image_data: { type: 'string' },
          target_width: { type: 'number' },
          target_height: { type: 'number' },
          resize_method: { type: 'string', enum: ['nearest', 'bilinear', 'bicubic'] }
        },
        required: ['image_data']
      },
      'pixel_image_generate': {
        type: 'object',
        properties: {
          user_input: { type: 'string' },
          negative_prompt: { type: 'string' },
          num_inference_steps: { type: 'number' },
          guidance_scale: { type: 'number' },
          seed: { type: 'number' },
          image_size: { type: 'string' }
        },
        required: ['user_input']
      },
      'get_device_status': {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          device_name: { type: 'string' }
        },
        required: ['product_id', 'device_name']
      }
    };

    return schemas[method] || {
      type: 'object',
      properties: {},
      required: []
    };
  }

  // Get service help information
  async getHelp(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return this.callMcpMethod('help', {}, 'help');
  }

  // Issue STS credentials for device access
  async issueStsCredentials(productId: string, deviceName: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return this.callMcpMethod(
      'issueSts', 
      { product_id: productId, device_name: deviceName }, 
      'issue_sts'
    );
  }

  // Send pixel image to device
  async sendPixelImage(params: PixelImageParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const mcpParams = {
      product_id: params.product_id,
      device_name: params.device_name,
      image_data: params.image_data,
      target_width: params.target_width || 16,
      target_height: params.target_height || 16,
      use_cos: params.use_cos !== false, // Default to true
      ttl_sec: params.ttl_sec || 900 // Default to 15 minutes
    };

    return this.callMcpMethod(
      'sendPixelImage', 
      mcpParams, 
      'send_pixel_image'
    );
  }

  // Send GIF animation to device
  async sendGifAnimation(params: GifAnimationParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const mcpParams = {
      product_id: params.product_id,
      device_name: params.device_name,
      gif_data: params.gif_data,
      frame_delay: params.frame_delay || 100,
      loop_count: params.loop_count || 0, // 0 for infinite
      target_width: params.target_width || 16,
      target_height: params.target_height || 16,
      use_cos: params.use_cos !== false, // Default to true
      ttl_sec: params.ttl_sec || 900 // Default to 15 minutes
    };

    return this.callMcpMethod(
      'sendGifAnimation', 
      mcpParams, 
      'send_gif_animation'
    );
  }

  // Convert image to pixels
  async convertImageToPixels(params: ConvertImageParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const mcpParams = {
      image_data: params.image_data,
      target_width: params.target_width || 16,
      target_height: params.target_height || 16,
      resize_method: params.resize_method || 'nearest'
    };

    return this.callMcpMethod(
      'convertImageToPixels', 
      mcpParams, 
      'convert_image_to_pixels'
    );
  }

  /**
   * Generate pixel-style emoji images
   * Generate pixel-style emoji images based on user natural language input
   * @param params Generation parameters
   * @returns Promise<PixelImageGenerateResponse> Generation result
   */
  async pixelImageGenerate(params: PixelImageGenerateParams): Promise<PixelImageGenerateResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`[AlayaMcpService] Starting pixel image generation: ${params.user_input}`);

      // Validate required parameters
      if (!params.user_input || params.user_input.trim().length === 0) {
        return {
          success: false,
          error: 'user_input parameter cannot be empty'
        };
      }

      // Build MCP parameters with default values according to JSON-RPC 2.0 spec
      const mcpParams = {
        user_input: params.user_input.trim(),
        negative_prompt: params.negative_prompt || '',
        num_inference_steps: params.num_inference_steps || 20,
        guidance_scale: params.guidance_scale || 7.5,
        seed: params.seed,
        image_size: params.image_size || '1024x1024'
      };

      console.log(`[AlayaMcpService] 🎨 JSON-RPC 2.0 pixel_image_generate request:`, {
        jsonrpc: '2.0',
        method: 'pixel_image_generate',
        params: mcpParams,
        id: `pixel_image_generate_${Date.now()}`
      });

      // Validate parameter ranges
      if (mcpParams.num_inference_steps < 1 || mcpParams.num_inference_steps > 100) {
        return {
          success: false,
          error: 'num_inference_steps must be between 1-100'
        };
      }

      if (mcpParams.guidance_scale < 0 || mcpParams.guidance_scale > 20) {
        return {
          success: false,
          error: 'guidance_scale must be between 0-20'
        };
      }

      // Validate image size format
      const sizePattern = /^\d+x\d+$/;
      if (!sizePattern.test(mcpParams.image_size)) {
        return {
          success: false,
          error: 'image_size format error, should be "widthxheight", e.g. "1024x1024"'
        };
      }

      // Call MCP method
      const result = await this.callMcpMethod(
        'pixelImageGenerate',
        mcpParams,
        'pixel_image_generate'
      );

      const generationTime = Date.now() - startTime;

      if (result.success) {
        console.log(`[AlayaMcpService] 🎨 JSON-RPC 2.0 call successful, processing response...`);
        console.log(`[AlayaMcpService] 🎨 Raw JSON-RPC 2.0 response data:`, {
          hasData: !!result.data,
          dataType: typeof result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          imageSize: (result.data as Record<string, unknown>)?.image_size,
          hasImageBase64: !!((result.data as Record<string, unknown>)?.image_base64 || (result.data as Record<string, unknown>)?.image_data),
          imageBase64Length: ((result.data as Record<string, unknown>)?.image_base64 as string || (result.data as Record<string, unknown>)?.image_data as string || '').length
        });

        // Validate returned data structure according to JSON-RPC 2.0
        if (!result.data || typeof result.data !== 'object') {
          console.error(`[AlayaMcpService] ❌ JSON-RPC 2.0 result format error:`, result.data);
          return {
            success: false,
            error: 'JSON-RPC 2.0 result format error'
          };
        }

        const data = result.data as Record<string, unknown>;
        
        // Check if image data is included in the result
        const imageBase64 = data.image_base64 || data.image_data || data;
        if (!imageBase64 || typeof imageBase64 !== 'string') {
          console.error(`[AlayaMcpService] ❌ Missing image data in JSON-RPC 2.0 result:`, {
            image_base64: data.image_base64 ? 'present' : 'missing',
            image_data: data.image_data ? 'present' : 'missing',
            result: data
          });
          return {
            success: false,
            error: 'Missing image data in JSON-RPC 2.0 result'
          };
        }

        console.log(`[AlayaMcpService] 🎨 Image data found, length: ${imageBase64.length} characters`);
        console.log(`[AlayaMcpService] 🎨 Image base64 preview:`, imageBase64.substring(0, 100) + '...');

        // Validate base64 format
        const base64Pattern = /^data:image\/[a-zA-Z]+;base64,/.test(imageBase64) 
          ? imageBase64 
          : `data:image/png;base64,${imageBase64}`;

        console.log(`[AlayaMcpService] 🎨 Base64 format validation:`, {
          originalFormat: /^data:image\/[a-zA-Z]+;base64,/.test(imageBase64),
          finalLength: base64Pattern.length,
          finalPreview: base64Pattern.substring(0, 100) + '...'
        });

        console.log(`[AlayaMcpService] ✅ Pixel image generation successful, time taken: ${generationTime}ms`);

        const finalResult = {
          success: true,
          data: {
            image_base64: base64Pattern,
            image_size: (data.image_size as string) || mcpParams.image_size,
            generation_params: {
              user_input: mcpParams.user_input,
              negative_prompt: mcpParams.negative_prompt,
              num_inference_steps: mcpParams.num_inference_steps,
              guidance_scale: mcpParams.guidance_scale,
              seed: mcpParams.seed,
              image_size: mcpParams.image_size
            },
            generation_time_ms: generationTime
          }
        };

        console.log(`[AlayaMcpService] 🎨 Final result prepared:`, {
          success: finalResult.success,
          imageSize: finalResult.data.image_size,
          imageBase64Length: finalResult.data.image_base64.length,
          generationTime: finalResult.data.generation_time_ms
        });

        return finalResult;
      } else {
        console.error(`[AlayaMcpService] ❌ Pixel image generation failed:`, result.error);
        return {
          success: false,
          error: result.error || 'Image generation failed'
        };
      }
    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error(`[AlayaMcpService] Pixel image generation exception:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Advanced customized MCP call method - Directly calls any method of specified MCP service
   * @param methodKey Method key (e.g., 'pixelImageGenerate', 'help')
   * @param params Method parameters object
   * @param customInputSchema Optional custom input schema (if not provided, will use default schema)
   * @returns Promise with success status and data
   */
  async callMcpMethodDirect(
    methodKey: string, 
    params: Record<string, unknown>, 
    customInputSchema?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const mcpServiceName = this.getMcpServiceForMethod(methodKey);
      const actualMethodName = this.getActualMethodName(methodKey);
      
      console.log(`[AlayaMcpService] Custom MCP call: ${actualMethodName} via ${mcpServiceName}`, { params });

      const result = await exec_step(
        '', // apiEndpoint - will be determined by exec_step
        `custom_${methodKey}_${Date.now()}`, // contextId
        params, // currentValue
        actualMethodName, // operation
        0, // callIndex
        {
          mcp: `${mcpServiceName}::${actualMethodName}`,
          action: actualMethodName,
          inputSchema: customInputSchema || this.getInputSchemaForMethod(actualMethodName)
        } // stepInfo
      );

      if (result.success) {
        console.log(`[AlayaMcpService] Custom MCP call ${actualMethodName} via ${mcpServiceName} executed successfully`);
        return { success: true, data: result.data };
      } else {
        console.error(`[AlayaMcpService] Custom MCP call ${actualMethodName} via ${mcpServiceName} failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[AlayaMcpService] Error in custom MCP call ${methodKey}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Legacy method for backward compatibility - calls mcp_pixelmug MCP
   * @deprecated Use callMcpMethodDirect instead
   */
  async callPixelMugMcp(
    method: string, 
    params: Record<string, unknown>, 
    customInputSchema?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    console.warn('[AlayaMcpService] callPixelMugMcp is deprecated, use callMcpMethodDirect instead');
    
    // Map legacy method names to new method keys
    const methodKeyMapping: { [key: string]: string } = {
      'help': 'help',
      'issue_sts': 'issueSts',
      'send_pixel_image': 'sendPixelImage',
      'send_gif_animation': 'sendGifAnimation',
      'convert_image_to_pixels': 'convertImageToPixels',
      'pixel_image_generate': 'pixelImageGenerate'
    };
    
    const methodKey = methodKeyMapping[method] || method;
    return this.callMcpMethodDirect(methodKey, params, customInputSchema);
  }

  // Legacy methods for backward compatibility
  async sendMqttMessage(deviceId: string, message: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    // Extract product_id and device_name from deviceId or use defaults
    const [productId, deviceName] = deviceId.includes(':') 
      ? deviceId.split(':') 
      : ['DEFAULT_PRODUCT', deviceId];

      if (message.messageType === 'pixel_art') {
        return this.sendPixelArtMessage(productId, deviceName, message.content as Record<string, unknown>);
      } else if (message.messageType === 'pixel_animation') {
        return this.sendGifAnimationMessage(productId, deviceName, message.content as Record<string, unknown>);
      } else if (message.messageType === 'gif') {
        return this.sendGifAnimationMessage(productId, deviceName, message.content as Record<string, unknown>);
      } else {
        return this.sendTextMessage(productId, deviceName, message.content as string);
      }
  }

  async sendPixelArtMessage(productId: string, deviceName: string, pixelArtData: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert pixel art data to base64 image or pixel matrix
      let imageData: string;
      
      if (typeof pixelArtData === 'string') {
        imageData = pixelArtData;
      } else if (pixelArtData.pixels && pixelArtData.palette) {
        // Convert palette-based format to 2D array
        const pixels = pixelArtData.pixels as number[][];
        const palette = pixelArtData.palette as string[];
        const pixelMatrix = pixels.map((row: number[]) => 
          row.map((colorIndex: number) => palette[colorIndex] || '#000000')
        );
        imageData = JSON.stringify(pixelMatrix);
      } else {
        imageData = JSON.stringify(pixelArtData);
      }

      const result = await this.sendPixelImage({
        product_id: productId,
        device_name: deviceName,
        image_data: imageData,
        target_width: (pixelArtData.width as number) || 16,
        target_height: (pixelArtData.height as number) || 16
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendPixelAnimationMessage(productId: string, deviceName: string, animationData: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    return this.sendGifAnimationMessage(productId, deviceName, animationData);
  }

  async sendGifAnimationMessage(productId: string, deviceName: string, gifData: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert animation data to GIF format
      let gifDataString: string;
      
      if (typeof gifData === 'string') {
        gifDataString = gifData;
      } else if (gifData.frames && gifData.palette) {
        // Convert palette-based animation to frame array
        const frames = gifData.frames as Record<string, unknown>[];
        const palette = gifData.palette as string[];
        const frameArray = frames.map((frame: Record<string, unknown>) => ({
          frame_index: frame.frame_index || 0,
          pixel_matrix: (frame.pixels as number[][]).map((row: number[]) => 
            row.map((colorIndex: number) => palette[colorIndex] || '#000000')
          ),
          duration: frame.duration || gifData.frame_delay || 100
        }));
        gifDataString = JSON.stringify(frameArray);
      } else {
        gifDataString = JSON.stringify(gifData);
      }

      const result = await this.sendGifAnimation({
        product_id: productId,
        device_name: deviceName,
        gif_data: gifDataString,
        frame_delay: (gifData.frame_delay as number) || 100,
        loop_count: (gifData.loop_count as number) || 0,
        target_width: (gifData.width as number) || 16,
        target_height: (gifData.height as number) || 16
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendGifMessage(productId: string, deviceName: string, gifData: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    return this.sendGifAnimationMessage(productId, deviceName, gifData);
  }

  async sendTextMessage(productId: string, deviceName: string, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert text to simple pixel pattern (could be enhanced)
      const textPixelData = {
        text: text,
        width: 16,
        height: 16,
        type: 'text_message'
      };

      const result = await this.sendPixelImage({
        product_id: productId,
        device_name: deviceName,
        image_data: JSON.stringify(textPixelData),
        target_width: 16,
        target_height: 16
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save base64 image to local file
   * @param base64Data Base64 encoded image data
   * @param filePath Save path
   * @param fileName File name (optional, defaults to timestamp)
   * @returns Promise<{ success: boolean; filePath?: string; error?: string }>
   */
  async saveImageToFile(
    base64Data: string, 
    filePath?: string, 
    fileName?: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Clean base64 data, remove data:image prefix
      const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      
      // Generate default file name
      const defaultFileName = fileName || `pixel_image_${Date.now()}.png`;
      const defaultPath = filePath || `./generated_images/${defaultFileName}`;
      
      // In browser environment, use download method
      if (typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = defaultFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return {
          success: true,
          filePath: defaultFileName
        };
      }
      
      // In Node.js environment, write file
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (globalThis as any).require !== 'undefined') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const fs = (globalThis as any).require('fs');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const path = (globalThis as any).require('path');
          
          // Ensure directory exists
          const dir = path.dirname(defaultPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Write file
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const buffer = (globalThis as any).Buffer.from(cleanBase64, 'base64');
          fs.writeFileSync(defaultPath, buffer);
        } catch (nodeError) {
          console.warn('[AlayaMcpService] Node.js file operations not available:', nodeError);
          return {
            success: false,
            error: 'File operations not supported in this environment'
          };
        }
        
        return {
          success: true,
          filePath: defaultPath
        };
      }
      
      return {
        success: false,
        error: 'Unsupported file saving environment'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File save failed'
      };
    }
  }

  /**
   * Batch generate pixel images
   * @param requests Batch request array
   * @param maxConcurrent Maximum concurrent number, default 3
   * @returns Promise<PixelImageGenerateResponse[]>
   */
  async batchPixelImageGenerate(
    requests: PixelImageGenerateParams[],
    maxConcurrent: number = 3
  ): Promise<PixelImageGenerateResponse[]> {
    const results: PixelImageGenerateResponse[] = [];
    
    // Process in batches
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(request => this.pixelImageGenerate(request));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        // If batch processing fails, add error result for each request
        batch.forEach(() => {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Batch processing failed'
          });
        });
      }
    }
    
    return results;
  }

  /**
   * Pixel image generation with retry mechanism
   * @param params Generation parameters
   * @param maxRetries Maximum retry count, default 3
   * @param retryDelay Retry delay (milliseconds), default 1000
   * @returns Promise<PixelImageGenerateResponse>
   */
  async pixelImageGenerateWithRetry(
    params: PixelImageGenerateParams,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<PixelImageGenerateResponse> {
    let lastError: string = '';
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pixelImageGenerate(params);
        
        if (result.success) {
          if (attempt > 0) {
            console.log(`[AlayaMcpService] Pixel image generation succeeded after ${attempt + 1} attempts`);
          }
          return result;
        }
        
        lastError = result.error || 'Generation failed';
        
        // If not the last attempt, wait and retry
        if (attempt < maxRetries) {
          console.log(`[AlayaMcpService] Pixel image generation failed, retrying after ${retryDelay}ms (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt < maxRetries) {
          console.log(`[AlayaMcpService] Pixel image generation exception, retrying after ${retryDelay}ms (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    return {
      success: false,
      error: `Still failed after ${maxRetries} retries: ${lastError}`
    };
  }

  /**
   * Check the health status of pixel image generation service
   * @returns Promise<{ healthy: boolean; responseTime?: number; error?: string }>
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Use simple test request to check service status
      const testResult = await this.pixelImageGenerate({
        user_input: 'test',
        image_size: '64x64',
        num_inference_steps: 1
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: testResult.success,
        responseTime,
        error: testResult.error
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  // ==================== Device Status Methods ====================

  /**
   * Get device online status via MCP
   * @param productId Product ID
   * @param deviceName Device name
   * @returns Promise<{ success: boolean; data?: any; error?: string }>
   */
  async getDeviceStatus(productId: string, deviceName: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const mcpParams = {
      product_id: productId,
      device_name: deviceName
    };

    return this.callMcpMethod(
      'getDeviceStatus',
      mcpParams,
      'get_device_status'
    );
  }

}

export const alayaMcpService = AlayaMcpService.getInstance();
export default alayaMcpService;