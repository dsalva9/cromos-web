'use client';

import { useTranslations } from 'next-intl';
import { MapPin, Search, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ------------------------------------------------------------------
// Radius Expansion Card
// ------------------------------------------------------------------
interface RadiusExpansionCardProps {
  currentRadiusKm: number | null;
  nextRadiusKm: number | null;
  onExpand: () => void;
  onReset: () => void;
}

export function RadiusExpansionCard({
  currentRadiusKm,
  nextRadiusKm,
  onExpand,
  onReset,
}: RadiusExpansionCardProps) {
  const t = useTranslations('trades.finder.swipe');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
        {/* Decorative header */}
        <div className="bg-gradient-to-r from-gold via-yellow-400 to-gold p-6 border-b-2 border-black">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-lg">
              <Search className="w-8 h-8 text-gray-900" />
            </div>
          </div>
          <h2 className="text-xl font-black uppercase text-gray-900 text-center">
            {t('expandTitle', { km: currentRadiusKm ?? '∞' })}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {nextRadiusKm !== null ? (
            <>
              <p className="text-center text-gray-700 dark:text-gray-300 font-medium">
                {t('expandPrompt', { nextKm: nextRadiusKm })}
              </p>

              <Button
                onClick={onExpand}
                className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase py-4 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                size="lg"
              >
                <MapPin className="w-5 h-5 mr-2" />
                {t('expandCta')}
              </Button>
            </>
          ) : null}

          <Button
            onClick={onReset}
            variant="outline"
            className="w-full text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-black font-bold uppercase py-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('backToStart')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Exhausted Card
// ------------------------------------------------------------------
interface ExhaustedCardProps {
  onReset: () => void;
  onChangeCollection: () => void;
}

export function ExhaustedCard({ onReset, onChangeCollection }: ExhaustedCardProps) {
  const t = useTranslations('trades.finder.swipe');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-2xl overflow-hidden">
        {/* Decorative header */}
        <div className="bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 p-6 border-b-2 border-black">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">🎉</span>
            </div>
          </div>
          <h2 className="text-xl font-black uppercase text-white text-center">
            {t('exhaustedTitle')}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-center text-gray-700 dark:text-gray-300 font-medium">
            {t('exhaustedDesc')}
          </p>

          <Button
            onClick={onReset}
            className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase py-4 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            size="lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {t('resetSeen')}
          </Button>

          <Button
            onClick={onChangeCollection}
            variant="outline"
            className="w-full text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-black font-bold uppercase py-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
            size="lg"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {t('changeCollection')}
          </Button>
        </div>
      </div>
    </div>
  );
}
