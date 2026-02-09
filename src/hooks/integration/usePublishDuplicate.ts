import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function usePublishDuplicate() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const publishDuplicate = async (
    copyId: number,
    slotId: number,
    customData?: {
      title?: string;
      description?: string;
      sticker_number?: string;
      collection_name?: string;
      image_url?: string;
    }
  ): Promise<string> => {
    try {
      setLoading(true);

      // Create the listing via RPC with the required fields
      const { data, error } = await supabase.rpc('publish_duplicate_to_marketplace', {
        p_copy_id: copyId,
        p_slot_id: slotId,
        p_title: customData?.title || 'Cromo',
        p_description: customData?.description || undefined,
        p_image_url: customData?.image_url || undefined
      });

      if (error) throw error;
      if (!data) throw new Error('No se devolvió ID del anuncio');

      const listingId = data.toString();

      // Update additional fields that RPC doesn't handle (sticker_number, collection_name)
      if (customData?.sticker_number || customData?.collection_name) {
        const updates: Record<string, string> = {};
        if (customData.sticker_number) updates.sticker_number = customData.sticker_number;
        if (customData.collection_name) updates.collection_name = customData.collection_name;

        const { error: updateError } = await supabase
          .from('trade_listings')
          .update(updates)
          .eq('id', parseInt(listingId));

        if (updateError) throw updateError;
      }

      return listingId;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { publishDuplicate, loading };
}
