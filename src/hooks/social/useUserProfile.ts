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

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get favorites count (how many users have favorited this user)
      const { data: favCountData, error: favCountError } = await supabase.rpc(
        'get_favourite_count',
        {
          p_target_type: 'user',
          p_target_id: userId
        }
      );

      if (favCountError) throw favCountError;

      let locationLabel: string | null = null;

      if (profileData?.postcode) {
        try {
          const { data: postalData, error: postalError } = await supabase
            .from('postal_codes')
            .select('municipality, city, locality, name, province, state')
            .eq('postcode', profileData.postcode)
            .eq('country', 'ES')
            .limit(1);

          if (!postalError && postalData && postalData.length > 0) {
            const record = postalData[0] as Record<string, unknown>;
            const cityLike =
              (record.municipality as string | undefined) ||
              (record.city as string | undefined) ||
              (record.locality as string | undefined) ||
              (record.name as string | undefined);
            const provinceLike =
              (record.province as string | undefined) ||
              (record.state as string | undefined);
            const segments = [cityLike, provinceLike].filter(
              (segment): segment is string => Boolean(segment && segment.length)
            );
            locationLabel = segments.length > 0 ? segments.join(', ') : null;
          }
        } catch (postalLookupError) {
          console.warn('Failed to resolve postcode location', postalLookupError);
        }
      }

      const normalizedProfile: UserProfile = {
        id: profileData.id,
        nickname: profileData.nickname ?? 'Sin nombre',
        avatar_url: profileData.avatar_url ?? null,
        rating_avg: Number(profileData.rating_avg ?? 0),
        rating_count: Number(profileData.rating_count ?? 0),
        favorites_count: Number(favCountData) || 0,
        is_admin: Boolean(profileData.is_admin),
        is_suspended: Boolean(profileData.is_suspended),
        postcode: profileData.postcode ?? null,
        location_label: locationLabel,
      };

      setProfile(normalizedProfile);

      // Get user listings
      const { data: listingsData, error: listingsError } = await supabase.rpc('get_user_listings', {
        p_user_id: userId,
        p_limit: 50,
        p_offset: 0
      });

      if (listingsError) throw listingsError;

      setListings(listingsData || []);
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
