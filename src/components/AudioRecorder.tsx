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
          console.log('startRecording:', startRecording, 'stopRecording:', stopRecording);
          console.log('typeof startRecording:', typeof startRecording);
          
          // Handle recorder errors
          if (recorderError && !error) {
            console.error('Recording error:', recorderError);
            setError('Recording failed. Please check your microphone and try again.');
          }

          const handleRecordClick = async () => {
            console.log('🎯 RECORD BUTTON CLICKED!');
            console.log('🎯 Current status:', status);
            console.log('🎯 Permission status:', permissionStatus);
            console.log('typeof startRecording:', typeof startRecording);
            if (status === 'recording') {
              console.log('🛑 Stopping recording...');
              stopRecording();
              return;
            }
            setError(null);
            // 兼容 navigator.permissions 不支持的情况
            let perm = permissionStatus;
            if (perm === 'unknown' && !navigator.permissions) {
              // 直接尝试请求权限
              const hasAccess = await requestMicrophoneAccess();
              if (!hasAccess) {
                console.log('❌ Microphone access denied (no permissions API)');
                return;
              }
              perm = 'granted';
            }
            // 检查权限
            if (perm !== 'granted') {
              console.log('🔐 Requesting microphone access...');
              const hasAccess = await requestMicrophoneAccess();
              if (!hasAccess) {
                console.log('❌ Microphone access denied');
                return;
              }
              // 权限刚被授予，自动调用 startRecording
              try {
                console.log('即将调用 startRecording (after permission granted)');
                startRecording();
                console.log('✅ startRecording called after permission granted');
              } catch (error) {
                console.error('❌ Error in startRecording:', error);
                setError('Failed to start recording. Please try again.');
              }
              return;
            }
            // 权限已授予，直接录音
            try {
              console.log('即将调用 startRecording');
              startRecording();
              console.log('✅ startRecording called successfully');
            } catch (error) {
              console.error('❌ Error in startRecording:', error);
              setError('Failed to start recording. Please try again.');
            }
          };
          
          return (
            <div className="flex flex-col items-center gap-3">
              <div className="text-xs text-gray-400 mb-1">Status: {status} | Permission: {permissionStatus}</div>
              
              <button
                type="button"
                onClick={(e) => {
                  console.log('🎯 BUTTON CLICKED!!! Event:', e);
                  handleRecordClick();
                }}
                onMouseDown={(e) => {
                  console.log('🖱️ Mouse down detected', e);
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  console.log('🖱️ Mouse up detected', e);
                  e.stopPropagation();
                }}
                onPointerDown={(e) => console.log('👆 Pointer down', e)}
                onPointerUp={(e) => console.log('👆 Pointer up', e)}
                disabled={status === 'acquiring_media'}
                className={`
                  flex items-center gap-3 px-8 py-4 text-lg font-semibold rounded-lg 
                  cursor-pointer transition-all duration-200 border-none outline-none
                  ${status === 'recording' 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600'
                  }
                  text-white shadow-lg hover:shadow-xl hover:scale-105
                  ${status === 'acquiring_media' ? 'opacity-50 cursor-not-allowed' : ''}
                  ${status === 'recording' ? 'animate-pulse' : ''}
                `}
                style={{
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 10
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
