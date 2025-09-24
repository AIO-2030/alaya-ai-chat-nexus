// ALAYA MCP Service - Direct communication with ALAYA network via pixelmug_stdio MCP
import { exec_step } from '../runtime/AIOProtocolExecutor';
import { AIOProtocolStepInfo } from '../runtime/AIOProtocolTypes';

// MCP Configuration for pixelmug_stdio
interface PixelMugMcpConfig {
  mcpName: string;
  methods: {
    help: string;
    issueSts: string;
    sendPixelImage: string;
    sendGifAnimation: string;
    convertImageToPixels: string;
  };
}

// MCP Request/Response types
interface McpRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, any>;
  id: number;
}

interface McpResponse {
  jsonrpc: string;
  result?: any;
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

class AlayaMcpService {
  private static instance: AlayaMcpService;
  private config: PixelMugMcpConfig;

  constructor() {
    this.config = {
      mcpName: 'pixelmug_stdio',
      methods: {
        help: 'help',
        issueSts: 'issue_sts',
        sendPixelImage: 'send_pixel_image',
        sendGifAnimation: 'send_gif_animation',
        convertImageToPixels: 'convert_image_to_pixels'
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
   * Generic MCP call method - Directly calls pixelmug_stdio MCP and gets results
   * @param method MCP method name
   * @param params Method parameters
   * @param contextName Context name (for logging)
   * @returns Promise with success status and data
   */
  private async callMcpMethod(
    method: string, 
    params: any, 
    contextName: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[AlayaMcpService] Calling MCP method: ${method}`, { params });

      const result = await exec_step(
        '', // apiEndpoint - will be determined by exec_step
        `${contextName}_${Date.now()}`, // contextId
        params, // currentValue
        method, // operation
        0, // callIndex
        {
          mcp: `${this.config.mcpName}::${method}`,
          action: method,
          inputSchema: this.getInputSchemaForMethod(method)
        } // stepInfo
      );

      if (result.success) {
        console.log(`[AlayaMcpService] MCP method ${method} executed successfully`);
        return { success: true, data: result.data };
      } else {
        console.error(`[AlayaMcpService] MCP method ${method} failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[AlayaMcpService] Error calling MCP method ${method}:`, error);
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
  private getInputSchemaForMethod(method: string): any {
    const schemas: Record<string, any> = {
      [this.config.methods.help]: {
        type: 'object',
        properties: {},
        required: []
      },
      [this.config.methods.issueSts]: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          device_name: { type: 'string' }
        },
        required: ['product_id', 'device_name']
      },
      [this.config.methods.sendPixelImage]: {
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
      [this.config.methods.sendGifAnimation]: {
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
      [this.config.methods.convertImageToPixels]: {
        type: 'object',
        properties: {
          image_data: { type: 'string' },
          target_width: { type: 'number' },
          target_height: { type: 'number' },
          resize_method: { type: 'string', enum: ['nearest', 'bilinear', 'bicubic'] }
        },
        required: ['image_data']
      }
    };

    return schemas[method] || {
      type: 'object',
      properties: {},
      required: []
    };
  }

  // Get service help information
  async getHelp(): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.callMcpMethod(this.config.methods.help, {}, 'help');
  }

  // Issue STS credentials for device access
  async issueStsCredentials(productId: string, deviceName: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.callMcpMethod(
      this.config.methods.issueSts, 
      { product_id: productId, device_name: deviceName }, 
      'issue_sts'
    );
  }

  // Send pixel image to device
  async sendPixelImage(params: PixelImageParams): Promise<{ success: boolean; data?: any; error?: string }> {
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
      this.config.methods.sendPixelImage, 
      mcpParams, 
      'send_pixel_image'
    );
  }

  // Send GIF animation to device
  async sendGifAnimation(params: GifAnimationParams): Promise<{ success: boolean; data?: any; error?: string }> {
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
      this.config.methods.sendGifAnimation, 
      mcpParams, 
      'send_gif_animation'
    );
  }

  // Convert image to pixels
  async convertImageToPixels(params: ConvertImageParams): Promise<{ success: boolean; data?: any; error?: string }> {
    const mcpParams = {
      image_data: params.image_data,
      target_width: params.target_width || 16,
      target_height: params.target_height || 16,
      resize_method: params.resize_method || 'nearest'
    };

    return this.callMcpMethod(
      this.config.methods.convertImageToPixels, 
      mcpParams, 
      'convert_image_to_pixels'
    );
  }

  /**
   * Advanced customized MCP call method - Directly calls any method of pixelmug_stdio
   * @param method MCP method name (e.g., help, issue_sts, send_pixel_image, etc.)
   * @param params Method parameters object
   * @param customInputSchema Optional custom input schema (if not provided, will use default schema)
   * @returns Promise with success status and data
   */
  async callPixelMugMcp(
    method: string, 
    params: any, 
    customInputSchema?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`[AlayaMcpService] Custom MCP call: ${method}`, { params });

      const result = await exec_step(
        '', // apiEndpoint - will be determined by exec_step
        `custom_${method}_${Date.now()}`, // contextId
        params, // currentValue
        method, // operation
        0, // callIndex
        {
          mcp: `${this.config.mcpName}::${method}`,
          action: method,
          inputSchema: customInputSchema || this.getInputSchemaForMethod(method)
        } // stepInfo
      );

      if (result.success) {
        console.log(`[AlayaMcpService] Custom MCP call ${method} executed successfully`);
        return { success: true, data: result.data };
      } else {
        console.error(`[AlayaMcpService] Custom MCP call ${method} failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[AlayaMcpService] Error in custom MCP call ${method}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Legacy methods for backward compatibility
  async sendMqttMessage(deviceId: string, message: any): Promise<{ success: boolean; error?: string }> {
    // Extract product_id and device_name from deviceId or use defaults
    const [productId, deviceName] = deviceId.includes(':') 
      ? deviceId.split(':') 
      : ['DEFAULT_PRODUCT', deviceId];

    if (message.messageType === 'pixel_art') {
      return this.sendPixelArtMessage(productId, deviceName, message.content);
    } else if (message.messageType === 'pixel_animation') {
      return this.sendGifAnimationMessage(productId, deviceName, message.content);
    } else if (message.messageType === 'gif') {
      return this.sendGifAnimationMessage(productId, deviceName, message.content);
    } else {
      return this.sendTextMessage(productId, deviceName, message.content);
    }
  }

  async sendPixelArtMessage(productId: string, deviceName: string, pixelArtData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert pixel art data to base64 image or pixel matrix
      let imageData: string;
      
      if (typeof pixelArtData === 'string') {
        imageData = pixelArtData;
      } else if (pixelArtData.pixels && pixelArtData.palette) {
        // Convert palette-based format to 2D array
        const pixelMatrix = pixelArtData.pixels.map((row: number[]) => 
          row.map((colorIndex: number) => pixelArtData.palette[colorIndex] || '#000000')
        );
        imageData = JSON.stringify(pixelMatrix);
      } else {
        imageData = JSON.stringify(pixelArtData);
      }

      const result = await this.sendPixelImage({
        product_id: productId,
        device_name: deviceName,
        image_data: imageData,
        target_width: pixelArtData.width || 16,
        target_height: pixelArtData.height || 16
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendPixelAnimationMessage(productId: string, deviceName: string, animationData: any): Promise<{ success: boolean; error?: string }> {
    return this.sendGifAnimationMessage(productId, deviceName, animationData);
  }

  async sendGifAnimationMessage(productId: string, deviceName: string, gifData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert animation data to GIF format
      let gifDataString: string;
      
      if (typeof gifData === 'string') {
        gifDataString = gifData;
      } else if (gifData.frames && gifData.palette) {
        // Convert palette-based animation to frame array
        const frameArray = gifData.frames.map((frame: any) => ({
          frame_index: frame.frame_index || 0,
          pixel_matrix: frame.pixels.map((row: number[]) => 
            row.map((colorIndex: number) => gifData.palette[colorIndex] || '#000000')
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
        frame_delay: gifData.frame_delay || 100,
        loop_count: gifData.loop_count || 0,
        target_width: gifData.width || 16,
        target_height: gifData.height || 16
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendGifMessage(productId: string, deviceName: string, gifData: any): Promise<{ success: boolean; error?: string }> {
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
}

export const alayaMcpService = AlayaMcpService.getInstance();
export default alayaMcpService;