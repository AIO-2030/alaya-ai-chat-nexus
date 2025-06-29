
import React from 'react';
import { ReactMediaRecorder } from 'react-media-recorder';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, transcript?: string) => void;
  className?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  className = ""
}) => {
  const handleStop = (blobUrl: string, blob: Blob) => {
    console.log('Audio recorded:', { blobUrl, blob });
    onAudioRecorded(blob);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ReactMediaRecorder
        audio
        onStop={handleStop}
        render={({ status, startRecording, stopRecording }) => (
          <>
            <Button
              variant={status === 'recording' ? "destructive" : "outline"}
              size="sm"
              onClick={status === 'recording' ? stopRecording : startRecording}
              className="flex items-center gap-2"
              disabled={status === 'acquiring_media'}
            >
              {status === 'recording' ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Record
                </>
              )}
            </Button>
            
            {status === 'recording' && (
              <div className="flex items-center gap-2 text-sm text-red-500 animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Recording...
              </div>
            )}
            
            {status === 'acquiring_media' && (
              <div className="flex items-center gap-2 text-sm text-blue-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Getting microphone access...
              </div>
            )}
          </>
        )}
      />
    </div>
  );
};
