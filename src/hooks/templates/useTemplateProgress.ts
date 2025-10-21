import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

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

interface SlotProgress {
  slot_id: string;
  page_id: string;
  page_number: number;
  slot_number: number;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
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
        // Handle 404/400 errors gracefully - RPC doesn't exist yet
        setError(
          'Las plantillas no están disponibles todavía. Próximamente en Sprint 9.'
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
        // Handle 404/400 errors gracefully - RPC doesn't exist yet
        setError(
          'Las plantillas no están disponibles todavía. Próximamente en Sprint 9.'
        );
        return;
      }

      setProgress(progressData || []);
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
          const completed = progress.filter(s =>
            s.slot_id === slotId ? status !== 'missing' : s.status !== 'missing'
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
