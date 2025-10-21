import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useUpdateListing() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const updateListing = async (
    listingId: string,
    data: {
      title: string;
      description?: string;
      sticker_number?: string;
      collection_name?: string;
      image_url?: string;
    }
  ): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('update_trade_listing', {
        p_listing_id: parseInt(listingId),
        p_title: data.title,
        p_description: data.description || null,
        p_sticker_number: data.sticker_number || null,
        p_collection_name: data.collection_name || null,
        p_image_url: data.image_url || null,
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { updateListing, loading };
}
