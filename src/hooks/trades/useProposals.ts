import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { TradeProposalListItem } from '@/types';
import { QUERY_KEYS } from '@/lib/queryKeys';

export type ProposalBox = 'inbox' | 'outbox' | 'history';
export type ProposalView = 'active' | 'rejected';

interface UseProposalsParams {
  box: ProposalBox;
  view?: ProposalView;
  limit?: number;
}

interface UseProposalsReturn {
  proposals: TradeProposalListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching trade proposals.
 *
 * Powered by React Query (`useQuery`) — provides automatic caching,
 * deduplication, and background refetching. Refetches when box/view change.
 *
 * @param params.box - Which mailbox to show: 'inbox', 'outbox', or 'history'
 * @param params.view - Filter within inbox/outbox: 'active' or 'rejected'
 * @param params.limit - Max results per fetch (default: 20)
 */
export const useProposals = ({
  box,
  view = 'active',
  limit = 20,
}: UseProposalsParams): UseProposalsReturn => {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const {
    data,
    error: queryError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.proposals(box, view),
    queryFn: async () => {
      if (!user) return [];

      // History box: fetch from trades_history
      if (box === 'history') {
        const { data: historyData, error: historyError } = await supabase
          .from('trades_history')
          .select(`
            trade_id,
            status,
            completed_at,
            cancelled_at,
            trade_proposals!inner(
              id,
              collection_id,
              from_user,
              to_user,
              status,
              message,
              created_at,
              updated_at,
              from_user_profile:profiles!trade_proposals_from_user_fkey(nickname),
              to_user_profile:profiles!trade_proposals_to_user_fkey(nickname)
            )
          `)
          .or(`from_user.eq.${user.id},to_user.eq.${user.id}`, {
            foreignTable: 'trade_proposals',
          })
          .order('completed_at', { ascending: false, nullsFirst: false })
          .limit(limit);

        if (historyError) throw new Error('Error al cargar el historial.');

        return (historyData || []).map((item: Record<string, unknown>) => {
          const proposal = Array.isArray(item.trade_proposals)
            ? item.trade_proposals[0]
            : item.trade_proposals;

          return {
            id: proposal?.id || item.trade_id,
            collection_id: proposal?.collection_id || 0,
            from_user_id: proposal?.from_user || '',
            to_user_id: proposal?.to_user || '',
            from_user_nickname: proposal?.from_user_profile?.nickname || null,
            to_user_nickname: proposal?.to_user_profile?.nickname || null,
            status: proposal?.status || 'cancelled',
            message: proposal?.message || null,
            created_at: proposal?.created_at || '',
            updated_at: proposal?.updated_at || '',
            offer_item_count: 0,
            request_item_count: 0,
          } as TradeProposalListItem;
        });
      }

      // Inbox/Outbox: use existing RPC, then filter by view
      // Over-fetch proportionally to compensate for client-side filtering.
      // TODO: add p_statuses param to RPC to filter server-side.
      const fetchLimit = limit * 3;
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'list_trade_proposals',
        { p_user_id: user.id, p_box: box, p_limit: fetchLimit, p_offset: 0 }
      );

      if (rpcError) throw new Error('Error al cargar las propuestas.');

      let filtered: TradeProposalListItem[];

      if (view === 'active') {
        filtered = (rpcData || []).filter(
          (p: TradeProposalListItem) => p.status === 'pending' || p.status === 'accepted'
        );
      } else {
        filtered = (rpcData || []).filter(
          (p: TradeProposalListItem) => p.status === 'rejected' || p.status === 'cancelled'
        );
      }

      return filtered.slice(0, limit);
    },
    enabled: !!user,
  });

  const proposals = useMemo(() => data ?? [], [data]);
  const loading = isLoading;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Ocurrió un error desconocido.')
    : null;

  return {
    proposals,
    loading,
    error,
    refetch: () => { refetch(); },
  };
};
