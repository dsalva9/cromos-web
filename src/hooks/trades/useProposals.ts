import { useState, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { TradeProposalListItem } from '@/types';

export type ProposalBox = 'inbox' | 'outbox' | 'history';
export type ProposalView = 'active' | 'rejected';

interface UseProposalsReturn {
  proposals: TradeProposalListItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchProposals: (params: {
    box: ProposalBox;
    view?: ProposalView;
    limit: number;
    offset: number;
  }) => Promise<void>;
  clearProposals: () => void;
}

export const useProposals = (): UseProposalsReturn => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [proposals, setProposals] = useState<TradeProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchProposals = useCallback(
    async ({
      box,
      view = 'active',
      limit,
      offset,
    }: {
      box: ProposalBox;
      view?: ProposalView;
      limit: number;
      offset: number;
    }) => {
      if (!user) {
        setProposals([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let data: TradeProposalListItem[] | null = null;

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
            .range(offset, offset + limit - 1);

          if (historyError) throw new Error('Error al cargar el historial.');

          // Transform history data to match TradeProposalListItem
          data = (historyData || []).map((item: Record<string, unknown>) => {
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
            };
          });
        } else {
          // Inbox/Outbox: use existing RPC, then filter by view
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            'list_trade_proposals',
            { p_user_id: user.id, p_box: box, p_limit: limit + 50, p_offset: offset }
          );

          if (rpcError) throw new Error('Error al cargar las propuestas.');

          // Filter based on view
          if (view === 'active') {
            // Active: pending + accepted
            data = (rpcData || []).filter(
              (p: TradeProposalListItem) => p.status === 'pending' || p.status === 'accepted'
            );
          } else {
            // Rejected: rejected + cancelled (for outbox, cancelled means sender cancelled it)
            data = (rpcData || []).filter(
              (p: TradeProposalListItem) => p.status === 'rejected' || p.status === 'cancelled'
            );
          }

          // Limit to requested count after filtering
          data = data ? data.slice(0, limit) : [];
        }

        setProposals(prev =>
          offset === 0 ? data || [] : [...prev, ...(data || [])]
        );
        setHasMore((data || []).length === limit);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Ocurrió un error desconocido.'
        );
      } finally {
        setLoading(false);
      }
    },
    [supabase, user]
  );

  const clearProposals = useCallback(() => {
    setProposals([]);
    setHasMore(false);
    setError(null);
  }, []);

  return { proposals, loading, error, hasMore, fetchProposals, clearProposals };
};

