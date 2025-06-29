import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { AudioRecorder } from './AudioRecorder';
import { FileUpload, FilePreview } from './FileUpload';
import { useChatSession } from '../hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Paperclip, Mic, Video, Trash2 } from 'lucide-react';

interface ChatBoxProps {
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ className = "" }) => {
  const {
    session,
    loading,
    provider,
    setProvider,
    sendMessage,
    addMessage,
    executeJsonRpc,
    setAlignmentMode,
    clearSession
  } = useChatSession();

  const [inputValue, setInputValue] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'file'>('voice');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;

    let content = inputValue;
    
    // Handle file uploads
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const fileMessage = `[File: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)]`;
        content = content ? `${content}\n\n${fileMessage}` : fileMessage;
        
        // Add file message
        addMessage({
          role: 'user',
          content: fileMessage,
          type: 'file',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          }
        });
      }
      setUploadedFiles([]);
    }

    if (inputValue.trim()) {
      await sendMessage(inputValue.trim());
    }
    
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob, transcript?: string) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    
    addMessage({
      role: 'user',
      content: transcript || '[Audio message]',
      type: 'audio',
      metadata: { audioUrl }
    });

    if (transcript) {
      await sendMessage(transcript);
    }
  };

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
             Univoice Agent
          </h2>
          
          <Select value={session.alignmentMode} onValueChange={(value: any) => setAlignmentMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Relaxed">Relaxed</SelectItem>
              <SelectItem value="Balanced">Balanced</SelectItem>
              <SelectItem value="Strict">Strict</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={clearSession}
          className="text-gray-600 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-600 mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">U</span>
              </div>
              <h3 className="text-lg font-medium mb-2">Welcome to Univoice Agent</h3>
              <p className="text-sm">Start a conversation with our multimodal AI assistant</p>
            </div>
          </div>
        )}

        {session.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onExecuteJsonRpc={executeJsonRpc}
          />
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File previews */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex-shrink-0">
                <FilePreview
                  file={file}
                  onRemove={() => removeFile(index)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Tabs value={inputMode} onValueChange={(value: any) => setInputMode(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || (!inputValue.trim() && uploadedFiles.length === 0)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-4">
            <AudioRecorder
              onAudioRecorded={handleAudioRecorded}
              className="w-full justify-center"
            />
          </TabsContent>

          <TabsContent value="file" className="mt-4">
            <FileUpload onFileUpload={handleFileUpload} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
