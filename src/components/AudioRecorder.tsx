
import React, { useState, useEffect } from 'react';
import { ReactMediaRecorder } from 'react-media-recorder';
import { Mic, Square, AlertCircle } from 'lucide-react';

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

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <ReactMediaRecorder
        audio={{
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }}
        onStop={handleStop}
        render={({ status, startRecording, stopRecording, error: recorderError }) => {
          console.log('Recorder status:', status, 'Error:', recorderError);
          
          // Handle recorder errors
          if (recorderError && !error) {
            console.error('Recording error:', recorderError);
            setError('Recording failed. Please check your microphone and try again.');
          }

          const handleRecordClick = async () => {
            console.log('🎯 RECORD BUTTON CLICKED!');
            console.log('🎯 Current status:', status);
            console.log('🎯 Permission status:', permissionStatus);
            
            if (status === 'recording') {
              console.log('🛑 Stopping recording...');
              stopRecording();
              return;
            }
            
            console.log('🎙️ Starting recording process...');
            setError(null);
            
            // Check microphone permission
            if (permissionStatus !== 'granted') {
              console.log('🔐 Requesting microphone access...');
              const hasAccess = await requestMicrophoneAccess();
              if (!hasAccess) {
                console.log('❌ Microphone access denied');
                return;
              }
            }
            
            console.log('🚀 Calling startRecording...');
            try {
              startRecording();
              console.log('✅ startRecording called successfully');
            } catch (error) {
              console.error('❌ Error in startRecording:', error);
              setError('Failed to start recording. Please try again.');
            }
          };
          
          return (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleRecordClick}
                onMouseDown={() => console.log('🖱️ Mouse down detected')}
                onMouseUp={() => console.log('🖱️ Mouse up detected')}
                disabled={status === 'acquiring_media'}
                style={{
                  all: 'unset',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  cursor: status === 'acquiring_media' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: status === 'recording' 
                    ? 'linear-gradient(to right, #ef4444, #dc2626)' 
                    : 'linear-gradient(to right, #06b6d4, #8b5cf6)',
                  color: 'white',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  opacity: status === 'acquiring_media' ? 0.5 : 1,
                  animation: status === 'recording' ? 'pulse 2s infinite' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (status !== 'acquiring_media') {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
              </button>
              
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
            </div>
          );
        }}
      />
    </div>
  );
};
