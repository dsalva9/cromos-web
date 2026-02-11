import { useMemo, useCallback, useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';

interface Template {
  id: number;
  author_id: string;
  author_nickname: string;
  title: string;
  description: string | null;
  image_url: string | null;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  pages_count: number;
  total_slots?: number;
  created_at: string;
}

interface UseTemplatesParams {
  search?: string;
  sortBy?: 'recent' | 'rating' | 'popular';
  limit?: number;
  initialData?: Template[];
}

/**
 * Hook for fetching and managing template listings with pagination.
 *
 * Powered by React Query (`useInfiniteQuery`) — provides automatic caching,
 * deduplication, stale-while-revalidate, and background refetching.
 *
 * Search input is debounced by 250ms to avoid excessive API calls.
 */
export function useTemplates({
  search = '',
  sortBy = 'recent',
  limit = 12,
  initialData,
}: UseTemplatesParams = {}) {
  const supabase = useSupabaseClient();

  // Debounce search input by 250ms
  const [deferredSearch, setDeferredSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDeferredSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Only use initialData when filters are at their defaults
  const isDefaultQuery = deferredSearch === '' && sortBy === 'recent';
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
    queryKey: QUERY_KEYS.templates(deferredSearch, sortBy),
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error: rpcError } = await supabase.rpc(
        'list_public_templates',
        {
          p_limit: limit,
          p_offset: pageParam,
          p_search: deferredSearch || undefined,
          p_sort_by: sortBy,
        }
      );

      if (rpcError) throw rpcError;

      return (data || []) as Template[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    ...effectiveInitialData,
  });

  // Flatten all pages into a single array
  const templates = useMemo(
    () => data?.pages.flat() ?? [],
    [data]
  );

  const loading = isLoading || isFetchingNextPage;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Error desconocido')
    : null;
  const hasMore = hasNextPage ?? false;

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNextPage();
    }
  }, [loading, hasMore, fetchNextPage]);

  return {
    templates,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => { refetch(); },
  };
}
