import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  Send, 
  Image, 
  Video, 
  Smile, 
  Paperclip,
  MicOff,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../types/chat';

// ChatBox 组件接口
interface ChatBoxProps {
  className?: string;
  messages: ChatMessage[];
  onSendMessage?: (content: string, type: 'text') => void;
  onVoiceMessage?: (audioBlob: Blob, transcript?: string) => void;
  onImageMessage?: (file: File) => void;
  onVideoMessage?: (file: File) => void;
  onEmojiMessage?: (emoji: string) => void;
  onFileMessage?: (file: File) => void;
  isVoiceMode?: boolean;
  onVoiceModeChange?: (isVoice: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  showVoiceControls?: boolean;
  showFileUpload?: boolean;
  showEmoji?: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  className = "",
  messages = [],
  onSendMessage,
  onVoiceMessage,
  onImageMessage,
  onVideoMessage,
  onEmojiMessage,
  onFileMessage,
  isVoiceMode = false,
  onVoiceModeChange,
  placeholder = "Type your message...",
  disabled = false,
  showVoiceControls = true,
  showFileUpload = true,
  showEmoji = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle text message sending
  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim(), 'text');
      setInputValue('');
    }
  };

  // Handle key press for Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunks, { type: 'audio/wav' });
        if (onVoiceMessage) {
          onVoiceMessage(audioBlob);
        }
        setRecordedChunks([]);
        setIsRecording(false);
        if (onVoiceModeChange) {
          onVoiceModeChange(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      if (onVoiceModeChange) {
        onVoiceModeChange(true);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (file.type.startsWith('image/') && onImageMessage) {
        onImageMessage(file);
      } else if (file.type.startsWith('video/') && onVideoMessage) {
        onVideoMessage(file);
      } else if (onFileMessage) {
        onFileMessage(file);
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    if (onEmojiMessage) {
      onEmojiMessage(emoji);
    }
  };

  // Common emojis
  const commonEmojis = ['😊', '👍', '❤️', '🎉', '🔥', '💯', '👏', '🙏', '😎', '🤔'];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages Display Area */}
      <div className="flex-1 overflow-hidden mb-4">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-white/60 py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start a conversation to see messages here</p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  className={cn(
                    "animate-fade-in",
                    message.role === 'user' ? "ml-auto" : "mr-auto"
                  )}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area with Multi-modal Tabs */}
      <div className="border-t border-white/10 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm border border-white/30 mb-4">
            <TabsTrigger 
              value="text" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            
            {showVoiceControls && (
              <TabsTrigger 
                value="voice" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="hidden sm:inline">Voice</span>
              </TabsTrigger>
            )}
            
            {showFileUpload && (
              <TabsTrigger 
                value="media" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
            )}
            
            {showEmoji && (
              <TabsTrigger 
                value="emoji" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400/30 data-[state=active]:to-purple-400/30 data-[state=active]:text-white data-[state=active]:font-semibold text-white/80 font-medium transition-all duration-200 hover:text-white hover:bg-white/10"
              >
                <Smile className="h-4 w-4" />
                <span className="hidden sm:inline">Emoji</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Text Input Tab */}
          <TabsContent value="text" className="space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/60 backdrop-blur-sm focus:border-cyan-400/70 focus:bg-white/15 transition-all duration-200 pr-16 font-medium text-base"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs font-medium bg-white/10 px-2 py-1 rounded border border-white/20">
                  ⏎ Send
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={disabled || !inputValue.trim()}
                className="bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 font-semibold px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Voice Input Tab */}
          {showVoiceControls && (
            <TabsContent value="voice" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-white/60">
                  {isRecording 
                    ? 'Recording in progress... Click stop to send voice message.' 
                    : 'Click start to begin voice recording.'
                  }
                </p>
                
                <div className="flex justify-center gap-4">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      disabled={disabled}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 font-semibold px-8 py-3"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 font-semibold px-8 py-3"
                    >
                      <MicOff className="h-5 w-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </div>

                {isRecording && (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Recording...</span>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Media Upload Tab */}
          {showFileUpload && (
            <TabsContent value="media" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-white/60">
                  Upload images, videos, or other files
                </p>
                
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-6 py-3"
                  >
                    <Image className="h-5 w-5 mr-2" />
                    Image/Video
                  </Button>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-6 py-3"
                  >
                    <Paperclip className="h-5 w-5 mr-2" />
                    File
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </TabsContent>
          )}

          {/* Emoji Tab */}
          {showEmoji && (
            <TabsContent value="emoji" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-white/60">
                  Select an emoji to send
                </p>
                
                <div className="grid grid-cols-5 gap-3 max-w-xs mx-auto">
                  {commonEmojis.map((emoji, index) => (
                    <Button
                      key={index}
                      onClick={() => handleEmojiSelect(emoji)}
                      disabled={disabled}
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm p-3 text-2xl hover:scale-110 transition-transform"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};
