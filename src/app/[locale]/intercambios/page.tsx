'use client';

import { useTranslations } from 'next-intl';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from '@/components/ui/link';
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

            <Link href="/intercambios/buscar" className="block">
              <Button
                className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase py-4 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('comingSoonCta')}
              </Button>
            </Link>
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
