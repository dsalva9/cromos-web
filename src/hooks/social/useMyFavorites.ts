import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface Favorite {
  favorite_user_id: string;
  nickname: string;
  avatar_url: string | null;
  active_listings_count: number;
  rating_avg: number;
  created_at: string;
}

export function useMyFavorites() {
  const supabase = useSupabaseClient();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('list_my_favourites', {
        p_limit: 100,
        p_offset: 0
      });

      if (rpcError) throw rpcError;

      setFavorites(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return { favorites, loading, error, refetch: fetchFavorites };
}
