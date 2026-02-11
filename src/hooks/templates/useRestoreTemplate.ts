'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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
      toast.success('Â¡ColecciÃ³n restaurada correctamente! Ahora estÃ¡ activa de nuevo.');

      return result;
    } catch (error) {
      // Show specific error messages based on common scenarios
      if (error instanceof Error) {
        logger.error('Restore template error:', error);

        if (error.message.includes('Permission denied')) {
          toast.error('No tienes permiso para restaurar esta colecciÃ³n');
        } else if (error.message.includes('not deleted')) {
          toast.error('Esta colecciÃ³n no estÃ¡ eliminada');
        } else if (error.message.includes('not found')) {
          toast.error('La colecciÃ³n no fue encontrada');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Debes estar autenticado para restaurar una colecciÃ³n');
        } else {
          toast.error('Error al restaurar la colecciÃ³n. Por favor, intÃ©ntalo de nuevo.');
        }
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { restoreTemplate, loading };
}
