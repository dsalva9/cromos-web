'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/toast';
import { processImageBeforeUpload } from '@/lib/images/processImageBeforeUpload';

interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, fileName: string) => void;
}

export function CameraCaptureModal({
  open,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Start camera stream
  useEffect(() => {
    if (!open) {
      // Clean up
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setCapturedImage(null);
      setPermissionDenied(false);
      return;
    }

    // Don't start camera if already running
    if (stream) {
      return;
    }

    let isMounted = true;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Rear camera on mobile
          audio: false,
        });

        if (!isMounted) {
          // Component unmounted, stop tracks
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Camera error:', error);
        if (isMounted) {
          setPermissionDenied(true);
          toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
        }
      }
    }

    void startCamera();

    return () => {
      isMounted = false;
    };
  }, [open, stream]);

  // Capture photo
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Confirm and process
  const handleConfirm = async () => {
    if (!capturedImage) return;

    setProcessing(true);

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });

      // Process image
      const result = await processImageBeforeUpload(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        convertToWebP: true,
        quality: 0.85,
      });

      const fileName = `photo-${Date.now()}.webp`;
      onCapture(result.blob, fileName);
      onClose();
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Error al procesar la foto');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <div className="relative bg-black">
          {permissionDenied ? (
            <div className="p-8 text-center">
              <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">
                Permiso de cámara denegado
              </h3>
              <p className="text-gray-400 mb-4">
                Para usar la cámara, habilita los permisos en la configuración de tu
                navegador.
              </p>
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          ) : capturedImage ? (
            // Preview captured image
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Captura"
                className="w-full h-auto max-h-[500px] object-contain"
              />
              <div className="flex gap-4 p-4 bg-gray-900">
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  className="flex-1"
                  disabled={processing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Repetir
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-[#FFC000] text-black hover:bg-yellow-400"
                  disabled={processing}
                >
                  {processing ? 'Procesando...' : 'Usar foto'}
                </Button>
              </div>
            </div>
          ) : (
            // Live camera view
            <div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[500px] object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-4 p-4 bg-gray-900">
                <Button onClick={onClose} variant="outline" className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleCapture}
                  className="flex-1 bg-[#FFC000] text-black hover:bg-yellow-400"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
