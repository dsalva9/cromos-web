import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface Template {
  id: string;
  author_id: string;
  author_nickname: string;
  title: string;
  description: string | null;
  image_url: string | null;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  pages_count: number;
  created_at: string;
}

interface UseTemplatesParams {
  search?: string;
  sortBy?: 'recent' | 'rating' | 'popular';
  limit?: number;
}

export function useTemplates({
  search = '',
  sortBy = 'recent',
  limit = 12,
}: UseTemplatesParams = {}) {
  const supabase = useSupabaseClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchTemplates = useCallback(
    async (isLoadMore = false) => {
      try {
        setLoading(true);
        const currentOffset = isLoadMore ? offset : 0;

        // Debug logging
        console.log('Fetching templates with params:', {
          p_limit: parseInt(limit.toString()),
          p_offset: parseInt(currentOffset.toString()),
          p_search: search || null,
          p_sort_by: sortBy,
        });

        const { data, error: rpcError } = await supabase.rpc(
          'list_public_templates',
          {
            p_limit: parseInt(limit.toString()),
            p_offset: parseInt(currentOffset.toString()),
            p_search: search || null,
            p_sort_by: sortBy,
          }
        );

        // Debug logging
        console.log('RPC response:', { data, error: rpcError });

        if (rpcError) {
          // Handle RPC errors gracefully and display actual error message
          console.error('RPC Error:', rpcError);
          setTemplates([]);
          setHasMore(false);
          // Fixed: Removed hardcoded Sprint 9 message, now showing actual RPC errors
          setError(
            rpcError.message || 'Error al cargar las plantillas. Por favor, intenta de nuevo.'
          );
          return;
        }

        if (isLoadMore) {
          setTemplates(prev => [...prev, ...(data || [])]);
        } else {
          setTemplates(data || []);
        }

        setHasMore((data || []).length === limit);
        if (isLoadMore) {
          setOffset(prev => prev + limit);
        } else {
          setOffset(limit);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    },
    [supabase, search, sortBy, limit, offset]
  );

  useEffect(() => {
    setOffset(0);
    fetchTemplates(false);
  }, [search, sortBy]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTemplates(true);
    }
  }, [loading, hasMore, fetchTemplates]);

  return {
    templates,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchTemplates(false),
  };
}
