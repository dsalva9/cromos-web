'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Share2, Copy, Check, X } from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { track } from '@vercel/analytics/react';
import { logger } from '@/lib/logger';
import { shareContent, getWhatsAppShareUrl, getTelegramShareUrl } from '@/lib/share';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/social-icons';
import { isNative } from '@/lib/platform';

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
  const [showShareFallback, setShowShareFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const qrUrl = `${siteConfig.url}/match/${userId}/${copyId}?name=${encodeURIComponent(nickname)}&album=${encodeURIComponent(copyTitle)}`;

  // Reset fallback state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setShowShareFallback(false);
      setCopied(false);
    }
  }, [open]);

  // ── Analytics: track QR modal open (fire-and-forget) ───────────────────────
  const trackedRef = useRef(false);
  useEffect(() => {
    if (open && !trackedRef.current) {
      trackedRef.current = true;
      track('trade_qr_generated', { copy_id: String(copyId), copy_title: copyTitle });
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from('analytics_events' as any).insert({
        event_name: 'trade_qr_generated',
        user_id: userId,
        metadata: { copy_id: copyId, copy_title: copyTitle },
      }).then(() => {});
    }
    if (!open) trackedRef.current = false;
  }, [open, userId, copyId, copyTitle]);

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
      logger.error('QR generation failed', { error: err });
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

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  }, [qrUrl]);

  const handleShare = useCallback(async () => {
    if (!qrDataUrl) return;
    setSharing(true);
    try {
      // On web browsers (not native Capacitor), convert dataUrl to File for platforms supporting file sharing
      let file: File | undefined;
      if (typeof window !== 'undefined' && !isNative()) {
        try {
          const res = await fetch(qrDataUrl);
          const blob = await res.blob();
          file = new File([blob], 'qr-intercambio.png', { type: 'image/png' });
        } catch {
          // Ignore file conversion errors and proceed with URL sharing
        }
      }

      const shareTitle = `Intercambio ${copyTitle}`;
      const shareMessage = `¡Hola! Mira qué cromos de ${copyTitle} podemos intercambiar en CambioCromos:`;

      const result = await shareContent({
        title: shareTitle,
        text: `${shareMessage}\n${qrUrl}`,
        url: qrUrl,
        dialogTitle: 'Compartir enlace de intercambio',
        files: file ? [file] : undefined,
      });

      // If native sharing succeeded or user intentionally aborted the share sheet, stop here
      if (result.success || result.method === 'aborted') {
        return;
      }

      // If native sharing is unsupported (e.g. desktop or older native app build without plugin),
      // copy the link to clipboard AND show direct WhatsApp / Telegram sharing options
      setShowShareFallback(true);
      await navigator.clipboard.writeText(qrUrl).catch(() => null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Enlace copiado. Elige dónde compartirlo:');
    } finally {
      setSharing(false);
    }
  }, [qrDataUrl, qrUrl, copyTitle]);

  const shareTextForApps = `¡Hola! Mira qué cromos de ${copyTitle} podemos intercambiar en CambioCromos:`;

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
            disabled={!qrDataUrl || sharing}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir
          </Button>
        </div>

        {/* Fallback share channels when native share is unavailable */}
        {showShareFallback && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Compartir por:
              </span>
              <button
                type="button"
                onClick={() => setShowShareFallback(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition-colors"
                aria-label="Cerrar opciones de compartir"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={getWhatsAppShareUrl(qrUrl, shareTextForApps)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all font-medium text-xs gap-1"
              >
                <WhatsAppIcon className="w-5 h-5" />
                WhatsApp
              </a>
              <a
                href={getTelegramShareUrl(qrUrl, shareTextForApps)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#26A5E4]/10 text-[#26A5E4] hover:bg-[#26A5E4]/20 transition-all font-medium text-xs gap-1"
              >
                <TelegramIcon className="w-5 h-5" />
                Telegram
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all font-medium text-xs gap-1"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* URL hint with click to copy */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-center text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 truncate px-2 cursor-pointer transition-colors block w-full text-left"
          title="Haz clic para copiar"
        >
          {qrUrl}
        </button>
      </DialogContent>
    </Dialog>
  );
}
