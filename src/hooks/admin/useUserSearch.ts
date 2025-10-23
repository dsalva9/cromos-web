import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface AdminUser {
  user_id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  rating_avg: number;
  rating_count: number;
  active_listings_count: number;
  reports_received_count: number;
  created_at: string;
}

export function useUserSearch(query: string, status: 'all' | 'active' | 'suspended') {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('search_users_admin', {
        p_query: query || null,
        p_status: status,
        p_limit: 50,
        p_offset: 0
      });

      if (rpcError) throw rpcError;

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase, query, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}
