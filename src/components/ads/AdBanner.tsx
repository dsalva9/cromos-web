'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Megaphone, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Strip the locale prefix from a pathname. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

/** Pages where the ad banner should be hidden */
const HIDDEN_PATHS = ['/login', '/register', '/advertise', '/admin'];

export function AdBanner() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);
  const locale = useLocale();
  const t = useTranslations('adBanner');

  // Defer to client to avoid SSR hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  if (!hasMounted) return null;

  // Hide on specific pages
  if (HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))) {
    return null;
  }

  const advertiseUrl = `/${locale}/advertise`;

  return (
    <>
      {/* ═══════ MOBILE BANNER (below bottom nav) ═══════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)]">
        <a
          href={advertiseUrl}
          className="
            group flex items-center gap-3 w-full
            bg-gray-900/95 backdrop-blur-sm
            border-t border-gold/20
            px-4 h-[50px]
            transition-colors duration-200
            hover:bg-gray-800/95
            active:bg-gray-800
          "
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Gold accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold/0 via-gold to-gold/0" />

          {/* Icon */}
          <div className="relative shrink-0">
            <Megaphone className="h-5 w-5 text-gold" />
            <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-gold/80 animate-pulse" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight truncate">
              {t('title')}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight truncate">
              {t('subtitle')}
            </p>
          </div>

          {/* CTA */}
          <div className="shrink-0 flex items-center gap-1 bg-gold/15 border border-gold/30 text-gold text-[11px] font-bold uppercase px-3 py-1.5 rounded-full transition-all duration-200 group-hover:bg-gold/25 group-hover:border-gold/50">
            <span>{t('cta')}</span>
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </a>
      </div>

      {/* ═══════ DESKTOP BANNER (sticky bottom strip) ═══════ */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)]">
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
          <div className="relative shrink-0">
            <Megaphone className="h-5 w-5 text-gold" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-3 w-3 text-gold/70 animate-pulse" />
          </div>

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
