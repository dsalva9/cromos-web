import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface ReportDetails {
  report: {
    entity_type: string;
    entity_id: string;
    reason: string;
    description: string | null;
    reporter_nickname: string;
    created_at: string;
  };
  reported_content: Record<string, unknown>;
  reported_user_history?: {
    total_reports_received: number;
    total_listings: number;
    total_templates_created: number;
    rating_avg: number | null;
  };
}

export function useReportDetails(reportId: string) {
  const supabase = useSupabaseClient();
  const [details, setDetails] = useState<ReportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: rpcError } = await supabase.rpc('get_report_details_with_context', {
        p_report_id: parseInt(reportId)
      });

      if (rpcError) throw rpcError;

      if (Array.isArray(data)) {
        setDetails((data[0] as ReportDetails) ?? null);
      } else {
        setDetails((data as ReportDetails) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [supabase, reportId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { details, loading, error };
}
