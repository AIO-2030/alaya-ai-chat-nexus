import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Download, Upload, Palette, RotateCcw, RotateCw, Grid3X3, Pen, Eraser, PaintBucket, Pipette, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppSidebar } from '../components/AppSidebar';
import { PageLayout } from '../components/PageLayout';

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
  
  // Basic creation info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
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

  const handleSave = () => {
    // Export as PNG data URL
    const display = displayRef.current;
    if (display) {
      const dataUrl = display.toDataURL('image/png');
      console.log('Saving creation:', { 
        title, 
        description, 
        cols,
        rows,
        palette,
        pixels: Array.from(pixels),
        dataUrl
      });
    }
    navigate('/gallery');
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
    else if (tool === "eraser") setPixel(x, y, 0);
    else if (tool === "picker") setColorIdx(getPixel(x, y));
    else if (tool === "fill") floodFill(x, y, getPixel(x, y), colorIdx);

    pushHistory();
  }, [eventToCell, tool, colorIdx, setPixel, getPixel, floodFill, pushHistory]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = eventToCell(e);
    const last = lastPosRef.current;

    if ((tool === "pen" || tool === "eraser") && last) {
      const color = tool === "pen" ? colorIdx : 0;
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
  }, [eventToCell, tool, colorIdx, setPixel]);

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
    const bctx = buffer.getContext("2d")!;
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

    // Scale to display - Maximize canvas to fill all available space
    const container = display.parentElement;
    let currentScale = scale;
    
    if (container) {
      // Get container dimensions
      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 16; // Minimal padding
      const maxHeight = containerRect.height - 16;
      
      // Calculate maximum possible scale to fill the container completely
      const scaleX = Math.floor(maxWidth / cols);
      const scaleY = Math.floor(maxHeight / rows);
      // Use the smaller scale to ensure canvas fits, then maximize it
      currentScale = Math.min(scaleX, scaleY);
      
      // Ensure minimum scale for visibility but allow very large scales
      currentScale = Math.max(currentScale, 8);
    }
    
    display.width = cols * currentScale;
    display.height = rows * currentScale;
    display.style.width = `${cols * currentScale}px`;
    display.style.height = `${rows * currentScale}px`;
    
    const dctx = display.getContext("2d")!;
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
    <PageLayout>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
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

        <div className="flex h-[calc(100vh-65px)] w-full">
          {/* Sidebar for desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="h-full p-2 md:p-4">
              <div className="h-full rounded-2xl bg-white/5 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col">
                
                {/* Creation Header */}
                <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Back Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm p-2 sm:p-3"
                      onClick={handleBackToGallery}
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    
                    {/* Title */}
                    <div className="flex-1">
                      <h1 className="text-lg sm:text-xl font-bold text-white">{t('gallery.create')}</h1>
                    </div>

                    {/* Save Button */}
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('userManagement.save')}
                    </Button>
                  </div>
                </div>

                {/* Pixel Editor Content */}
                <div className="flex-1 min-h-0 flex flex-col">
                  
                  {/* Canvas Area - Main Drawing Space */}
                  <div className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 m-2 mb-0 rounded-t-xl overflow-hidden min-h-0">
                    <div className="h-full w-full flex items-center justify-center p-1">
                      <canvas
                        ref={displayRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="border border-white/20 rounded bg-white/5 shadow-lg"
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

                  {/* Bottom Control Panel - Compact Layout */}
                  <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm border-t border-white/20 m-2 mt-0 rounded-b-xl">
                    
                    {/* Drawing Tools Row */}
                    <div className="flex items-center justify-center gap-3 p-3 pb-2">
                        {/* Undo/Redo */}
                        <div className="flex gap-2 bg-white/5 rounded-lg p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={undo}
                            disabled={histIndex <= 0}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={redo}
                            disabled={histIndex >= history.length - 1}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-2"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Main Tools */}
                        <div className="flex gap-2 bg-white/5 rounded-lg p-2">
                          <Button
                            variant={tool === "pen" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("pen")}
                            className={`p-2 ${tool === "pen" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={tool === "eraser" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("eraser")}
                            className={`p-2 ${tool === "eraser" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <Eraser className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={tool === "fill" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("fill")}
                            className={`p-2 ${tool === "fill" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <PaintBucket className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={tool === "picker" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool("picker")}
                            className={`p-2 ${tool === "picker" ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white" : "bg-white/5 border-white/20 text-white hover:bg-white/10"}`}
                          >
                            <Pipette className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* View Controls */}
                        <div className="flex gap-2 bg-white/5 rounded-lg p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => clamp(s - 1, 1, 40))}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-2"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-2 bg-white/5 rounded border border-white/20 text-white text-sm min-w-[60px] text-center">
                            {scale}x
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScale(s => clamp(s + 1, 1, 40))}
                            className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-2"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Grid Toggle */}
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                          <Grid3X3 className="h-4 w-4 text-white/60" />
                          <Switch
                            checked={showGrid}
                            onCheckedChange={setShowGrid}
                            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-purple-500"
                          />
                        </div>
                      </div>

                    {/* Color Palette Row */}
                    <div className="flex items-center justify-center gap-4 p-3 pt-2">
                      <div className="flex gap-2 bg-white/5 rounded-lg p-2">
                        {palette.map((hex, i) => (
                          <button
                            key={i}
                            onClick={() => setColorIdx(i)}
                            className={`w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                              i === colorIdx ? 'border-cyan-400 shadow-lg shadow-cyan-400/30' : 'border-white/30 hover:border-white/60'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={`Color ${i}: ${hex}`}
                          />
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPalette([...palette, "#ff0000"])}
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10 p-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                    
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Creation;
