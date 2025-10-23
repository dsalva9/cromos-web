import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useMarkSold() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const markSold = async (listingId: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('mark_listing_sold_and_decrement', {
        p_listing_id: parseInt(listingId)
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { markSold, loading };
}
