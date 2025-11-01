import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import type { SlotProgress } from '@/types/v1.6.0';

interface TemplateCopy {
  copy_id: string;
  template_id: string;
  title: string;
  is_active: boolean;
  copied_at: string;
  original_author_nickname: string;
  completed_slots: number;
  total_slots: number;
}

export function useTemplateProgress(copyId: string) {
  const supabase = useSupabaseClient();
  const [copy, setCopy] = useState<TemplateCopy | null>(null);
  const [progress, setProgress] = useState<SlotProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);

      // Get copy info
      const { data: copyData, error: copyError } = await supabase.rpc(
        'get_my_template_copies'
      );

      if (copyError) {
        // Fixed: Removed hardcoded Sprint 9 message, now showing actual RPC errors
        logger.error('RPC Error fetching template copies:', copyError);
        setError(
          copyError.message || 'Error al cargar las copias de plantillas. Por favor, intenta de nuevo.'
        );
        return;
      }

      const currentCopy = copyData?.find(
        (c: { copy_id: number | string }) => c.copy_id === parseInt(copyId)
      );
      if (!currentCopy) throw new Error('Copia de plantilla no encontrada');

      setCopy(currentCopy);

      // Get progress
      const { data: progressData, error: progressError } = await supabase.rpc(
        'get_template_progress',
        {
          p_copy_id: parseInt(copyId),
        }
      );

      if (progressError) {
        // Fixed: Removed hardcoded Sprint 9 message, now showing actual RPC errors
        logger.error('RPC Error fetching template progress:', progressError);
        setError(
          progressError.message || 'Error al cargar el progreso de la plantilla. Por favor, intenta de nuevo.'
        );
        return;
      }

      setProgress(progressData || []);

      // Update copy with correct total slots
      if (progressData && progressData.length > 0) {
        setCopy(prev => {
          if (!prev) return prev;

          // Count owned + duplicates as completed
          const completed = progressData.filter(
            (s: SlotProgress) =>
              s.status === 'owned' || s.status === 'duplicate'
          ).length;

          // Total slots is the total number of unique stickers
          const totalSlots = progressData.length;

          return {
            ...prev,
            completed_slots: completed,
            total_slots: totalSlots,
          };
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [supabase, copyId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updateSlotStatus = useCallback(
    async (slotId: string, status: string, count: number) => {
      try {
        const { error: updateError } = await supabase.rpc(
          'update_template_progress',
          {
            p_copy_id: parseInt(copyId),
            p_slot_id: parseInt(slotId),
            p_status: status,
            p_count: count,
          }
        );

        if (updateError) throw updateError;

        // Optimistic update
        setProgress(prev =>
          prev.map(slot =>
            slot.slot_id === slotId
              ? {
                  ...slot,
                  status: status as 'missing' | 'owned' | 'duplicate',
                  count,
                }
              : slot
          )
        );

        // Update copy stats
        setCopy(prev => {
          if (!prev) return prev;

          // Calculate completed slots based on owned + duplicates
          const updatedProgress = progress.map(slot =>
            slot.slot_id === slotId
              ? {
                  ...slot,
                  status: status as 'missing' | 'owned' | 'duplicate',
                  count,
                }
              : slot
          );

          // Count owned + duplicates as completed
          const completed = updatedProgress.filter(
            s => s.status === 'owned' || s.status === 'duplicate'
          ).length;

          return { ...prev, completed_slots: completed };
        });
      } catch (err) {
        throw err;
      }
    },
    [supabase, copyId, progress]
  );

  return {
    copy,
    progress,
    loading,
    error,
    updateSlotStatus,
    refetch: fetchProgress,
  };
}
