'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface AdminCreditTransaction {
  id: number;
  amount: number;
  balance_after: number;
  credit_source: string;
  ls_order_id: string | null;
  listing_id: number | null;
  listing_title: string | null;
  description: string | null;
  created_at: string;
}

export function useAdminCredits(userId?: string | null) {
  const supabase = createClient();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [transactions, setTransactions] = useState<AdminCreditTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    try {
      const { data, error: balanceError } = await (supabase as any)
        .from('highlight_credit_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (balanceError) throw balanceError;
      setBalance(data?.balance ?? 0);
    } catch (err) {
      logger.error('Error fetching user credit balance:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar saldo'));
    } finally {
      setBalanceLoading(false);
    }
  }, [supabase, userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      return;
    }
    setTxLoading(true);
    try {
      const { data, error: txError } = await (supabase as any).rpc(
        'admin_get_user_transactions',
        { p_user_id: userId }
      );

      if (txError) throw txError;
      setTransactions(data || []);
    } catch (err) {
      logger.error('Error fetching user credit transactions:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar historial'));
    } finally {
      setTxLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [userId, fetchBalance, fetchTransactions]);

  const adjustCredits = useCallback(
    async (amount: number, description: string) => {
      if (!userId) return;
      try {
        const { data, error: adjustError } = await (supabase as any).rpc(
          'admin_adjust_user_credits',
          {
            p_user_id: userId,
            p_amount: amount,
            p_description: description,
          }
        );

        if (adjustError) throw adjustError;
        setBalance(data ?? 0);
        await fetchTransactions();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al ajustar créditos');
      }
    },
    [supabase, userId, fetchTransactions]
  );

  return {
    balance,
    balanceLoading,
    transactions,
    txLoading,
    error,
    refresh: () => {
      fetchBalance();
      fetchTransactions();
    },
    adjustCredits,
  };
}
