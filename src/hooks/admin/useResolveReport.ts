import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useResolveReport() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const resolveReport = async (
    reportId: string,
    action: 'dismiss' | 'remove_content' | 'suspend_user',
    adminNotes: string
  ): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('resolve_report', {
        p_report_id: parseInt(reportId),
        p_action: action,
        p_admin_notes: adminNotes
      });

      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { resolveReport, loading };
}
