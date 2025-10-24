import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import {
  reserveListing,
  completeListingTransaction,
  cancelListingTransaction,
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

  // Complete transaction
  const handleComplete = useCallback(async () => {
    if (!user || !transaction || processing) return;

    if (!confirm('¿Confirmar que la transacción se ha completado?')) return;

    setProcessing(true);
    const { success, error } = await completeListingTransaction(
      supabase,
      transaction.id
    );

    if (error) {
      toast.error(error.message);
    } else if (success) {
      toast.success('Transacción completada');
      await fetchTransaction();
    }

    setProcessing(false);
  }, [supabase, transaction, user, processing, fetchTransaction]);

  // Cancel reservation
  const handleCancel = useCallback(
    async (reason: string) => {
      if (!user || !transaction || processing) return;

      setProcessing(true);
      const { success, error } = await cancelListingTransaction(
        supabase,
        transaction.id,
        reason
      );

      if (error) {
        toast.error(error.message);
      } else if (success) {
        toast.success('Reserva cancelada');
        await fetchTransaction();
      }

      setProcessing(false);
    },
    [supabase, transaction, user, processing, fetchTransaction]
  );

  return {
    transaction,
    loading,
    processing,
    refetch: fetchTransaction,
    reserveListing: handleReserve,
    completeTransaction: handleComplete,
    cancelReservation: handleCancel,
  };
}
