import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { PendingDeletionTemplate } from '@/types/admin';

export function useAdminPendingDeletionTemplates() {
  const supabase = useSupabaseClient();
  const [templates, setTemplates] = useState<PendingDeletionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingDeletionTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_get_pending_deletion_templates');

      if (rpcError) throw rpcError;

      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching pending deletion templates:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPendingDeletionTemplates();
  }, [fetchPendingDeletionTemplates]);

  return { templates, loading, error, refetch: fetchPendingDeletionTemplates };
}
