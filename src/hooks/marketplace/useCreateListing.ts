import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { CreateListingForm } from '@/types/v1.6.0';

export function useCreateListing() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const createListing = async (data: CreateListingForm): Promise<string> => {
    try {
      setLoading(true);

      const { data: result, error } = await supabase.rpc(
        'create_trade_listing',
        {
          p_title: data.title,
          p_description: data.description || null,
          p_sticker_number: data.sticker_number || null,
          p_collection_name: data.collection_name || null,
          p_image_url: data.image_url || null,
        }
      );

      if (error) throw error;
      if (!result) throw new Error('No listing ID returned');

      return result.toString();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { createListing, loading };
}
