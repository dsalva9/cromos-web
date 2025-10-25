'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AdminTemplate {
  id: string;
  title: string;
  status: string;
  created_at: string;
  author_id: string;
  author_nickname: string;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  is_public: boolean;
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
      const { data, error: fetchError } = await supabase.rpc('admin_list_templates', {
        p_status: statusFilter || null,
        p_query: query || null,
        p_page: page,
        p_page_size: pageSize
      });

      if (fetchError) throw fetchError;

      setTemplates(data || []);
      setTotalCount(data?.length || 0);
    } catch (err) {
      console.error('Error fetching admin templates:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar plantillas'));
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, query, page, pageSize]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const suspendTemplate = useCallback(
    async (templateId: string, reason: string) => {
      try {
        const { error: suspendError } = await supabase.rpc(
          'admin_update_template_status',
          {
            p_template_id: parseInt(templateId),
            p_status: 'suspended',
            p_reason: reason
          }
        );

        if (suspendError) throw suspendError;

        await fetchTemplates();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al suspender plantilla');
      }
    },
    [supabase, fetchTemplates]
  );

  const restoreTemplate = useCallback(
    async (templateId: string) => {
      try {
        const { error: restoreError } = await supabase.rpc(
          'admin_update_template_status',
          {
            p_template_id: parseInt(templateId),
            p_status: 'active',
            p_reason: null
          }
        );

        if (restoreError) throw restoreError;

        await fetchTemplates();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al reactivar plantilla');
      }
    },
    [supabase, fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (templateId: string, reason: string) => {
      try {
        const { error: deleteError } = await supabase.rpc(
          'admin_update_template_status',
          {
            p_template_id: parseInt(templateId),
            p_status: 'deleted',
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

  return {
    templates,
    loading,
    error,
    totalCount,
    refresh: fetchTemplates,
    suspendTemplate,
    restoreTemplate,
    deleteTemplate
  };
}
