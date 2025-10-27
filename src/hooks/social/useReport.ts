import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useReport() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const submitReport = async (
    entityType: string,
    entityId: string,
    reason: string,
    description?: string
  ): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('create_report', {
        p_target_type: entityType,
        p_target_id: parseInt(entityId),
        p_reason: reason,
        p_description: description || null,
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { submitReport, loading };
}
