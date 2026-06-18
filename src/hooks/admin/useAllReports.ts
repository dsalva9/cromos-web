import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface ReportRecord {
  report_id: number;
  reporter_id: string;
  reporter_nickname: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  reason: string;
  description: string;
  status: string;
  admin_notes: string | null;
  admin_nickname: string | null;
  created_at: string;
  resolved_at: string | null;
}

const PAGE_SIZE = 30;

export function useAllReports(options?: {
  status?: string;
  targetUserId?: string;
  reporterUserId?: string;
}) {
  const supabase = useSupabaseClient();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchReports = useCallback(async (append = false) => {
    try {
      if (!append) {
        setLoading(true);
        offsetRef.current = 0;
      }

      const params: Record<string, unknown> = {
        p_limit: PAGE_SIZE,
        p_offset: offsetRef.current,
      };

      params.p_status = options?.status || 'all';

      params.p_target_user_id = options?.targetUserId || null;
      params.p_reporter_user_id = options?.reporterUserId || null;

      const { data, error: rpcError } = await (supabase.rpc as any)('list_all_reports', params);

      if (rpcError) throw rpcError;

      const results = (data as ReportRecord[]) || [];
      setHasMore(results.length >= PAGE_SIZE);

      if (append) {
        setReports(prev => [...prev, ...results]);
      } else {
        setReports(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase, options?.status, options?.targetUserId, options?.reporterUserId]);

  const loadMore = useCallback(async () => {
    offsetRef.current += PAGE_SIZE;
    await fetchReports(true);
  }, [fetchReports]);

  const refetch = useCallback(async () => {
    offsetRef.current = 0;
    await fetchReports(false);
  }, [fetchReports]);

  useEffect(() => {
    offsetRef.current = 0;
    fetchReports(false);
  }, [fetchReports]);

  return { reports, loading, error, refetch, loadMore, hasMore };
}
