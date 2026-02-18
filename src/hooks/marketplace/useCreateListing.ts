import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { CreateListingForm } from '@/types/v1.6.0';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';

/**
 * Hook for creating marketplace listings, powered by React Query `useMutation`.
 *
 * On success, automatically:
 * - Invalidates listings cache so new listing appears in the marketplace
 * - Invalidates marketplace availability cache (counts change)
 * - If it's a pack listing with structured `pack_items`, inserts them
 *   into the `listing_pack_items` table for searchability.
 */
export function useCreateListing() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: CreateListingForm): Promise<string> => {
      // 1. Create the listing via RPC
      const { data: result, error } = await supabase.rpc(
        'create_trade_listing',
        {
          p_title: data.title,
          p_description: data.description || '',
          p_sticker_number: data.sticker_number || '',
          p_collection_name: data.collection_name || '',
          p_image_url: data.image_url || '',
          p_copy_id: data.copy_id || undefined,
          p_slot_id: data.slot_id || undefined,
          p_page_number: data.page_number || undefined,
          p_page_title: data.page_title || undefined,
          p_slot_variant: data.slot_variant || undefined,
          p_global_number: data.global_number || undefined,
          p_is_group: data.is_group || false,
          p_group_count: data.group_count || 1,
          p_listing_type: data.listing_type || 'intercambio',
          p_price: data.price || undefined,
        }
      );

      if (error) throw error;
      if (!result) throw new Error('No listing ID returned');

      const listingId = result.toString();

      // 2. If pack listing with structured items, insert into listing_pack_items
      if (data.is_group && data.pack_items && data.pack_items.length > 0) {
        const rows = data.pack_items.map(item => ({
          listing_id: parseInt(listingId),
          template_id: item.template_id,
          slot_number: item.slot_number,
          slot_variant: item.slot_variant ?? null,
          page_title: item.page_title ?? null,
          label: item.label ?? null,
        }));

        const { error: insertError } = await supabase
          .from('listing_pack_items')
          .insert(rows);

        if (insertError) {
          // Non-fatal: listing was created successfully, log and continue
          logger.error('[useCreateListing] Failed to insert pack items:', insertError);
        }
      }

      return listingId;
    },

    onSuccess: () => {
      // Invalidate caches so UI reflects the new listing
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listingsAll() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.marketplaceAvailability() });
    },

    onError: (error) => {
      logger.error('[useCreateListing] Mutation error:', error);
    },
  });

  return {
    createListing: mutation.mutateAsync,
    loading: mutation.isPending,
  };
}
