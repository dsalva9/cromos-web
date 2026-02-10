import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { PendingDeletionListing } from '@/types/admin';

export function useAdminPendingDeletionListings() {
  const supabase = useSupabaseClient();
  const [listings, setListings] = useState<PendingDeletionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingDeletionListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_get_pending_deletion_listings');

      if (rpcError) throw rpcError;

      setListings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching pending deletion listings:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPendingDeletionListings();
  }, [fetchPendingDeletionListings]);

  return { listings, loading, error, refetch: fetchPendingDeletionListings };
}
