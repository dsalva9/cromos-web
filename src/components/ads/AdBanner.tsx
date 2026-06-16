'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Megaphone, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

/** Strip the locale prefix from a pathname. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

/** Pages where the ad banner should be hidden */
export const AD_BANNER_HIDDEN_PATHS = ['/login', '/register', '/advertise', '/admin'];

/**
 * Height of the ad banner content (without safe-area).
 * Exported so other components can reference it for offset calculations.
 * Mobile: 50px ad + 44px self-promo. Desktop: 90px ad + 56px self-promo.
 */
export const AD_BANNER_HEIGHT = 94; // px — mobile (50 + 44)

export function AdBanner() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);
  const locale = useLocale();
  const t = useTranslations('adBanner');

  const mobileAdRef = useRef<HTMLDivElement>(null);
  const desktopAdRef = useRef<HTMLDivElement>(null);

  // Defer to client to avoid SSR hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  const [showAdBlockerModal, setShowAdBlockerModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      const checkViewport = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkViewport();
      window.addEventListener('resize', checkViewport);
      return () => window.removeEventListener('resize', checkViewport);
    }
  }, []);

  const isHidden = AD_BANNER_HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

  // Adblocker detection
  useEffect(() => {
    if (!hasMounted || isHidden) return;

    let isCheckActive = true;

    const performCheck = async () => {
      // 1. Bait element check (detects CSS-blocking adblockers)
      const bait = document.createElement('div');
      bait.className = 'adsbox ads-box ad-zone ad-space doubleclick-ad';
      bait.setAttribute('style', 'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px;');
      document.body.appendChild(bait);
      
      const baitBlocked = bait.offsetHeight === 0 || bait.clientHeight === 0 || window.getComputedStyle?.(bait).display === 'none';
      document.body.removeChild(bait);

      if (baitBlocked) {
        if (isCheckActive) setShowAdBlockerModal(true);
        return;
      }

      // 2. Fetch-based check (detects network/DNS blocking like Pi-hole or Brave Shields)
      try {
        const url = 'https://www.highperformanceformat.com/cda4bca11f2cef504a11b56506742be3/invoke.js';
        await fetch(new Request(url), {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store'
        });
      } catch (error) {
        if (isCheckActive) setShowAdBlockerModal(true);
      }
    };

    const timer = setTimeout(performCheck, 1000);

    return () => {
      isCheckActive = false;
      clearTimeout(timer);
    };
  }, [hasMounted, isHidden]);

  // Inject mobile ad script inside a sandboxed iframe using a local same-domain src
  useEffect(() => {
    if (!hasMounted || isHidden || !isMobile) return;

    const container = mobileAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = '/ad-frame.html';
    iframe.width = '320';
    iframe.height = '50';
    iframe.style.width = '320px';
    iframe.style.height = '50px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    // Allow scripts, same-origin, popups (so clicks open sponsors in new tab), but omit top-navigation to block main window hijacking redirects.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms');

    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, isMobile, pathname]);

  // Inject desktop ad script inside a sandboxed iframe (same approach as mobile)
  useEffect(() => {
    if (!hasMounted || isHidden || isMobile) return;

    const container = desktopAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = '/ad-frame-desktop.html';
    iframe.width = '728';
    iframe.height = '90';
    iframe.style.width = '728px';
    iframe.style.height = '90px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    // Allow scripts, same-origin, popups (so clicks open sponsors in new tab), but omit top-navigation to block main window hijacking redirects.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms');

    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, isMobile, pathname]);

  if (!hasMounted || isHidden) return null;

  const advertiseUrl = `/${locale}/advertise`;

  return (
    <>
      {showAdBlockerModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto border-2 border-black dark:border-white">
              <Megaphone className="h-8 w-8 text-red-600 dark:text-red-400 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {t('adBlocker.title')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('adBlocker.description')}
              </p>
            </div>

            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-gold hover:bg-gold-light text-black font-bold h-11 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-all"
            >
              {t('adBlocker.cta')}
            </Button>
          </div>
        </div>
      )}
      {/* ═══════ MOBILE STACK (below bottom nav) ═══════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)] bg-white dark:bg-gray-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Third-party ad (320×50) */}
        <div
          ref={mobileAdRef}
          className="flex items-center justify-center bg-gray-50 dark:bg-gray-800"
          style={{ width: '100%', height: '50px', overflow: 'hidden' }}
        />

        {/* Self-promo banner */}
        <a
          href={advertiseUrl}
          className="
            group flex items-center gap-2 w-full
            bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm
            border-t border-gold/30 dark:border-gold/20
            border-b border-b-gray-200 dark:border-b-gray-800
            px-3 h-[44px]
            transition-colors duration-200
            hover:bg-gray-50 dark:hover:bg-gray-800/95
            active:bg-gray-100 dark:active:bg-gray-800
          "
        >
          {/* Gold accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold/0 via-gold to-gold/0" />

          {/* Icon */}
          <Megaphone className="h-4 w-4 text-gold shrink-0" />

          {/* Single-line text */}
          <p className="flex-1 min-w-0 text-[12px] font-semibold text-gray-800 dark:text-white leading-none truncate">
            {t('titleShort')}
          </p>

          {/* CTA pill */}
          <div className="shrink-0 flex items-center gap-0.5 bg-gold text-black text-[10px] font-bold uppercase px-2.5 py-1 rounded-full transition-all duration-200 group-hover:bg-gold-light">
            <span>{t('cta')}</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </a>
      </div>

      {/* ═══════ DESKTOP STACK (sticky bottom strip) ═══════ */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)]">
        {/* Third-party ad (728×90) */}
        <div
          ref={desktopAdRef}
          className="flex items-center justify-center bg-gray-50 dark:bg-gray-800"
          style={{ width: '100%', height: '90px', overflow: 'hidden' }}
        />

        {/* Self-promo banner */}
        <a
          href={advertiseUrl}
          className="
            group flex items-center justify-center gap-4 w-full
            bg-white/80 dark:bg-gray-900/95
            backdrop-blur-lg
            border-t border-gray-200/80 dark:border-gold/20
            px-6 h-[56px]
            transition-all duration-200
            hover:bg-white/90 dark:hover:bg-gray-800/95
          "
        >
          {/* Gold accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-60 dark:opacity-100" />

          {/* Icon */}
          <Megaphone className="h-5 w-5 text-gold shrink-0" />

          {/* Text */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {t('titleDesktop')}
            </p>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('subtitleDesktop')}
            </p>
          </div>

          {/* CTA */}
          <div className="shrink-0 flex items-center gap-1.5 bg-gold text-black text-xs font-bold uppercase px-4 py-2 rounded-full transition-all duration-200 shadow-sm group-hover:shadow-md group-hover:bg-gold-light">
            <span>{t('cta')}</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </a>
      </div>
    </>
  );
}
