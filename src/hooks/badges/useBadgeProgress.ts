/**
 * Hook to fetch user's progress towards earning badges
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBadgeProgress } from '@/lib/supabase/badges';
import { createClient } from '@/lib/supabase/client';
import type { BadgeProgress } from '@/types/badges';

export function useBadgeProgress(userId: string | undefined) {
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      const data = await getBadgeProgress(userId);
      setProgress(data);
    } catch (err) {
      console.error('Error fetching badge progress:', err);
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Set up real-time subscription for progress updates
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`badge-progress-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_badge_progress',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Badge progress updated:', payload);
          // Refetch progress
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProgress]);

  return {
    progress,
    isLoading,
    isError,
    error,
    refetch: fetchProgress,
  };
}

/**
 * Hook to get progress for a specific badge category
 */
export function useBadgeProgressByCategory(
  userId: string | undefined,
  category: string
) {
  const { progress, isLoading, isError } = useBadgeProgress(userId);

  const categoryProgress = progress.filter((p) => p.category === category);

  return {
    progress: categoryProgress,
    isLoading,
    isError,
  };
}

/**
 * Hook to get next badge to earn (closest to threshold)
 */
export function useNextBadge(userId: string | undefined) {
  const { progress, isLoading, isError } = useBadgeProgress(userId);

  // Find unearned badges and calculate progress percentage
  const unearnedBadges = progress
    .filter((p) => !p.is_earned)
    .map((p) => ({
      ...p,
      progressPercent: (p.current_progress / p.threshold) * 100,
    }))
    .sort((a, b) => b.progressPercent - a.progressPercent);

  const nextBadge = unearnedBadges[0] || null;

  return {
    nextBadge,
    isLoading,
    isError,
  };
}
