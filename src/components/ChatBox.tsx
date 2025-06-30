import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { AudioRecorder } from './AudioRecorder';
import { FileUpload, FilePreview } from './FileUpload';
import { useChatSession } from '../hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse opacity-50"></div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Univoice Agent
              </h2>
              <div className="flex items-center gap-1 text-xs text-white/60">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Neural Processing Active</span>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <Select value={session.alignmentMode} onValueChange={(value: any) => setAlignmentMode(value)}>
              <SelectTrigger className="w-36 bg-white/5 border-white/20 text-white backdrop-blur-sm hover:bg-white/10 transition-all duration-200 group-hover:border-cyan-400/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-white/10">
                <SelectItem value="Relaxed" className="text-white hover:bg-green-400/20 focus:bg-green-400/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Relaxed
                  </div>
                </SelectItem>
                <SelectItem value="Balanced" className="text-white hover:bg-yellow-400/20 focus:bg-yellow-400/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Balanced
                  </div>
                </SelectItem>
                <SelectItem value="Strict" className="text-white hover:bg-red-400/20 focus:bg-red-400/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    Strict
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={clearSession}
          className="bg-white/5 border-white/20 text-white/60 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 backdrop-blur-sm transition-all duration-200"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages with ScrollArea */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {session.messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-white/60 mb-6">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-purple-400 to-blue-400 rounded-full animate-spin opacity-20"></div>
                  <div className="absolute inset-2 bg-gradient-to-br from-cyan-400 via-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                    <Sparkles className="text-white text-xl animate-pulse" />
                  </div>
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
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <span>Neural Active</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
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
      </ScrollArea>

      {/* File previews */}
      {uploadedFiles.length > 0 && (
        <div className="px-6 py-3 border-t border-white/10 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex-shrink-0 animate-fade-in">
                <FilePreview
                  file={file}
                  onRemove={() => removeFile(index)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Input Area with Better Text Visibility */}
      <div className="p-6 border-t border-white/10 flex-shrink-0">
        <Tabs value={inputMode} onValueChange={(value: any) => setInputMode(value)}>
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm border border-white/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <TabsTrigger 
              value="text" 
              className="relative flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
            >
              <Send className="h-4 w-4" />
              <span className="text-sm font-semibold">Text</span>
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              className="relative flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
            >
              <Mic className="h-4 w-4" />
              <span className="text-sm font-semibold">Voice</span>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </TabsTrigger>
            <TabsTrigger 
              value="file" 
              className="relative flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
            >
              <Paperclip className="h-4 w-4" />
              <span className="text-sm font-semibold">Files</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <div className="flex gap-3 group">
              <div className="relative flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/60 backdrop-blur-sm focus:border-cyan-400/70 focus:bg-white/15 transition-all duration-200 pr-16 font-medium text-base"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs font-medium bg-white/10 px-2 py-1 rounded border border-white/20">
                  ⏎ Send
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || (!inputValue.trim() && uploadedFiles.length === 0)}
                className="bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 font-semibold"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-4">
            <div className="flex justify-center">
              <div className="relative">
                <AudioRecorder
                  onAudioRecorded={handleAudioRecorded}
                  className="w-full max-w-md"
                />
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full blur-xl opacity-50 animate-pulse"></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file" className="mt-4">
            <div className="relative">
              <FileUpload onFileUpload={handleFileUpload} />
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
