/**
 * Badge System Types
 * Defines all types for the gamification badges system
 */

export type BadgeCategory =
  | 'collector'
  | 'creator'
  | 'reviewer'
  | 'completionist'
  | 'trader'
  | 'top_rated';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'special';

/**
 * Badge definition from badge_definitions table
 */
export interface BadgeDefinition {
  id: string;
  category: BadgeCategory;
  tier: BadgeTier;
  display_name_es: string;
  description_es: string;
  icon_name: string;
  threshold: number;
  sort_order: number;
  created_at?: string;
}

/**
 * User's earned badge with metadata
 */
export interface UserBadge {
  badge_id: string;
  category: BadgeCategory;
  tier: BadgeTier;
  display_name_es: string;
  description_es: string;
  icon_name: string;
  threshold: number;
  earned_at: string;
  progress_snapshot: number;
  sort_order: number;
}

/**
 * User's progress towards earning a badge
 */
export interface BadgeProgress {
  badge_id: string;
  category: BadgeCategory;
  tier: BadgeTier;
  display_name_es: string;
  description_es: string;
  icon_name: string;
  threshold: number;
  current_progress: number;
  is_earned: boolean;
  earned_at: string | null;
  sort_order: number;
}

/**
 * Badge progress tracking for a category
 */
export interface UserBadgeProgress {
  user_id: string;
  badge_category: BadgeCategory;
  current_count: number;
  updated_at: string;
}

/**
 * Result of check_and_award_badge RPC function
 */
export interface BadgeAwardResult {
  badge_awarded: boolean;
  badge_id: string | null;
  badge_name: string | null;
}

/**
 * Props for badge display components
 */
export interface BadgeDisplayProps {
  badge: UserBadge | BadgeProgress;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  className?: string;
}

/**
 * Badge notification metadata
 */
export interface BadgeNotificationMetadata {
  badge_id: string;
  badge_name: string;
  earned_at: string;
}
