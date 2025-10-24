import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  admin_nickname: string | null;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useAuditLog(actionType: string = 'all') {
  const supabase = useSupabaseClient();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const fetchLogs = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      const currentOffset = isLoadMore ? offset : 0;

      let query = supabase
        .from('audit_log')
        .select(`
          *,
          admin:profiles!admin_id(nickname)
        `)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      if (actionType !== 'all') {
        query = query.eq('action_type', actionType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formattedData = (data || []).map((log: { admin?: { nickname?: string } } & Omit<AuditLogEntry, 'admin_nickname'>) => ({
        ...log,
        admin_nickname: log.admin?.nickname || null
      }));

      if (isLoadMore) {
        setLogs(prev => [...prev, ...formattedData]);
      } else {
        setLogs(formattedData);
      }

      setHasMore(formattedData.length === limit);

      if (isLoadMore) {
        setOffset(prev => prev + limit);
      } else {
        setOffset(limit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase, actionType, offset, limit]);

  useEffect(() => {
    setOffset(0);
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchLogs(true);
    }
  }, [loading, hasMore, fetchLogs]);

  return { logs, loading, error, hasMore, loadMore };
}
