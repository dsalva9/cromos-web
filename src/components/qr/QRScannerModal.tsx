'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { ScanLine, X, Flashlight, FlashlightOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from '@/hooks/use-router';
import { useLocale } from 'next-intl';
import { toast } from '@/lib/toast';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MATCH_PATH_RE = /\/match\/([^/?]+)\/([^/?]+)/;

export function QRScannerModal({ open, onOpenChange }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const torchRef = useRef<boolean>(false);
  const lastToastRef = useRef<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanning, setScanning] = useState(false);

  const router = useRouter();
  const locale = useLocale();

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleResult = useCallback((url: string) => {
    stopCamera();
    onOpenChange(false);

    // Extract userId / copyId from a match URL
    const m = MATCH_PATH_RE.exec(url);
    if (m) {
      const [, userId, copyId] = m;
      // Preserve any query params that were in the scanned URL
      const qp = url.includes('?') ? url.slice(url.indexOf('?')) : '';
      window.location.href = `/${locale}/match/${userId}/${copyId}${qp}`;
      return;
    }

    // Non-CambioCromos QR — just try navigating to the URL if it's ours
    if (url.includes('cambiocromos.com') || url.includes('localhost')) {
      window.location.href = url;
    } else {
      const now = Date.now();
      if (now - lastToastRef.current > 2000) {
        lastToastRef.current = now;
        toast.error('Este QR no es de CambioCromos');
      }
      // Restart scanning after toast
      setTimeout(() => {
        if (streamRef.current) setScanning(true);
      }, 2000);
    }
  }, [stopCamera, onOpenChange, locale]);

  const startScanning = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setScanning(true);

    const tick = () => {
      if (!streamRef.current) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code?.data) {
          handleResult(code.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [handleResult]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(!!caps.torch);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = startScanning;
      }
    } catch (err) {
      if ((err as Error)?.name === 'NotAllowedError') {
        setError('No se pudo acceder a la cámara. Comprueba los permisos en tu dispositivo.');
      } else {
        setError('No se pudo iniciar la cámara.');
      }
    }
  }, [startScanning]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const newVal = !torchRef.current;
    torchRef.current = newVal;
    setTorch(newVal);
    try {
      // @ts-expect-error — torch is not in standard TS types yet
      await track.applyConstraints({ advanced: [{ torch: newVal }] });
    } catch {
      // silently ignore if not supported
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setError(null);
      setTorch(false);
      torchRef.current = false;
    }
    return stopCamera;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-black border-gray-800">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-white">
            <ScanLine className="w-5 h-5 text-gold" />
            Escanear QR
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black" style={{ aspectRatio: '1 / 1' }}>
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-white text-sm">{error}</p>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300 hover:text-white"
                onClick={startCamera}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              {/* Hidden canvas used for QR decoding */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Video preview */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Dark vignette */}
                <div className="absolute inset-0 bg-black/40" style={{
                  maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, black 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, black 100%)',
                }} />
                {/* Corner brackets */}
                <div className="relative w-48 h-48">
                  {[
                    'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                    'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                    'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                    'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-gold ${cls}`} />
                  ))}
                  {/* Scanning line */}
                  {scanning && (
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gold/70 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Hint text */}
              <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/70">
                Apunta la cámara al QR de otro coleccionista
              </p>

              {/* Torch button */}
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label={torch ? 'Apagar linterna' : 'Encender linterna'}
                >
                  {torch
                    ? <FlashlightOff className="w-5 h-5" />
                    : <Flashlight className="w-5 h-5" />
                  }
                </button>
              )}
            </>
          )}
        </div>

        {/* Close button */}
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
