import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export interface TemplateSlot {
  slot_id: number;
  page_title: string;
  page_number: number;
  slot_number: number;
  slot_label: string | null;
  is_special: boolean;
  user_status: 'missing' | 'owned' | 'duplicate';
  user_count: number;
}

/**
 * Hook for fetching template slots for a specific copy
 * Used for slot selection in listing form when user selects a collection
 *
 * @returns Object containing:
 * - `slots`: Array of template slots with user progress
 * - `loading`: Boolean indicating if data is being fetched
 * - `error`: Error message if fetch failed, null otherwise
 * - `fetchSlots`: Function to manually fetch slots for a copy_id
 *
 * @example
 * ```tsx
 * const { slots, loading, fetchSlots } = useTemplateSlots();
 *
 * // When user selects a collection
 * const handleCollectionSelect = async (copyId: number) => {
 *   await fetchSlots(copyId);
 * };
 * ```
 */
export function useTemplateSlots() {
  const supabase = useSupabaseClient();
  const [slots, setSlots] = useState<TemplateSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(
    async (copyId: number): Promise<TemplateSlot[]> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc(
          'get_template_copy_slots',
          {
            p_copy_id: copyId,
          }
        );

        if (rpcError) throw rpcError;

        const fetchedSlots = (data || []) as TemplateSlot[];
        setSlots(fetchedSlots);
        return fetchedSlots;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setSlots([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    slots,
    loading,
    error,
    fetchSlots,
  };
}
