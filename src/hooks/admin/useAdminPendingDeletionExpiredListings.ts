import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { PendingDeletionListing } from '@/types/admin';
import { logger } from '@/lib/logger';

export function useAdminPendingDeletionExpiredListings() {
  const supabase = useSupabaseClient();
  const [listings, setListings] = useState<PendingDeletionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingDeletionExpiredListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_get_pending_deletion_expired_listings');

      if (rpcError) throw rpcError;

      setListings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      logger.error('Error fetching pending deletion expired listings:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPendingDeletionExpiredListings();
  }, [fetchPendingDeletionExpiredListings]);

  return { listings, loading, error, refetch: fetchPendingDeletionExpiredListings };
}
