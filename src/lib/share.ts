import { Capacitor } from '@capacitor/core';
import { isNative } from '@/lib/platform';

export interface ShareContentOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  files?: File[];
}

export type ShareMethod = 'capacitor' | 'web-share' | 'web-share-files' | 'aborted' | 'unsupported';

export interface ShareContentResult {
  success: boolean;
  method: ShareMethod;
  error?: unknown;
}

/**
 * Checks whether native system sharing is supported in the current environment
 * (either through Capacitor's Share plugin on native app or Web Share API in browser).
 */
export async function canNativeShare(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (isNative()) {
    if (Capacitor.isPluginAvailable('Share')) {
      try {
        const { Share } = await import('@capacitor/share');
        const res = await Share.canShare();
        return !!res.value;
      } catch {
        return false;
      }
    }
    return false;
  }

  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Triggers native share sheet via Capacitor (on iOS/Android) or Web Share API (on mobile web).
 * Falls back safely without throwing if sharing is unsupported or cancelled.
 */
export async function shareContent(options: ShareContentOptions): Promise<ShareContentResult> {
  if (typeof window === 'undefined') {
    return { success: false, method: 'unsupported' };
  }

  // 1. Native Capacitor platform: use @capacitor/share if plugin is available in the binary
  if (isNative() && Capacitor.isPluginAvailable('Share')) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || options.title,
      });
      return { success: true, method: 'capacitor' };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message?.toLowerCase() || '';
      if (
        errMsg.includes('canceled') ||
        errMsg.includes('cancelled') ||
        (err as Error)?.name === 'AbortError'
      ) {
        return { success: false, method: 'aborted' };
      }
      // If Capacitor share failed for any other reason, fall through to web share or unsupported
    }
  }

  // 2. Web browser: use Web Share API if supported
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // If files are provided, try sharing with files first if supported
    if (options.files && options.files.length > 0 && navigator.canShare?.({ files: options.files })) {
      try {
        await navigator.share({
          files: options.files,
          title: options.title,
          text: options.text,
        });
        return { success: true, method: 'web-share-files' };
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return { success: false, method: 'aborted' };
        }
        // If file sharing failed, fall through to text/url sharing below
      }
    }

    // Standard text/url share
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return { success: true, method: 'web-share' };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return { success: false, method: 'aborted' };
      }
      return { success: false, method: 'unsupported', error: err };
    }
  }

  return { success: false, method: 'unsupported' };
}

/** Build WhatsApp share intent URL */
export function getWhatsAppShareUrl(url: string, text?: string): string {
  const content = text ? (url ? `${text}\n${url}` : text) : url;
  return `https://wa.me/?text=${encodeURIComponent(content)}`;
}

/** Build Telegram share intent URL */
export function getTelegramShareUrl(url: string, text?: string): string {
  const urlParam = url ? `url=${encodeURIComponent(url)}` : '';
  const textParam = text ? `text=${encodeURIComponent(text)}` : '';
  const query = [urlParam, textParam].filter(Boolean).join('&');
  return `https://t.me/share/url${query ? `?${query}` : ''}`;
}

/** Build X (Twitter) intent URL */
export function getXShareUrl(url: string, text?: string): string {
  const urlParam = url ? `url=${encodeURIComponent(url)}` : '';
  const textParam = text ? `text=${encodeURIComponent(text)}` : '';
  const query = [textParam, urlParam].filter(Boolean).join('&');
  return `https://twitter.com/intent/tweet${query ? `?${query}` : ''}`;
}

/** Build Facebook share dialog URL */
export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
