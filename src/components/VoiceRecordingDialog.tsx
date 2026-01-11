import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';

interface VoiceRecordingDialogProps {
  open: boolean;
  onClose: () => void;
  onRecorded: (audioBlob: Blob) => void;
}

const RECORDING_DURATION_MS = 30000; // 30 seconds

export const VoiceRecordingDialog: React.FC<VoiceRecordingDialogProps> = ({
  open,
  onClose,
  onRecorded,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Request microphone permission and start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsStopping(false);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 100;
          if (newTime >= RECORDING_DURATION_MS) {
            stopRecording();
            return RECORDING_DURATION_MS;
          }
          return newTime;
        });
      }, 100);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 100;
          if (newTime >= RECORDING_DURATION_MS) {
            stopRecording();
            return RECORDING_DURATION_MS;
          }
          return newTime;
        });
      }, 100);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      if (isRecording || isPaused) {
        setIsStopping(true);
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSubmit = () => {
    if (audioBlob) {
      onRecorded(audioBlob);
      // Reset state
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setRecordingTime(0);
      setIsStopping(false);
    }
  };

  const handleClose = () => {
    // Stop recording if active
    if (isRecording || isPaused) {
      stopRecording();
    }
    
    // Stop playback if active
    if (isPlaying) {
      pausePlayback();
    }
    
    // Reset state
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setError(null);
    setIsStopping(false);
    onClose();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = (recordingTime / RECORDING_DURATION_MS) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Your Voice</DialogTitle>
          <DialogDescription>
            Please record 30 seconds of your voice. Speak clearly and naturally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recording Status */}
          {!audioBlob && (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                  {isRecording && !isPaused && (
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                  )}
                  {isRecording || isPaused ? (
                    <MicOff className="w-12 h-12 text-white" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatTime(recordingTime)} / {formatTime(RECORDING_DURATION_MS)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {isRecording && !isPaused && 'Recording...'}
                  {isPaused && 'Paused'}
                  {!isRecording && !isPaused && 'Ready to record'}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Playback Section */}
          {audioBlob && (
            <div className="space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                Recording complete! Listen to your recording:
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? pausePlayback : playRecording}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAudioBlob(null);
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl(null);
                    }
                    setRecordingTime(0);
                    setIsStopping(false);
                  }}
                >
                  Re-record
                </Button>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                className="hidden"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!audioBlob && !isRecording && !isPaused && !isStopping && (
            <Button onClick={startRecording}>
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          )}
          {isStopping && (
            <Button disabled>
              Processing...
            </Button>
          )}
          {isRecording && !isPaused && (
            <>
              <Button variant="outline" onClick={pauseRecording}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={stopRecording}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          {isPaused && (
            <>
              <Button variant="outline" onClick={resumeRecording}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button onClick={stopRecording}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          {audioBlob && (
            <Button onClick={handleSubmit}>
              Use This Recording
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
