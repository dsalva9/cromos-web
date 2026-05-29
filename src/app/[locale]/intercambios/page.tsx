'use client';

import { useTranslations } from 'next-intl';
import { ArrowRightLeft } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

function ComingSoonContent() {
  const t = useTranslations('trades.hub');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
          {/* Decorative header */}
          <div className="bg-gradient-to-r from-gold via-yellow-400 to-gold p-8 border-b-2 border-black">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-lg">
                <ArrowRightLeft className="w-10 h-10 text-gray-900" />
              </div>
            </div>
            <h1 className="text-2xl font-black uppercase text-gray-900 text-center">
              {t('comingSoonTitle')}
            </h1>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <p className="text-center text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
              {t('comingSoonDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntercambiosPage() {
  return (
    <AuthGuard>
      <ComingSoonContent />
    </AuthGuard>
  );
}
