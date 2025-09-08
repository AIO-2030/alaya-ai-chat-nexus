import React, { useRef, useEffect, useState } from 'react';
import { QrCode, X, AlertCircle, CheckCircle } from 'lucide-react';
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
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      
      if (err.name === 'NotAllowedError' || (err.message && err.message.includes('permission'))) {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError' || (err.message && err.message.includes('No camera'))) {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotSupportedError' || (err.message && err.message.includes('not supported'))) {
        errorMessage = 'Camera access not supported in this browser.';
      } else if (err.name === 'NotReadableError' || (err.message && err.message.includes('in use'))) {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.message && err.message.includes('Camera not found')) {
        errorMessage = 'No camera found. Please connect a camera and try again.';
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

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-cyan-400" />
            <h3 className="text-white font-semibold">{t('common.scanQRCode')}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
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
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <div className="bg-green-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('common.qrCodeScannedSuccess')}
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2">
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
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                {t('common.cancel')}
              </Button>
              {!isScanning && !success && (
                <Button
                  onClick={startScanning}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                >
                  {error ? 'Retry Camera Access' : t('common.scanQRCode')}
                </Button>
              )}
            </div>
            
            {/* Permission Help */}
            {error && (error.includes('permission') || error.includes('denied')) && (
              <div className="mt-3 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                <div className="text-yellow-400 text-xs">
                  <strong>Camera Permission Required:</strong>
                  <br />
                  1. Click the camera icon in your browser's address bar
                  <br />
                  2. Select "Allow" for camera access
                  <br />
                  3. Refresh the page and try again
                </div>
              </div>
            )}
            
            {/* Camera Not Found Help */}
            {error && error.includes('No camera') && (
              <div className="mt-3 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                <div className="text-red-400 text-xs">
                  <strong>Camera Not Found:</strong>
                  <br />
                  1. Make sure your device has a camera
                  <br />
                  2. Check if another application is using the camera
                  <br />
                  3. Try refreshing the page
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
