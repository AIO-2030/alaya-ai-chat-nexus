
import { AIORPCRequest, AIORPCResponse, LLMProvider } from '../types/chat';

export class AIOService {
  private baseUrl = 'https://api.aio2030.fun'; // Replace with actual AIO API endpoint

  async callLLMProvider(
    provider: LLMProvider,
    messages: any[],
    alignmentMode: string,
    traceId?: string
  ): Promise<any> {
    const request: AIORPCRequest = {
      jsonrpc: '2.0',
      method: 'llm.chat',
      params: {
        provider: provider.type,
        messages,
        alignment_mode: alignmentMode,
        trace_id: traceId,
        api_key: provider.apiKey,
        endpoint: provider.endpoint
      },
      id: Date.now().toString()
    };

    try {
      const response = await fetch('/api/aio/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      return await response.json();
    } catch (error) {
      console.error('LLM call failed:', error);
      throw error;
    }
  }

  async dispatchMCP(capability: string, params: any): Promise<AIORPCResponse> {
    const request: AIORPCRequest = {
      jsonrpc: '2.0',
      method: 'mcp.dispatch',
      params: { capability, ...params },
      id: Date.now().toString()
    };

    try {
      const response = await fetch('/api/aio/mcp/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      return await response.json();
    } catch (error) {
      console.error('MCP dispatch failed:', error);
      throw error;
    }
  }

  async getTrace(traceId: string): Promise<any> {
    try {
      const response = await fetch(`/api/aio/trace/${traceId}`);
      return await response.json();
    } catch (error) {
      console.error('Trace fetch failed:', error);
      throw error;
    }
  }

  async searchIndex(query: string, group?: string): Promise<any> {
    const request: AIORPCRequest = {
      jsonrpc: '2.0',
      method: 'index.search',
      params: { query, group },
      id: Date.now().toString()
    };

    try {
      const response = await fetch('/api/aio/index/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Index search failed:', error);
      throw error;
    }
  }
}

export const aioService = new AIOService();
