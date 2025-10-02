// AIO Protocol Executor - Independent implementation for alaya-chat-nexus-frontend
import { AIOProtocolStepInfo, AIOProtocolResult } from './AIOProtocolTypes';

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
    
    let baseUrl;
    if (isProduction) {
      // Production environment uses remote MCP service directly with HTTPS
      baseUrl = 'https://mcp.aio2030.fun/api/v1/rpc';
      console.log(`[executeRpc] Using production MCP server: ${baseUrl}`);
    } else {
      // Development environment uses environment variables with HTTPS fallback
      baseUrl = import.meta.env.VITE_AIO_MCP_API_URL?.replace(/\/+$/, '');
      
      if (!baseUrl) {
        throw new Error('VITE_AIO_MCP_API_URL is not defined in environment variables');
      }
      
      // Ensure HTTPS for development environment too
      if (baseUrl.startsWith('http://')) {
        baseUrl = baseUrl.replace('http://', 'https://');
        console.log(`[executeRpc] Converted HTTP to HTTPS for development: ${baseUrl}`);
      }
      console.log(`[executeRpc] Using URL: ${baseUrl}`);
    }
    
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
  
  let baseApiUrl;
  if (isProduction) {
    // Production environment uses remote MCP service directly
    baseApiUrl = 'https://mcp.aio2030.fun/api/v1/rpc';
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

