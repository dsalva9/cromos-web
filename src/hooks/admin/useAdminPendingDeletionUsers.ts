import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { PendingDeletionUser } from '@/types/admin';

export function useAdminPendingDeletionUsers() {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<PendingDeletionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingDeletionUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPendingDeletionUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_get_pending_deletion_users');

      if (rpcError) throw rpcError;

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching pending deletion users:', err);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refetch: fetchPendingDeletionUsers };
}
