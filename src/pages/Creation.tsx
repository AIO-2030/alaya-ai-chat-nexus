import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Download, Upload, Palette, RotateCcw, RotateCw, Grid3X3, Pen, Eraser, PaintBucket, Pipette, Plus, Minus, Trash2, X, Mic, MicOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { LoginScreen } from '../components/LoginScreen';
import { RegisterScreen } from '../components/RegisterScreen';
import { EmailLoginScreen } from '../components/EmailLoginScreen';
import { PixelCreationApi, convertImageToPixelArt, ImageImportOptions } from '../services/api/pixelCreationApi';
import { alayaMcpService, PixelImageGenerateParams } from '../services/alayaMcpService';
import { useAuth } from '../lib/auth';
import { useToast } from '../hooks/use-toast';
import { useElevenLabsStable } from '../hooks/elevenlabhook-stable';
import styles from '../styles/pages/Creation.module.css';

// Types
type Tool = "pen" | "eraser" | "fill" | "picker";

// Helpers
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function download(filename: string, blob: Blob) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const Creation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, loginWithEmailPassword, registerWithEmail } = useAuth();
  const { toast } = useToast();
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEmailLoginModal, setShowEmailLoginModal] = useState(false);
  const hasShownLoginPrompt = useRef(false);
  
  // Basic creation info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Save state management
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  
  // Image import state management
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Color picker state management
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  
  // AI Creation drawer state
  const [showAiCreationDrawer, setShowAiCreationDrawer] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // AI creation original image (for display, separate from pixel canvas)
  const [aiOriginalImage, setAiOriginalImage] = useState<string | null>(null);
  const [isAiCreationMode, setIsAiCreationMode] = useState(false);
  
  // Voice recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ElevenLabs hook for speech to text
  const agentId = "agent_01jz8rr062f41tsyt56q8fzbrz";
  const [elevenLabsState, elevenLabsActions] = useElevenLabsStable(agentId);
  
  // Canvas settings (fixed, no UI controls needed)
  const cols = 32;
  const rows = 32;
  const [scale, setScale] = useState(12);
  const [showGrid, setShowGrid] = useState(true);
  
  // Tools and colors
  const [tool, setTool] = useState<Tool>("pen");
  const [palette, setPalette] = useState<string[]>([
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff",
    "#7f7f7f", "#ff7f00", "#7fff00", "#007fff", "#ff007f", "#7f00ff", "#00ff7f", "#3b3b3b",
  ]);
  const [colorIdx, setColorIdx] = useState(2);
  
  // Pixel data
  const [pixels, setPixels] = useState<Uint8Array>(() => new Uint8Array(32 * 32).fill(1));
  
  // History (undo/redo)
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  
  // Canvas refs
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleBackToGallery = () => {
    navigate('/gallery');
  };

  // AI Creation drawer functions
  const handleAiCreationClick = () => {
    setShowAiCreationDrawer(true);
  };

  const handleAiCreationClose = () => {
    setShowAiCreationDrawer(false);
    setAiPrompt('');
    setIsRecording(false);
    setIsProcessingVoice(false);
    setIsGeneratingImage(false);
  };

  // Voice recording functions
  const startVoiceRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting voice recording...');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Create MediaRecorder with fallback for different browsers
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🛑 Voice recording stopped, processing...');
        setIsProcessingVoice(true);
        
        try {
          // Create audio blob with the correct MIME type
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('📁 Audio blob created:', audioBlob.size, 'bytes', 'type:', mimeType);
          
          // Convert to File for speech to text with appropriate extension
          const extension = mimeType.includes('webm') ? 'webm' : 
                          mimeType.includes('mp4') ? 'mp4' : 'wav';
          const audioFile = new File([audioBlob], `recording.${extension}`, { type: mimeType });
          
          // Call speech to text
          const result = await elevenLabsActions.speechToText(audioFile);
          
          if (result && result.text) {
            console.log('✅ Speech to text successful:', result.text);
            setAiPrompt(prev => prev + (prev ? ' ' : '') + result.text);
            toast({
              title: t('gallery.aiCreationDrawer.errors.voiceInputReceived'),
              description: t('gallery.aiCreationDrawer.errors.voiceInputReceivedDesc', { text: result.text }),
              variant: "default",
            });
          } else {
            console.log('❌ Speech to text failed or no text returned');
            toast({
              title: t('gallery.aiCreationDrawer.errors.voiceInputFailed'),
              description: t('gallery.aiCreationDrawer.errors.voiceInputFailedDesc'),
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Error processing voice:', error);
          toast({
            title: t('gallery.aiCreationDrawer.errors.voiceProcessingError'),
            description: t('gallery.aiCreationDrawer.errors.voiceProcessingErrorDesc'),
            variant: "destructive",
          });
        } finally {
          setIsProcessingVoice(false);
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 30 seconds to prevent long recordings
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.log('⏰ Recording timeout reached, stopping automatically');
          mediaRecorder.stop();
        }
      }, 30000); // 30 seconds
      
      console.log('✅ Voice recording started');
      
    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      toast({
        title: t('gallery.aiCreationDrawer.errors.microphoneDenied'),
        description: t('gallery.aiCreationDrawer.errors.microphoneDeniedDesc'),
        variant: "destructive",
      });
    }
  }, [elevenLabsActions, toast]);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('🛑 Stopping voice recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timeout when manually stopping
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    }
  }, []);

  // Handle microphone button click (toggle recording)
  const handleMicClick = () => {
    if (isProcessingVoice) {
      // Don't allow new recording while processing
      return;
    }
    
    if (isRecording) {
      // Currently recording, stop it
      stopVoiceRecording();
    } else {
      // Not recording, start it
      startVoiceRecording();
    }
  };


  // Handle AI prompt submission
  const handleAiPromptSubmit = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: t('gallery.aiCreationDrawer.errors.emptyPrompt'),
        description: t('gallery.aiCreationDrawer.errors.emptyPromptDesc'),
        variant: "destructive",
      });
      return;
    }

    if (isGeneratingImage) {
      return; // Prevent multiple simultaneous requests
    }

    console.log('🤖 AI Creation prompt:', aiPrompt);
    
    setIsGeneratingImage(true);
    
    try {
      // Prepare parameters for pixel image generation
      const params: PixelImageGenerateParams = {
        user_input: aiPrompt.trim(),
        image_size: '512x512', // Generate at higher resolution
        num_inference_steps: 20,
        guidance_scale: 7.5
      };

      // Call the pixel image generation service
      const result = await alayaMcpService.pixelImageGenerate(params);
      
      if (result.success && result.data?.image_base64) {
        console.log('✅ AI image generation successful');
        
        // Store the original AI-generated image for display
        setAiOriginalImage(result.data.image_base64);
        setIsAiCreationMode(true);
        
        // Clear pixel canvas to show AI image clearly
        const clearPixels = new Uint8Array(rows * cols).fill(1); // Fill with white
        setPixels(clearPixels);
        pushHistory(clearPixels);
        
        toast({
          title: t('gallery.aiCreationDrawer.errors.aiCreationStarted'),
          description: t('gallery.aiCreationDrawer.errors.aiCreationStartedDesc', { prompt: aiPrompt }),
          variant: "success",
        });
        
        // Close drawer after successful generation
        handleAiCreationClose();
      } else {
        throw new Error(result.error || 'Image generation failed');
      }
    } catch (error) {
      console.error('❌ AI image generation failed:', error);
      toast({
        title: t('gallery.aiCreationDrawer.errors.aiCreationFailed'),
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle Enter key press in textarea
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAiPromptSubmit();
    }
  };

  // Authentication is now handled by useAuth hook

  // Resize pixels when cols/rows change
  useEffect(() => {
    setPixels((prev) => {
      const next = new Uint8Array(rows * cols).fill(1);
      const prevCols = Math.sqrt(prev.length) % 1 === 0 ? Math.sqrt(prev.length) : cols;
      const prevRows = prev.length / (prevCols || cols);
      const w = Math.min(cols, prevCols);
      const h = Math.min(rows, prevRows);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          next[y * cols + x] = prev[y * (prevCols as number) + x] ?? 1;
        }
      }
      return next;
    });
    setHistory([]);
    setHistIndex(-1);
  }, [cols, rows]);

  // History management
  const pushHistory = useCallback((next?: Uint8Array) => {
    setHistory((h) => {
      const snapshot = (next ? next : pixels).slice();
      const trimmed = histIndex >= 0 ? h.slice(0, histIndex + 1) : [];
      trimmed.push(snapshot);
      setHistIndex(trimmed.length - 1);
      return trimmed;
    });
  }, [pixels, histIndex]);

  const undo = useCallback(() => {
    setHistIndex((i) => {
      const ni = i - 1;
      if (ni >= 0) setPixels(history[ni].slice());
      return Math.max(0, ni);
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistIndex((i) => {
      const ni = i + 1;
      if (ni < history.length) setPixels(history[ni].slice());
      return Math.min(history.length - 1, ni);
    });
  }, [history]);

  const clearCanvas = useCallback(() => {
    const clearPixels = new Uint8Array(rows * cols).fill(1); // Fill with white (index 1)
    setPixels(clearPixels);
    pushHistory(clearPixels);
  }, [rows, cols, pushHistory]);

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Convert base64 image to pixel data and display on canvas
  // Uses the same algorithm as convertImageToPixelArt for consistency
  const convertBase64ToPixelData = useCallback(async (base64Image: string) => {
    try {
      console.log('🎨 [Creation] Starting image conversion from MCP result using convertImageToPixelArt algorithm...');
      
      // Convert base64 to File object to reuse convertImageToPixelArt
      // Extract base64 data (remove data:image/...;base64, prefix if present)
      let base64Data = base64Image;
      if (base64Image.includes(',')) {
        base64Data = base64Image.split(',')[1];
      }
      
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob and file from binary data
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'ai-generated-image.png', { type: 'image/png' });
      
      // Use the same conversion function as image import
      const options: ImageImportOptions = {
        targetWidth: cols,
        targetHeight: rows,
        maxColors: palette.length || 16,
        enableDithering: false,
        preserveAspectRatio: true,
        scaleMode: 'fill' // Use 'fill' to maximize canvas usage
      };

      const result = await convertImageToPixelArt(file, options);
      
      if (result.success && result.pixelArt) {
        const importedPixelArt = result.pixelArt;
        
        // Convert 2D array to flat array for pixels
        const flatPixels = new Uint8Array(cols * rows);
        
        // Copy imported pixels
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (y < importedPixelArt.height && x < importedPixelArt.width) {
              flatPixels[y * cols + x] = importedPixelArt.pixels[y][x];
            } else {
              // Fallback to white
              flatPixels[y * cols + x] = 0; // Assuming 0 is white in the palette
            }
          }
        }
        
        // Update the canvas with imported data
        setPixels(flatPixels);
        setPalette(importedPixelArt.palette);
        
        // Add to history
        pushHistory(flatPixels);
        
        console.log('✅ [Creation] MCP image conversion completed successfully using convertImageToPixelArt');
        return true;
      } else {
        console.error('❌ [Creation] Failed to convert MCP image:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ [Creation] Error in convertBase64ToPixelData:', error);
      return false;
    }
  }, [cols, rows, palette, pushHistory, setPixels, setPalette]);

  // Drawing operations
  const setPixel = useCallback((x: number, y: number, idx: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    setPixels((p) => {
      const n = p.slice();
      n[y * cols + x] = idx;
      return n;
    });
  }, [cols, rows]);

  const getPixel = useCallback((x: number, y: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return 0;
    return pixels[y * cols + x];
  }, [pixels, cols, rows]);

  const floodFill = useCallback((startX: number, startY: number, targetIdx: number, replacementIdx: number) => {
    if (targetIdx === replacementIdx) return;
    const out = pixels.slice();
    const stack: [number, number][] = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      const i = y * cols + x;
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      if (out[i] !== targetIdx) continue;
      out[i] = replacementIdx;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    setPixels(out);
  }, [pixels, cols, rows]);

  const handleSaveClick = () => {
    // Set temporary values from current state
    setTempTitle(title);
    setTempDescription(description);
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Check authentication before saving
      if (!isAuthenticated()) {
        toast({
          title: "Authentication Required",
          description: t('auth.loginRequired'),
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // If in AI creation mode, prompt user to convert to pixel art first
      if (isAiCreationMode && aiOriginalImage) {
        toast({
          title: t('gallery.convertToPixelCanvasFirst'),
          description: t('gallery.convertToPixelCanvasFirstDesc'),
          variant: "destructive",
        });
        setIsSaving(false);
        setShowSaveDialog(false);
        return;
      }

      // Update the actual title and description from dialog
      setTitle(tempTitle);
      setDescription(tempDescription);

      // Convert Uint8Array pixels to 2D number array for API
      const pixels2D: number[][] = [];
      for (let y = 0; y < rows; y++) {
        const row: number[] = [];
        for (let x = 0; x < cols; x++) {
          row.push(pixels[y * cols + x]);
        }
        pixels2D.push(row);
      }

      // Prepare pixel art data
      const pixelArtData = {
        title: tempTitle.trim() || undefined,
        description: tempDescription.trim() || undefined,
        width: cols,
        height: rows,
        palette: palette,
        pixels: pixels2D,
        tags: ['pixel-art', 'created-with-alaya'] // Add default tags
      };

      // Create project in backend
      const result = await PixelCreationApi.createProject({
        pixelArt: pixelArtData,
        message: 'Initial version'
      });

      if (result.success) {
        console.log('Successfully saved pixel art project:', result.projectId);
        
        // Show success message
        toast({
          title: "Success!",
          description: t('gallery.saveSuccess'),
          variant: "default",
        });
        
        // Close dialog and navigate back to gallery
        setShowSaveDialog(false);
        navigate('/gallery');
      } else {
        console.error('Failed to save pixel art:', result.error);
        toast({
          title: "Save Failed",
          description: `${t('gallery.saveError')}: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving pixel art:', error);
      toast({
        title: "Error",
        description: t('gallery.saveError'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCancel = () => {
    setShowSaveDialog(false);
    setTempTitle('');
    setTempDescription('');
  };

  // Handle image import
  const handleImageImport = async (file: File) => {
    if (isImporting) return;
    
    setIsImporting(true);
    
    try {
      const options: ImageImportOptions = {
        targetWidth: 32,
        targetHeight: 32,
        maxColors: palette.length,
        enableDithering: false,
        preserveAspectRatio: true,
        scaleMode: 'fill' // Use 'fill' to maximize canvas usage
      };

      const result = await convertImageToPixelArt(file, options);
      
      if (result.success && result.pixelArt) {
        const importedPixelArt = result.pixelArt;
        
        // Convert 2D array to flat array for pixels
        // The conversion API now guarantees 32x32 output, so we can directly use it
        const flatPixels = new Uint8Array(32 * 32);
        
        // Copy imported pixels directly (should be exactly 32x32)
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            if (y < importedPixelArt.height && x < importedPixelArt.width) {
              flatPixels[y * 32 + x] = importedPixelArt.pixels[y][x];
            } else {
              // This shouldn't happen as API guarantees 32x32, but safety fallback
              flatPixels[y * 32 + x] = getEraserColorIndex();
            }
          }
        }
        
        // Update the canvas with imported data
        setPixels(flatPixels);
        setPalette(importedPixelArt.palette);
        
        // Update metadata if provided
        if (importedPixelArt.title) {
          setTitle(importedPixelArt.title);
        }
        if (importedPixelArt.description) {
          setDescription(importedPixelArt.description);
        }
        
        // Add to history
        pushHistory(flatPixels);
        
        toast({
          title: "Import Successful!",
          description: `Image imported and converted to 32x32 pixel art format`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import Failed",
          description: result.error || 'Unknown error occurred during import',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error importing image:', error);
      toast({
        title: "Import Error",
        description: 'An error occurred while importing the image',
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        handleImageImport(file);
      } else {
        toast({
          title: "Invalid File",
          description: 'Please select a valid image file (PNG, JPG, GIF, etc.)',
          variant: "destructive",
        });
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input
  const triggerImageImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Get eraser color index (white or closest to white)
  const getEraserColorIndex = useCallback(() => {
    // Look for white color in palette
    const whiteIndex = palette.findIndex(color => 
      color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff'
    );
    
    if (whiteIndex !== -1) {
      return whiteIndex;
    }
    
    // If no white, find the lightest color
    let lightestIndex = 0;
    let maxBrightness = 0;
    
    palette.forEach((color, index) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r + g + b) / 3;
      
      if (brightness > maxBrightness) {
        maxBrightness = brightness;
        lightestIndex = index;
      }
    });
    
    return lightestIndex;
  }, [palette]);

  // Color picker functions
  const triggerColorPicker = () => {
    if (colorPickerRef.current) {
      colorPickerRef.current.click();
    }
  };

  const handleColorPickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedColor = event.target.value;
    
    // Check if this color already exists in the palette
    if (!palette.includes(selectedColor)) {
      // Add the new color to the palette and select it
      const newPalette = [...palette, selectedColor];
      setPalette(newPalette);
      setColorIdx(newPalette.length - 1); // Select the newly added color
      
      // Add to history for undo/redo
      pushHistory();
    } else {
      // If color already exists, just select it
      const existingIndex = palette.indexOf(selectedColor);
      setColorIdx(existingIndex);
    }
  };

  // Remove color from palette (with double-click)
  const handleColorDoubleClick = (colorIndex: number) => {
    // Don't allow removing colors if only a few left
    if (palette.length <= 2) {
      toast({
        title: "Cannot Remove Color",
        description: 'At least 2 colors are required in the palette',
        variant: "destructive",
      });
      return;
    }

    // Create new palette without the selected color
    const newPalette = palette.filter((_, i) => i !== colorIndex);
    setPalette(newPalette);
    
    // Adjust color index if necessary
    if (colorIdx >= newPalette.length) {
      setColorIdx(newPalette.length - 1);
    } else if (colorIdx === colorIndex && colorIdx > 0) {
      setColorIdx(colorIdx - 1);
    }
    
    // Add to history for undo/redo
    pushHistory();
  };

  // Mouse/touch interaction
  const eventToCell = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    
    // Calculate current scale based on canvas actual size
    const currentScale = canvas.width / cols;
    
    const x = clamp(Math.floor(dx / currentScale), 0, cols - 1);
    const y = clamp(Math.floor(dy / currentScale), 0, rows - 1);
    return { x, y };
  }, [cols, rows]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = eventToCell(e);
    isDrawingRef.current = true;
    lastPosRef.current = { x, y };

    if (tool === "pen") setPixel(x, y, colorIdx);
    else if (tool === "eraser") setPixel(x, y, getEraserColorIndex());
    else if (tool === "picker") setColorIdx(getPixel(x, y));
    else if (tool === "fill") floodFill(x, y, getPixel(x, y), colorIdx);

    pushHistory();
  }, [eventToCell, tool, colorIdx, setPixel, getPixel, floodFill, pushHistory, getEraserColorIndex]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = eventToCell(e);
    const last = lastPosRef.current;

    if ((tool === "pen" || tool === "eraser") && last) {
      const color = tool === "pen" ? colorIdx : getEraserColorIndex();
      let x0 = last.x, y0 = last.y;
      let x1 = x, y1 = y;
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      while (true) {
        setPixel(x0, y0, color);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
    }

    lastPosRef.current = { x, y };
  }, [eventToCell, tool, colorIdx, setPixel, getEraserColorIndex]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  // Canvas rendering
  useEffect(() => {
    const buffer = bufferRef.current;
    const display = displayRef.current;
    if (!buffer || !display) return;

    // Scale to display - Use user-defined scale, but ensure it fits in container
    const container = display.parentElement;
    let currentScale = scale;
    
    if (container) {
      // Get container dimensions with minimal padding
      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 8; // Minimal padding for mobile
      const maxHeight = containerRect.height - 8; // Minimal padding for mobile
      
      // Calculate maximum possible scale to fit in container
      const maxScaleX = Math.floor(maxWidth / cols);
      const maxScaleY = Math.floor(maxHeight / rows);
      const maxScale = Math.min(maxScaleX, maxScaleY);
      
      // Use user-defined scale, but clamp it to fit within container bounds
      // Ensure minimum scale for visibility on mobile
      currentScale = Math.max(scale, 6);
      
      // Cap maximum scale to prevent canvas from being too large
      // Use the smaller of user scale or max container scale
      currentScale = Math.min(currentScale, maxScale);
    }
    
    display.width = cols * currentScale;
    display.height = rows * currentScale;
    display.style.width = `${cols * currentScale}px`;
    display.style.height = `${rows * currentScale}px`;
    
    const dctx = display.getContext("2d", { willReadFrequently: true })!;
    dctx.clearRect(0, 0, display.width, display.height);

    // If in AI creation mode, display the original image
    if (isAiCreationMode && aiOriginalImage) {
      // Display original AI-generated image
      dctx.imageSmoothingEnabled = true;
      dctx.imageSmoothingQuality = 'high';
      
      const img = new Image();
      img.onload = () => {
        // Calculate aspect ratio and fit image within canvas
        const imgAspect = img.width / img.height;
        const canvasAspect = display.width / display.height;
        
        let drawWidth = display.width;
        let drawHeight = display.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (imgAspect > canvasAspect) {
          // Image is wider, fit to width
          drawHeight = display.width / imgAspect;
          offsetY = (display.height - drawHeight) / 2;
        } else {
          // Image is taller, fit to height
          drawWidth = display.height * imgAspect;
          offsetX = (display.width - drawWidth) / 2;
        }
        
        dctx.clearRect(0, 0, display.width, display.height);
        dctx.fillStyle = '#ffffff';
        dctx.fillRect(0, 0, display.width, display.height);
        dctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      };
      img.src = aiOriginalImage;
    } else {
      // Normal pixel art rendering (hand-drawn mode)
      // Ensure buffer matches logical grid size
      if (buffer.width !== cols || buffer.height !== rows) {
        buffer.width = cols;
        buffer.height = rows;
      }

      // Draw logical pixels
      const bctx = buffer.getContext("2d", { willReadFrequently: true })!;
      const image = bctx.createImageData(cols, rows);
      for (let i = 0; i < pixels.length; i++) {
        const idx = pixels[i];
        const col = palette[idx] || "#000000";
        const r = parseInt(col.slice(1, 3), 16);
        const g = parseInt(col.slice(3, 5), 16);
        const b = parseInt(col.slice(5, 7), 16);
        const off = i * 4;
        image.data[off] = r;
        image.data[off + 1] = g;
        image.data[off + 2] = b;
        image.data[off + 3] = 255;
      }
      bctx.putImageData(image, 0, 0);
      
      dctx.imageSmoothingEnabled = false;
      dctx.drawImage(buffer, 0, 0, display.width, display.height);

      // Grid overlay (only for pixel art mode)
      if (showGrid && currentScale >= 6) {
        dctx.strokeStyle = "rgba(128,128,128,0.5)";
        dctx.lineWidth = 1;
        for (let x = 0; x <= cols; x++) {
          const sx = x * currentScale + 0.5;
          dctx.beginPath(); 
          dctx.moveTo(sx, 0); 
          dctx.lineTo(sx, rows * currentScale); 
          dctx.stroke();
        }
        for (let y = 0; y <= rows; y++) {
          const sy = y * currentScale + 0.5;
          dctx.beginPath(); 
          dctx.moveTo(0, sy); 
          dctx.lineTo(cols * currentScale, sy); 
          dctx.stroke();
        }
      }
    }
  }, [pixels, cols, rows, scale, palette, showGrid, isAiCreationMode, aiOriginalImage]);

  // Export functions
  const exportPNG = useCallback(() => {
    const display = displayRef.current!;
    display.toBlob((blob) => {
      if (blob) download(`${title || 'pixel-art'}-${cols}x${rows}.png`, blob);
    }, "image/png");
  }, [title, cols, rows]);

  const exportJSON = useCallback(() => {
    const payload = {
      title,
      description,
      w: cols,
      h: rows,
      palette,
      data: Array.from(pixels),
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    download(`${title || 'pixel-art'}-${cols}x${rows}.json`, blob);
  }, [title, description, cols, rows, palette, pixels]);

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "b") setTool("pen");
      if (e.key === "e") setTool("eraser");
      if (e.key === "g") setTool("fill");
      if (e.key === "i") setTool("picker");
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) { 
        e.preventDefault();
        e.shiftKey ? redo() : undo(); 
      }
      if (e.key === "+") setScale((s) => clamp(s + 1, 1, 40));
      if (e.key === "-") setScale((s) => clamp(s - 1, 1, 40));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Check authentication on mount and when auth state changes
  useEffect(() => {
    if (!authLoading && !isAuthenticated() && !hasShownLoginPrompt.current) {
      hasShownLoginPrompt.current = true;
      setShowLoginModal(true);
    }
    // Reset the flag when user becomes authenticated
    if (isAuthenticated()) {
      hasShownLoginPrompt.current = false;
    }
  }, [authLoading, isAuthenticated]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className={`${styles.creation__page} h-screen w-full flex items-center justify-center`}>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animation-delay-150"></div>
          <div className="mt-4 text-center">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xl font-semibold">
              {t('common.loading') || 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const isLoggedIn = isAuthenticated();

  // Login handlers
  const handleShowEmailLogin = () => {
    setShowLoginModal(false);
    setShowEmailLoginModal(true);
  };

  const handleShowRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleBackToLogin = () => {
    setShowRegisterModal(false);
    setShowEmailLoginModal(false);
    setShowLoginModal(true);
  };

  const handleEmailLogin = async (email: string, password: string) => {
    try {
      const userInfo = await loginWithEmailPassword(email, password);
      setShowEmailLoginModal(false);
      setShowLoginModal(false);
      return userInfo;
    } catch (error) {
      console.error('[Creation] Email login failed:', error);
      throw error;
    }
  };

  const handleRegister = async (nickname: string, email: string, password: string) => {
    try {
      await registerWithEmail(nickname, email, password);
      setShowRegisterModal(false);
      setShowLoginModal(false);
    } catch (error) {
      console.error('[Creation] Registration failed:', error);
      throw error;
    }
  };

  return (
    <div className={`${styles.creation__page} h-screen w-full relative overflow-hidden flex flex-col`}>

        {/* Header */}
        <AppHeader />

        {/* Login Required Overlay - Only show when login modal is open */}
        {!isLoggedIn && showLoginModal && (
          <div className={`${styles['creation__login-overlay']} absolute inset-0 z-50 flex items-center justify-center p-4`}>
            <div className="w-full max-w-md">
              <LoginScreen
                onEmailLoginClick={handleShowEmailLogin}
                onRegisterClick={handleShowRegister}
                loading={authLoading}
                closeBehavior="navigateToHome"
                onClose={() => {
                  setShowLoginModal(false);
                  hasShownLoginPrompt.current = false;
                }}
              />
            </div>
          </div>
        )}

        <div className={`flex flex-1 w-full min-h-0 ${!isLoggedIn ? 'pointer-events-none opacity-30' : ''}`}>
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 p-1 md:p-2 min-h-0">
              <div className={`${styles['creation__content-panel']} h-full rounded-2xl flex flex-col overflow-hidden`}>
                
                {/* Creation Header - Compact for mobile */}
                <div className={`${styles.creation__header} flex-shrink-0 p-2 sm:p-3 md:p-4`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Back Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${styles['creation__button-base']} p-1.5 sm:p-2`}
                      onClick={handleBackToGallery}
                    >
                      <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    
                    {/* Title */}
                    <div className="flex-1">
                      <h1 className="text-base sm:text-lg font-bold text-white">{t('gallery.create')}</h1>
                    </div>

                    {/* Save Button */}
                    <Button
                      onClick={handleSaveClick}
                      disabled={isSaving}
                      size="sm"
                      className={`${styles['creation__button-base']} text-white disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm px-2 sm:px-3`}
                    >
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">{isSaving ? t('gallery.saving') : t('userManagement.save')}</span>
                      <span className="xs:hidden">{isSaving ? '...' : 'Save'}</span>
                    </Button>
                  </div>
                </div>

                {/* Pixel Editor Content */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  
                  {/* AI Creation Entry Banner - Gray Design */}
                  <div className={`${styles['creation__ai-banner']} flex-shrink-0 h-16 sm:h-20 md:h-24 z-10 overflow-hidden relative`}>
                    {/* Main content */}
                    <div className="relative h-full flex items-center justify-center p-3 sm:p-4">
                      <div className="w-full max-w-3xl">
                        {/* Background card */}
                        <div 
                          className={`${styles['creation__ai-card']} relative rounded-2xl cursor-pointer hover:scale-[1.02] transition-all duration-300 group`}
                          onClick={handleAiCreationClick}
                        >
                          {/* Content with text box wrapper */}
                          <div className={`${styles['creation__ai-card-content']} relative p-3 sm:p-4 md:p-5`}>
                            {/* AI Icon */}
                            <div className="flex justify-center mb-2 sm:mb-3">
                              <div className="relative">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 rounded-xl flex items-center justify-center transition-all duration-300">
                                  <span className="text-white font-bold text-sm sm:text-base">🤖</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Main text */}
                            <div className="text-center">
                              <h2 className="text-white text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 leading-tight">
                                {t('gallery.aiCreation')}
                              </h2>
                              
                              {/* Subtitle - Sky Blue */}
                              <p className="text-[#00BFFF] text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                                {t('gallery.aiCreationSubtitle')}
                              </p>
                              
                              {/* Description - Yellow */}
                              <p className="text-[#FFD700] text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">
                                {t('gallery.aiCreationDescription')}
                              </p>
                              
                              {/* Action button */}
                              <div className="flex justify-center">
                                <button className={`${styles['creation__button-base']} text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105`}>
                                  {t('gallery.startAiCreation')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Canvas Area - Main Drawing Space - Optimized for mobile */}
                  <div className={`${styles['creation__canvas-area']} flex-1 min-h-0 overflow-hidden relative`}>
                    {/* AI Creation Mode Banner */}
                    {isAiCreationMode && aiOriginalImage && (
                      <div className={`${styles['creation__ai-banner']} absolute top-2 left-1/2 transform -translate-x-1/2 z-10 rounded-lg px-4 py-2`}>
                        <div className="flex items-center gap-3">
                          <span className="text-white text-sm font-medium">{t('gallery.aiCreationMode')}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${styles['creation__button-base']} text-xs`}
                            onClick={async () => {
                              // Convert AI image to pixel art for editing
                              if (aiOriginalImage) {
                                const success = await convertBase64ToPixelData(aiOriginalImage);
                                if (success) {
                                  setIsAiCreationMode(false);
                                  setAiOriginalImage(null);
                                  toast({
                                    title: t('gallery.convertedToPixelCanvas'),
                                    description: t('gallery.convertedToPixelCanvasDesc'),
                                    variant: "success",
                                  });
                                }
                              }
                            }}
                          >
                            {t('gallery.convertToPixelCanvas')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${styles['creation__button-base']} text-xs`}
                            onClick={() => {
                              setIsAiCreationMode(false);
                              setAiOriginalImage(null);
                              const clearPixels = new Uint8Array(rows * cols).fill(1);
                              setPixels(clearPixels);
                              pushHistory(clearPixels);
                            }}
                          >
                            {t('gallery.clear')}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="h-full w-full flex items-center justify-center p-2 sm:p-3 md:p-4 min-h-[150px] sm:min-h-[200px]">
                      <canvas
                        ref={displayRef}
                        onPointerDown={isAiCreationMode ? undefined : handlePointerDown}
                        onPointerMove={isAiCreationMode ? undefined : handlePointerMove}
                        onPointerUp={isAiCreationMode ? undefined : handlePointerUp}
                        className={`bg-white/5 max-w-full max-h-full ${
                          isAiCreationMode 
                            ? styles['canvas--ai-mode']
                            : `${styles.canvas} ${
                                tool === "pen" ? styles['canvas--pen'] :
                                tool === "eraser" ? styles['canvas--eraser'] :
                                tool === "picker" ? styles['canvas--picker'] :
                                styles['canvas--fill']
                              }`
                        }`}
                      />
                      {/* Hidden buffer canvas */}
                      <canvas ref={bufferRef} className="hidden" />
                    </div>
                  </div>

                  {/* Bottom Control Panel - Compact for mobile */}
                  <div className={`${styles['creation__control-panel']} flex-shrink-0 max-h-32 sm:max-h-40 overflow-y-auto`}>
                    
                    {/* Drawing Tools Row - Compact Layout */}
                    <div className="flex flex-wrap items-center justify-center gap-1 p-1.5 sm:p-2">
                        {/* Undo/Redo/Clear/Import - Compact */}
                        <div className={`${styles['creation__tool-group']} flex gap-0.5 p-0.5`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={undo}
                            disabled={histIndex <= 0}
                            className={`${styles['creation__tool-button']} p-1 min-w-0 h-7`}
                            style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                          >
                            <RotateCcw className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={redo}
                            disabled={histIndex >= history.length - 1}
                            className={`${styles['creation__tool-button']} p-1 min-w-0 h-7`}
                            style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                          >
                            <RotateCw className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearCanvas}
                            className={`${styles['creation__tool-button']} p-1 min-w-0 h-7`}
                            style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                          >
                            <Trash2 className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={triggerImageImport}
                            disabled={isImporting}
                            className={`${styles['creation__tool-button']} p-1 min-w-0 h-7`}
                            title="Import Image"
                            style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                          >
                            <Upload className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                        </div>

                        {/* Main Tools - Compact */}
                        <div className={`${styles['creation__tool-group']} flex gap-0.5 p-0.5`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTool("pen")}
                            className={`p-1 min-w-0 h-7 ${tool === "pen" ? styles['creation__tool-button--active'] : styles['creation__tool-button']}`}
                            style={{ 
                              backgroundColor: tool === "pen" ? '#FFFFFF' : '#FFFFFF', 
                              color: '#000000', 
                              borderColor: tool === "pen" ? '#BDBDBD' : '#E0E0E0' 
                            }}
                          >
                            <Pen className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTool("eraser")}
                            className={`p-1 min-w-0 h-7 relative ${tool === "eraser" ? styles['creation__tool-button--active'] : styles['creation__tool-button']}`}
                            title={`Eraser (erases to ${palette[getEraserColorIndex()]})`}
                            style={{ 
                              backgroundColor: tool === "eraser" ? '#FFFFFF' : '#FFFFFF', 
                              color: '#000000', 
                              borderColor: tool === "eraser" ? '#BDBDBD' : '#E0E0E0' 
                            }}
                          >
                            <Eraser className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                            {/* Small indicator showing eraser color */}
                            {tool === "eraser" && (
                              <div 
                                className={`${styles['eraser-indicator']} absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white/50`}
                                style={{ backgroundColor: palette[getEraserColorIndex()] }}
                              />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTool("fill")}
                            className={`p-1 min-w-0 h-7 ${tool === "fill" ? styles['creation__tool-button--active'] : styles['creation__tool-button']}`}
                            style={{ 
                              backgroundColor: tool === "fill" ? '#FFFFFF' : '#FFFFFF', 
                              color: '#000000', 
                              borderColor: tool === "fill" ? '#BDBDBD' : '#E0E0E0' 
                            }}
                          >
                            <PaintBucket className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTool("picker")}
                            className={`p-1 min-w-0 h-7 ${tool === "picker" ? styles['creation__tool-button--active'] : styles['creation__tool-button']}`}
                            style={{ 
                              backgroundColor: tool === "picker" ? '#FFFFFF' : '#FFFFFF', 
                              color: '#000000', 
                              borderColor: tool === "picker" ? '#BDBDBD' : '#E0E0E0' 
                            }}
                          >
                            <Pipette className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                        </div>

                        {/* View Controls - Compact */}
                        <div className={`${styles['creation__tool-group']} flex gap-0.5 p-0.5`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => clamp(s - 1, 1, 40))}
                            className={`${styles['creation__tool-button']} p-1 min-w-0 h-7`}
                            style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                          >
                            <Minus className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                          <div className={`${styles['creation__scale-display']} px-1.5 py-1 rounded text-xs min-w-[32px] text-center h-7 flex items-center justify-center`}>
                            {scale}x
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => clamp(s + 1, 1, 40))}
                            className={`${styles['creation__tool-button']} p-1 min-w-0 h-7`}
                            style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                          >
                            <Plus className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                          </Button>
                        </div>

                        {/* Grid Toggle - Compact */}
                        <div className={`${styles['creation__tool-group']} flex items-center gap-0.5 p-0.5`}>
                          <Grid3X3 className="h-3 w-3 text-white/60" />
                          <Switch
                            checked={showGrid}
                            onCheckedChange={setShowGrid}
                            className="data-[state=checked]:bg-gray-600 scale-50"
                          />
                        </div>
                      </div>

                    {/* Color Palette Row - Compact for mobile */}
                    <div className="flex items-center justify-center gap-1 p-1.5 sm:p-2">
                      <div className={`${styles['creation__palette-container']} flex gap-1 p-1 max-w-full overflow-x-auto`}>
                        {palette.map((hex, i) => (
                          <button
                            key={i}
                            onClick={() => setColorIdx(i)}
                            onDoubleClick={() => handleColorDoubleClick(i)}
                            className={`${styles['color-swatch']} w-4 h-4 sm:w-5 sm:h-5 rounded border-2 transition-all duration-200 hover:scale-110 flex-shrink-0 ${
                              i === colorIdx ? 'border-cyan-400 shadow-md shadow-cyan-400/30' : 'border-white/30 hover:border-white/60'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={`Color ${i}: ${hex} (Double-click to remove)`}
                          />
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerColorPicker}
                        className={`${styles['creation__tool-button']} p-1 min-w-0 flex-shrink-0 h-6`}
                        title="Add new color"
                        style={{ backgroundColor: '#FFFFFF', color: '#000000', borderColor: '#E0E0E0' }}
                      >
                        <Plus className="h-3 w-3" style={{ color: '#000000', stroke: '#000000' }} />
                      </Button>
                    </div>
                  </div>
                    
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hidden file input for image import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className={styles['hidden-input']}
        />
        
        {/* Hidden color picker input for palette management */}
        <input
          ref={colorPickerRef}
          type="color"
          onChange={handleColorPickerChange}
          className={styles['hidden-input']}
        />

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className={`sm:max-w-md ${styles['creation__content-panel']} text-white`}>
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">
                {t('gallery.saveCreation')}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm">
                {t('gallery.saveDialogDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Title Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  {t('gallery.artTitle')} <span className="text-red-400">*</span>
                </label>
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder={t('gallery.titlePlaceholder')}
                  className={`${styles['creation__tool-button']} text-white placeholder-white/50`}
                  maxLength={100}
                  autoFocus
                />
                {!tempTitle.trim() && (
                  <div className="text-xs text-red-400">
                    {t('gallery.titleRequired')}
                  </div>
                )}
              </div>
              
              {/* Description Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  {t('gallery.artDescription')}
                </label>
                <Textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  placeholder={t('gallery.descriptionPlaceholder')}
                  className={`${styles['creation__tool-button']} text-white placeholder-white/50 resize-none`}
                  maxLength={200}
                  rows={3}
                />
                <div className="text-xs text-white/50 text-right">
                  {tempDescription.length}/200 {t('gallery.characterCount')}
                </div>
              </div>
            </div>
            
            {/* Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={handleSaveCancel}
                disabled={isSaving}
                className="bg-[#1a1a1a] hover:bg-[#252525] border-2 border-[rgba(255,255,255,0.15)] text-white rounded-2xl px-6 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSaveConfirm}
                disabled={isSaving || !tempTitle.trim()}
                className="bg-[#1E3A5F] hover:bg-[#2A4A7F] text-white rounded-2xl px-6 py-3 font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[rgba(255,255,255,0.2)] shadow-[0_4px_16px_rgba(30,58,95,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:translateY(-2px) hover:shadow-[0_6px_20px_rgba(30,58,95,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] min-h-[48px] flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    {t('gallery.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('userManagement.save')}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Creation Drawer */}
        <Sheet open={showAiCreationDrawer} onOpenChange={setShowAiCreationDrawer}>
          <SheetContent side="bottom" className={`h-[85vh] max-h-[600px] ${styles['creation__content-panel']} text-white flex flex-col`}>
            <SheetHeader className="text-center pb-6 flex-shrink-0">
              <SheetTitle className="text-3xl font-bold text-[#D4AF37] mb-2">
                {t('gallery.aiCreationDrawer.title')}
              </SheetTitle>
              <SheetDescription className="text-[#9ca3af] text-sm">
                {t('gallery.aiCreationDrawer.subtitle')}
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 flex flex-col space-y-4 px-4 min-h-0">
              {/* Text Input Area */}
              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={t('gallery.aiCreationDrawer.placeholder')}
                  className="flex-1 min-h-[200px] max-h-[350px] resize-none bg-[#1a1a1a] border-2 border-[rgba(255,255,255,0.15)] rounded-2xl text-white placeholder:text-[#9ca3af] text-base p-4 focus:border-[#D4AF37] focus:outline-none transition-colors duration-200"
                  maxLength={500}
                />
                <div className="text-xs text-[#9ca3af] text-right flex-shrink-0">
                  {aiPrompt.length}/500 {t('gallery.aiCreationDrawer.characterCount')}
                </div>
              </div>

              {/* Voice Input and Action Buttons */}
              <div className="flex items-center justify-center gap-4 flex-shrink-0">
                {/* Microphone Button */}
                <Button
                  onClick={handleMicClick}
                  disabled={isProcessingVoice}
                  className={`w-16 h-16 rounded-full transition-all duration-200 cursor-pointer ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : isProcessingVoice
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-[#1E3A5F] hover:bg-[#2A4A7F] border-2 border-[rgba(255,255,255,0.2)]'
                  } shadow-lg hover:shadow-xl hover:translateY(-2px)`}
                >
                  {isProcessingVoice ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </Button>

                {/* Confirm Button */}
                <Button
                  onClick={handleAiPromptSubmit}
                  disabled={!aiPrompt.trim() || isProcessingVoice || isGeneratingImage}
                  className="bg-[#1E3A5F] hover:bg-[#2A4A7F] text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[rgba(255,255,255,0.2)] shadow-[0_4px_16px_rgba(30,58,95,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:translateY(-2px) hover:shadow-[0_6px_20px_rgba(30,58,95,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] min-h-[64px] flex items-center justify-center"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      {t('gallery.aiCreationDrawer.generating')}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {t('gallery.aiCreationDrawer.confirm')}
                    </>
                  )}
                </Button>
              </div>

              {/* Status Messages */}
              <div className="flex-shrink-0">
                {isRecording && (
                  <div className="text-center text-[#D4A5FF] text-sm font-medium animate-pulse">
                    <Mic className="w-4 h-4 inline-block mr-1" />
                    {t('gallery.aiCreationDrawer.recording')}
                  </div>
                )}
                
                {isProcessingVoice && (
                  <div className="text-center text-[#D4AF37] text-sm font-medium">
                    <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin inline-block mr-1" />
                    {t('gallery.aiCreationDrawer.processing')}
                  </div>
                )}
                
                {isGeneratingImage && (
                  <div className="text-center text-[#D4AF37] text-sm font-medium animate-pulse">
                    <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin inline-block mr-1" />
                    {t('gallery.aiCreationDrawer.generatingImage')}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center text-[#9ca3af] text-xs space-y-2 flex-shrink-0 pb-2">
                <p><strong className="text-white">Tip:</strong> {t('gallery.aiCreationDrawer.tips.voice')}</p>
                <p><strong className="text-white">Keyboard:</strong> {t('gallery.aiCreationDrawer.tips.keyboard')}</p>
                <p>{t('gallery.aiCreationDrawer.tips.specific')}</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Login Modals */}
        {showLoginModal && !isLoggedIn && (
          <Dialog 
            open={showLoginModal} 
            onOpenChange={(open) => {
              setShowLoginModal(open);
              if (!open) {
                hasShownLoginPrompt.current = false;
                // Navigation is handled by LoginScreen's closeBehavior
                navigate('/');
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-transparent border-0 p-0">
              <LoginScreen
                onEmailLoginClick={handleShowEmailLogin}
                onRegisterClick={handleShowRegister}
                loading={authLoading}
                closeBehavior="navigateToHome"
                onClose={() => {
                  setShowLoginModal(false);
                  hasShownLoginPrompt.current = false;
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {showRegisterModal && (
          <Dialog 
            open={showRegisterModal} 
            onOpenChange={(open) => {
              setShowRegisterModal(open);
              if (!open) {
                hasShownLoginPrompt.current = false;
                navigate('/');
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-transparent border-0 p-0">
              <RegisterScreen
                onRegister={handleRegister}
                onBackToLogin={handleBackToLogin}
                loading={authLoading}
                onClose={() => {
                  setShowRegisterModal(false);
                  hasShownLoginPrompt.current = false;
                  navigate('/');
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {showEmailLoginModal && (
          <Dialog 
            open={showEmailLoginModal} 
            onOpenChange={(open) => {
              setShowEmailLoginModal(open);
              if (!open) {
                hasShownLoginPrompt.current = false;
                navigate('/');
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-transparent border-0 p-0">
              <EmailLoginScreen
                onEmailLogin={handleEmailLogin}
                onBackToLogin={handleBackToLogin}
                loading={authLoading}
                onClose={() => {
                  setShowEmailLoginModal(false);
                  hasShownLoginPrompt.current = false;
                  navigate('/');
                }}
              />
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
};

export default Creation;
