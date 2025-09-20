// AIO Protocol Executor - Independent implementation for alaya-chat-nexus-frontend
import { AIOProtocolStepInfo, AIOProtocolResult } from './AIOProtocolTypes';

/**
 * Executes a single step in the protocol using JSON-RPC
 * @param apiEndpoint The API endpoint to call
 * @param contextId Unique identifier for the calling context
 * @param currentValue Current value from the context
 * @param operation Current operation keyword
 * @param callIndex Current call index
 * @param stepInfo Information about the current step
 * @returns Promise with execution result
 */
export async function exec_step(
  apiEndpoint: string,
  contextId: string,
  currentValue: any,
  operation: string,
  callIndex: number,
  stepInfo: AIOProtocolStepInfo
): Promise<AIOProtocolResult> {
  try {
    console.log(`[AIOProtocolExecutor] Executing step:`, {
      contextId,
      operation,
      callIndex,
      mcp: stepInfo.mcp,
      action: stepInfo.action
    });

    // For alaya-chat-nexus-frontend, we'll implement a simplified MCP execution
    // that directly calls the pixelmug_stdio MCP without the full AIO base infrastructure
    
    // Extract MCP name and method from stepInfo.mcp
    const [mcpName, method] = stepInfo.mcp.split('::');
    
    if (mcpName !== 'pixelmug_stdio') {
      throw new Error(`Unsupported MCP: ${mcpName}. Only pixelmug_stdio is supported.`);
    }

    // Simulate MCP execution for pixelmug_stdio
    const result = await executePixelMugMcp(method, currentValue, stepInfo.inputSchema);
    
    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error(`[AIOProtocolExecutor] Error executing step:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Execute pixelmug_stdio MCP method
 * @param method MCP method name
 * @param params Method parameters
 * @param inputSchema Input schema for validation
 * @returns Promise with method result
 */
async function executePixelMugMcp(
  method: string,
  params: any,
  inputSchema: any
): Promise<any> {
  console.log(`[AIOProtocolExecutor] Executing pixelmug_stdio.${method}:`, params);

  // Validate input parameters against schema
  if (inputSchema && inputSchema.required) {
    for (const requiredField of inputSchema.required) {
      if (!(requiredField in params)) {
        throw new Error(`Missing required parameter: ${requiredField}`);
      }
    }
  }

  // Simulate different MCP methods
  switch (method) {
    case 'help':
      return {
        message: 'pixelmug_stdio MCP service for PixelMug smart mugs',
        methods: ['help', 'issue_sts', 'send_pixel_image', 'send_gif_animation', 'convert_image_to_pixels'],
        version: '1.0.0'
      };

    case 'issue_sts':
      return {
        success: true,
        credentials: {
          access_key: 'mock_access_key',
          secret_key: 'mock_secret_key',
          session_token: 'mock_session_token',
          expiration: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      };

    case 'send_pixel_image':
      return {
        success: true,
        message_id: `msg_${Date.now()}`,
        device_status: 'message_sent',
        delivery_time: new Date().toISOString()
      };

    case 'send_gif_animation':
      return {
        success: true,
        message_id: `anim_${Date.now()}`,
        device_status: 'animation_sent',
        delivery_time: new Date().toISOString()
      };

    case 'convert_image_to_pixels':
      return {
        success: true,
        pixel_data: {
          width: params.target_width || 16,
          height: params.target_height || 16,
          pixels: generateMockPixelData(params.target_width || 16, params.target_height || 16)
        }
      };

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

/**
 * Generate mock pixel data for testing
 * @param width Image width
 * @param height Image height
 * @returns Mock pixel data array
 */
function generateMockPixelData(width: number, height: number): number[][] {
  const pixels: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      // Generate a simple pattern
      row.push((x + y) % 4);
    }
    pixels.push(row);
  }
  return pixels;
}
