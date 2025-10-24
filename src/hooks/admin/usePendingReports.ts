import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface PendingReport {
  report_id: number;
  reporter_nickname: string;
  entity_type: string;
  entity_id: number;
  reason: string;
  description: string | null;
  created_at: string;
}

export function usePendingReports() {
  const supabase = useSupabaseClient();
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('list_pending_reports', {
        p_limit: 50,
        p_offset: 0
      });

      if (rpcError) throw rpcError;

      setReports(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
