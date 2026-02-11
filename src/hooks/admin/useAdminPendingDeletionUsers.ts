import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { PendingDeletionUser } from '@/types/admin';
import { logger } from '@/lib/logger';

export function useAdminPendingDeletionUsers() {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<PendingDeletionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingDeletionUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_get_pending_deletion_users');

      if (rpcError) throw rpcError;

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      logger.error('Error fetching pending deletion users:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPendingDeletionUsers();
  }, [fetchPendingDeletionUsers]);

  return { users, loading, error, refetch: fetchPendingDeletionUsers };
}
