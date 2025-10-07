import { useState, useCallback, useEffect, useRef } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        p_trade_ids: tradeIds || null,
      });

      if (rpcError) throw rpcError;

      const newCounts = new Map<number, number>();
      (data || []).forEach((item: UnreadCount) => {
        newCounts.set(item.trade_id, item.unread_count);
      });

      setCounts(newCounts);
    } catch (err) {
      console.error('Error fetching unread counts:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar conteo de mensajes'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, user, box, tradeIds, enabled]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user, box, tradeIds?.length, supabase]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!enabled || !user) return;

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabase
      .channel('unread-counts-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_chats',
        },
        async payload => {
          const newMessage = payload.new as {
            id: number;
            trade_id: number;
            sender_id: string;
            message: string;
            created_at: string;
          };

          // Only update if the message is from the counterparty
          if (newMessage.sender_id === user.id) {
            return;
          }

          // Check if this trade belongs to the current box
          const { data: proposalData } = await supabase
            .from('trade_proposals')
            .select('from_user, to_user')
            .eq('id', newMessage.trade_id)
            .single();

          if (!proposalData) return;

          const isInCurrentBox =
            (box === 'inbox' && proposalData.to_user === user.id) ||
            (box === 'outbox' && proposalData.from_user === user.id);

          if (!isInCurrentBox) return;

          // If tradeIds filter is active, check if this trade is included
          if (tradeIds && !tradeIds.includes(newMessage.trade_id)) {
            // Message is in the opposite box or not in our filter, debounce refetch
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = setTimeout(() => {
              fetchCounts();
            }, 2000);
            return;
          }

          // Increment count for this trade
          setCounts(prev => {
            const newCounts = new Map(prev);
            const currentCount = newCounts.get(newMessage.trade_id) || 0;
            newCounts.set(newMessage.trade_id, currentCount + 1);
            return newCounts;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase, user, box, tradeIds, enabled, fetchCounts]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    counts,
    totalUnread,
    loading,
    error,
    refresh,
    getCountForTrade,
  };
};
