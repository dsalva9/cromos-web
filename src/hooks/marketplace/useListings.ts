import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Listing } from '@/types/v1.6.0';

// Type for the raw RPC response
interface RpcListingResponse {
  id: number;
  user_id: string;
  author_nickname: string;
  author_avatar_url: string | null;
  author_postcode?: string | null;
  title: string;
  description: string | null;
  sticker_number: string | null;
  collection_name: string | null;
  image_url: string | null;
  status: 'active' | 'sold' | 'removed';
  views_count: number;
  created_at: string;
  copy_id: number | null;
  slot_id: number | null;
  distance_km?: number | null;
}

interface UseListingsParams {
  search?: string;
  limit?: number;
  sortByDistance?: boolean;
  viewerPostcode?: string | null;
}

/**
 * Hook for fetching and managing marketplace listings with pagination
 *
 * @param params - Configuration options for listings
 * @param params.search - Optional search query to filter listings by title or collection name
 * @param params.limit - Number of listings per page (default: 20)
 *
 * @returns Object containing:
 * - `listings`: Array of listing objects
 * - `loading`: Boolean indicating if data is being fetched
 * - `error`: Error message if fetch failed, null otherwise
 * - `hasMore`: Boolean indicating if more listings are available
 * - `loadMore`: Function to load next page of listings
 * - `refetch`: Function to reload listings from the beginning
 *
 * @example
 * ```tsx
 * const { listings, loading, loadMore, hasMore } = useListings({
 *   search: 'Panini',
 *   limit: 10
 * });
 *
 * return (
 *   <div>
 *     {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
 *     {hasMore && <button onClick={loadMore}>Cargar más</button>}
 *   </div>
 * );
 * ```
 */
export function useListings({
  search = '',
  limit = 20,
  sortByDistance = false,
  viewerPostcode = null,
}: UseListingsParams = {}) {
  const supabase = useSupabaseClient();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchListings = useCallback(
    async (fetchOffset: number, isLoadMore = false) => {
      try {
        setLoading(true);
        const currentOffset = isLoadMore ? fetchOffset : 0;

        // Use distance-aware RPC if sorting by distance, otherwise use basic filtered RPC
        const rpcName = sortByDistance
          ? 'list_trade_listings_filtered_with_distance'
          : 'list_trade_listings_filtered';

        const rpcParams: Record<string, unknown> = {
          p_limit: limit,
          p_offset: currentOffset,
          p_search: search || null,
        };

        // Add distance params if needed
        if (sortByDistance) {
          rpcParams.p_viewer_postcode = viewerPostcode;
          rpcParams.p_sort_by_distance = true;
        }

        const { data, error: rpcError } = await supabase.rpc(
          rpcName,
          rpcParams
        );

        if (rpcError) throw rpcError;

        // Transform the data to match our Listing interface
        const transformedData = (data || []).map(
          (item: RpcListingResponse) => ({
            id: item.id.toString(),
            user_id: item.user_id,
            author_nickname: item.author_nickname,
            author_avatar_url: item.author_avatar_url,
            author_postcode: item.author_postcode,
            title: item.title,
            description: item.description,
            sticker_number: item.sticker_number,
            collection_name: item.collection_name,
            image_url: item.image_url,
            status: item.status,
            views_count: item.views_count,
            created_at: item.created_at,
            copy_id: item.copy_id?.toString(),
            slot_id: item.slot_id?.toString(),
            distance_km: item.distance_km,
          })
        );

        if (isLoadMore) {
          setListings(prev => [...prev, ...transformedData]);
        } else {
          setListings(transformedData);
        }

        setHasMore((data || []).length === limit);
        if (isLoadMore) {
          setOffset(prev => prev + limit);
        } else {
          setOffset(limit);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [supabase, search, limit, sortByDistance, viewerPostcode]
  );

  useEffect(() => {
    // Debounce initial fetch on search change or sort change
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchListings(0, false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, limit, sortByDistance, viewerPostcode, fetchListings]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchListings(offset, true);
    }
  }, [loading, hasMore, fetchListings, offset]);

  return {
    listings,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchListings(0, false),
  };
}
