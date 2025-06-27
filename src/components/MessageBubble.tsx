
import React from 'react';
import { ChatMessage } from '../types/chat';
import { JSONViewer } from './JSONViewer';
import { FilePreview } from './FileUpload';
import { Button } from '@/components/ui/button';
import { Download, Play, Info } from 'lucide-react';

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
          <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Play className="h-5 w-5 text-blue-500" />
            <span className="text-sm">Audio message</span>
            {message.metadata?.audioUrl && (
              <audio controls className="max-w-xs">
                <source src={message.metadata.audioUrl} type="audio/webm" />
              </audio>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="max-w-md">
            {message.metadata?.videoUrl && (
              <video controls className="w-full rounded-lg">
                <source src={message.metadata.videoUrl} type="video/mp4" />
              </video>
            )}
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Download className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">
                {message.metadata?.fileName || 'File'}
              </span>
              <span className="text-xs text-gray-500">
                ({(message.metadata?.fileSize || 0) / 1024 / 1024} MB)
              </span>
              <Button size="sm" variant="outline" className="ml-auto">
                Download
              </Button>
            </div>
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            
            {message.metadata?.alignmentExplanation && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Alignment Explanation
                    </h5>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
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
      <div className={`flex justify-center mb-4 ${className}`}>
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-600 dark:text-gray-400">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${className}`}>
      <div
        className={`
          max-w-[70%] px-4 py-3 rounded-2xl
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }
        `}
      >
        {renderContent()}
        
        <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.metadata?.traceId && (
            <span className="ml-2">• Trace: {message.metadata.traceId.slice(0, 8)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
