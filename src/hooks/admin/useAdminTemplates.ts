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
  pageSize = 20,
  countryFilter?: string | null,
  isFeaturedFilter?: boolean | null
) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const isFeatured =
    isFeaturedFilter !== undefined && isFeaturedFilter !== null
      ? isFeaturedFilter
      : statusFilter === 'featured'
      ? true
      : undefined;
  const rpcStatus = statusFilter === 'featured' ? undefined : (statusFilter || undefined);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.rpc('admin_list_templates', {
        p_status: rpcStatus,
        p_query: query || undefined,
        p_page: page,
        p_page_size: pageSize,
        p_country_code: countryFilter || undefined,
        p_is_featured: isFeatured
      });

      if (fetchError) throw fetchError;

      const results = (data || []) as AdminTemplate[];
      setTemplates(results);
      setTotalCount(results.length);
    } catch (err) {
      logger.error('Error fetching admin templates:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar plantillas'));
    } finally {
      setLoading(false);
    }
  }, [supabase, rpcStatus, query, page, pageSize, countryFilter, isFeatured]);

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

  const reorderFeatured = useCallback(
    async (templateIds: number[]) => {
      try {
        const { error: reorderError } = await supabase.rpc(
          'admin_reorder_featured_templates',
          {
            p_template_ids: templateIds
          }
        );

        if (reorderError) throw reorderError;

        await fetchTemplates();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al reordenar plantillas destacadas');
      }
    },
    [supabase, fetchTemplates]
  );

  const moveFeatured = useCallback(
    async (templateId: number, direction: 'up' | 'down') => {
      const idx = templates.findIndex(t => t.id === templateId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= templates.length) return;

      const newOrder = [...templates];
      const [moved] = newOrder.splice(idx, 1);
      newOrder.splice(targetIdx, 0, moved);

      // Optimistic update
      setTemplates(newOrder.map((t, i) => ({ ...t, featured_priority: i + 1 })));

      try {
        await reorderFeatured(newOrder.map(t => t.id));
      } catch (err) {
        // Rollback on error
        await fetchTemplates();
        throw err;
      }
    },
    [templates, reorderFeatured, fetchTemplates]
  );

  return {
    templates,
    loading,
    error,
    totalCount,
    refresh: fetchTemplates,
    deleteTemplate,
    toggleFeatured,
    updateFeaturedPriority,
    reorderFeatured,
    moveFeatured
  };
}
