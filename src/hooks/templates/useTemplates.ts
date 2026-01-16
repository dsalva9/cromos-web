import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

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
  total_slots: number;
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTemplates = useCallback(
    async (fetchOffset: number, isLoadMore = false) => {
      try {
        setLoading(true);
        const currentOffset = isLoadMore ? fetchOffset : 0;

        // Debug logging
        logger.debug('Fetching templates with params:', {
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
        logger.debug('RPC response:', { data, error: rpcError });

        if (rpcError) {
          // Handle RPC errors gracefully and display actual error message
          logger.error('RPC Error:', rpcError);
          setTemplates([]);
          setHasMore(false);
          // Fixed: Removed hardcoded Sprint 9 message, now showing actual RPC errors
          setError(
            rpcError.message || 'Error al cargar las colecciones. Por favor, intenta de nuevo.'
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
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError') {
          return; // ignore aborted fetches
        }
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    },
    [supabase, search, sortBy, limit]
  );

  useEffect(() => {
    // Debounce initial fetch on search/sort changes
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTemplates(0, false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, sortBy, limit, fetchTemplates]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTemplates(offset, true);
    }
  }, [loading, hasMore, fetchTemplates, offset]);

  return {
    templates,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchTemplates(0, false),
  };
}
