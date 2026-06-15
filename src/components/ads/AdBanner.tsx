'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Megaphone, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  useEffect(() => { setHasMounted(true); }, []);

  const isHidden = AD_BANNER_HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

  // Inject mobile ad script
  useEffect(() => {
    if (!hasMounted || isHidden) return;

    const container = mobileAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    const optionsScript = document.createElement('script');
    optionsScript.text = `
      atOptions = {
        'key' : '207f77c777a93d9b339e6e77660a9707',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://www.highperformanceformat.com/207f77c777a93d9b339e6e77660a9707/invoke.js';

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, pathname]);

  // Inject desktop ad script
  useEffect(() => {
    if (!hasMounted || isHidden) return;

    const container = desktopAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    const optionsScript = document.createElement('script');
    optionsScript.text = `
      atOptions = {
        'key' : 'cda4bca11f2cef504a11b56506742be3',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://www.highperformanceformat.com/cda4bca11f2cef504a11b56506742be3/invoke.js';

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, pathname]);

  if (!hasMounted || isHidden) return null;

  const advertiseUrl = `/${locale}/advertise`;

  return (
    <>
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
