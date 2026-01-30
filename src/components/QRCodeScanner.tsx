import React, { useRef, useEffect, useState } from 'react';
import { QrCode, X, AlertCircle, CheckCircle, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import QrScanner from 'qr-scanner';

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose, isOpen }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'file' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser.');
      }

      // Check permissions policy
      if (typeof navigator.permissions !== 'undefined') {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permissionStatus.state === 'denied') {
            throw new Error('Camera permission denied by browser permissions policy.');
          }
        } catch (permErr) {
          // Permission query might not be supported, continue anyway
          console.log('Permission query not supported, continuing...');
        }
      }

      // Create QR scanner instance
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          setSuccess(true);
          setIsScanning(false);
          onScan(result.data);
          
          // Show success message briefly
          setTimeout(() => {
            setSuccess(false);
            onClose();
          }, 1500);
        },
        {
          onDecodeError: (error) => {
            // Ignore decode errors - they're normal during scanning
            console.log('QR decode error (normal during scanning):', error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
        }
      );

      // Start scanning
      await qrScannerRef.current.start();
      
    } catch (err: any) {
      console.error('Error starting QR scanner:', err);
      
      let errorMessage = t('common.qrCodeScanErrorDesc');
      
      if (err.name === 'NotAllowedError' || (err.message && err.message.includes('permission')) || (err.message && err.message.includes('Permissions policy'))) {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError' || (err.message && err.message.includes('No camera')) || (err.message && err.message.includes('Camera not found'))) {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotSupportedError' || (err.message && err.message.includes('not supported'))) {
        errorMessage = 'Camera access not supported in this browser.';
      } else if (err.name === 'NotReadableError' || (err.message && err.message.includes('in use'))) {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.message && err.message.includes('Permissions policy violation')) {
        errorMessage = 'Camera access is blocked by browser permissions policy. Please check your browser settings or contact the administrator.';
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  // Check if file access is available
  const checkFileAccess = (): boolean => {
    // Check if File API is supported
    if (typeof File === 'undefined' || typeof FileReader === 'undefined') {
      return false;
    }
    
    // Check if input type="file" is supported
    const input = document.createElement('input');
    input.type = 'file';
    if (input.type !== 'file') {
      return false;
    }
    
    return true;
  };

  // Handle file selection and scanning
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      // User cancelled file selection
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIsScanning(true);

    try {
      // Check file access support
      if (!checkFileAccess()) {
        throw new Error(t('common.fileAccessNotSupported'));
      }

      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        throw new Error(t('common.pleaseSelectImageFile'));
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(t('common.fileTooLarge'));
      }

      // Check if file can be read
      if (file.size === 0) {
        throw new Error(t('common.cannotReadFile'));
      }

      // Use QrScanner.scanImage to scan the file
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });

      if (result && result.data) {
        console.log('QR Code detected from file:', result.data);
        setSuccess(true);
        setIsScanning(false);
        onScan(result.data);
        
        // Show success message briefly
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        throw new Error('No QR code found in the image. Please try another image.');
      }
    } catch (err: any) {
      console.error('Error scanning QR code from file:', err);
      setIsScanning(false);
      
      let errorMessage = t('common.qrCodeScanErrorDesc');
      
      if (err.name === 'SecurityError' || err.message?.includes('permission') || err.message?.includes('access')) {
        errorMessage = t('common.cannotAccessFile');
      } else if (err.name === 'NotReadableError' || err.message?.includes('read')) {
        errorMessage = t('common.cannotReadFileError');
      } else if (err.message && err.message.includes('No QR code')) {
        errorMessage = t('common.noQRCodeFound');
      } else if (err.message && (err.message.includes('图片') || err.message.includes('image') || err.message.includes('File access'))) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setScanMode(null);
      setSelectedFile(null);
      setError(null);
      setSuccess(false);
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      startScanning();
    } else if (scanMode !== 'camera') {
      stopScanning();
    }
    
    return () => {
      if (scanMode === 'camera') {
        stopScanning();
      }
    };
  }, [isOpen, scanMode]);

  if (!isOpen) return null;

  // Show mode selection if no mode is selected
  if (!scanMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full shadow-2xl" style={{ WebkitFontSmoothing: 'antialiased' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-cyan-400" />
              <h3 className="text-white font-semibold text-base" style={{ WebkitFontSmoothing: 'antialiased' }}>{t('common.scanQRCode')}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/90 hover:text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Mode Selection */}
          <div className="p-6">
            <p className="text-white text-sm mb-4 text-center font-medium" style={{ WebkitFontSmoothing: 'antialiased' }}>
              {t('common.selectScanMode')}
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setScanMode('file')}
                className="w-full bg-[#1E3A5F] hover:bg-[#4A2C5A] text-white border-2 border-white/20 hover:border-white/30 h-12 flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(30,58,95,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_24px_rgba(30,58,95,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                <ImageIcon className="h-5 w-5" />
                <span>{t('common.selectFromGallery')}</span>
              </Button>
              <Button
                onClick={() => setScanMode('camera')}
                className="w-full bg-[#4A2C5A] hover:bg-[#1E3A5F] text-white border-2 border-white/20 hover:border-white/30 h-12 flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(74,44,90,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_24px_rgba(74,44,90,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                <Camera className="h-5 w-5" />
                <span>{t('common.useCameraScan')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full shadow-2xl" style={{ WebkitFontSmoothing: 'antialiased' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-cyan-400" />
            <h3 className="text-white font-semibold text-base" style={{ WebkitFontSmoothing: 'antialiased' }}>
              {scanMode === 'camera' ? t('common.cameraScan') : t('common.imageRecognition')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopScanning();
                setScanMode(null);
                setError(null);
                setSelectedFile(null);
              }}
              className="text-white/90 hover:text-white hover:bg-white/20"
              title={t('common.switchMode')}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/90 hover:text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {/* Hidden file input */}
          {scanMode === 'file' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="qr-file-input"
              capture="environment"
            />
          )}

          {scanMode === 'file' && !selectedFile && !isScanning && (
            <div className="mb-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#1E3A5F] hover:bg-[#4A2C5A] text-white border-2 border-white/20 hover:border-white/30 h-12 flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(30,58,95,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_24px_rgba(30,58,95,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                <ImageIcon className="h-5 w-5" />
                <span>{t('common.selectImage')}</span>
              </Button>
            </div>
          )}

          {scanMode === 'file' && selectedFile && (
            <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/10">
              <p className="text-white text-sm mb-2 font-medium" style={{ WebkitFontSmoothing: 'antialiased' }}>{t('common.fileSelected')}</p>
              <p className="text-white/90 text-sm truncate" style={{ WebkitFontSmoothing: 'antialiased' }}>{selectedFile.name}</p>
            </div>
          )}

          {scanMode === 'camera' && (
            <>
          <div className="relative bg-black rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-cyan-400 rounded-lg relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg"></div>
              </div>
            </div>

            {/* Status Messages */}
            {success && (
              <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                <div className="bg-green-500 border border-green-400/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg" style={{ WebkitFontSmoothing: 'antialiased' }}>
                  <CheckCircle className="h-4 w-4" />
                  {t('common.qrCodeScannedSuccess')}
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                <div className="bg-red-500 border border-red-400/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg" style={{ WebkitFontSmoothing: 'antialiased' }}>
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center text-white/60 text-sm mb-4">
            {t('common.scanQRCodePlaceholder')}
          </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-[#1a1a1a] border-white/15 text-white hover:bg-[#252525] hover:border-white/25 font-medium transition-all duration-200"
                style={{ WebkitFontSmoothing: 'antialiased' }}
              >
                {t('common.cancel')}
              </Button>
              {!isScanning && !success && (
                <Button
                  onClick={startScanning}
                  className="flex-1 bg-[#4A2C5A] hover:bg-[#1E3A5F] text-white border-2 border-white/20 hover:border-white/30 font-medium transition-all duration-200 shadow-[0_4px_16px_rgba(74,44,90,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_24px_rgba(74,44,90,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  style={{ WebkitFontSmoothing: 'antialiased' }}
                >
                  {error ? t('common.retryCamera') : t('common.scanQRCode')}
                </Button>
              )}
            </div>
            
            {/* Permission Help */}
            {error && (error.includes('permission') || error.includes('denied') || error.includes('Permissions policy')) && (
              <div className="mt-3 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                <div className="text-yellow-400 text-xs">
                  <strong>{t('common.cameraPermissionRequired')}</strong>
                  <br />
                  1. {t('common.cameraPermissionStep1')}
                  <br />
                  2. {t('common.cameraPermissionStep2')}
                  <br />
                  3. {t('common.cameraPermissionStep3')}
                  <br />
                  4. {t('common.cameraPermissionStep4')}
                </div>
              </div>
            )}
            
            {/* Camera Not Found Help */}
            {error && error.includes('No camera') && (
              <div className="mt-3 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                <div className="text-red-400 text-xs">
                  <strong>{t('common.cameraNotFound')}</strong>
                  <br />
                  1. {t('common.cameraNotFoundStep1')}
                  <br />
                  2. {t('common.cameraNotFoundStep2')}
                  <br />
                  3. {t('common.cameraNotFoundStep3')}
                </div>
              </div>
            )}
            </>
          )}

          {/* File scanning status */}
          {scanMode === 'file' && isScanning && (
            <div className="relative bg-black rounded-lg overflow-hidden mb-4 h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-sm font-medium" style={{ WebkitFontSmoothing: 'antialiased' }}>{t('common.recognizingQRCode')}</p>
              </div>
            </div>
          )}

          {/* File scanning success/error overlay */}
          {scanMode === 'file' && (
            <>
              {success && (
                <div className="relative bg-black rounded-lg overflow-hidden mb-4 h-64 flex items-center justify-center">
                  <div className="bg-green-500/20 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">{t('common.qrCodeScannedSuccess')}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="relative bg-black rounded-lg overflow-hidden mb-4 h-64 flex items-center justify-center">
                  <div className="bg-red-500/30 border border-red-400/40 rounded-lg p-4 flex items-center gap-2" style={{ WebkitFontSmoothing: 'antialiased' }}>
                    <AlertCircle className="h-5 w-5 text-red-300" />
                    <span className="text-white text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Instructions */}
          {scanMode === 'camera' && (
            <div className="text-center text-white/90 text-sm mb-4 font-medium" style={{ WebkitFontSmoothing: 'antialiased' }}>
              {t('common.scanQRCodePlaceholder')}
            </div>
          )}

          {scanMode === 'file' && !isScanning && !success && (
            <div className="text-center text-white/90 text-sm mb-4 font-medium" style={{ WebkitFontSmoothing: 'antialiased' }}>
              {t('common.selectQRImageFile')}
            </div>
          )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (scanMode === 'camera') {
                    stopScanning();
                  }
                  setScanMode(null);
                  setError(null);
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                variant="outline"
                className="flex-1 bg-[#1a1a1a] border-white/15 text-white hover:bg-[#252525] hover:border-white/25 font-medium transition-all duration-200"
                style={{ WebkitFontSmoothing: 'antialiased' }}
              >
                {t('common.goBack')}
              </Button>
              {scanMode === 'camera' && !isScanning && !success && (
                <Button
                  onClick={startScanning}
                  className="flex-1 bg-[#4A2C5A] hover:bg-[#1E3A5F] text-white border-2 border-white/20 hover:border-white/30 font-medium transition-all duration-200 shadow-[0_4px_16px_rgba(74,44,90,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_24px_rgba(74,44,90,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  style={{ WebkitFontSmoothing: 'antialiased' }}
                >
                  {error ? t('common.retryCamera') : t('common.scanQRCode')}
                </Button>
              )}
              {scanMode === 'file' && !isScanning && !success && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-[#1E3A5F] hover:bg-[#4A2C5A] text-white border-2 border-white/20 hover:border-white/30 font-medium transition-all duration-200 shadow-[0_4px_16px_rgba(30,58,95,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_24px_rgba(30,58,95,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  style={{ WebkitFontSmoothing: 'antialiased' }}
                >
                  {selectedFile ? t('common.reselect') : t('common.selectImage')}
                </Button>
              )}
            </div>
            
            {/* Permission Help */}
            {scanMode === 'camera' && error && (error.includes('permission') || error.includes('denied') || error.includes('Permissions policy')) && (
              <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/40 rounded-lg" style={{ WebkitFontSmoothing: 'antialiased' }}>
                <div className="text-yellow-300 text-sm leading-relaxed">
                  <strong className="font-semibold text-yellow-200">{t('common.cameraPermissionRequired')}</strong>
                  <br />
                  <span className="text-yellow-300/90">1. {t('common.cameraPermissionStep1')}</span>
                  <br />
                  <span className="text-yellow-300/90">2. {t('common.cameraPermissionStep2')}</span>
                  <br />
                  <span className="text-yellow-300/90">3. {t('common.cameraPermissionStep3')}</span>
                  <br />
                  <span className="text-yellow-300/90">4. {t('common.cameraPermissionStep4')}</span>
                </div>
              </div>
            )}
            
            {/* Camera Not Found Help */}
            {scanMode === 'camera' && error && error.includes('No camera') && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-400/40 rounded-lg" style={{ WebkitFontSmoothing: 'antialiased' }}>
                <div className="text-red-300 text-sm leading-relaxed">
                  <strong className="font-semibold text-red-200">{t('common.cameraNotFound')}</strong>
                  <br />
                  <span className="text-red-300/90">1. {t('common.cameraNotFoundStep1')}</span>
                  <br />
                  <span className="text-red-300/90">2. {t('common.cameraNotFoundStep2')}</span>
                  <br />
                  <span className="text-red-300/90">3. {t('common.cameraNotFoundStep3')}</span>
                </div>
              </div>
            )}

            {/* File scan error help */}
            {scanMode === 'file' && error && (
              <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/40 rounded-lg" style={{ WebkitFontSmoothing: 'antialiased' }}>
                <div className="text-yellow-300 text-sm leading-relaxed">
                  <strong className="font-semibold text-yellow-200">{t('common.tips')}</strong>
                  <br />
                  {error.includes('权限') || error.includes('access') || error.includes('permission') ? (
                    <>
                      <span className="text-yellow-300/90">1. {t('common.filePermissionTip1')}</span>
                      <br />
                      <span className="text-yellow-300/90">2. {t('common.filePermissionTip2')}</span>
                      <br />
                      <span className="text-yellow-300/90">3. {t('common.filePermissionTip3')}</span>
                      <br />
                      <span className="text-yellow-300/90">4. {t('common.filePermissionTip4')}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-300/90">1. {t('common.fileScanTip1')}</span>
                      <br />
                      <span className="text-yellow-300/90">2. {t('common.fileScanTip2')}</span>
                      <br />
                      <span className="text-yellow-300/90">3. {t('common.fileScanTip3')}</span>
                      <br />
                      <span className="text-yellow-300/90">4. {t('common.fileScanTip4')}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* File access permission info */}
            {scanMode === 'file' && !error && !isScanning && !success && (
              <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/40 rounded-lg" style={{ WebkitFontSmoothing: 'antialiased' }}>
                <div className="text-blue-300 text-sm leading-relaxed">
                  <strong className="font-semibold text-blue-200">{t('common.usageInstructions')}</strong>
                  <br />
                  <span className="text-blue-300/90">1. {t('common.usageStep1')}</span>
                  <br />
                  <span className="text-blue-300/90">2. {t('common.usageStep2')}</span>
                  <br />
                  <span className="text-blue-300/90">3. {t('common.usageStep3')}</span>
                  <br />
                  <span className="text-blue-300/90">4. {t('common.usageStep4')}</span>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
