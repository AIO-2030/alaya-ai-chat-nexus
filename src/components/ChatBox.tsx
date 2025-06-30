
import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { AudioRecorder } from './AudioRecorder';
import { FileUpload, FilePreview } from './FileUpload';
import { useChatSession } from '../hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Paperclip, Mic, Video, Trash2, Sparkles, Zap, Brain } from 'lucide-react';

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
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Univoice Agent
              </h2>
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Zap className="h-3 w-3" />
                <span>Neural Processing Active</span>
              </div>
            </div>
          </div>
          
          <Select value={session.alignmentMode} onValueChange={(value: any) => setAlignmentMode(value)}>
            <SelectTrigger className="w-36 bg-white/5 border-white/20 text-white backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-white/10">
              <SelectItem value="Relaxed" className="text-white hover:bg-white/10">Relaxed</SelectItem>
              <SelectItem value="Balanced" className="text-white hover:bg-white/10">Balanced</SelectItem>
              <SelectItem value="Strict" className="text-white hover:bg-white/10">Strict</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={clearSession}
          className="bg-white/5 border-white/20 text-white/60 hover:text-red-400 hover:bg-red-400/10 backdrop-blur-sm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {session.messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/60 mb-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-400 via-purple-400 to-blue-400 rounded-full flex items-center justify-center relative">
                <Sparkles className="text-white text-xl" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-purple-400 to-blue-400 animate-pulse"></div>
              </div>
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3">
                Welcome to Univoice Agent
              </h3>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                Your advanced AI assistant powered by neural networks. Start with voice, text, or file interactions.
              </p>
              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span>Voice Ready</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse animation-delay-300"></div>
                  <span>Neural Active</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse animation-delay-600"></div>
                  <span>Learning Mode</span>
                </div>
              </div>
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
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-md px-6 py-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-white/60">Neural processing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File previews */}
      {uploadedFiles.length > 0 && (
        <div className="px-6 py-3 border-t border-white/10">
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
      <div className="p-6 border-t border-white/10">
        <Tabs value={inputMode} onValueChange={(value: any) => setInputMode(value)}>
          <TabsList className="grid w-full grid-cols-3 bg-white/5 backdrop-blur-sm border border-white/20">
            <TabsTrigger 
              value="text" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/20 data-[state=active]:to-purple-400/20 data-[state=active]:text-white text-white/60"
            >
              <Send className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/20 data-[state=active]:to-purple-400/20 data-[state=active]:text-white text-white/60"
            >
              <Mic className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger 
              value="file" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/20 data-[state=active]:to-purple-400/20 data-[state=active]:text-white text-white/60"
            >
              <Paperclip className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:border-cyan-400/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || (!inputValue.trim() && uploadedFiles.length === 0)}
                className="bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-4">
            <div className="flex justify-center">
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                className="w-full max-w-md"
              />
            </div>
          </TabsContent>

          <TabsContent value="file" className="mt-4">
            <FileUpload onFileUpload={handleFileUpload} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
