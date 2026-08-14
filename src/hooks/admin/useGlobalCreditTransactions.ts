'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface GlobalCreditTransaction {
  id: number;
  user_id: string;
  nickname: string;
  email: string;
  amount: number;
  balance_after: number;
  credit_source: string;
  ls_order_id: string | null;
  listing_id: number | null;
  listing_title: string | null;
  description: string | null;
  created_at: string;
}

export function useGlobalCreditTransactions(limit: number = 50, source: string = 'all') {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<GlobalCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any).rpc(
        'admin_get_global_credit_transactions',
        {
          p_limit: limit,
          p_source: source === 'all' ? null : source,
        }
      );

      if (err) throw err;
      setTransactions(data || []);
    } catch (err) {
      logger.error('Error fetching global credit transactions:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar transacciones globales'));
    } finally {
      setLoading(false);
    }
  }, [supabase, limit, source]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}
