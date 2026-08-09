// AIO Protocol Executor - Independent implementation for alaya-chat-nexus-frontend
import { AIOProtocolStepInfo, AIOProtocolResult } from './AIOProtocolTypes';

// ============ AIO WebChat Interface (OpenAI-compatible) ============
/** Production: https://webchat.univoices.club/v1/chat/completions */
/** Dev: http://127.0.0.1:8002/v1/chat/completions (or VITE_AIO_WEBCHAT_URL) */

/** Univoice AI 联系人唯一标识：contactPrincipalId 为此值时视为 AI 会话，走 execWebChat + localStorage */
export const AIO_WEBCHAT_AI_CONTACT_PRINCIPAL_ID = 'aio_webchat_ai';

export interface WebChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WebChatCompletionRequest {
  model: string;
  messages: WebChatMessage[];
  /** 发送方 principalId，用于保持同一用户的会话（Session behavior），必传 */
  user?: string;
  /** 用户昵称，用于 AI 个性化交互 */
  user_nickname?: string;
  stream?: boolean;
}

/** Non-stream response (OpenAI format) */
export interface WebChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** Stream chunk (SSE data line) */
export interface WebChatStreamChunk {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason?: string | null;
  }>;
}

export interface ExecWebChatOptions {
  model?: string;
  messages: WebChatMessage[];
  /** 发送方 principalId，用于保持同一用户的会话（Session behavior），必传 */
  user?: string;
  /** 用户昵称，用于 AI 个性化交互 */
  user_nickname?: string;
  stream?: boolean;
  timeout?: number;
  /** 流式响应时每收到一个 chunk 的回调 */
  onChunk?: (chunk: WebChatStreamChunk) => void;
}

export interface ExecWebChatResult {
  success: boolean;
  data?: WebChatCompletionResponse;
  error?: string;
}

const WEBCHAT_PRODUCTION_URL = 'https://webchat.univoices.club/v1/chat/completions';

/** Get WebChat endpoint by environment (prod vs dev). */
function getWebChatEndpoint(): string {
  const isProduction = window.location.protocol === 'https:';
  if (isProduction) {
    console.log(`[getWebChatEndpoint] Using production WebChat server: ${WEBCHAT_PRODUCTION_URL}`);
    return WEBCHAT_PRODUCTION_URL;
  }
  const devUrl = (import.meta.env.VITE_AIO_WEBCHAT_URL || 'http://127.0.0.1:8002')
    .replace(/\/+$/, '');
  console.log(`[getWebChatEndpoint] Using development WebChat server: ${devUrl}`);
  return `${devUrl}/v1/chat/completions`;
}

// Types for RPC communication
interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

interface InputSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
}

// Generate parameters from input schema
function generateParamsFromSchema(inputSchema: InputSchema | undefined, currentValue: any): any {
  if (!inputSchema || !inputSchema.properties) {
    return currentValue || {};
  }

  const params: any = {};
  
  // Use currentValue as base if it's an object
  if (currentValue && typeof currentValue === 'object') {
    Object.assign(params, currentValue);
  }

  // Add any missing required fields with default values
  if (inputSchema.required) {
    for (const field of inputSchema.required) {
      if (!(field in params)) {
        const fieldSchema = inputSchema.properties[field];
        if (fieldSchema) {
          params[field] = fieldSchema.default || getDefaultValue(fieldSchema.type);
        }
      }
    }
  }

  return params;
}

// Get default value based on type
function getDefaultValue(type: string): any {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

// Execute RPC call to MCP service
async function executeRpc(
  fileType: string,
  filename: string,
  method: string,
  params?: any,
  id?: string | number,
  timeout: number = 30
): Promise<JsonRpcResponse> {
  const requestId = id || Date.now();
  
  // Construct proper JSON-RPC 2.0 request
  const rpcRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    method: method,
    params: params || {},
    id: requestId
  };
  
  console.log(`[executeRpc] JSON-RPC 2.0 Request:`, JSON.stringify(rpcRequest, null, 2));

  try {
    // Check if running in production environment
    const isProduction = import.meta.env.PROD || window.location.protocol === 'https:';
    const isProductionFlag = false;

    let baseUrl = import.meta.env.VITE_AIO_MCP_API_URL;
    console.log(`[executeRpc] Using URL: ${baseUrl}`);

    // Construct endpoint - handle both base URL and full URL with path
    let endpoint;
    if (baseUrl.includes('/api/v1/rpc')) {
      // If URL already contains the API path, just append the file path
      endpoint = `${baseUrl}/${fileType}/${encodeURIComponent(filename)}`;
    } else {
      // If URL is just the base, construct the full path
      endpoint = `${baseUrl}/api/v1/rpc/${fileType}/${encodeURIComponent(filename)}`;
    }
    
    console.log('[executeRpc] Calling URL:', endpoint);
    console.log('[executeRpc] Request:', rpcRequest);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(rpcRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    if (!responseData) {
      throw new Error('Empty response received from server');
    }

    console.log(`[executeRpc] JSON-RPC 2.0 Response:`, JSON.stringify(responseData, null, 2));

    // Validate JSON-RPC 2.0 response format
    if (responseData.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC response: missing or incorrect jsonrpc version');
    }

    // Handle non-standard response format where data is in 'output' field instead of 'result'
    if (responseData.hasOwnProperty('output') && !responseData.hasOwnProperty('result') && !responseData.hasOwnProperty('error')) {
      console.log('[executeRpc] Converting non-standard response format: output -> result');
      // Convert output field to result field for JSON-RPC 2.0 compliance
      responseData.result = responseData.output;
      delete responseData.output;
    }

    if (!responseData.hasOwnProperty('result') && !responseData.hasOwnProperty('error')) {
      throw new Error('Invalid JSON-RPC response: missing result or error field');
    }

    // Return the complete JSON-RPC 2.0 response
    return responseData;
  } catch (error) {
    console.error('Error executing RPC:', error);
    
    // Construct error response in JSON-RPC format
    return {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'RPC execution failed',
        data: error
      },
      id: requestId
    };
  }
}

/**
 * Execute WebChat completion (AIO Chat Router / OpenAI-compatible).
 * Production: https://webchat.univoices.club/v1/chat/completions
 * Dev: http://127.0.0.1:8002/v1/chat/completions (or VITE_AIO_WEBCHAT_URL)
 *
 * @param options model, messages, stream, timeout, optional onChunk for stream mode
 * @returns Promise<ExecWebChatResult> with data (and assembled content when stream)
 */
export async function execWebChat(options: ExecWebChatOptions): Promise<ExecWebChatResult> {
  const {
    model = 'openclaw:main',
    messages,
    user,
    user_nickname,
    stream = false,
    timeout = 60,
    onChunk
  } = options;

  const endpoint = getWebChatEndpoint();
  const requestBody: WebChatCompletionRequest = {
    model,
    messages,
    user: user != null && user !== '' ? user : `anonymous-${Date.now()}`,
    ...(user_nickname != null && user_nickname !== '' ? { user_nickname } : {}),
    stream
  };

  console.log('[execWebChat] endpoint:', endpoint, 'requestBody:', requestBody);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[execWebChat] HTTP error:', response.status, errText);
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    if (stream) {
      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: 'No response body for stream' };
      }
      const decoder = new TextDecoder();
      let buffer = '';
      let assembledContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const chunk: WebChatStreamChunk = JSON.parse(data);
            const content = chunk?.choices?.[0]?.delta?.content;
            if (content) assembledContent += content;
            if (onChunk) onChunk(chunk);
          } catch {
            // ignore parse errors for partial lines
          }
        }
      }

      return {
        success: true,
        data: {
          choices: [{ index: 0, message: { role: 'assistant', content: assembledContent } }]
        }
      };
    }

    const data: WebChatCompletionResponse = await response.json();
    console.log('[execWebChat] response:', data);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const err = error as Error & { name?: string; cause?: unknown };
    console.error('[execWebChat] error:', message, {
      name: err?.name,
      cause: err?.cause,
      endpoint
    });
    // iOS 模拟器常见：Safari/WebKit 对网络失败会报 "Load failed" 或 "网络连接已中断"，
    // 可能原因：模拟器网络/DNS 与真机不同、代理/VPN、CORS（若页面来源与请求域不同）、
    // 或跨域/混合内容策略。真机与 Chrome 正常时多为模拟器环境差异。
    return { success: false, error: message };
  }
}

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
  const startTime = Date.now();

  // Check if running in production environment
  const isProduction = import.meta.env.PROD || window.location.protocol === 'https:';
  const isProductionFlag = true;
  let baseApiUrl;
  if (isProductionFlag) {
    // Production environment uses remote MCP service directly
    baseApiUrl = 'https://mcp.univoices.club/api/v1/rpc';
    console.log(`[AIOProtocolExecutor] Using production MCP server: ${baseApiUrl}`);
  } else {
    // Development environment uses environment variables
    baseApiUrl = import.meta.env.VITE_AIO_MCP_API_URL;
    if (!baseApiUrl) {
      const error = 'VITE_AIO_MCP_API_URL is not defined in environment variables';
      console.error(`[AIOProtocolExecutor] ${error}`);
      return {
        success: false,
        error
      };
    }
    
    // Ensure HTTPS for development environment too
    if (baseApiUrl.startsWith('http://')) {
      baseApiUrl = baseApiUrl.replace('http://', 'https://');
      console.log(`[AIOProtocolExecutor] Converted HTTP to HTTPS for development: ${baseApiUrl}`);
    }
    console.log(`[AIOProtocolExecutor] Using URL: ${baseApiUrl}`);
  }

  console.log(`[AIOProtocolExecutor] Executing step:`, {
    contextId,
    operation,
    callIndex,
    mcp: stepInfo.mcp,
    action: stepInfo.action,
    baseApiUrl
  });

  // Extract MCP name and method from stepInfo.mcp (format: "mcpname::action")
  const mcpName = stepInfo.mcp ? stepInfo.mcp.split('::')[0] : '';
  const method = stepInfo.action || operation;
  
  console.log(`[AIOProtocolExecutor] MCP name: ${mcpName}, method: ${method}`);
  
  try {
    const fileType = 'mcp';
    const filename = mcpName;

    console.log(`[AIOProtocolExecutor] Extracted file type: ${fileType}, filename: ${filename}`);

    // Generate parameters based on input schema
    const generatedParams = generateParamsFromSchema(stepInfo.inputSchema, currentValue);

    // Execute the RPC call
    console.log(`[AIOProtocolExecutor] Initiating RPC call with method: ${method}`);
    console.log(`[AIOProtocolExecutor] Generated parameters:`, generatedParams);
    
    const rpcResponse = await executeRpc(
      fileType,
      filename,
      method,
      generatedParams,
      `${contextId}_${callIndex}`
    );

    console.log(`[AIOProtocolExecutor] RPC response received:`, rpcResponse);

    // Handle RPC error response
    if (rpcResponse.error) {
      console.error(`[AIOProtocolExecutor] JSON-RPC 2.0 error occurred:`, rpcResponse.error);
      throw new Error(`JSON-RPC Error ${rpcResponse.error.code}: ${rpcResponse.error.message}`);
    }

    // Validate the response data - check for result field
    if (!rpcResponse.result) {
      console.error(`[AIOProtocolExecutor] Invalid JSON-RPC 2.0 response: missing result field`, rpcResponse);
      throw new Error('JSON-RPC 2.0 response missing result field');
    }

    const executionTime = Date.now() - startTime;
    console.log(`[AIOProtocolExecutor] Execution completed successfully in ${executionTime}ms`);
    console.log(`[AIOProtocolExecutor] Result data:`, rpcResponse.result);

    // Return the successful result - use the result field directly
    return {
      success: true,
      data: rpcResponse.result
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[AIOProtocolExecutor] Execution failed after ${executionTime}ms:`, error);

    // Return the error result
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

