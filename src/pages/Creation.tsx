import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Download, Upload, Palette, RotateCcw, RotateCw, Grid3X3, Pen, Eraser, PaintBucket, Pipette, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { PixelCreationApi, convertImageToPixelArt, ImageImportOptions } from '../services/api/pixelCreationApi';
import { useAuth } from '../lib/auth';
import { useToast } from '../hooks/use-toast';

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
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Basic creation info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Save state management
  const [isSaving, setIsSaving] = useState(false);
  
  // Image import state management
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Color picker state management
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  
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

  const handleSave = async () => {
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
        title: title.trim() || undefined,
        description: description.trim() || undefined,
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
        
        // Navigate back to gallery
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

    // Scale to display - Optimize for mobile screens
    const container = display.parentElement;
    let currentScale = scale;
    
    if (container) {
      // Get container dimensions with minimal padding
      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 8; // Minimal padding for mobile
      const maxHeight = containerRect.height - 8; // Minimal padding for mobile
      
      // Calculate maximum possible scale to fill the container completely
      const scaleX = Math.floor(maxWidth / cols);
      const scaleY = Math.floor(maxHeight / rows);
      // Use the smaller scale to ensure canvas fits completely in container
      currentScale = Math.min(scaleX, scaleY);
      
      // Ensure minimum scale for visibility on mobile (smaller minimum for better fit)
      currentScale = Math.max(currentScale, 6);
      
      // Cap maximum scale to prevent canvas from being too large on small screens
      currentScale = Math.min(currentScale, 20);
    }
    
    display.width = cols * currentScale;
    display.height = rows * currentScale;
    display.style.width = `${cols * currentScale}px`;
    display.style.height = `${rows * currentScale}px`;
    
    const dctx = display.getContext("2d", { willReadFrequently: true })!;
    dctx.imageSmoothingEnabled = false;
    dctx.clearRect(0, 0, display.width, display.height);
    dctx.drawImage(buffer, 0, 0, display.width, display.height);

    // Grid overlay
    if (showGrid && currentScale >= 6) {
      dctx.strokeStyle = "rgba(255,255,255,0.3)";
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
  }, [pixels, cols, rows, scale, palette, showGrid]);

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

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        {/* Neural network pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-blue-400 rounded-full"></div>
          <svg className="absolute inset-0 w-full h-full">
            <line x1="25%" y1="25%" x2="75%" y2="50%" stroke="url(#gradient1)" strokeWidth="1" opacity="0.3"/>
            <line x1="75%" y1="50%" x2="75%" y2="75%" stroke="url(#gradient2)" strokeWidth="1" opacity="0.3"/>
            <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#gradient3)" strokeWidth="1" opacity="0.3"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Header */}
        <AppHeader />

        <div className="flex flex-1 w-full min-h-0">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 p-1 md:p-2 min-h-0">
              <div className="h-full rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
                
                {/* Creation Header - Compact for mobile */}
                <div className="flex-shrink-0 p-2 sm:p-3 md:p-4 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    {/* Back Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-1.5 sm:p-2"
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
                      onClick={handleSave}
                      disabled={isSaving}
                      size="sm"
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">{isSaving ? t('gallery.saving') : t('userManagement.save')}</span>
                      <span className="xs:hidden">{isSaving ? '...' : 'Save'}</span>
                    </Button>
                  </div>
                  
                  {/* Metadata Input Fields - Stacked on mobile */}
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white/80 mb-1">
                        {t('gallery.artTitle')}
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('gallery.titlePlaceholder')}
                        className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-cyan-400 text-sm h-8 sm:h-10"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white/80 mb-1">
                        {t('gallery.artDescription')}
                      </label>
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('gallery.descriptionPlaceholder')}
                        className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-cyan-400 text-sm h-8 sm:h-10"
                        maxLength={200}
                      />
                    </div>
                  </div>
                </div>

                {/* Pixel Editor Content */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  
                  {/* NFT Hero Banner Section - Compact for mobile */}
                  <div className="flex-shrink-0 h-12 sm:h-16 md:h-20 z-10 overflow-hidden relative">
                    {/* Animated background elements */}
                    <div className="absolute inset-0">
                      <div className="absolute top-1 left-2 w-8 h-8 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-lg animate-pulse"></div>
                      <div className="absolute top-2 right-4 w-6 h-6 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-md animate-pulse animation-delay-500"></div>
                      <div className="absolute bottom-1 left-1/3 w-4 h-4 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full blur-sm animate-pulse animation-delay-1000"></div>
                    </div>
                    
                    {/* Main content */}
                    <div className="relative h-full flex items-center justify-center p-2 sm:p-3">
                      <div className="w-full max-w-2xl">
                        {/* Background card */}
                        <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-lg rounded-xl border border-white/30 shadow-xl overflow-hidden">
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
                          
                          {/* Content */}
                          <div className="relative p-1.5 sm:p-2 md:p-3">
                            {/* Icon/Symbol */}
                            <div className="flex justify-center mb-0.5 sm:mb-1">
                              <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-md flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xs">💎</span>
                              </div>
                            </div>
                            
                            {/* Main text */}
                            <div className="text-center">
                              <h2 className="text-white text-xs sm:text-sm font-bold mb-0.5 leading-tight">
                                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent animate-pulse">
                                  {t('nft.mintMessage')}
                                </span>
                              </h2>
                              
                              {/* Subtitle/Description */}
                              <p className="text-white/80 text-xs font-medium">
                                <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                                  ⭐ Create • Mint • Earn ⭐
                                </span>
                              </p>
                            </div>
                            
                            {/* Decorative elements */}
                            <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
                            <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-purple-400 rounded-full animate-ping animation-delay-300"></div>
                            <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-400 rounded-full animate-ping animation-delay-700"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Canvas Area - Main Drawing Space - Optimized for mobile */}
                  <div className="flex-1 min-h-0 bg-white/10 backdrop-blur-sm overflow-hidden">
                    <div className="h-full w-full flex items-center justify-center p-2 sm:p-3 md:p-4 min-h-[150px] sm:min-h-[200px]">
                      <canvas
                        ref={displayRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="bg-white/5 max-w-full max-h-full"
                        style={{
                          imageRendering: 'pixelated',
                          touchAction: 'none',
                          cursor: tool === "pen" ? "crosshair" : 
                                 tool === "eraser" ? "cell" : 
                                 tool === "picker" ? "copy" : "crosshair",
                        }}
                      />
                      {/* Hidden buffer canvas */}
                      <canvas ref={bufferRef} className="hidden" />
                    </div>
                  </div>

                  {/* Bottom Control Panel - Compact for mobile */}
                  <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm border-t border-white/20 max-h-32 sm:max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30 hover:scrollbar-thumb-white/50">
                    
                    {/* Drawing Tools Row - Compact Layout */}
                    <div className="flex flex-wrap items-center justify-center gap-1 p-1.5 sm:p-2">
                        {/* Undo/Redo/Clear/Import - Compact */}
                        <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={undo}
                            disabled={histIndex <= 0}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-1 min-w-0 h-7"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={redo}
                            disabled={histIndex >= history.length - 1}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-1 min-w-0 h-7"
                          >
                            <RotateCw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearCanvas}
                            className="bg-white/5 border-white/20 text-white hover:bg-red-500/20 hover:border-red-400/40 p-1 min-w-0 h-7"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={triggerImageImport}
                            disabled={isImporting}
                            className="bg-white/5 border-white/20 text-white hover:bg-green-500/20 hover:border-green-400/40 p-1 min-w-0 h-7"
                            title="Import Image"
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Main Tools - Compact */}
                        <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
                          <Button
                            variant={tool === "pen" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("pen")}
                            className={`p-1 min-w-0 h-7 ${tool === "pen" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <Pen className="h-3 w-3" />
                          </Button>
                          <Button
                            variant={tool === "eraser" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("eraser")}
                            className={`p-1 min-w-0 h-7 relative ${tool === "eraser" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                            title={`Eraser (erases to ${palette[getEraserColorIndex()]})`}
                          >
                            <Eraser className="h-3 w-3" />
                            {/* Small indicator showing eraser color */}
                            {tool === "eraser" && (
                              <div 
                                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white/50"
                                style={{ backgroundColor: palette[getEraserColorIndex()] }}
                              />
                            )}
                          </Button>
                          <Button
                            variant={tool === "fill" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("fill")}
                            className={`p-1 min-w-0 h-7 ${tool === "fill" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <PaintBucket className="h-3 w-3" />
                          </Button>
                          <Button
                            variant={tool === "picker" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("picker")}
                            className={`p-1 min-w-0 h-7 ${tool === "picker" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <Pipette className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* View Controls - Compact */}
                        <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => clamp(s - 1, 1, 40))}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-1 min-w-0 h-7"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="px-1.5 py-1 bg-white/5 rounded border border-white/20 text-white text-xs min-w-[32px] text-center h-7 flex items-center justify-center">
                            {scale}x
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => clamp(s + 1, 1, 40))}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-1 min-w-0 h-7"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Grid Toggle - Compact */}
                        <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5">
                          <Grid3X3 className="h-3 w-3 text-white/60" />
                          <Switch
                            checked={showGrid}
                            onCheckedChange={setShowGrid}
                            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-purple-500 scale-50"
                          />
                        </div>
                      </div>

                    {/* Color Palette Row - Compact for mobile */}
                    <div className="flex items-center justify-center gap-1 p-1.5 sm:p-2">
                      <div className="flex gap-1 bg-white/5 rounded-md p-1 max-w-full overflow-x-auto">
                        {palette.map((hex, i) => (
                          <button
                            key={i}
                            onClick={() => setColorIdx(i)}
                            onDoubleClick={() => handleColorDoubleClick(i)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 transition-all duration-200 hover:scale-110 flex-shrink-0 ${
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
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-1 min-w-0 flex-shrink-0 h-6"
                        title="Add new color"
                      >
                        <Plus className="h-3 w-3" />
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
          style={{ display: 'none' }}
        />
        
        {/* Hidden color picker input for palette management */}
        <input
          ref={colorPickerRef}
          type="color"
          onChange={handleColorPickerChange}
          style={{ display: 'none' }}
        />
    </div>
  );
};

export default Creation;
