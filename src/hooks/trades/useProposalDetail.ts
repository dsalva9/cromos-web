import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { TradeProposalDetail } from '@/types';

interface UseProposalDetailReturn {
  detail: TradeProposalDetail | null;
  loading: boolean;
  error: string | null;
  fetchDetail: (proposalId: number) => Promise<void>;
  clearDetail: () => void;
}

export const useProposalDetail = (): UseProposalDetailReturn => {
  const { supabase } = useSupabase();
  const [detail, setDetail] = useState<TradeProposalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(
    async (proposalId: number) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_trade_proposal_detail',
          { p_proposal_id: proposalId }
        );

        if (rpcError) throw new Error(rpcError.message);

        setDetail(data);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al cargar los detalles.';
        setError(errorMessage);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const clearDetail = useCallback(() => setDetail(null), []);

  return { detail, loading, error, fetchDetail, clearDetail };
};
