'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { siteConfig } from '@/config/site';
import { toast } from '@/lib/toast';

interface TradeQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  copyId: number;
  copyTitle: string;
  nickname: string;
}

export function TradeQRModal({
  open,
  onOpenChange,
  userId,
  copyId,
  copyTitle,
  nickname,
}: TradeQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const qrUrl = `${siteConfig.url}/match/${userId}/${copyId}?name=${encodeURIComponent(nickname)}&album=${encodeURIComponent(copyTitle)}`;

  const generateQR = useCallback(async () => {
    if (!canvasRef.current) return;
    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('QR generation failed', err);
    } finally {
      setGenerating(false);
    }
  }, [qrUrl]);

  useEffect(() => {
    if (open) {
      // Small delay so the dialog has mounted and canvas is in the DOM
      const t = setTimeout(generateQR, 80);
      return () => clearTimeout(t);
    } else {
      setQrDataUrl(null);
    }
  }, [open, generateQR]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-intercambio-${copyTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.click();
  }, [qrDataUrl, copyTitle]);

  const handleShare = useCallback(async () => {
    if (!qrDataUrl) return;
    try {
      if (navigator.share && navigator.canShare) {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'qr-intercambio.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Intercambio ${copyTitle}`,
            text: `Escanea este QR para intercambiar cromos de ${copyTitle} conmigo en CambioCromos`,
          });
          return;
        }
      }
      // Fallback: copy URL to clipboard
      await navigator.clipboard.writeText(qrUrl);
      toast.success('Enlace copiado al portapapeles');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        await navigator.clipboard.writeText(qrUrl).catch(() => null);
        toast.success('Enlace copiado al portapapeles');
      }
    }
  }, [qrDataUrl, qrUrl, copyTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <QrCode className="w-5 h-5 text-gold" />
            Tu QR de intercambio
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Muestra este código a otro coleccionista para ver qué cromos podéis intercambiar.
          </DialogDescription>
        </DialogHeader>

        {/* Album title */}
        <p className="text-center text-sm font-bold text-gray-700 dark:text-gray-300 -mt-1 truncate px-2">
          {copyTitle}
        </p>

        {/* QR canvas */}
        <div className="flex justify-center py-2">
          <div className="rounded-2xl border-4 border-gold p-2 bg-white shadow-lg relative">
            <canvas
              ref={canvasRef}
              className={generating ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
              style={{ display: 'block' }}
            />
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 -mt-1">
          Escanea para intercambiar con <span className="font-bold text-gray-600 dark:text-gray-300">{nickname}</span>
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            className="flex-1 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            onClick={handleDownload}
            disabled={!qrDataUrl}
          >
            <Download className="w-4 h-4 mr-2" />
            Guardar
          </Button>
          <Button
            className="flex-1 bg-gold text-black hover:bg-yellow-400 font-bold"
            onClick={handleShare}
            disabled={!qrDataUrl}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir
          </Button>
        </div>

        {/* URL hint for desktop */}
        <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 truncate px-2 select-all cursor-text">
          {qrUrl}
        </p>
      </DialogContent>
    </Dialog>
  );
}
