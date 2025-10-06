import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface TradeMatch {
  match_user_id: string;
  nickname: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
}

interface SearchParams {
  userId: string;
  collectionId: number;
  filters: {
    rarity?: string;
    team?: string;
    query?: string;
    minOverlap?: number;
  };
  limit?: number;
  offset?: number;
}

export function useFindTraders() {
  const { supabase } = useSupabase();
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const searchTrades = useCallback(
    async ({
      userId,
      collectionId,
      filters,
      limit = 20,
      offset = 0,
    }: SearchParams) => {
      try {
        setLoading(true);
        setError(null);

        // Prepare RPC parameters
        const rpcParams = {
          p_user_id: userId,
          p_collection_id: collectionId,
          p_rarity: filters.rarity || null,
          p_team: filters.team || null,
          p_query: filters.query || null,
          p_min_overlap: filters.minOverlap || 1,
          p_limit: limit,
          p_offset: offset,
        };

        // Call the RPC function
        const { data, error: rpcError } = await supabase.rpc(
          'find_mutual_traders',
          rpcParams
        );

        if (rpcError) {
          console.error('RPC error:', rpcError);
          throw new Error('Error al buscar intercambios disponibles');
        }

        const results = data || [];

        // Update state
        if (offset === 0) {
          // New search - replace results
          setMatches(results);
        } else {
          // Pagination - append results
          setMatches(prev => [...prev, ...results]);
        }

        // Update pagination state
        setHasMore(results.length === limit);
        setTotalCount(prev =>
          offset === 0 ? results.length : prev + results.length
        );
      } catch (err: unknown) {
        console.error('Search trades error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Error al buscar intercambios';
        setError(errorMessage);

        // Reset state on error
        if (offset === 0) {
          setMatches([]);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const clearResults = useCallback(() => {
    setMatches([]);
    setTotalCount(0);
    setHasMore(false);
    setError(null);
  }, []);

  return {
    matches,
    loading,
    error,
    hasMore,
    totalCount,
    searchTrades,
    clearResults,
  };
}

