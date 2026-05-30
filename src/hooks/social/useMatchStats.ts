import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useMatchStats(userId: string | undefined) {
  const supabase = useSupabaseClient();
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      try {
        // Use raw SQL via rpc since match_conversations isn't in generated types yet
        const { data, error } = await supabase.rpc(
          'get_match_count' as never,
          { p_user_id: userId } as never,
        );

        if (!cancelled && !error && data !== null) {
          setMatchCount(typeof data === 'number' ? data : 0);
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [userId, supabase]);

  return { matchCount, loading };
}
