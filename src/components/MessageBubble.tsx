
import React from 'react';
import { ChatMessage } from '../types/chat';
import { JSONViewer } from './JSONViewer';
import { FilePreview } from './FileUpload';
import { Button } from '@/components/ui/button';
import { Download, Play, Info, Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onExecuteJsonRpc?: (method: string, params: any) => void;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onExecuteJsonRpc,
  className = ""
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const renderContent = () => {
    switch (message.type) {
      case 'json':
        try {
          const jsonData = JSON.parse(message.content);
          return (
            <JSONViewer
              data={jsonData}
              onExecute={onExecuteJsonRpc}
            />
          );
        } catch {
          return <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>;
        }

      case 'audio':
        return (
          <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
              <Play className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-white">Audio message</span>
              {message.metadata?.audioUrl && (
                <audio controls className="mt-2 w-full max-w-xs">
                  <source src={message.metadata.audioUrl} type="audio/webm" />
                </audio>
              )}
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="max-w-md">
            {message.metadata?.videoUrl && (
              <video controls className="w-full rounded-xl border border-white/10">
                <source src={message.metadata.videoUrl} type="video/mp4" />
              </video>
            )}
            {message.content && (
              <p className="mt-3 text-sm text-white/80">{message.content}</p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {message.metadata?.fileName || 'File'}
                </div>
                <div className="text-xs text-white/60">
                  {((message.metadata?.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white/80 hover:bg-white/20">
                Download
              </Button>
            </div>
            {message.content && (
              <p className="text-sm text-white/80">{message.content}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-white/90 leading-relaxed">{message.content}</p>
            </div>
            
            {message.metadata?.alignmentExplanation && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-400/20 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <Info className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-blue-300 mb-2">
                      Alignment Analysis
                    </h5>
                    <p className="text-sm text-blue-200/80 leading-relaxed">
                      {message.metadata.alignmentExplanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  if (isSystem) {
    return (
      <div className={`flex justify-center mb-6 ${className}`}>
        <div className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-sm text-white/60 border border-white/10">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 ${className}`}>
      <div className="flex items-start gap-3 max-w-[75%]">
        {!isUser && (
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}
        
        <div
          className={`
            px-5 py-4 rounded-2xl backdrop-blur-sm
            ${isUser
              ? 'bg-gradient-to-r from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-br-md text-white'
              : 'bg-white/5 border border-white/10 rounded-bl-md text-white/90'
            }
          `}
        >
          {renderContent()}
          
          <div className={`text-xs mt-3 flex items-center gap-2 ${isUser ? 'text-white/60' : 'text-white/40'}`}>
            <span>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.metadata?.traceId && (
              <>
                <span>•</span>
                <span>ID: {message.metadata.traceId.slice(0, 8)}</span>
              </>
            )}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};
