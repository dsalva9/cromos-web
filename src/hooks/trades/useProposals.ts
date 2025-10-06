import { useState, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { TradeProposalListItem } from '@/types';

interface UseProposalsReturn {
  proposals: TradeProposalListItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchProposals: (params: {
    box: 'inbox' | 'outbox';
    limit: number;
    offset: number;
  }) => Promise<void>;
  clearProposals: () => void;
}

export const useProposals = (): UseProposalsReturn => {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [proposals, setProposals] = useState<TradeProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchProposals = useCallback(
    async ({
      box,
      limit,
      offset,
    }: {
      box: 'inbox' | 'outbox';
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
        const { data, error: rpcError } = await supabase.rpc(
          'list_trade_proposals',
          { p_user_id: user.id, p_box: box, p_limit: limit, p_offset: offset }
        );

        if (rpcError) throw new Error('Error al cargar las propuestas.');

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

