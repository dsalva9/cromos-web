/**
 * Hook to fetch and manage user's earned badges
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserBadges, getTopUserBadges } from '@/lib/supabase/badges';
import { createClient } from '@/lib/supabase/client';
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

  // Set up real-time subscription for badge updates
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`user-badges-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          logger.debug('New badge earned:', payload);
          // Refetch badges
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchBadges]);

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
