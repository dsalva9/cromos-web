import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';

interface MissingSlotMatch {
  slot_id: number;
  copy_id: number;
  template_id: number;
  label: string;
}

/**
 * Given a search string, finds if the current user has a missing sticker
 * whose label matches. Used to show the "Usuarios con repe" banner
 * when searching directly in the marketplace.
 */
export function useMissingSlotBySearch(search: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const trimmed = search.trim();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.missingSlotBySearch(trimmed),
    queryFn: async (): Promise<MissingSlotMatch | null> => {
      if (!trimmed || trimmed.length < 2) return null;

      const { data: result, error } = await (supabase.rpc as any)(
        'find_missing_slot_by_search',
        { p_search: trimmed },
      );

      if (error) throw error;
      const rows = result as MissingSlotMatch[] | null;
      return rows && rows.length > 0 ? rows[0] : null;
    },
    enabled: !!user && trimmed.length >= 2,
    staleTime: 60 * 1000,
  });

  return {
    match: data ?? null,
    loading: isLoading,
  };
}
