
export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'audio' | 'video' | 'file' | 'json';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    audioUrl?: string;
    videoUrl?: string;
    alignmentExplanation?: string;
    executionResult?: any;
    traceId?: string;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  alignmentMode: 'Relaxed' | 'Balanced' | 'Strict';
  traceId?: string;
}

export interface LLMProvider {
  name: string;
  type: 'openai' | 'local' | 'siliconflow';
  apiKey?: string;
  endpoint?: string;
}

export interface AIORPCRequest {
  jsonrpc: '2.0';
  method: string;
  params: any;
  id: string;
}

export interface AIORPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: string;
}
