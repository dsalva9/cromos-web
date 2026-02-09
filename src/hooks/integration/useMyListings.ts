import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface MyListing {
  id: number;
  title: string;
  description: string | null;
  sticker_number: string | null;
  collection_name: string | null;
  image_url: string | null;
  status: string;
  views_count: number;
  created_at: string;
  // Template information
  copy_id: number | null;
  copy_title: string | null;
  template_title: string | null;
  page_number: number | null;
  slot_number: number | null;
  slot_label: string | null;
  // Sync information
  current_status: string | null;
  current_count: number | null;
  sync_status: string | null;
  // Panini metadata
  page_title: string | null;
  slot_variant: string | null;
  global_number: number | null;
  // Deletion metadata
  deleted_at?: string | null;
  scheduled_for?: string | null;
}

export interface MyListingWithAttention extends MyListing {
  listing_id: number;
  needs_attention: boolean;
}

export function useMyListings() {
  const supabase = useSupabaseClient();
  const [listings, setListings] = useState<MyListingWithAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('get_my_listings_with_progress', {
        p_status: undefined // Get all statuses
      });

      if (rpcError) throw rpcError;

      // Transform data to add needs_attention flag and compatibility fields
      const transformedData = (data || []).map((listing: MyListing) => ({
        ...listing,
        id: listing.id,
        listing_id: listing.id,
        needs_attention:
          listing.status === 'active' &&
          listing.copy_id !== null &&
          listing.sync_status === 'out_of_sync'
      }));

      setListings(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, loading, error, refetch: fetchListings };
}
