import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';

/**
 * Hook to check if a feature flag is enabled for the current user.
 * Uses React Query for caching (5 min stale time).
 * Returns false while loading or on error (safe default).
 *
 * Resolution order:
 * 1. Per-user override (user_feature_overrides)
 * 2. Global flag value (feature_flags.enabled)
 * 3. false (default)
 */
export function useFeatureFlag(flagId: string): { enabled: boolean; loading: boolean } {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', flagId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_feature_flag', {
        p_flag_id: flagId,
      });
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    enabled: data ?? false,
    loading: isLoading,
  };
}
