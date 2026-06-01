import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

export interface UnreadCount {
  trade_id: number;
  unread_count: number;
}

interface UseUnreadCountsParams {
  box: 'inbox' | 'outbox';
  tradeIds?: number[];
  enabled?: boolean;
}

interface UseUnreadCountsReturn {
  counts: Map<number, number>;
  totalUnread: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getCountForTrade: (tradeId: number) => number;
}

export const useUnreadCounts = ({
  box,
  tradeIds,
  enabled = true,
}: UseUnreadCountsParams): UseUnreadCountsReturn => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Stabilize tradeIds dependency
  const tradeIdsString = tradeIds ? tradeIds.join(',') : '';
  const stableTradeIds = useMemo(() => {
    return tradeIds;
  }, [tradeIdsString]);

  // Fetch unread counts
  const fetchCounts = useCallback(async () => {
    if (!enabled || !user) {
      setCounts(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_unread_counts', {
        p_box: box,
        p_trade_ids: stableTradeIds || undefined,
      });

      if (rpcError) throw rpcError;

      const newCounts = new Map<number, number>();
      (data || []).forEach((item: UnreadCount) => {
        newCounts.set(item.trade_id, item.unread_count);
      });

      setCounts(newCounts);
    } catch (err) {
      logger.error('Error fetching unread counts:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar conteo de mensajes'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, user, box, stableTradeIds, enabled]);

  // Refresh counts
  const refresh = useCallback(async () => {
    await fetchCounts();
  }, [fetchCounts]);

  // Get count for specific trade
  const getCountForTrade = useCallback(
    (tradeId: number): number => {
      return counts.get(tradeId) || 0;
    },
    [counts]
  );

  // Calculate total unread
  const totalUnread = Array.from(counts.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  // Initial fetch
  useEffect(() => {
    if (enabled && user) {
      fetchCounts();
    } else {
      setCounts(new Map());
      setError(null);
    }
  }, [fetchCounts, enabled, user]);

  // Poll for unread count updates every 15s (replaces unfiltered realtime subscription)
  useEffect(() => {
    if (!enabled || !user) return;
    const interval = setInterval(fetchCounts, 15_000);
    return () => clearInterval(interval);
  }, [enabled, user, fetchCounts]);

  return {
    counts,
    totalUnread,
    loading,
    error,
    refresh,
    getCountForTrade,
  };
};
