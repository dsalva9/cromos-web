import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useSuspendUser() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const suspendUser = async (userId: string, reason: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('suspend_user_with_reason', {
        p_user_id: userId,
        p_reason: reason
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unsuspendUser = async (userId: string, reason: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('unsuspend_user', {
        p_user_id: userId,
        p_reason: reason
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { suspendUser, unsuspendUser, loading };
}
