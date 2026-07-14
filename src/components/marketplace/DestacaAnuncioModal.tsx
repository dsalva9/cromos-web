'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const LS_STORE_ID = process.env.NEXT_PUBLIC_LS_STORE_ID ?? '410950';
const LS_VARIANT_48H_ID = process.env.NEXT_PUBLIC_LS_VARIANT_48H ?? '1903433';
const LS_VARIANT_7D_ID = process.env.NEXT_PUBLIC_LS_VARIANT_7D ?? '1903426';
// Per-variant checkout UUIDs (from the Share link on each variant in LS dashboard)
const LS_VARIANT_48H_UUID = process.env.NEXT_PUBLIC_LS_VARIANT_48H_UUID ?? 'df84bb68-f7ac-49a4-acd1-72690b3d583c';
const LS_VARIANT_7D_UUID = process.env.NEXT_PUBLIC_LS_VARIANT_7D_UUID ?? '18a4fdb1-8773-4975-ab4b-a2a453b00736';
// Store slug
const LS_STORE_SLUG = process.env.NEXT_PUBLIC_LS_STORE_SLUG ?? 'cambiocromos';

export type HighlightDuration = '48_hours' | '7_days';

interface DestacaAnuncioModalProps {
  open: boolean;
  listingId: number;
  userId: string;
  onClose: () => void;
}

function buildCheckoutUrl(
  duration: HighlightDuration,
  listingId: number,
  userId: string,
): string {
  const variantUuid = duration === '48_hours' ? LS_VARIANT_48H_UUID : LS_VARIANT_7D_UUID;
  const variantNumericId = duration === '48_hours' ? LS_VARIANT_48H_ID : LS_VARIANT_7D_ID;
  const params = new URLSearchParams({
    enabled: variantNumericId,
    'checkout[custom][user_id]': userId,
    'checkout[custom][listing_id]': String(listingId),
    'checkout[custom][duration]': duration,
  });
  return `https://${LS_STORE_SLUG}.lemonsqueezy.com/checkout/buy/${variantUuid}?${params.toString()}`;
}

export function DestacaAnuncioModal({
  open,
  listingId,
  userId,
  onClose,
}: DestacaAnuncioModalProps) {
  const t = useTranslations('destacaModal');
  const [selected, setSelected] = useState<HighlightDuration | null>(null);

  const handlePay = (duration: HighlightDuration) => {
    const url = buildCheckoutUrl(duration, listingId, userId);
    window.location.href = url;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 px-6 pt-8 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {t('title')}
          </h2>
          <p className="text-white/85 text-sm mt-1.5 leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Options */}
        <div className="px-6 py-5 space-y-3 bg-white dark:bg-gray-900">
          {/* 48h option */}
          <button
            onClick={() => setSelected('48_hours')}
            className={cn(
              'w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
              selected === '48_hours'
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-gray-800',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">
                    {t('option48hTitle')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('option48hDesc')}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                  0,99€
                </p>
              </div>
            </div>
          </button>

          {/* 7-day option */}
          <button
            onClick={() => setSelected('7_days')}
            className={cn(
              'w-full rounded-xl border-2 p-4 text-left transition-all duration-200 relative overflow-hidden',
              selected === '7_days'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-gray-800',
            )}
          >
            {/* Best value pill */}
            <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-lg">
              {t('bestValue')}
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">
                    {t('option7dTitle')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('option7dDesc')}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                  2,99€
                </p>
              </div>
            </div>
          </button>

          {/* CTA */}
          <Button
            disabled={!selected}
            onClick={() => selected && handlePay(selected)}
            className={cn(
              'w-full h-12 text-base font-black rounded-xl transition-all duration-200',
              selected
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed',
            )}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t('ctaButton')}
          </Button>

          {/* Skip */}
          <div className="text-center pt-1 pb-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2"
            >
              {t('skip')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
