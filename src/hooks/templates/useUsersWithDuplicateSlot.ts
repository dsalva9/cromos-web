import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';
import { isTransientNetworkError } from '@/lib/supabase/notifications';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';

export interface UserWithDuplicateSlot {
  match_user_id: string;
  nickname: string;
  avatar_url: string | null;
  postcode: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
  distance_km: number | null;
}

/**
 * Returns other users who have a specific sticker as a duplicate,
 * along with their mutual trade overlap.
 *
 * Used by the sticker tile drawer to find trade partners for missing stickers.
 */
export function useUsersWithDuplicateSlot(slotId: number | null, copyId: number) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.usersWithDuplicateSlot(slotId, copyId),
    queryFn: async (): Promise<UserWithDuplicateSlot[]> => {
      if (!slotId || !copyId) return [];

      const { data: result, error: rpcError } = await (supabase.rpc as any)(
        'find_users_with_duplicate_slot',
        {
          p_slot_id: slotId,
          p_copy_id: copyId,
        }
      );

      if (rpcError) {
        if (isTransientNetworkError(rpcError)) {
          logger.info('[useUsersWithDuplicateSlot] RPC aborted (navigation):', rpcError);
        } else {
          logger.error('[useUsersWithDuplicateSlot] RPC error:', rpcError);
        }
        throw rpcError;
      }

      return ((result as UserWithDuplicateSlot[]) ?? []).map((u) => ({
        ...u,
        avatar_url: resolveAvatarUrl(u.avatar_url, supabase),
      }));
    },
    enabled: !!user && !!slotId && !!copyId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
    refetch,
  };
}
