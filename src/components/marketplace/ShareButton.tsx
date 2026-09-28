'use client';

import { useState, useCallback } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { useLocale } from 'next-intl';
import { shareContent, getWhatsAppShareUrl, getTelegramShareUrl, getXShareUrl, getFacebookShareUrl } from '@/lib/share';
import { WhatsAppIcon, XTwitterIcon, TelegramIcon, FacebookIcon } from '@/components/ui/social-icons';

// ── Types ───────────────────────────────────────────────────────────────
interface ShareButtonProps {
  listingId: number;
  listingTitle: string;
  collectionName?: string | null;
  /** 'icon' renders a compact icon button, 'full' shows label too */
  variant?: 'icon' | 'full';
  className?: string;
}

interface ShareTarget {
  key: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  buildUrl: (url: string, text: string) => string;
}

// ── Component ───────────────────────────────────────────────────────────
export function ShareButton({
  listingId,
  listingTitle,
  collectionName,
  variant = 'icon',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const locale = useLocale();

  const shareUrl = `${siteConfig.url}/${locale}/explorar/${listingId}`;

  // Build share text – short and punchy for social
  const shareText = collectionName
    ? `${listingTitle} (${collectionName})`
    : listingTitle;

  const fullShareText = `${shareText} — CambioCromos`;

  // ── Native Share API (mobile / Capacitor) ───────────────────────────
  const handleNativeShare = useCallback(async () => {
    const res = await shareContent({
      title: shareText,
      text: fullShareText,
      url: shareUrl,
      dialogTitle: shareText,
    });
    if (res.method === 'unsupported') {
      setOpen(true);
    }
  }, [shareText, fullShareText, shareUrl]);

  // ── Copy to clipboard ──────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      // Fallback for insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    }
  }, [shareUrl]);

  // ── Share targets (desktop fallback) ───────────────────────────────
  const shareTargets: ShareTarget[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#25D366]/15 text-[#25D366]',
      buildUrl: (url, text) => getWhatsAppShareUrl(url, text),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <TelegramIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#26A5E4]/15 text-[#26A5E4]',
      buildUrl: (url, text) => getTelegramShareUrl(url, text),
    },
    {
      key: 'x',
      label: 'X',
      icon: <XTwitterIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-gray-500/15 text-gray-700 dark:text-gray-300',
      buildUrl: (url, text) => getXShareUrl(url, text),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FacebookIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#1877F2]/15 text-[#1877F2]',
      buildUrl: (url) => getFacebookShareUrl(url),
    },
  ];

  // ── Click handler: try native first, fallback to popover ──────────
  const handleClick = useCallback(() => {
    handleNativeShare();
  }, [handleNativeShare]);

  // ── Render ─────────────────────────────────────────────────────────
  const triggerButton = (
    <Button
      variant="outline"
      size={variant === 'icon' ? 'icon' : 'default'}
      className={cn(
        'transition-all',
        variant === 'icon'
          ? 'h-10 w-10 md:h-12 md:w-12'
          : 'h-10 md:h-12',
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      aria-label="Compartir"
    >
      <Share2 className="h-4 w-4 md:h-5 md:w-5" />
      {variant === 'full' && (
        <span className="ml-1 md:ml-2 text-xs md:text-sm">Compartir</span>
      )}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 bg-white dark:bg-gray-800 border-2 border-black dark:border-white rounded-xl shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            Compartir
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Social share grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {shareTargets.map((target) => (
            <a
              key={target.key}
              href={target.buildUrl(shareUrl, fullShareText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all',
                target.colorClass,
              )}
            >
              {target.icon}
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                {target.label}
              </span>
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

        {/* Copy link row */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
        >
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
              copied
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gold/20',
            )}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
              {shareUrl.replace('https://', '')}
            </div>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
}
