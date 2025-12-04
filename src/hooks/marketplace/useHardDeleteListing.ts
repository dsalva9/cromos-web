'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';

interface HardDeleteListingResponse {
  success: boolean;
  message: string;
  deleted_chat_count: number;
  deleted_transaction_count: number;
  media_files_deleted: number;
}

export function useHardDeleteListing() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const hardDeleteListing = async (listingId: string): Promise<HardDeleteListingResponse> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('hard_delete_listing', {
        p_listing_id: parseInt(listingId, 10)
      });

      if (error) {
        throw new Error(error.message || 'Failed to hard delete listing');
      }

      if (!data || data.length === 0) {
        throw new Error('No response from hard delete operation');
      }

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message || 'Failed to hard delete listing');
      }

      // Show success toast with details
      let successMessage = '¡Anuncio eliminado permanentemente!';
      
      if (result.deleted_chat_count > 0 || result.deleted_transaction_count > 0) {
        const details = [];
        if (result.deleted_chat_count > 0) {
          details.push(`${result.deleted_chat_count} mensajes de chat`);
        }
        if (result.deleted_transaction_count > 0) {
          details.push(`${result.deleted_transaction_count} transacciones`);
        }
        if (result.media_files_deleted > 0) {
          details.push(`${result.media_files_deleted} archivos multimedia`);
        }
        
        if (details.length > 0) {
          successMessage += ` (${details.join(', ')} eliminados)`;
        }
      }

      toast.success(successMessage);

      return result;
    } catch (error) {
      // Show specific error messages based on common scenarios
      if (error instanceof Error) {
        console.error('Hard delete listing error:', error);
        
        if (error.message.includes('Permission denied')) {
          toast.error('No tienes permiso para eliminar este anuncio');
        } else if (error.message.includes('ELIMINADO status')) {
          toast.error('Solo se pueden eliminar permanentemente anuncios con estado ELIMINADO');
        } else if (error.message.includes('not found')) {
          toast.error('El anuncio no fue encontrado');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Debes estar autenticado para eliminar un anuncio');
        } else {
          toast.error('Error al eliminar el anuncio permanentemente. Por favor, inténtalo de nuevo.');
        }
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { hardDeleteListing, loading };
}