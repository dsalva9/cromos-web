import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import {
  PermanentDeleteUserResponse,
  PermanentDeleteListingResponse,
  PermanentDeleteTemplateResponse,
} from '@/types/admin';
import { logger } from '@/lib/logger';

export function useAdminPermanentDelete() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permanentlyDeleteUser = async (
    userId: string,
    userNickname: string
  ): Promise<PermanentDeleteUserResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_permanently_delete_user', {
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      toast.success(`User ${userNickname} permanently deleted`);
      return data as unknown as PermanentDeleteUserResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Failed to delete user: ${errorMessage}`);
      logger.error('Error permanently deleting user:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeleteListing = async (
    listingId: string,
    listingTitle: string
  ): Promise<PermanentDeleteListingResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_permanently_delete_listing', {
        p_listing_id: parseInt(listingId, 10),
      });

      if (rpcError) throw rpcError;

      toast.success(`Listing "${listingTitle}" permanently deleted`);
      return data as unknown as PermanentDeleteListingResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Failed to delete listing: ${errorMessage}`);
      logger.error('Error permanently deleting listing:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeleteTemplate = async (
    templateId: string,
    templateTitle: string
  ): Promise<PermanentDeleteTemplateResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('admin_permanently_delete_template', {
        p_template_id: parseInt(templateId, 10),
      });

      if (rpcError) throw rpcError;

      toast.success(`Template "${templateTitle}" permanently deleted`);
      return data as unknown as PermanentDeleteTemplateResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Failed to delete template: ${errorMessage}`);
      logger.error('Error permanently deleting template:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    permanentlyDeleteUser,
    permanentlyDeleteListing,
    permanentlyDeleteTemplate,
    loading,
    error,
  };
}
