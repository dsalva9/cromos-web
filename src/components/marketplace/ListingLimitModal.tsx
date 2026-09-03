'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Tv2, CreditCard, Crown, Loader2, CheckCircle2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { isNative } from '@/lib/platform';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useListingQuota, type AdViewResult } from '@/hooks/marketplace/useListingQuota';
import { useInAppPurchase, PRODUCT_IDS } from '@/hooks/useInAppPurchase';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';
import { track } from '@vercel/analytics/react';

// ─── LemonSqueezy config (web only) ──────────────────────────────────────────
const LS_VARIANT_EXTRA_LISTING = process.env.NEXT_PUBLIC_LS_VARIANT_EXTRA_LISTING ?? '';
const LS_STORE_SLUG = process.env.NEXT_PUBLIC_LS_STORE_SLUG ?? 'cambiocromos';

interface ListingLimitModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  /** Called after a successful unlock (ad or payment) so the parent can retry */
  onUnlocked?: () => void;
}

function buildExtraListingCheckoutUrl(userId: string): string {
  if (!LS_VARIANT_EXTRA_LISTING) return '';
  const params = new URLSearchParams({
    'checkout[custom][user_id]': userId,
    'checkout[custom][product]': 'listing_extra_upload',
  });
  return `https://${LS_STORE_SLUG}.lemonsqueezy.com/checkout/buy/${LS_VARIANT_EXTRA_LISTING}?${params.toString()}`;
}

/**
 * Modal shown when a free user tries to create a listing after reaching the
 * daily limit (2/day). Offers 3 unlock paths:
 *   1. Watch 5 rewarded ads (Android only)
 *   2. Pay 0.50€ (Google Play on Android, LemonSqueezy on Web)
 *   3. Upgrade to PRO (banner CTA)
 */
export function ListingLimitModal({
  open,
  userId,
  onClose,
  onUnlocked,
}: ListingLimitModalProps) {
  const t = useTranslations('listingLimitModal');
  const { quota, recordAdView, refresh: refreshQuota } = useListingQuota();

  // ── Platform detection (post-hydration) ──────────────────────────────────
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => { setIsAndroid(isNative()); }, []);

  // ── Ad state ─────────────────────────────────────────────────────────────
  const { loadAd, showRewardedAd, isLoading: adLoading, isLoaded: adLoaded } = useRewardedAd();
  const [watchingAd, setWatchingAd] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [adLimitReached, setAdLimitReached] = useState(false);

  // ── Google Play Billing ──────────────────────────────────────────────────
  const { purchaseProduct, isReady: storeReady } = useInAppPurchase();
  const [purchasing, setPurchasing] = useState(false);

  // ── Analytics: track modal open ──────────────────────────────────────────
  const trackedRef = useRef(false);
  useEffect(() => {
    if (open && !trackedRef.current) {
      trackedRef.current = true;
      track('listing_limit_modal_opened', { used: String(quota.used), limit: String(quota.limit) });
      const supabase = createClient();
      supabase.from('analytics_events' as any).insert({
        event_name: 'listing_limit_modal_opened',
        user_id: userId,
        metadata: { used: quota.used, limit: quota.limit },
      }).then(() => {});
    }
    if (!open) {
      trackedRef.current = false;
      setAdsWatched(0);
      setJustUnlocked(false);
      setAdLimitReached(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preload rewarded ad on Android ───────────────────────────────────────
  useEffect(() => {
    if (isAndroid && open && !adLoaded && !adLoading) {
      loadAd();
    }
  }, [isAndroid, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Watch ad handler ─────────────────────────────────────────────────────
  const handleWatchAd = async () => {
    if (watchingAd || justUnlocked || adLimitReached) return;
    setWatchingAd(true);
    try {
      if (!adLoaded) await loadAd();
      const rewarded = await showRewardedAd();
      if (rewarded) {
        try {
          const result: AdViewResult = await recordAdView();
          setAdsWatched(result.adsWatched);

          if (result.unlocked) {
            setJustUnlocked(true);
            toast.success(t('optionAdsUnlocked'));
            refreshQuota();
            onUnlocked?.();
          }

          // Check if daily ad unlock limit reached
          if (result.dailyAdUnlocksUsed >= result.dailyAdUnlocksMax) {
            setAdLimitReached(true);
          }

          // Pre-load next ad
          loadAd();
        } catch (err: any) {
          const msg = err?.message ?? '';
          if (msg.includes('daily_ad_unlock_limit_reached')) {
            setAdLimitReached(true);
            toast.error(t('dailyAdLimitReached'));
          } else {
            toast.error('Error');
          }
        }
      }
    } catch {
      toast.error('Error');
    } finally {
      setWatchingAd(false);
    }
  };

  // ── Pay handler (Google Play — Android) ──────────────────────────────────
  const handlePayAndroid = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await purchaseProduct(PRODUCT_IDS.LISTING_EXTRA_UPLOAD);
      if (result.success) {
        toast.success(t('optionAdsUnlocked'));
        refreshQuota();
        onUnlocked?.();
      } else if (result.error !== 'cancelled') {
        toast.error(result.error || 'Error');
      }
    } catch {
      toast.error('Error');
    } finally {
      setPurchasing(false);
    }
  };

  // ── Pay handler (Web — LemonSqueezy) ─────────────────────────────────────
  const handlePayWeb = () => {
    const url = buildExtraListingCheckoutUrl(userId);
    if (url) {
      window.location.href = url;
    }
  };

  // ── Progress dots ────────────────────────────────────────────────────────
  const renderProgressDots = () => {
    const total = 10;
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              i < adsWatched
                ? 'bg-amber-400 scale-110'
                : 'bg-gray-300 dark:bg-gray-600',
            )}
          />
        ))}
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          {t('optionAdsProgress', { watched: adsWatched, required: 10 })}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-y-auto max-h-[90vh] rounded-2xl border-0 shadow-2xl"
        showCloseButton={false}
      >
        {/* ── Warning Header ──────────────────────────────────────────────── */}
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
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {t('title')}
          </h2>
          <p className="text-white/85 text-sm mt-1.5 leading-relaxed">
            {t('subtitle', { limit: quota.limit })}
          </p>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-4 bg-white dark:bg-gray-900">

          {/* ── Option 1: Watch 5 rewarded ads (Android only) ─────────────── */}
          {isAndroid && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                  <Tv2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {t('optionAdsTitle')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('optionAdsDescription', { required: 10 })}
                  </p>
                  <div className="mt-3">
                    {renderProgressDots()}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                {justUnlocked ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium text-sm">{t('optionAdsUnlocked')}</span>
                  </div>
                ) : adLimitReached ? (
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
                    {t('dailyAdLimitReached')}
                  </p>
                ) : (
                  <Button
                    onClick={handleWatchAd}
                    disabled={watchingAd || adLoading}
                    variant="outline"
                    className="w-full border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    {watchingAd || adLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Tv2 className="h-4 w-4 mr-2" />
                    )}
                    {t('optionAdsButton')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Option 2: Pay 0.50€ ──────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {t('optionPayTitle')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('optionPayDescription')}
                </p>
              </div>
            </div>
            <div className="mt-3">
              {isAndroid ? (
                <Button
                  onClick={handlePayAndroid}
                  variant="default"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {t('optionPayButton', { price: '0,50€' })}
                </Button>
              ) : (
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 italic">
                  {t('desktopComingSoon')}
                </p>
              )}
            </div>
          </div>

          {/* ── Option 3: PRO banner ─────────────────────────────────────── */}
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 rounded-full shrink-0">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                  CambioCromos PRO
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {t('proBanner')} — {t('proTrial')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 font-semibold text-xs shrink-0"
                // TODO Phase 3: Link to /pro page
                disabled
              >
                {t('proCta')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
