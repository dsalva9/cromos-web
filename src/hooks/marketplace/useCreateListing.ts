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
          p_description: data.description || '',
          p_sticker_number: data.sticker_number || '',
          p_collection_name: data.collection_name || '',
          p_image_url: data.image_url || '',
          p_copy_id: data.copy_id || 0,
          p_slot_id: data.slot_id || 0,
          p_page_number: data.page_number || undefined,
          p_page_title: data.page_title || undefined,
          p_slot_variant: data.slot_variant || undefined,
          p_global_number: data.global_number || undefined,
          p_is_group: data.is_group || false,
          p_group_count: data.group_count || 1,
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
