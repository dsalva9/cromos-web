import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Listing } from '@/types/v1.6.0';
import { logger } from '@/lib/logger';

export function useListing(listingId: string) {
  const supabase = useSupabaseClient();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);

      // Get listing with author info
      const { data, error: fetchError } = await supabase
        .from('trade_listings')
        .select(
          `
          *,
          author:profiles!user_id (
            nickname,
            avatar_url,
            is_suspended,
            deleted_at
          )
        `
        )
        .eq('id', parseInt(listingId))
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setListing({
          id: data.id,
          user_id: data.user_id,
          author_nickname: data.author.nickname ?? '',
          author_avatar_url: data.author.avatar_url ?? null,
          author_is_suspended: data.author.is_suspended,  // Include suspension status
          author_deleted_at: data.author.deleted_at,  // Include author deletion timestamp
          deleted_at: data.deleted_at,  // Include listing deletion timestamp
          title: data.title,
          description: data.description,
          sticker_number: data.sticker_number,
          collection_name: data.collection_name,
          image_url: data.image_url,
          status: data.status ?? 'active',
          views_count: data.views_count ?? 0,
          created_at: data.created_at ?? '',
          copy_id: data.copy_id,
          slot_id: data.slot_id,
          // Panini metadata
          page_number: data.page_number,
          page_title: data.page_title,
          slot_variant: data.slot_variant,
          global_number: data.global_number,
          // Pack/individual listing type
          is_group: data.is_group,
          group_count: data.group_count,
          // Listing type (exchange/sale/both) — cast through any until DB types are regenerated
          listing_type: (data as any).listing_type || 'intercambio',
          price: (data as any).price,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase, listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const incrementViews = useCallback(async () => {
    try {
      await supabase
        .from('trade_listings')
        .update({ views_count: (listing?.views_count || 0) + 1 })
        .eq('id', parseInt(listingId));

      // Update local state
      setListing(prev =>
        prev ? { ...prev, views_count: prev.views_count + 1 } : null
      );
    } catch (err) {
      logger.error('Failed to increment views:', err);
    }
  }, [supabase, listingId, listing?.views_count]);

  const deleteListing = useCallback(async () => {
    try {
      const { error: deleteError } = await supabase.rpc(
        'update_listing_status',
        {
          p_listing_id: parseInt(listingId),
          p_new_status: 'removed',
        }
      );

      if (deleteError) throw deleteError;
    } catch (err) {
      throw err;
    }
  }, [supabase, listingId]);

  return {
    listing,
    loading,
    error,
    incrementViews,
    deleteListing,
    refetch: fetchListing,
  };
}
