import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export interface UserCollection {
  copy_id: number;
  template_id: number;
  title: string;
  is_active: boolean;
  copied_at: string;
}

/**
 * Hook for fetching user's template copies (collections)
 * Used for collection filter and listing form dropdowns
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
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        'get_user_collections',
        {}
      );

      if (rpcError) throw rpcError;

      setCollections(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return {
    collections,
    loading,
    error,
    refetch: fetchCollections,
  };
}
