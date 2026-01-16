'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';

interface RestoreTemplateResponse {
  success: boolean;
  message: string;
  previous_status: string;
  new_status: string;
}

export function useRestoreTemplate() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const restoreTemplate = async (templateId: string): Promise<RestoreTemplateResponse> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('restore_template', {
        p_template_id: parseInt(templateId, 10)
      });

      if (error) {
        throw new Error(error.message || 'Failed to restore template');
      }

      if (!data || data.length === 0) {
        throw new Error('No response from restore operation');
      }

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message || 'Failed to restore template');
      }

      // Show success toast
      toast.success('¡Colección restaurada correctamente! Ahora está activa de nuevo.');

      return result;
    } catch (error) {
      // Show specific error messages based on common scenarios
      if (error instanceof Error) {
        console.error('Restore template error:', error);

        if (error.message.includes('Permission denied')) {
          toast.error('No tienes permiso para restaurar esta colección');
        } else if (error.message.includes('not deleted')) {
          toast.error('Esta colección no está eliminada');
        } else if (error.message.includes('not found')) {
          toast.error('La colección no fue encontrada');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Debes estar autenticado para restaurar una colección');
        } else {
          toast.error('Error al restaurar la colección. Por favor, inténtalo de nuevo.');
        }
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { restoreTemplate, loading };
}
