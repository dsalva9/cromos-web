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

      const parsedId = parseInt(reportId, 10);

      if (isNaN(parsedId)) {
        throw new Error(`Invalid report ID: ${reportId}`);
      }

      console.log('Resolving report with params:', {
        p_report_id: parsedId,
        p_action: action,
        p_admin_notes: adminNotes
      });

      const { error, data } = await supabase.rpc('resolve_report', {
        p_report_id: parsedId,
        p_action: action,
        p_admin_notes: adminNotes
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Report resolved successfully:', data);
    } catch (error) {
      console.error('Failed to resolve report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { resolveReport, loading };
}
