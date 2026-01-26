import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import type { Listing } from '@/types/v1.6.0';

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  favorites_count: number;
  is_admin: boolean;
  is_suspended: boolean;
  deleted_at: string | null;
  postcode: string | null;
  location_label: string | null;
}

export function useUserProfile(userId: string) {
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Run all three queries in parallel instead of sequentially
      const [profileResult, favCountResult, listingsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.rpc('get_favourite_count', { p_target_type: 'user', p_target_id: userId }),
        supabase.rpc('get_user_listings', { p_user_id: userId, p_limit: 50, p_offset: 0 }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (favCountResult.error) throw favCountResult.error;
      if (listingsResult.error) throw listingsResult.error;

      const profileData = profileResult.data;
      const locationLabel =
        typeof profileData?.location_label === 'string' &&
        profileData.location_label.trim().length > 0
          ? profileData.location_label.trim()
          : null;

      const normalizedProfile: UserProfile = {
        id: profileData.id,
        nickname: profileData.nickname ?? 'Sin nombre',
        avatar_url: profileData.avatar_url ?? null,
        rating_avg: Number(profileData.rating_avg ?? 0),
        rating_count: Number(profileData.rating_count ?? 0),
        favorites_count: Number(favCountResult.data) || 0,
        is_admin: Boolean(profileData.is_admin),
        is_suspended: Boolean(profileData.is_suspended),
        deleted_at: profileData.deleted_at ?? null,
        postcode: profileData.postcode ?? null,
        location_label: locationLabel,
      };

      setProfile(normalizedProfile);
      setListings(listingsResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  const adjustFavoritesCount = useCallback((delta: number) => {
    setProfile(prev => {
      if (!prev) return prev;

      const nextCount = Math.max(0, (prev.favorites_count ?? 0) + delta);

      return {
        ...prev,
        favorites_count: nextCount
      };
    });
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    listings,
    loading,
    error,
    refetch: fetchProfile,
    adjustFavoritesCount
  };
}
