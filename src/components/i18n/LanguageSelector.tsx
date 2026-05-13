'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { routing, type Locale } from '@/i18n/routing';

const LOCALE_LABELS: Record<Locale, { flag: string; label: string }> = {
  es: { flag: '🇪🇸', label: 'Español' },
  en: { flag: '🇬🇧', label: 'English' },
  pt: { flag: '🇧🇷', label: 'Português' },
};

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = (newLocale: Locale) => {
    if (newLocale === locale) {
      setOpen(false);
      return;
    }

    // Strip current locale prefix and replace with new one
    const pathWithoutLocale = pathname.replace(/^\/(es|en|pt)/, '') || '/';
    const newPath = `/${newLocale}${pathWithoutLocale}`;

    // Persist preference
    try {
      localStorage.setItem('locale', newLocale);
    } catch { /* ignore */ }

    setOpen(false);
    // Hard navigation to ensure full re-render with new locale
    window.location.href = newPath;
  };

  const current = LOCALE_LABELS[locale];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
          'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1',
          open && 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        )}
        aria-label={t('change')}
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current.flag}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-40 z-50 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 rounded-md shadow-xl overflow-hidden">
            {routing.locales.map((loc) => {
              const item = LOCALE_LABELS[loc];
              const isActive = loc === locale;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSwitch(loc)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gold/10 text-gold font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <span className="text-base">{item.flag}</span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto text-gold text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
