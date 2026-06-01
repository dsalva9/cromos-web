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
  // If it's currently before 3 AM UTC, go back to yesterday's 3 AM
  if (now < today3am) {
    today3am.setUTCDate(today3am.getUTCDate() - 1);
  }
  return today3am.toISOString();
}

// ── Response types ────────────────────────────────────────────────────
export type NewUserRow = {
  user_id: string;
  nickname: string;
  email: string;
  created_at: string;
  listings_count: number;
  albums_count: number;
  chat_messages_count: number;
  country_code: string;
};

export type MessagingSummary = {
  total_messages: number;
  unique_senders: number;
  unique_receivers: number;
  unique_conversations: number;
  messages_per_day: number;
  busiest_hour: number;
  top_senders: unknown;
  match_conversations_opened?: number;
  match_active_users?: number;
  match_messages_sent?: number;
};

export type MessagingByCountry = {
  country_code: string;
  total_messages: number;
  unique_senders: number;
  unique_conversations: number;
};

export type ListingStatusStat = {
  status: string;
  total: number;
};

export type ListingsByCountry = {
  country_code: string;
  total_listings: number;
  users: unknown;
};

export type AdminStatisticsData = {
  newUsers: NewUserRow[];
  messagingSummary: MessagingSummary | null;
  messagingByCountry: MessagingByCountry[];
  listingStatusStats: ListingStatusStat[];
  listingsByCountry: ListingsByCountry[];
};

export function useAdminStatistics(period: TimePeriodKey) {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<AdminStatisticsData>({
    newUsers: [],
    messagingSummary: null,
    messagingByCountry: [],
    listingStatusStats: [],
    listingsByCountry: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = TIME_PERIODS.find(p => p.key === period)?.days ?? 7;
  const isToday = period === 'today';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build the RPC params: use p_since for "today", p_days for all others
      const params: { p_days: number; p_since?: string } = { p_days: days };
      if (isToday) {
        params.p_since = getTodaySince();
      }

      const [usersRes, msgSummaryRes, msgCountryRes, listingStatusRes, listingCountryRes] =
        await Promise.all([
          supabase.rpc('admin_get_new_users_summary', params),
          supabase.rpc('admin_get_messaging_activity_summary', params),
          supabase.rpc('admin_get_messaging_activity_by_country', params),
          supabase.rpc('admin_get_listing_status_stats', params),
          supabase.rpc('admin_get_new_listings_by_country', params),
        ]);

      // Check for errors
      const anyError = [usersRes, msgSummaryRes, msgCountryRes, listingStatusRes, listingCountryRes]
        .find(r => r.error);
      if (anyError?.error) {
        throw new Error(anyError.error.message);
      }

      setData({
        newUsers: (usersRes.data as NewUserRow[]) || [],
        messagingSummary: ((msgSummaryRes.data as MessagingSummary[])?.[0]) || null,
        messagingByCountry: (msgCountryRes.data as MessagingByCountry[]) || [],
        listingStatusStats: (listingStatusRes.data as ListingStatusStat[]) || [],
        listingsByCountry: (listingCountryRes.data as ListingsByCountry[]) || [],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load statistics';
      logger.error('useAdminStatistics error', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [supabase, days, isToday]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
