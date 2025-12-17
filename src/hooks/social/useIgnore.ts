import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';

export function useIgnore() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const ignoreUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        setLoading(true);

        const { error } = await supabase.rpc('ignore_user', {
          p_ignored_user_id: userId,
        });

        if (error) throw error;

        toast.success('Usuario bloqueado correctamente');
        return true;
      } catch (error) {
        console.error('Error ignoring user:', error);
        toast.error(
          error instanceof Error ? error.message : 'Error al bloquear usuario'
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const unignoreUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        setLoading(true);

        const { error } = await supabase.rpc('unignore_user', {
          p_ignored_user_id: userId,
        });

        if (error) throw error;

        toast.success('Usuario desbloqueado correctamente');
        return true;
      } catch (error) {
        console.error('Error unignoring user:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al desbloquear usuario'
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const isUserIgnored = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc('is_user_ignored', {
          p_user_id: userId,
          p_target_user_id: userId,
        });

        if (error) throw error;

        return Boolean(data);
      } catch (error) {
        console.error('Error checking if user is ignored:', error);
        return false;
      }
    },
    [supabase]
  );

  return {
    ignoreUser,
    unignoreUser,
    isUserIgnored,
    loading,
  };
}

export function useIgnoredUsers() {
  const supabase = useSupabaseClient();
  const [ignoredUsers, setIgnoredUsers] = useState<
    {
      ignored_user_id: string;
      nickname: string;
      avatar_url: string | null;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIgnoredUsers = useCallback(
    async (limit = 50, offset = 0) => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc('get_ignored_users', {
          p_limit: limit,
          p_offset: offset,
        });

        if (error) throw error;

        setIgnoredUsers(data || []);
      } catch (err) {
        console.error('Error fetching ignored users:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Error al cargar usuarios bloqueados'
        );
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getIgnoredUsersCount = useCallback(async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_ignored_users_count');

      if (error) throw error;

      return Number(data) || 0;
    } catch (err) {
      console.error('Error getting ignored users count:', err);
      return 0;
    }
  }, [supabase]);

  const removeFromIgnoredList = useCallback((userId: string) => {
    setIgnoredUsers(prev =>
      prev.filter(user => user.ignored_user_id !== userId)
    );
  }, []);

  return {
    ignoredUsers,
    loading,
    error,
    fetchIgnoredUsers,
    getIgnoredUsersCount,
    removeFromIgnoredList,
  };
}
