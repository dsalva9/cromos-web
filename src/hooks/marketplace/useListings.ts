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
  author_is_suspended?: boolean;  // Suspension status
  author_deleted_at?: string | null;  // Author deletion timestamp
  deleted_at?: string | null;  // Listing deletion timestamp
  title: string;
  description: string | null;
  sticker_number: string | null;
  collection_name: string | null;
  image_url: string | null;
  status: string;  // DB returns string
  views_count: number;
  created_at: string;
  copy_id: number | null;
  slot_id: number | null;
  distance_km?: number | null;
  match_score?: number;
  is_group?: boolean;
  group_count?: number;
}

interface UseListingsParams {
  search?: string;
  limit?: number;
  sortByDistance?: boolean;
  viewerPostcode?: string | null;
  collectionIds?: number[];
  initialData?: Listing[];
}

/**
 * Hook for fetching and managing marketplace listings with pagination
 *
 * @param params - Configuration options for listings
 * @param params.search - Optional search query to filter listings by title or collection name
 * @param params.limit - Number of listings per page (default: 20)
 * @param params.sortByDistance - Sort listings by distance (requires postcode)
 * @param params.viewerPostcode - User's postcode for distance calculation
 * @param params.collectionIds - Filter by user's collection IDs (template copies)
 * @param params.initialData - Server-fetched data to avoid double fetch on initial render
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
  collectionIds = [],
  initialData,
}: UseListingsParams = {}) {
  const supabase = useSupabaseClient();
  // Initialize with server data if provided
  const [listings, setListings] = useState<Listing[]>(initialData ?? []);
  // If we have initial data, skip initial loading state
  const [loading, setLoading] = useState(initialData ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(initialData ? initialData.length : 0);
  const [hasMore, setHasMore] = useState(initialData ? initialData.length === limit : true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  // Track if this is the first render with server data
  const isInitialRender = useRef(!!initialData);

  const fetchListings = useCallback(
    async (fetchOffset: number, isLoadMore = false) => {
      try {
        setLoading(true);
        const currentOffset = isLoadMore ? fetchOffset : 0;

        // Always use the new collection filter RPC (it handles all cases including basic filtering)
        // This ensures own listings are always excluded
        const hasCollectionFilter = collectionIds && collectionIds.length > 0;
        const rpcName = 'list_trade_listings_with_collection_filter';

        const rpcParams: Record<string, unknown> = {
          p_limit: limit,
          p_offset: currentOffset,
          p_search: search || null,
          p_viewer_postcode: viewerPostcode,
          p_sort_by_distance: sortByDistance,
          p_collection_ids: hasCollectionFilter ? collectionIds : null,
        };

        const { data, error: rpcError } = await supabase.rpc(
          rpcName,
          rpcParams
        );

        if (rpcError) throw rpcError;

        // Transform the data to match our Listing interface
        const transformedData = (data || []).map(
          (item: RpcListingResponse) => ({
            id: item.id,
            user_id: item.user_id,
            author_nickname: item.author_nickname,
            author_avatar_url: item.author_avatar_url,
            author_postcode: item.author_postcode,
            author_is_suspended: item.author_is_suspended,  // Include suspension status
            author_deleted_at: item.author_deleted_at,  // Include author deletion timestamp
            deleted_at: item.deleted_at,  // Include listing deletion timestamp
            title: item.title,
            description: item.description,
            sticker_number: item.sticker_number,
            collection_name: item.collection_name,
            image_url: item.image_url,
            status: item.status,
            views_count: item.views_count,
            created_at: item.created_at,
            copy_id: item.copy_id,
            slot_id: item.slot_id,
            distance_km: item.distance_km,
            is_group: item.is_group,
            group_count: item.group_count,
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
    [supabase, search, limit, sortByDistance, viewerPostcode, collectionIds]
  );

  useEffect(() => {
    // Skip initial fetch if we have server data and filters are at defaults
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // Only skip if using default filters
      if (search === '' && !sortByDistance && collectionIds.length === 0) {
        return;
      }
    }

    // Debounce fetch on filter change
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchListings(0, false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, limit, sortByDistance, viewerPostcode, JSON.stringify(collectionIds)]);

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
