import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export interface FavoriteListing {
  listing_id: string;
  title: string;
  image_url: string;
  status: string;
  is_group: boolean;
  collection_name: string;
  author_nickname: string;
  author_avatar_url: string | null;
  author_id: string;
  created_at: string;
  favorited_at: string;
}

export function useMyFavoriteListings() {
  const supabase = useSupabaseClient();
  const [favorites, setFavorites] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('list_my_favorite_listings', {
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
