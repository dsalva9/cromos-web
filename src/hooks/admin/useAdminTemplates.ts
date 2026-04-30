'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface AdminTemplate {
  id: number;
  title: string;
  status: string;
  deleted_at: string;
  created_at: string;
  author_id: string;
  author_nickname: string;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  is_public: boolean;
  is_featured: boolean;
  featured_priority: number;
}

export function useAdminTemplates(
  statusFilter?: string | null,
  query?: string | null,
  page = 1,
  pageSize = 20
) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // 'featured' is not a DB status — handle it as a client-side filter
      const rpcStatus = statusFilter === 'featured' ? undefined : (statusFilter || undefined);

      const { data, error: fetchError } = await supabase.rpc('admin_list_templates', {
        p_status: rpcStatus,
        p_query: query || undefined,
        p_page: page,
        p_page_size: pageSize
      });

      if (fetchError) throw fetchError;

      const filtered = statusFilter === 'featured'
        ? (data || []).filter((t: AdminTemplate) => t.is_featured)
        : (data || []);

      setTemplates(filtered);
      setTotalCount(filtered.length);
    } catch (err) {
      logger.error('Error fetching admin templates:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar plantillas'));
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, query, page, pageSize]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(
    async (templateId: string, reason: string) => {
      try {
        const { error: deleteError } = await supabase.rpc(
          'admin_delete_template',
          {
            p_template_id: parseInt(templateId),
            p_reason: reason
          }
        );

        if (deleteError) throw deleteError;

        await fetchTemplates();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al eliminar plantilla');
      }
    },
    [supabase, fetchTemplates]
  );

  const toggleFeatured = useCallback(
    async (templateId: number, featured: boolean) => {
      try {
        const { error: toggleError } = await supabase.rpc(
          'admin_toggle_featured_template',
          {
            p_template_id: templateId,
            p_featured: featured
          }
        );

        if (toggleError) throw toggleError;

        await fetchTemplates();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al destacar plantilla');
      }
    },
    [supabase, fetchTemplates]
  );

  const updateFeaturedPriority = useCallback(
    async (templateId: number, priority: number) => {
      try {
        const { error: updateError } = await supabase.rpc(
          'admin_update_featured_priority',
          {
            p_template_id: templateId,
            p_priority: priority
          }
        );

        if (updateError) throw updateError;

        await fetchTemplates();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al actualizar prioridad');
      }
    },
    [supabase, fetchTemplates]
  );

  return {
    templates,
    loading,
    error,
    totalCount,
    refresh: fetchTemplates,
    deleteTemplate,
    toggleFeatured,
    updateFeaturedPriority
  };
}
