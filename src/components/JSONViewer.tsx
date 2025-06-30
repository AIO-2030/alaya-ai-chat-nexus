import React from 'react';
import ReactJson from 'react18-json-view';
import { Button } from '@/components/ui/button';

interface JSONViewerProps {
  data: any;
  onExecute?: (method: string, params: any) => void;
  className?: string;
}

export const JSONViewer: React.FC<JSONViewerProps> = ({
  data,
  onExecute,
  className = ""
}) => {
  const isJsonRpc = data && data.jsonrpc === '2.0' && data.method;

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isJsonRpc ? 'JSON-RPC Call' : 'Structured Data'}
        </h4>
        {isJsonRpc && onExecute && (
          <Button
            size="sm"
            onClick={() => onExecute(data.method, data.params)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Execute
          </Button>
        )}
      </div>
      
      <div className="max-h-96 overflow-auto">
        <ReactJson
          src={data}
          theme="vscode"
          style={{
            backgroundColor: 'transparent',
            fontSize: '12px'
          }}
          collapsed={2}
          enableClipboard={true}
        />
      </div>
    </div>
  );
};
