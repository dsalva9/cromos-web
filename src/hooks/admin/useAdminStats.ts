import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface AdminStats {
  total_users: number;
  active_users_last_30_days: number;
  suspended_users: number;
  pending_reports: number;
  active_listings: number;
  public_templates: number;
  completed_trades_last_30_days: number;
  total_admin_actions_last_30_days: number;
}

export function useAdminStats() {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('get_admin_stats');

      if (rpcError) throw rpcError;

      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchStats };
}
