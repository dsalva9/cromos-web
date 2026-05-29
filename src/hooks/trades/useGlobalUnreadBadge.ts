'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';

/**
 * Lightweight polling hook for the navigation badge — no Realtime WebSocket.
 * Use this in always-visible nav components instead of useUnreadCounts
 * to avoid maintaining a persistent WebSocket connection on every page.
 * 
 * Returns combined unread count from marketplace chats AND match chats.
 */
export function useGlobalUnreadBadge() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ['globalUnreadBadge'],
    queryFn: async () => {
      // Fetch marketplace unread
      const marketplacePromise = supabase.rpc('get_unread_counts', {
        p_box: 'inbox',
      });

      // Fetch match chat unread
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchPromise = (supabase.rpc as any)('get_match_unread_total');

      const [marketplaceResult, matchResult] = await Promise.all([
        marketplacePromise,
        matchPromise,
      ]);

      // Sum marketplace unread
      let marketplaceTotal = 0;
      if (!marketplaceResult.error && Array.isArray(marketplaceResult.data)) {
        marketplaceTotal = marketplaceResult.data.reduce(
          (sum: number, item: { unread_count: number }) =>
            sum + (item.unread_count || 0),
          0
        );
      }

      // Match unread
      const matchTotal = (!matchResult.error && typeof matchResult.data === 'number')
        ? matchResult.data
        : 0;

      return { marketplace: marketplaceTotal, match: matchTotal, total: marketplaceTotal + matchTotal };
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled: !!user,
  });

  return {
    totalUnread: data?.total ?? 0,
    marketplaceUnread: data?.marketplace ?? 0,
    matchUnread: data?.match ?? 0,
    isLoading,
  };
}

