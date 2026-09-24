import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import {
  reserveListing,
  unreserveListing,
  getListingTransaction,
  ListingTransaction,
} from '@/lib/supabase/listings/transactions';
import { toast } from '@/lib/toast';

export function useListingWorkflow(listingId: number) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [transaction, setTransaction] = useState<ListingTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Fetch transaction
  const fetchTransaction = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { transaction: txn } = await getListingTransaction(supabase, listingId);
    setTransaction(txn);
    setLoading(false);
  }, [supabase, listingId, user]);

  useEffect(() => {
    void fetchTransaction();
  }, [fetchTransaction]);

  // Reserve listing
  const handleReserve = useCallback(
    async (buyerId: string, note?: string) => {
      if (!user || processing) return;

      setProcessing(true);
      const { transactionId, error } = await reserveListing(
        supabase,
        listingId,
        buyerId,
        note
      );

      if (error) {
        toast.error(error.message);
      } else if (transactionId) {
        toast.success('Anuncio reservado correctamente');
        await fetchTransaction();
      }

      setProcessing(false);
    },
    [supabase, listingId, user, processing, fetchTransaction]
  );

  // Unreserve listing (return to active)
  const handleUnreserve = useCallback(async () => {
    if (!user || processing) return;

    if (!confirm('¿Seguro que quieres liberar la reserva? El anuncio volverá a estar disponible para todos.')) return;

    setProcessing(true);
    const { success, error } = await unreserveListing(supabase, listingId);

    if (error) {
      toast.error(error.message);
    } else if (success) {
      toast.success('Reserva liberada correctamente');
      await fetchTransaction();
    }

    setProcessing(false);
  }, [supabase, listingId, user, processing, fetchTransaction]);

  return {
    transaction,
    loading,
    processing,
    refetch: fetchTransaction,
    reserveListing: handleReserve,
    unreserveListing: handleUnreserve,
  };
}
