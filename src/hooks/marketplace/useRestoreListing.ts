'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface RestoreListingResponse {
  success: boolean;
  message: string;
  previous_status: string;
  new_status: string;
}

export function useRestoreListing() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const restoreListing = async (listingId: string): Promise<RestoreListingResponse> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('restore_listing', {
        p_listing_id: parseInt(listingId, 10)
      });

      if (error) {
        throw new Error(error.message || 'Failed to restore listing');
      }

      if (!data || data.length === 0) {
        throw new Error('No response from restore operation');
      }

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message || 'Failed to restore listing');
      }

      // Show success toast
      toast.success('¡Anuncio restaurado correctamente! Ahora está activo de nuevo.');

      return result;
    } catch (error) {
      // Show specific error messages based on common scenarios
      if (error instanceof Error) {
        logger.error('Restore listing error:', error);

        if (error.message.includes('Permission denied')) {
          toast.error('No tienes permiso para restaurar este anuncio');
        } else if (error.message.includes('ELIMINADO status')) {
          toast.error('Solo se pueden restaurar anuncios con estado ELIMINADO');
        } else if (error.message.includes('not found')) {
          toast.error('El anuncio no fue encontrado');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Debes estar autenticado para restaurar un anuncio');
        } else {
          toast.error('Error al restaurar el anuncio. Por favor, inténtalo de nuevo.');
        }
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { restoreListing, loading };
}
