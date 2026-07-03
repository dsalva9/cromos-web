import { useMemo, useCallback, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { Listing } from '@/types/v1.6.0';
import { QUERY_KEYS } from '@/lib/queryKeys';

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
  thumbnail_url?: string | null; // 400px WebP thumbnail
  status: string;  // DB returns string
  views_count: number;
  created_at: string;
  copy_id: number | null;
  slot_id: number | null;
  distance_km?: number | null;
  match_score?: number;
  is_group?: boolean;
  group_count?: number;
  author_completed_trades?: number;
  author_is_patron?: boolean;
}

interface UseListingsParams {
  search?: string;
  limit?: number;
  sortByDistance?: boolean;
  viewerPostcode?: string | null;
  collectionIds?: number[];
  initialData?: Listing[];
  listingTypeFilter?: 'all' | 'cromo' | 'pack';
}

/** Transform raw RPC row into the app-level Listing type */
function transformRow(item: RpcListingResponse): Listing {
  return {
    id: item.id,
    user_id: item.user_id,
    author_nickname: item.author_nickname,
    author_avatar_url: item.author_avatar_url,
    author_postcode: item.author_postcode,
    author_is_suspended: item.author_is_suspended,
    author_deleted_at: item.author_deleted_at,
    deleted_at: item.deleted_at,
    title: item.title,
    description: item.description,
    sticker_number: item.sticker_number,
    collection_name: item.collection_name,
    image_url: item.image_url,
    thumbnail_url: item.thumbnail_url,
    status: item.status,
    views_count: item.views_count,
    created_at: item.created_at,
    copy_id: item.copy_id,
    slot_id: item.slot_id,
    distance_km: item.distance_km,
    is_group: item.is_group,
    group_count: item.group_count,
    author_completed_trades: item.author_completed_trades,
    author_is_patron: item.author_is_patron,
  };
}

/**
 * Hook for fetching and managing marketplace listings with pagination.
 *
 * Powered by React Query (`useInfiniteQuery`) — provides automatic caching,
 * deduplication, stale-while-revalidate, and background refetching.
 *
 * @param params - Configuration options for listings
 * @param params.search - Optional search query to filter listings by title or collection name
 * @param params.limit - Number of listings per page (default: 19)
 * @param params.sortByDistance - Sort listings by distance (requires postcode)
 * @param params.viewerPostcode - User's postcode for distance calculation
 * @param params.collectionIds - Filter by user's collection IDs (template copies)
 * @param params.initialData - Server-fetched data to avoid double fetch on initial render
 *
 * @returns Object containing:
 * - `listings`: Array of listing objects (all pages flattened)
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
  limit = 18,
  sortByDistance = false,
  viewerPostcode = null,
  collectionIds = [],
  initialData,
  listingTypeFilter = 'all',
}: UseListingsParams = {}) {
  const supabase = useSupabaseClient();
  const { profile } = useProfileCompletion();
  const { enabled: multiCountryEnabled } = useFeatureFlag('multi_country');
  const countryCode = multiCountryEnabled ? (profile?.country_code ?? 'ES') : undefined;

  // Stable key for collectionIds to avoid unnecessary refetches when the
  // array reference changes but the contents are the same.
  const collectionIdsKey = useMemo(
    () => JSON.stringify(collectionIds),
    [collectionIds]
  );

  // Use a ref to keep the latest collectionIds for the queryFn,
  // so the function identity doesn't change on every render.
  const collectionIdsRef = useRef(collectionIds);
  collectionIdsRef.current = collectionIds;

  // Only use initialData when filters are at their defaults and limit is the default (18).
  // When filters or limit are modified (e.g. during restoration), the server data is unfiltered or the wrong size.
  const isDefaultQuery = !search && !sortByDistance && collectionIds.length === 0 && limit === 18 && listingTypeFilter === 'all';
  const effectiveInitialData = isDefaultQuery && initialData && initialData.length > 0
    ? { initialData: { pages: [initialData], pageParams: [0] } }
    : {};

  const {
    data,
    error: queryError,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.listings(search, sortByDistance, viewerPostcode, collectionIdsKey, limit, countryCode, listingTypeFilter),
    queryFn: async ({ pageParam = 0 }) => {
      const currentIds = collectionIdsRef.current;
      const hasCollectionFilter = currentIds && currentIds.length > 0;
      const currentLimit = pageParam === 0 ? limit : 20;

      const rpcParams: Record<string, unknown> = {
        p_limit: currentLimit,
        p_offset: pageParam,
        p_search: search || null,
        p_viewer_postcode: viewerPostcode,
        p_sort_by_distance: sortByDistance,
        p_collection_ids: hasCollectionFilter ? currentIds : null,
        p_is_group: listingTypeFilter === 'all' ? null : (listingTypeFilter === 'pack'),
        ...(countryCode ? { p_country_code: countryCode } : {}),
      };

      const { data, error } = await supabase.rpc(
        'list_trade_listings_with_collection_filter',
        rpcParams
      );

      if (error) throw error;

      return (data || []).map((item: RpcListingResponse) => transformRow(item));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page returned fewer items than the limit used for that page, there are no more
      const pageIndex = allPages.length - 1;
      const expectedLimit = pageIndex === 0 ? limit : 20;
      if (lastPage.length < expectedLimit) return undefined;
      // Otherwise the next offset is the total number of items fetched so far
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    ...effectiveInitialData,
  });


  // Flatten all pages into a single array
  const listings = useMemo(
    () => data?.pages.flat() ?? [],
    [data]
  );

  const loading = isLoading || isFetchingNextPage;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;
  const hasMore = hasNextPage ?? false;

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNextPage();
    }
  }, [loading, hasMore, fetchNextPage]);

  return {
    listings,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => { refetch(); },
  };
}
