import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface AdminStats {
  total_users: number;
  total_listings: number;
  total_templates: number;
  total_reports: number;
  pending_reports: number;
  active_listings: number;
  public_templates: number;
  suspended_users: number;
}

export function useAdminStats() {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');

      if (rpcError) throw rpcError;

      // The RPC returns an array with one row, get the first item
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
