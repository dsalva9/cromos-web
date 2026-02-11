import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface UserCollection {
  copy_id: number;
  template_id: number;
  title: string;
  is_active: boolean;
  copied_at: string;
}

/**
 * Hook for fetching user's template copies (collections).
 * Used for collection filter and listing form dropdowns.
 *
 * Powered by React Query — provides automatic caching,
 * deduplication, and stale-while-revalidate.
 *
 * @returns Object containing:
 * - `collections`: Array of user's collection copies
 * - `loading`: Boolean indicating if data is being fetched
 * - `error`: Error message if fetch failed, null otherwise
 * - `refetch`: Function to manually reload collections
 *
 * @example
 * ```tsx
 * const { collections, loading, error } = useUserCollections();
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return (
 *   <select>
 *     {collections.map(col => (
 *       <option key={col.copy_id} value={col.copy_id}>
 *         {col.title}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useUserCollections() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  const {
    data,
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.userCollections(),
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc(
        'get_user_collections',
        {}
      );

      if (rpcError) throw rpcError;

      return (data || []) as UserCollection[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — collections rarely change
  });

  const collections = data ?? [];
  const loading = isLoading;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Unknown error')
    : null;

  return {
    collections,
    loading,
    error,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userCollections() });
    },
  };
}
