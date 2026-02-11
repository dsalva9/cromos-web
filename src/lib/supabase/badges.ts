/**
 * Supabase Client Wrappers for Badges System
 * Provides type-safe functions for badge-related database operations
 */

import { createClient } from '@/lib/supabase/client';
import type {
  BadgeDefinition,
  UserBadge,
  BadgeProgress,
  BadgeAwardResult,
} from '@/types/badges';
import { logger } from '@/lib/logger';

/**
 * Get all badges earned by a user
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_user_badges_with_details', {
    p_user_id: userId,
  });

  if (error) {
    logger.error('Error fetching user badges:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get user's progress towards all badges
 */
export async function getBadgeProgress(
  userId: string
): Promise<BadgeProgress[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_badge_progress', {
    p_user_id: userId,
  });

  if (error) {
    // Ignore fetch aborts caused by navigating away from the page
    const details = (error as any)?.details || (error as any)?.message || '';
    if (details.includes('Failed to fetch') || details.includes('AbortError')) {
      return [];
    }
    logger.error('Error fetching badge progress:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all available badge definitions
 */
export async function getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('badge_definitions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('Error fetching badge definitions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get badge definitions by category
 */
export async function getBadgesByCategory(
  category: string
): Promise<BadgeDefinition[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('badge_definitions')
    .select('*')
    .eq('category', category)
    .order('threshold', { ascending: true });

  if (error) {
    logger.error('Error fetching badges by category:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific badge definition by ID
 */
export async function getBadgeById(
  badgeId: string
): Promise<BadgeDefinition | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('badge_definitions')
    .select('*')
    .eq('id', badgeId)
    .single();

  if (error) {
    logger.error('Error fetching badge by ID:', error);
    return null;
  }

  return data;
}

/**
 * Check and award badge for a user (called by triggers, exposed for manual testing)
 */
export async function checkAndAwardBadge(
  userId: string,
  category: string
): Promise<BadgeAwardResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('check_and_award_badge', {
    p_user_id: userId,
    p_category: category,
  });

  if (error) {
    logger.error('Error checking/awarding badge:', error);
    throw error;
  }

  return (data as unknown as BadgeAwardResult[])?.[0] || {
    badge_awarded: false,
    badge_id: null,
    badge_name: null,
  };
}

/**
 * Get top badges for a user (highest tier, for display in cards)
 */
export async function getTopUserBadges(
  userId: string,
  limit: number = 3
): Promise<UserBadge[]> {
  const badges = await getUserBadges(userId);

  // Sort by tier priority (special > gold > silver > bronze) then by earned date
  const tierPriority: Record<string, number> = {
    special: 4,
    gold: 3,
    silver: 2,
    bronze: 1,
  };

  return badges
    .sort((a, b) => {
      const tierDiff =
        (tierPriority[b.tier] || 0) - (tierPriority[a.tier] || 0);
      if (tierDiff !== 0) return tierDiff;

      // If same tier, sort by earned date (most recent first)
      return (
        new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
      );
    })
    .slice(0, limit);
}

/**
 * Check if user has a specific badge
 */
export async function userHasBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error
    logger.error('Error checking user badge:', error);
    return false;
  }

  return !!data;
}
