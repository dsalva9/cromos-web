'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface AdminListing {
  id: number;
  title: string;
  collection_name: string;
  status: string;
  deleted_at: string;
  created_at: string;
  seller_id: string;
  seller_nickname: string;
  views_count: number;
  transaction_count: number;
}

export function useAdminListings(
  statusFilter?: string | null,
  query?: string | null,
  page = 1,
  pageSize = 20
) {
  const supabase = createClient();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.rpc(
        'admin_list_marketplace_listings',
        {
          p_status: statusFilter || undefined,
          p_query: query || undefined,
          p_page: page,
          p_page_size: pageSize
        }
      );

      if (fetchError) throw fetchError;

      setListings(data || []);
      // For now, we don't have total count - could add another RPC
      setTotalCount(data?.length || 0);
    } catch (err) {
      logger.error('Error fetching admin listings:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar listados'));
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, query, page, pageSize]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const deleteListing = useCallback(
    async (listingId: string, reason: string) => {
      try {
        const { error: deleteError } = await supabase.rpc(
          'admin_delete_listing',
          {
            p_listing_id: parseInt(listingId),
            p_reason: reason
          }
        );

        if (deleteError) throw deleteError;

        await fetchListings();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al eliminar listado');
      }
    },
    [supabase, fetchListings]
  );

  return {
    listings,
    loading,
    error,
    totalCount,
    refresh: fetchListings,
    deleteListing
  };
}
