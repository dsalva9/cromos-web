import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

export interface RatingsStats {
  total_ratings: number;
  total_raters: number;
  total_rated_users: number;
  average_rating: number;
  stars_5: number;
  stars_4: number;
  stars_3: number;
  stars_2: number;
  stars_1: number;
  with_comments: number;
  without_comments: number;
  well_rated_users_count: number;
  neutral_rated_users_count: number;
  badly_rated_users_count: number;
  flagged_users_count: number;
}

export interface RatedUser {
  user_id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string;
  rating_avg: number;
  rating_count: number;
  ratings_given_count: number;
  latest_rating_at: string | null;
  is_patron: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  is_flagged: boolean;
  flagged_reason: string | null;
  created_at: string;
  total_filtered_count: number;
}

export interface RecentRating {
  rating_id: number;
  rating: number;
  comment: string | null;
  context_type: string | null;
  context_id: number | null;
  created_at: string;
  updated_at: string | null;
  rater_id: string;
  rater_nickname: string;
  rater_avatar_url: string | null;
  rater_email: string;
  rated_id: string;
  rated_nickname: string;
  rated_avatar_url: string | null;
  rated_email: string;
}

export interface UserRatingDetail {
  rating_id: number;
  rating: number;
  comment: string | null;
  context_type: string | null;
  context_id: number | null;
  created_at: string;
  updated_at: string | null;
  other_user_id: string;
  other_nickname: string;
  other_avatar_url: string | null;
  other_email: string;
}

export type RatingFilterType =
  | 'rated'
  | 'all'
  | 'well_rated'
  | 'neutral'
  | 'badly_rated'
  | 'top_reviewed'
  | 'flagged'
  | 'unrated';

export type RatingSortType =
  | 'rating_desc'
  | 'rating_asc'
  | 'count_desc'
  | 'count_asc'
  | 'recent_desc'
  | 'given_desc';

export type RecentRatingFilterType = 'all' | 'with_comments' | 'bad' | 'good';

export function useAdminRatings(
  searchQuery = '',
  filter: RatingFilterType = 'rated',
  sortBy: RatingSortType = 'rating_desc',
  page = 0,
  pageSize = 25
) {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState<RatingsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [users, setUsers] = useState<RatedUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recent activity feed
  const [recentRatings, setRecentRatings] = useState<RecentRating[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentFilter, setRecentFilter] = useState<RecentRatingFilterType>('all');

  // Fetch overall statistics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_get_ratings_stats');
      if (rpcError) throw rpcError;
      setStats(data as RatingsStats);
    } catch (err) {
      logger.error('Error fetching admin ratings stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [supabase]);

  // Fetch users table
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_get_users_by_rating', {
        p_search: searchQuery.trim() || undefined,
        p_filter: filter,
        p_sort_by: sortBy,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });

      if (rpcError) throw rpcError;

      const rows = (data as RatedUser[]) || [];
      setUsers(rows);
      if (rows.length > 0) {
        setTotalCount(Number(rows[0].total_filtered_count));
      } else {
        setTotalCount(0);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      logger.error('Error fetching admin users by rating:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [supabase, searchQuery, filter, sortBy, page, pageSize]);

  // Fetch recent ratings feed
  const fetchRecentRatings = useCallback(async (currentFilter: RecentRatingFilterType = recentFilter) => {
    try {
      setRecentLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_get_recent_ratings', {
        p_limit: 50,
        p_offset: 0,
        p_filter: currentFilter,
      });

      if (rpcError) throw rpcError;
      setRecentRatings((data as RecentRating[]) || []);
    } catch (err) {
      logger.error('Error fetching recent ratings:', err);
    } finally {
      setRecentLoading(false);
    }
  }, [supabase, recentFilter]);

  // Fetch detailed ratings for a specific user (modal)
  const fetchUserDetails = useCallback(async (userId: string, direction: 'received' | 'given' = 'received') => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_get_user_ratings_detailed', {
        p_target_user_id: userId,
        p_direction: direction,
        p_limit: 100,
        p_offset: 0,
      });

      if (rpcError) throw rpcError;
      return (data as UserRatingDetail[]) || [];
    } catch (err) {
      logger.error('Error fetching user ratings details:', err);
      throw err;
    }
  }, [supabase]);

  // Delete an abusive rating
  const deleteRating = useCallback(async (ratingId: number, reason?: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)('admin_delete_user_rating', {
        p_rating_id: ratingId,
        p_reason: reason || undefined,
      });

      if (rpcError) throw rpcError;

      // Refresh all
      await Promise.all([fetchStats(), fetchUsers(), fetchRecentRatings()]);
      return true;
    } catch (err) {
      logger.error('Error deleting rating:', err);
      throw err;
    }
  }, [supabase, fetchStats, fetchUsers, fetchRecentRatings]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChangeRecent = (newFilter: RecentRatingFilterType) => {
    setRecentFilter(newFilter);
    fetchRecentRatings(newFilter);
  };

  return {
    stats,
    statsLoading,
    users,
    totalCount,
    usersLoading,
    error,
    recentRatings,
    recentLoading,
    recentFilter,
    setRecentFilter: handleFilterChangeRecent,
    refetchStats: fetchStats,
    refetchUsers: fetchUsers,
    refetchRecent: fetchRecentRatings,
    fetchUserDetails,
    deleteRating,
  };
}
