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
            avatar_url
          )
        `
        )
        .eq('id', listingId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setListing({
          id: data.id.toString(),
          user_id: data.user_id,
          author_nickname: data.author.nickname,
          author_avatar_url: data.author.avatar_url,
          title: data.title,
          description: data.description,
          sticker_number: data.sticker_number,
          collection_name: data.collection_name,
          image_url: data.image_url,
          status: data.status,
          views_count: data.views_count,
          created_at: data.created_at,
          copy_id: data.copy_id?.toString(),
          slot_id: data.slot_id?.toString(),
          // Panini metadata
          page_number: data.page_number,
          page_title: data.page_title,
          slot_variant: data.slot_variant,
          global_number: data.global_number,
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
        .eq('id', listingId);

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
