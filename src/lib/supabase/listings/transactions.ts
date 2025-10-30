import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Schemas
const listingTransactionSchema = z.object({
  id: z.number(),
  listing_id: z.number(),
  seller_id: z.string().uuid(),
  buyer_id: z.string().uuid(),
  seller_nickname: z.string(),
  buyer_nickname: z.string(),
  status: z.enum(['reserved', 'pending_completion', 'completed', 'cancelled']),
  reserved_at: z.string(),
  completed_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
});

export type ListingTransaction = z.infer<typeof listingTransactionSchema>;

/**
 * Reserve a listing for a specific buyer
 */
export async function reserveListing(
  supabase: SupabaseClient,
  listingId: number,
  buyerId: string,
  note?: string
): Promise<{ transactionId: number | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('reserve_listing', {
      p_listing_id: listingId,
      p_buyer_id: buyerId,
      p_note: note || null,
    });

    if (error) throw error;

    return { transactionId: data as number, error: null };
  } catch (error) {
    console.error('Error reserving listing:', error);
    return {
      transactionId: null,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudo reservar el anuncio'),
    };
  }
}

/**
 * Complete a listing transaction
 */
export async function completeListingTransaction(
  supabase: SupabaseClient,
  transactionId: number
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('complete_listing_transaction', {
      p_transaction_id: transactionId,
    });

    if (error) throw error;

    return { success: !!data, error: null };
  } catch (error) {
    console.error('Error completing transaction:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudo completar la transacción'),
    };
  }
}

/**
 * Cancel a listing reservation
 */
export async function cancelListingTransaction(
  supabase: SupabaseClient,
  transactionId: number,
  reason: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('cancel_listing_transaction', {
      p_transaction_id: transactionId,
      p_reason: reason,
    });

    if (error) throw error;

    return { success: !!data, error: null };
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudo cancelar la reserva'),
    };
  }
}

/**
 * Unreserve a listing (return to active status)
 */
export async function unreserveListing(
  supabase: SupabaseClient,
  listingId: number
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('unreserve_listing', {
      p_listing_id: listingId,
    });

    if (error) throw error;

    return { success: !!data, error: null };
  } catch (error) {
    console.error('Error unreserving listing:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudo liberar la reserva'),
    };
  }
}

/**
 * Get transaction for a listing
 */
export async function getListingTransaction(
  supabase: SupabaseClient,
  listingId: number
): Promise<{ transaction: ListingTransaction | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_listing_transaction', {
      p_listing_id: listingId,
    });

    if (error) throw error;

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return { transaction: null, error: null };
    }

    const transactionData = Array.isArray(data) ? data[0] : data;
    const validated = listingTransactionSchema.parse(transactionData);

    return { transaction: validated, error: null };
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return {
      transaction: null,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudo obtener la transacción'),
    };
  }
}
