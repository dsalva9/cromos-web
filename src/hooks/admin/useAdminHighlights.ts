'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface AdminHighlight {
  highlight_id: number;
  listing_id: number;
  listing_title: string;
  user_id: string;
  nickname: string;
  duration: string;
  credit_source: string;
  credits_spent: number;
  price_eur: number;
  ls_order_id: string | null;
  starts_at: string;
  expires_at: string;
  extra_views: number;
  is_active: boolean;
}

export function useAdminHighlights(statusFilter: 'all' | 'active' | 'expired' = 'all') {
  const supabase = createClient();
  const [highlights, setHighlights] = useState<AdminHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await (supabase as any).rpc(
        'admin_get_all_highlights',
        { p_status: statusFilter }
      );

      if (fetchError) throw fetchError;

      setHighlights(data || []);
    } catch (err) {
      logger.error('Error fetching admin highlights:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar destacados'));
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const expireHighlight = useCallback(
    async (highlightId: number) => {
      try {
        const { error: expireError } = await (supabase as any).rpc(
          'admin_expire_highlight',
          { p_highlight_id: highlightId }
        );

        if (expireError) throw expireError;

        await fetchHighlights();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al finalizar el destacado');
      }
    },
    [supabase, fetchHighlights]
  );

  return {
    highlights,
    loading,
    error,
    refresh: fetchHighlights,
    expireHighlight,
  };
}
