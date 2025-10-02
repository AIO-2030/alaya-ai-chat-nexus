import React, { useRef } from 'react';
import { useElevenLabsStable } from '../hooks/elevenlabhook-stable';
import { Button } from '@/components/ui/button';
import { Mic, Upload } from 'lucide-react';

/**
 * Example component demonstrating how to use the speechToText function
 * from the useElevenLabsStable hook
 */
const SpeechToTextExample: React.FC = () => {
  const agentId = "agent_01jz8rr062f41tsyt56q8fzbrz";
  const [state, actions] = useElevenLabsStable(agentId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 Selected file:', file.name, file.size, file.type);

    // Call the speechToText function
    const result = await actions.speechToText(file);
    
    if (result) {
      console.log('✅ Speech to text result:', result);
      console.log('🌍 Language:', result.language_code);
      console.log('📝 Text:', result.text);
      
      // Add the transcribed text as a user message
      actions.addMessage('user', result.text);
    } else {
      console.log('❌ Speech to text failed');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">
        Speech to Text Example
      </h3>
      
      <div className="space-y-4">
        <div>
          <Button
            onClick={handleButtonClick}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Audio File
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="text-sm text-gray-400">
          <p>Supported formats: All major audio and video formats</p>
          <p>Max file size: 3GB</p>
          <p>Language: English (auto-detected)</p>
        </div>

        {state.error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300">
            Error: {state.error}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-white">Recent Messages:</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {state.messages.slice(-5).map((message) => (
              <div
                key={message.id}
                className={`p-2 rounded text-sm ${
                  message.type === 'user'
                    ? 'bg-blue-500/20 text-blue-300'
                    : message.type === 'agent'
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-gray-500/20 text-gray-300'
                }`}
              >
                <span className="font-medium">{message.type}:</span> {message.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToTextExample;
