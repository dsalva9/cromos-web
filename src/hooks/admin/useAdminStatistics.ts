'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

// ── Time period mapping ───────────────────────────────────────────────
export const TIME_PERIODS = [
  { key: 'today', days: 0 },
  { key: '24h', days: 1 },
  { key: '3d', days: 3 },
  { key: '1w', days: 7 },
  { key: '1m', days: 30 },
  { key: 'all', days: 99999 },
] as const;

export type TimePeriodKey = (typeof TIME_PERIODS)[number]['key'];

/**
 * Returns the ISO timestamp for "today at 3 AM UTC".
 * This matches the time the daily digest email is sent.
 */
export function getTodaySince(): string {
  const now = new Date();
  const today3am = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0),
  );
  if (now < today3am) {
    today3am.setUTCDate(today3am.getUTCDate() - 1);
  }
  return today3am.toISOString();
}

// ── Response types ────────────────────────────────────────────────────

export type OverviewStats = {
  total_registered: number;
  mau: number;
  wau: number;
  dau: number;
  active_listings: number;
  retention_30d: number | null;
  retention_90d: number | null;
};

export type DayCount = {
  day: string; // ISO date string e.g. "2026-07-10"
  user_count?: number;
  listing_count?: number;
};

export type WeekCount = {
  week_start: string; // ISO date string
  user_count: number;
};

export type DayMessages = {
  day: string;
  match_messages: number;
  marketplace_messages: number;
  total_messages: number;
};

export type PeriodTotals = {
  new_users: number;
  new_listings: number;
  total_messages: number;
  matches_generated: number;
  exchanges_completed: number;
};

export type ProvinceCount = {
  province_code: string;
  user_count: number;
};

export type AdminStatisticsData = {
  overview: OverviewStats | null;
  newUsersDaily: DayCount[];
  newUsersWeekly: WeekCount[];
  dailyListings: DayCount[];
  dailyMessages: DayMessages[];
  periodTotals: PeriodTotals | null;
  spainCCAA: ProvinceCount[];
};

// ── Hook ──────────────────────────────────────────────────────────────
export function useAdminStatistics(
  period: TimePeriodKey,
  countryCode: string | null,
) {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<AdminStatisticsData>({
    overview: null,
    newUsersDaily: [],
    newUsersWeekly: [],
    dailyListings: [],
    dailyMessages: [],
    periodTotals: null,
    spainCCAA: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodConfig = TIME_PERIODS.find(p => p.key === period) ?? TIME_PERIODS[3];
  const days = periodConfig.days;
  const isToday = period === 'today';
  const isAll = period === 'all';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    try {
      // Build RPC params for time-filtered RPCs
      const timeParams: { p_days: number; p_since?: string } = { p_days: days };
      if (isToday) {
        timeParams.p_since = getTodaySince();
      }

      const countryParam = countryCode ?? undefined;

      // All 7 RPCs in parallel (spain CCAA only when ES selected)
      const [
        overviewRes,
        dailyUsersRes,
        weeklyUsersRes,
        dailyListingsRes,
        dailyMessagesRes,
        periodTotalsRes,
        spainCCAARes,
      ] = await Promise.all([
        db.rpc('admin_stats_overview', {
          p_country_code: countryParam ?? null,
        }),
        db.rpc('admin_stats_new_users_daily', {
          ...timeParams,
          p_country_code: countryParam ?? null,
        }),
        db.rpc('admin_stats_new_users_weekly', {
          p_days: isAll ? 99999 : Math.max(days, 90),
          ...(isToday ? { p_since: getTodaySince() } : {}),
          p_country_code: countryParam ?? null,
        }),
        db.rpc('admin_stats_daily_listings', {
          ...timeParams,
          p_country_code: countryParam ?? null,
        }),
        db.rpc('admin_stats_daily_messages', {
          ...timeParams,
          p_country_code: countryParam ?? null,
        }),
        db.rpc('admin_stats_period_totals', {
          ...timeParams,
          p_country_code: countryParam ?? null,
        }),
        // CCAA only needed for ES; for others return empty
        countryCode === 'ES'
          ? db.rpc('admin_stats_spain_ccaa')
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Check for errors
      const results = [
        overviewRes,
        dailyUsersRes,
        weeklyUsersRes,
        dailyListingsRes,
        dailyMessagesRes,
        periodTotalsRes,
        spainCCAARes,
      ];
      const firstError = results.find(r => r.error);
      if (firstError?.error) {
        throw new Error(firstError.error.message);
      }

      const overviewRow = Array.isArray(overviewRes.data)
        ? (overviewRes.data[0] as OverviewStats | undefined) ?? null
        : null;

      const periodRow = Array.isArray(periodTotalsRes.data)
        ? (periodTotalsRes.data[0] as PeriodTotals | undefined) ?? null
        : null;

      setData({
        overview: overviewRow,
        newUsersDaily: (dailyUsersRes.data as DayCount[]) ?? [],
        newUsersWeekly: (weeklyUsersRes.data as WeekCount[]) ?? [],
        dailyListings: (dailyListingsRes.data as DayCount[]) ?? [],
        dailyMessages: (dailyMessagesRes.data as DayMessages[]) ?? [],
        periodTotals: periodRow,
        spainCCAA: (spainCCAARes.data as ProvinceCount[]) ?? [],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load statistics';
      logger.error('useAdminStatistics error', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [supabase, days, isToday, isAll, countryCode]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
