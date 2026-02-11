'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SoftDeleteListingResponse {
  success: boolean;
  message: string;
  previous_status: string;
  new_status: string;
}

export function useSoftDeleteListing() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const softDeleteListing = async (listingId: string): Promise<SoftDeleteListingResponse> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('soft_delete_listing', {
        p_listing_id: parseInt(listingId, 10)
      });

      if (error) {
        throw new Error(error.message || 'Failed to soft delete listing');
      }

      if (!data || data.length === 0) {
        throw new Error('No response from soft delete operation');
      }

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message || 'Failed to soft delete listing');
      }

      // Show success toast
      toast.success('Anuncio eliminado correctamente');

      return result;
    } catch (error) {
      // Show specific error messages based on common scenarios
      if (error instanceof Error) {
        logger.error('Soft delete listing error:', error);
        
        if (error.message.includes('Permission denied')) {
          toast.error('No tienes permiso para eliminar este anuncio');
        } else if (error.message.includes('ACTIVE status')) {
          toast.error('Solo se pueden eliminar anuncios con estado ACTIVO');
        } else if (error.message.includes('not found')) {
          toast.error('El anuncio no fue encontrado');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Debes estar autenticado para eliminar un anuncio');
        } else {
          toast.error('Error al eliminar el anuncio. Por favor, inténtalo de nuevo.');
        }
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { softDeleteListing, loading };
}