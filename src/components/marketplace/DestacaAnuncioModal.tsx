'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, X, Tv2, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { isNative } from '@/lib/platform';
import { useHighlightCredits, HIGHLIGHT_COSTS, CREDITS_PER_AD } from '@/hooks/marketplace/useHighlightCredits';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { toast } from '@/lib/toast';

// ─── LemonSqueezy config (web only) ──────────────────────────────────────────
const LS_VARIANT_48H_ID = process.env.NEXT_PUBLIC_LS_VARIANT_48H ?? '1903433';
const LS_VARIANT_7D_ID = process.env.NEXT_PUBLIC_LS_VARIANT_7D ?? '1903426';
const LS_VARIANT_48H_UUID = process.env.NEXT_PUBLIC_LS_VARIANT_48H_UUID ?? 'df84bb68-f7ac-49a4-acd1-72690b3d583c';
const LS_VARIANT_7D_UUID = process.env.NEXT_PUBLIC_LS_VARIANT_7D_UUID ?? '18a4fdb1-8773-4975-ab4b-a2a453b00736';
const LS_STORE_SLUG = process.env.NEXT_PUBLIC_LS_STORE_SLUG ?? 'cambiocromos';

export type HighlightDuration = '48_hours' | '7_days';

interface DestacaAnuncioModalProps {
  open: boolean;
  listingId: number;
  userId: string;
  onClose: () => void;
  /** When true, shows "publish without highlighting" skip link (post-create flow) */
  isNewListing?: boolean;
}

function buildCheckoutUrl(
  duration: HighlightDuration,
  listingId: number,
  userId: string,
): string {
  const variantUuid = duration === '48_hours' ? LS_VARIANT_48H_UUID : LS_VARIANT_7D_UUID;
  const variantNumericId = duration === '48_hours' ? LS_VARIANT_48H_ID : LS_VARIANT_7D_ID;
  const successUrl = `https://cambiocromos.com/es/marketplace/${listingId}?highlight=success`;
  const params = new URLSearchParams({
    enabled: variantNumericId,
    'checkout[custom][user_id]': userId,
    'checkout[custom][listing_id]': String(listingId),
    'checkout[custom][duration]': duration,
    'checkout[success_url]': successUrl,
  });
  return `https://${LS_STORE_SLUG}.lemonsqueezy.com/checkout/buy/${variantUuid}?${params.toString()}`;
}

export function DestacaAnuncioModal({
  open,
  listingId,
  userId,
  onClose,
  isNewListing = false,
}: DestacaAnuncioModalProps) {
  const t = useTranslations('destacaModal');

  // Detect native after hydration to avoid SSR mismatch
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => { setIsAndroid(isNative()); }, []);

  // Shared state
  const [selected, setSelected] = useState<HighlightDuration | null>(null);

  // Android-only state
  const { balance, loading: creditsLoading, refresh: refreshBalance, earnCredits, activateHighlight } = useHighlightCredits();
  const { loadAd, showRewardedAd, isLoading: adLoading, isLoaded: adLoaded } = useRewardedAd();
  const [watchingAd, setWatchingAd] = useState(false);
  const [activating, setActivating] = useState(false);
  const [creditFlash, setCreditFlash] = useState(false);

  const creditCost = selected ? HIGHLIGHT_COSTS[selected] : 0;
  const hasEnoughCredits = selected ? balance >= creditCost : false;
  const shortfall = selected ? Math.max(0, creditCost - balance) : 0;
  const adsNeeded = Math.ceil(shortfall / CREDITS_PER_AD);

  // Preload rewarded ad when modal opens on Android
  useEffect(() => {
    if (isAndroid && open && !adLoaded && !adLoading) {
      loadAd();
    }
  }, [isAndroid, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh balance when modal opens (picks up credits granted elsewhere)
  useEffect(() => {
    if (open && isAndroid) {
      refreshBalance();
    }
  }, [open, isAndroid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Android: watch ad ──────────────────────────────────────────────────────
  const handleWatchAd = async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      if (!adLoaded) await loadAd();
      const rewarded = await showRewardedAd();
      if (rewarded) {
        try {
          await earnCredits();
          setCreditFlash(true);
          setTimeout(() => setCreditFlash(false), 2500);
        } catch (err: any) {
          const msg = err?.message ?? '';
          if (msg === 'credit_grant_timeout') {
            // SSV callback slow — refresh balance and show info toast
            await refreshBalance();
            toast.info(t('rewardProcessing'));
          } else if (msg.includes('rate_limited')) {
            toast.error(t('rateLimited'));
          } else if (msg.includes('daily_limit_reached')) {
            toast.error(t('dailyLimitReached'));
          } else {
            toast.error(t('adError'));
          }
        }
        // Pre-load next ad for a seamless second watch
        loadAd();
      }
    } catch {
      toast.error(t('adError'));
    } finally {
      setWatchingAd(false);
    }
  };

  // ── Android: activate highlight ────────────────────────────────────────────
  const handleActivate = async () => {
    if (!selected || !hasEnoughCredits || activating) return;
    setActivating(true);
    try {
      await activateHighlight(listingId, selected);
      toast.success(t('activateSuccess'));
      onClose();
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('already_highlighted')) toast.error(t('alreadyHighlighted'));
      else if (msg.includes('listing_not_active')) toast.error(t('listingNotActive'));
      else toast.error(t('activateError'));
    } finally {
      setActivating(false);
    }
  };

  // ── Web: open LS checkout ─────────────────────────────────────────────────
  const handlePayWeb = (duration: HighlightDuration) => {
    const url = buildCheckoutUrl(duration, listingId, userId);
    window.location.href = url;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl',
          // On Android, add bottom margin so the modal clears the AdMob banner
          isAndroid && 'mb-[70px]',
        )}
        showCloseButton={false}
      >
        {/* ── Golden Header (same for both modes) ─────────────────────────── */}
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

          {/* Credit balance pill — Android only */}
          {isAndroid && (
            <div className={cn(
              'mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-500',
              creditFlash
                ? 'bg-white text-amber-600 scale-105'
                : 'bg-white/20 text-white',
            )}>
              {creditFlash
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <Sparkles className="h-4 w-4" />
              }
              <span className="font-black text-sm">
                {creditsLoading ? '...' : creditFlash
                  ? t('creditsGranted', { amount: CREDITS_PER_AD })
                  : t('creditsBalance', { count: balance })
                }
              </span>
            </div>
          )}
        </div>

        {/* ── Options + CTA ────────────────────────────────────────────────── */}
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
                {isAndroid ? (
                  <p className="font-black text-amber-600 dark:text-amber-400 text-sm leading-tight">
                    {HIGHLIGHT_COSTS['48_hours']}
                    <span className="text-xs font-medium block">{t('credits')}</span>
                  </p>
                ) : (
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">1,20€</p>
                )}
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
                {isAndroid ? (
                  <p className="font-black text-amber-600 dark:text-amber-400 text-sm leading-tight">
                    {HIGHLIGHT_COSTS['7_days']}
                    <span className="text-xs font-medium block">{t('credits')}</span>
                  </p>
                ) : (
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">3,50€</p>
                )}
              </div>
            </div>
          </button>

          {/* ── Android mode bottom section ──────────────────────────────── */}
          {isAndroid ? (
            <>
              {/* Shortfall info */}
              {selected && !hasEnoughCredits && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium pb-1">
                  {t('needMoreCredits', { needed: shortfall, ads: adsNeeded })}
                </p>
              )}

              {/* Primary CTA */}
              <Button
                disabled={!selected || !hasEnoughCredits || activating}
                onClick={handleActivate}
                className={cn(
                  'w-full h-12 text-base font-black rounded-xl transition-all duration-200',
                  selected && hasEnoughCredits
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed',
                )}
              >
                {activating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {activating ? t('activating') : t('ctaButton')}
              </Button>

              {/* Watch ad button */}
              <Button
                variant="outline"
                onClick={handleWatchAd}
                disabled={watchingAd}
                className="w-full h-11 rounded-xl border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold"
              >
                {watchingAd ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Tv2 className="h-4 w-4 mr-2" />
                )}
                {watchingAd
                  ? t('watchAdLoading')
                  : adLoading
                    ? t('watchAdPreparing')
                    : t('watchAd', { amount: CREDITS_PER_AD })
                }
              </Button>
            </>
          ) : (
            /* ── Web mode CTA ──────────────────────────────────────────── */
            <Button
              disabled={!selected}
              onClick={() => selected && handlePayWeb(selected)}
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
          )}

          {/* Skip — only show for new listings (post-create flow) */}
          {isNewListing && (
            <div className="text-center pt-1 pb-2">
              <button
                onClick={onClose}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2"
              >
                {t('skip')}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
