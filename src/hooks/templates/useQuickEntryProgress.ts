import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export interface QuickEntrySlot {
  slot_id: number;
  page_id: number;
  page_number: number;
  page_title: string;
  slot_number: number;
  slot_variant: string | null;
  global_number: number | null;
  label: string | null;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
}

/**
 * Hook for quick entry progress updates
 * Provides optimized methods for batch updates and quick single-slot updates
 *
 * @returns Object containing:
 * - `updateSlot`: Function to update a single slot's progress
 * - `updateSlotByGlobalNumber`: Function to update by global checklist number
 * - `loading`: Boolean indicating if an update is in progress
 * - `error`: Error message if update failed, null otherwise
 *
 * @example
 * ```tsx
 * const { updateSlot, updateSlotByGlobalNumber } = useQuickEntryProgress();
 *
 * // Update by slot ID
 * await updateSlot(copyId, slotId, 'owned', 0);
 *
 * // Update by global number (faster for quick entry)
 * await updateSlotByGlobalNumber(copyId, 123, 'owned', 0);
 * ```
 */
export function useQuickEntryProgress() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update a single slot's progress
   */
  const updateSlot = useCallback(
    async (
      copyId: number,
      slotId: number,
      status: 'missing' | 'owned' | 'duplicate',
      count: number = 0
    ): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const { error: rpcError } = await supabase.rpc('update_slot_progress', {
          p_copy_id: copyId,
          p_slot_id: slotId,
          p_status: status,
          p_count: count,
        });

        if (rpcError) throw rpcError;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Update a slot by its global checklist number
   * This is faster for quick entry mode as it does the lookup in one RPC call
   */
  const updateSlotByGlobalNumber = useCallback(
    async (
      copyId: number,
      globalNumber: number,
      status: 'missing' | 'owned' | 'duplicate',
      count: number = 0
    ): Promise<QuickEntrySlot | null> => {
      try {
        setLoading(true);
        setError(null);

        // First, get the slot by global number
        const { data: slotData, error: slotError } = await supabase.rpc(
          'get_slot_by_global_number',
          {
            p_copy_id: copyId,
            p_global_number: globalNumber,
          }
        );

        if (slotError) throw slotError;

        if (!slotData || slotData.length === 0) {
          throw new Error(`No se encontró el cromo número ${globalNumber}`);
        }

        const slot = slotData[0] as QuickEntrySlot;

        // Then update the progress
        const { error: updateError } = await supabase.rpc('update_slot_progress', {
          p_copy_id: copyId,
          p_slot_id: slot.slot_id,
          p_status: status,
          p_count: count,
        });

        if (updateError) throw updateError;

        return { ...slot, status, count };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Batch update multiple slots at once
   * Useful for marking multiple stickers from a pack
   */
  const batchUpdateSlots = useCallback(
    async (
      copyId: number,
      updates: Array<{
        slotId: number;
        status: 'missing' | 'owned' | 'duplicate';
        count?: number;
      }>
    ): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        // Execute all updates in parallel
        await Promise.all(
          updates.map(update =>
            supabase.rpc('update_slot_progress', {
              p_copy_id: copyId,
              p_slot_id: update.slotId,
              p_status: update.status,
              p_count: update.count || 0,
            })
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    updateSlot,
    updateSlotByGlobalNumber,
    batchUpdateSlots,
    loading,
    error,
  };
}
