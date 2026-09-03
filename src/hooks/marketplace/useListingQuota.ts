'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface ListingQuota {
  used: number;
  limit: number;
  extraUnlocks: number;
  canCreate: boolean;
  isPro: boolean;
  adsWatched: number;
}

export interface AdViewResult {
  adsWatched: number;
  adsRequired: number;
  unlocked: boolean;
  dailyAdUnlocksUsed: number;
  dailyAdUnlocksMax: number;
}

/**
 * Manages daily marketplace listing quota.
 *
 * Free users: 2 listings/day + extras via ads or purchase.
 * Pro users: unlimited.
 *
 * Provides recordAdView() to track rewarded ad views toward an unlock
 * (10 ads = 1 extra listing) and recordPurchaseUnlock() for paid unlocks.
 */
export function useListingQuota() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  const { data: quota, isLoading } = useQuery({
    queryKey: QUERY_KEYS.listingQuota(),
    queryFn: async (): Promise<ListingQuota> => {
      const { data, error } = await (supabase as any).rpc('get_my_daily_listing_quota');
      if (error) throw error;
      return {
        used: data?.used ?? 0,
        limit: data?.limit ?? 2,
        extraUnlocks: data?.extra_unlocks ?? 0,
        canCreate: data?.can_create ?? true,
        isPro: data?.is_pro ?? false,
        adsWatched: data?.ads_watched ?? 0,
      };
    },
    staleTime: 30_000, // 30 seconds — quota can change after ads/purchases
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listingQuota() });
  }, [queryClient]);

  /**
   * Records a rewarded ad view toward unlocking an extra listing.
   * After 5 ads, auto-grants 1 extra listing and resets progress.
   */
  const recordAdView = useCallback(async (): Promise<AdViewResult> => {
    const { data, error } = await (supabase as any).rpc('record_listing_ad_view');
    if (error) throw error;

    // Always refresh quota so adsWatched updates in cache
    refresh();

    return {
      adsWatched: data?.ads_watched ?? 0,
      adsRequired: data?.ads_required ?? 10,
      unlocked: data?.unlocked ?? false,
      dailyAdUnlocksUsed: data?.daily_ad_unlocks_used ?? 0,
      dailyAdUnlocksMax: data?.daily_ad_unlocks_max ?? 5,
    };
  }, [supabase, refresh]);

  /**
   * Records a paid listing unlock (after server-side purchase verification).
   */
  const recordPurchaseUnlock = useCallback(async (paymentId: string): Promise<void> => {
    const { error } = await (supabase as any).rpc('record_listing_purchase_unlock', {
      p_payment_id: paymentId,
    });
    if (error) throw error;
    refresh();
  }, [supabase, refresh]);

  return {
    quota: quota ?? { used: 0, limit: 2, extraUnlocks: 0, canCreate: true, isPro: false, adsWatched: 0 },
    loading: isLoading,
    refresh,
    recordAdView,
    recordPurchaseUnlock,
  };
}
