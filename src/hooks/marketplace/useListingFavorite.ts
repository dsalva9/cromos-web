import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useListingFavorite() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const checkFavorite = useCallback(async (listingId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_favourited', {
        p_target_type: 'listing',
        p_target_id: listingId
      });

      if (error) throw error;

      return data || false;
    } catch {
      return false;
    }
  }, [supabase]);

  const toggleFavorite = useCallback(async (listingId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('toggle_favourite', {
        p_target_type: 'listing',
        p_target_id: listingId
      });

      if (error) throw error;

      return data; // true if added, false if removed
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { checkFavorite, toggleFavorite, loading };
}
