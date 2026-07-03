'use client';

import { Coffee } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BmacChatPrompt() {
  const t = useTranslations('marketplace.chat.bmac');

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm max-w-[85%] sm:max-w-[70%] text-center flex flex-col items-center gap-2.5">
      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <Coffee className="w-5 h-5 stroke-[2.5]" />
      </div>
      <div>
        <h4 className="text-sm font-black text-amber-900 dark:text-amber-300">
          {t('title')}
        </h4>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
          {t('subtitle')}
        </p>
      </div>
      <a
        href="https://buymeacoffee.com/cambiocromos"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 bg-[#FF9900] hover:bg-[#E68A00] text-white font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
      >
        <span>{t('cta')}</span>
      </a>
    </div>
  );
}
