import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { AffiliateLink, ImageConfig } from '@/types/affiliates';
import { DEFAULT_IMAGE_CONFIG } from '@/types/affiliates';

const supabase = createClient();

interface UseAdminAffiliatesReturn {
  affiliates: AffiliateLink[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  fetchAffiliates: () => Promise<void>;
  upsertAffiliate: (data: {
    id?: string;
    placement: string;
    image_url: string;
    title: string;
    subtitle: string;
    rating: number;
    destination_url: string;
    is_active?: boolean;
    image_config?: ImageConfig;
  }) => Promise<string>;
  deleteAffiliate: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
}

export function useAdminAffiliates(): UseAdminAffiliatesReturn {
  const [affiliates, setAffiliates] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAffiliates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_list_affiliate_links');
      if (rpcError) throw rpcError;
      setAffiliates((data as AffiliateLink[]) || []);
    } catch (err) {
      logger.error('Error fetching affiliate links:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch affiliate links');
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertAffiliate = useCallback(async (data: {
    id?: string;
    placement: string;
    image_url: string;
    title: string;
    subtitle: string;
    rating: number;
    destination_url: string;
    is_active?: boolean;
    image_config?: ImageConfig;
  }): Promise<string> => {
    setSaving(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultId, error: rpcError } = await (supabase.rpc as any)('admin_upsert_affiliate_link', {
        p_id: data.id || null,
        p_placement: data.placement,
        p_image_url: data.image_url,
        p_title: data.title,
        p_subtitle: data.subtitle,
        p_rating: data.rating,
        p_destination_url: data.destination_url,
        p_is_active: data.is_active ?? true,
        p_image_config: data.image_config ?? DEFAULT_IMAGE_CONFIG,
      });
      if (rpcError) throw rpcError;
      await fetchAffiliates();
      return resultId as string;
    } catch (err) {
      logger.error('Error saving affiliate link:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save affiliate link';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [fetchAffiliates]);

  const deleteAffiliate = useCallback(async (id: string) => {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)('admin_delete_affiliate_link', { p_id: id });
      if (rpcError) throw rpcError;
      await fetchAffiliates();
    } catch (err) {
      logger.error('Error deleting affiliate link:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete affiliate link';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAffiliates]);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('affiliate-images')
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Error uploading affiliate image:', uploadError);
      throw new Error(uploadError.message);
    }

    const { data: urlData } = supabase.storage
      .from('affiliate-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }, []);

  return {
    affiliates,
    loading,
    error,
    saving,
    fetchAffiliates,
    upsertAffiliate,
    deleteAffiliate,
    uploadImage,
  };
}
