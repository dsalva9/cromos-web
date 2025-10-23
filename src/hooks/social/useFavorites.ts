import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useFavorites() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const checkFavorite = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('favorite_user_id')
        .eq('favorite_user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch {
      return false;
    }
  };

  const toggleFavorite = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('toggle_favourite', {
        p_target_user_id: userId
      });

      if (error) throw error;

      return data; // true if added, false if removed
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { checkFavorite, toggleFavorite, loading };
}
