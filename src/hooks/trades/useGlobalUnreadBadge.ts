'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';

/**
 * Lightweight polling hook for the navigation badge — no Realtime WebSocket.
 * Use this in always-visible nav components instead of useUnreadCounts
 * to avoid maintaining a persistent WebSocket connection on every page.
 */
export function useGlobalUnreadBadge() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ['globalUnreadBadge'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_counts', {
        p_box: 'inbox',
      });
      if (error) throw error;
      // The RPC returns an array of { trade_id, unread_count }
      // Sum all unread counts for total
      if (!data || !Array.isArray(data)) return 0;
      return data.reduce(
        (sum: number, item: { unread_count: number }) =>
          sum + (item.unread_count || 0),
        0
      );
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled: !!user,
  });

  return {
    totalUnread: data ?? 0,
    isLoading,
  };
}
