// AIO Protocol Types - Independent implementation for alaya-chat-nexus-frontend

export interface AIOProtocolStepInfo {
  mcp: string;
  action: string;
  inputSchema: any;
}

export interface AIOProtocolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface AIOProtocolContext {
  contextId: string;
  currentValue: any;
  operation: string;
  callIndex: number;
  stepInfo: AIOProtocolStepInfo;
}
