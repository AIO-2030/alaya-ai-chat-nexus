
import { useState, useCallback } from 'react';
import { ChatMessage, ChatSession, LLMProvider } from '../types/chat';
import { aioService } from '../lib/aio';

export const useChatSession = () => {
  const [session, setSession] = useState<ChatSession>({
    id: Date.now().toString(),
    messages: [],
    alignmentMode: 'Balanced'
  });
  
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>({
    name: 'OpenAI',
    type: 'openai'
  });

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
    
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (content: string, type: ChatMessage['type'] = 'text') => {
    if (!content.trim()) return;

    // Add user message
    const userMessage = addMessage({
      role: 'user',
      content,
      type
    });

    setLoading(true);

    try {
      // Convert messages to format expected by LLM
      const messages = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call AIO LLM service
      const response = await aioService.callLLMProvider(
        provider,
        [...messages, { role: 'user', content }],
        session.alignmentMode,
        session.traceId
      );

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response.result?.content || 'Sorry, I encountered an error.',
        type: 'text',
        metadata: {
          alignmentExplanation: response.result?.alignment_explanation,
          traceId: response.result?.trace_id
        }
      });

      // Update trace ID if provided
      if (response.result?.trace_id) {
        setSession(prev => ({
          ...prev,
          traceId: response.result.trace_id
        }));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        type: 'text'
      });
    } finally {
      setLoading(false);
    }
  }, [session, provider, addMessage]);

  const executeJsonRpc = useCallback(async (method: string, params: any) => {
    setLoading(true);
    try {
      const response = await aioService.dispatchMCP(method, params);
      
      addMessage({
        role: 'assistant',
        content: 'Execution completed',
        type: 'json',
        metadata: {
          executionResult: response.result
        }
      });
    } catch (error) {
      console.error('JSON-RPC execution failed:', error);
      addMessage({
        role: 'assistant',
        content: 'Execution failed: ' + (error as Error).message,
        type: 'text'
      });
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  const setAlignmentMode = useCallback((mode: ChatSession['alignmentMode']) => {
    setSession(prev => ({
      ...prev,
      alignmentMode: mode
    }));
  }, []);

  const clearSession = useCallback(() => {
    setSession({
      id: Date.now().toString(),
      messages: [],
      alignmentMode: session.alignmentMode
    });
  }, [session.alignmentMode]);

  return {
    session,
    loading,
    provider,
    setProvider,
    sendMessage,
    addMessage,
    executeJsonRpc,
    setAlignmentMode,
    clearSession
  };
};
