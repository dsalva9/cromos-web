/**
 * Hook to fetch and manage user's earned badges
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserBadges, getTopUserBadges } from '@/lib/supabase/badges';
import type { UserBadge } from '@/types/badges';
import { logger } from '@/lib/logger';

export function useUserBadges(userId: string | undefined) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBadges = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      const data = await getUserBadges(userId);
      setBadges(data);
    } catch (err) {
      logger.error('Error fetching user badges:', err);
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Badge awards are rare events. Data is refetched on
  // component mount — no realtime or polling needed.

  return {
    badges,
    isLoading,
    isError,
    error,
    refetch: fetchBadges,
  };
}

/**
 * Hook to get top badges for display in compact spaces
 */
export function useTopUserBadges(userId: string | undefined, limit: number = 3) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchTopBadges = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const data = await getTopUserBadges(userId, limit);
        setBadges(data);
      } catch (err) {
        logger.error('Error fetching top user badges:', err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopBadges();
  }, [userId, limit]);

  return {
    badges,
    isLoading,
    isError,
  };
}
