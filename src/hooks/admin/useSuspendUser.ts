import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

export function useSuspendUser() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const suspendUser = async (userId: string, reason: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('admin_suspend_account', {
        p_user_id: userId,
        p_reason: reason
      });

      if (error) {
        logger.error('Suspend user error:', error);
        throw error;
      }
    } catch (error) {
      logger.error('Suspend user catch:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unsuspendUser = async (userId: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('admin_unsuspend_account', {
        p_user_id: userId
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
