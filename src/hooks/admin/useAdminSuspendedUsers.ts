import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { SuspendedUser } from '@/types/admin';

export function useAdminSuspendedUsers() {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<SuspendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuspendedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuspendedUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_get_suspended_users');

      if (rpcError) throw rpcError;

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching suspended users:', err);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refetch: fetchSuspendedUsers };
}
