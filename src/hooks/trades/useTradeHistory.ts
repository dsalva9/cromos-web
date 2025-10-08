import { useState, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';

interface TradeHistoryItem {
  id: number;
  collection_id: number;
  from_user: string;
  to_user: string;
  from_user_nickname: string | null;
  to_user_nickname: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  created_at: string;
  updated_at: string;
  offer_count: number;
  request_count: number;
  history_status: 'completed' | 'cancelled';
  completed_at: string | null;
  cancelled_at: string | null;
}

interface UseTradeHistoryReturn {
  history: TradeHistoryItem[];
  loading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
  clearHistory: () => void;
}

export const useTradeHistory = (): UseTradeHistoryReturn => {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch completed/cancelled trades from trades_history
      const { data, error: queryError } = await supabase
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
        .order('cancelled_at', { ascending: false, nullsFirst: false });

      if (queryError) throw new Error('Error al cargar el historial.');

      // Transform data to match interface
      const transformed: TradeHistoryItem[] = (data || []).map((item: Record<string, unknown>) => {
        const proposal = Array.isArray(item.trade_proposals)
          ? item.trade_proposals[0]
          : item.trade_proposals;

        return {
          id: proposal?.id || item.trade_id,
          collection_id: proposal?.collection_id || 0,
          from_user: proposal?.from_user || '',
          to_user: proposal?.to_user || '',
          from_user_nickname: proposal?.from_user_profile?.nickname || null,
          to_user_nickname: proposal?.to_user_profile?.nickname || null,
          status: proposal?.status || 'cancelled',
          message: proposal?.message || null,
          created_at: proposal?.created_at || '',
          updated_at: proposal?.updated_at || '',
          offer_count: 0, // Would need to join trade_proposal_items to get counts
          request_count: 0,
          history_status: (item.status as 'completed' | 'cancelled') || 'cancelled',
          completed_at: item.completed_at as string | null,
          cancelled_at: item.cancelled_at as string | null,
        };
      });

      setHistory(transformed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setError(null);
  }, []);

  return { history, loading, error, fetchHistory, clearHistory };
};
