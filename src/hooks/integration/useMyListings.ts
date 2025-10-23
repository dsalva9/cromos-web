import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface MyListing {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  status: string;
  views_count: number;
  created_at: string;
  // Template information
  copy_id: string | null;
  copy_title: string | null;
  template_title: string | null;
  page_number: number | null;
  slot_number: number | null;
  slot_label: string | null;
  // Sync information
  current_status: string | null;
  current_count: number | null;
  sync_status: string | null;
}

export interface MyListingWithAttention extends MyListing {
  listing_id: string;
  collection_name: string | null;
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
        p_status: null // Get all statuses
      });

      if (rpcError) throw rpcError;

      // Transform data to add needs_attention flag and compatibility fields
      const transformedData = (data || []).map((listing: MyListing) => ({
        ...listing,
        id: listing.id?.toString() || '',
        listing_id: listing.id?.toString() || '',
        collection_name: listing.template_title || listing.copy_title || null,
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
