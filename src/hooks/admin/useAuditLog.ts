import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  admin_nickname: string | null;
  action_type: string; // For display - maps to moderation_action_type
  moderation_action_type: string | null; // Actual DB column
  target_type: string; // For display - maps to moderated_entity_type
  moderated_entity_type: string | null; // Actual DB column
  target_id: string; // For display - maps to moderated_entity_id
  moderated_entity_id: number | null; // Actual DB column
  reason: string | null; // For display - maps to moderation_reason
  moderation_reason: string | null; // Actual DB column
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

      // Build query - select all columns from audit_log
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      // Apply filter by moderation_action_type if not 'all'
      if (actionType !== 'all') {
        query = query.eq('moderation_action_type', actionType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Map database columns to display-friendly interface
      const formattedData = (data || []).map((log: any) => ({
        id: log.id,
        admin_id: log.admin_id,
        admin_nickname: log.admin_nickname,
        // Map moderation columns to display properties
        action_type: log.moderation_action_type || log.action || 'unknown',
        moderation_action_type: log.moderation_action_type,
        target_type: log.moderated_entity_type || log.entity_type || 'unknown',
        moderated_entity_type: log.moderated_entity_type,
        target_id: String(log.moderated_entity_id || log.entity_id || ''),
        moderated_entity_id: log.moderated_entity_id,
        reason: log.moderation_reason || null,
        moderation_reason: log.moderation_reason,
        metadata: log.metadata || log.old_values || log.new_values || null,
        created_at: log.created_at,
      })) as AuditLogEntry[];

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
