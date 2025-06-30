
import React, { useState, useEffect } from 'react';
import { ReactMediaRecorder } from 'react-media-recorder';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, transcript?: string) => void;
  className?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  className = ""
}) => {
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  useEffect(() => {
    // Check microphone permission on component mount
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      console.log('Checking microphone permission...');
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionStatus(permission.state);
        console.log('Microphone permission status:', permission.state);
      }
    } catch (err) {
      console.error('Failed to check microphone permission:', err);
      setPermissionStatus('unknown');
    }
  };

  const requestMicrophoneAccess = async () => {
    try {
      console.log('Requesting microphone access...');
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted:', stream);
      setPermissionStatus('granted');
      // Stop the stream immediately as we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Microphone access is required for recording. Please allow microphone access and try again.');
      setPermissionStatus('denied');
      return false;
    }
  };

  const handleStop = (blobUrl: string, blob: Blob) => {
    console.log('Audio recorded successfully:', { blobUrl, blob, size: blob.size });
    if (blob && blob.size > 0) {
      onAudioRecorded(blob);
      setError(null);
    } else {
      console.error('Recorded blob is empty or invalid');
      setError('Recording failed. Please try again.');
    }
  };

  const handleError = (error: any) => {
    console.error('Recording error:', error);
    setError('Recording failed. Please check your microphone and try again.');
  };

  const handleStart = async () => {
    console.log('Starting recording...');
    setError(null);
    
    // Check if we have microphone permission
    if (permissionStatus !== 'granted') {
      const hasAccess = await requestMicrophoneAccess();
      if (!hasAccess) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <ReactMediaRecorder
        audio={{
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }}
        onStop={handleStop}
        onError={handleError}
        render={({ status, startRecording, stopRecording, error: recorderError }) => {
          console.log('Recorder status:', status, 'Error:', recorderError);
          
          return (
            <>
              <Button
                variant={status === 'recording' ? "destructive" : "default"}
                size="lg"
                onClick={async () => {
                  if (status === 'recording') {
                    console.log('Stopping recording...');
                    stopRecording();
                  } else {
                    console.log('Attempting to start recording...');
                    const canStart = await handleStart();
                    if (canStart) {
                      startRecording();
                    }
                  }
                }}
                disabled={status === 'acquiring_media'}
                className={`flex items-center gap-3 px-8 py-4 text-lg font-semibold transition-all duration-200 ${
                  status === 'recording' 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                }`}
              >
                {status === 'recording' ? (
                  <>
                    <Square className="h-5 w-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Start Recording
                  </>
                )}
              </Button>
              
              {status === 'recording' && (
                <div className="flex items-center gap-3 text-red-500 animate-pulse">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording in progress...</span>
                </div>
              )}
              
              {status === 'acquiring_media' && (
                <div className="flex items-center gap-3 text-blue-500">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Accessing microphone...</span>
                </div>
              )}

              {(error || recorderError) && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20 max-w-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error || recorderError}</span>
                </div>
              )}

              {permissionStatus === 'denied' && (
                <div className="text-center max-w-md">
                  <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-lg border border-yellow-400/20 mb-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">Microphone access required</span>
                  </div>
                  <p className="text-xs text-white/60">
                    Please allow microphone access in your browser settings and refresh the page.
                  </p>
                </div>
              )}
            </>
          );
        }}
      />
    </div>
  );
};
