'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface CreditRankingUser {
  user_id: string;
  nickname: string;
  email: string;
  purchase_credits: number;
  reward_credits: number;
  total_credits: number;
}

export function useCreditRanking(limit: number = 50) {
  const supabase = createClient();
  const [ranking, setRanking] = useState<CreditRankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase as any).rpc(
        'admin_get_credit_ranking',
        { p_limit: limit }
      );

      if (err) throw err;
      setRanking(data || []);
    } catch (err) {
      logger.error('Error fetching credit ranking:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar ranking'));
    } finally {
      setLoading(false);
    }
  }, [supabase, limit]);

  useEffect(() => {
    void fetchRanking();
  }, [fetchRanking]);

  return {
    ranking,
    loading,
    error,
    refetch: fetchRanking,
  };
}
