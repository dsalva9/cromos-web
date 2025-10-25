'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AdminListing {
  id: string;
  title: string;
  collection_name: string;
  status: string;
  created_at: string;
  seller_id: string;
  seller_nickname: string;
  price: number;
  views_count: number;
  transaction_count: number;
  is_public: boolean;
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
          p_status: statusFilter || null,
          p_query: query || null,
          p_page: page,
          p_page_size: pageSize
        }
      );

      if (fetchError) throw fetchError;

      setListings(data || []);
      // For now, we don't have total count - could add another RPC
      setTotalCount(data?.length || 0);
    } catch (err) {
      console.error('Error fetching admin listings:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar listados'));
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, query, page, pageSize]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const suspendListing = useCallback(
    async (listingId: string, reason: string) => {
      try {
        const { error: suspendError } = await supabase.rpc(
          'admin_update_listing_status',
          {
            p_listing_id: parseInt(listingId),
            p_status: 'suspended',
            p_reason: reason
          }
        );

        if (suspendError) throw suspendError;

        await fetchListings();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al suspender listado');
      }
    },
    [supabase, fetchListings]
  );

  const restoreListing = useCallback(
    async (listingId: string) => {
      try {
        const { error: restoreError } = await supabase.rpc(
          'admin_update_listing_status',
          {
            p_listing_id: parseInt(listingId),
            p_status: 'active',
            p_reason: null
          }
        );

        if (restoreError) throw restoreError;

        await fetchListings();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al reactivar listado');
      }
    },
    [supabase, fetchListings]
  );

  const deleteListing = useCallback(
    async (listingId: string, reason: string) => {
      try {
        const { error: deleteError } = await supabase.rpc(
          'admin_update_listing_status',
          {
            p_listing_id: parseInt(listingId),
            p_status: 'removed',
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
    suspendListing,
    restoreListing,
    deleteListing
  };
}
