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
      const { count: favCount } = await supabase
        .from('favourites')
        .select('*', { count: 'exact', head: true })
        .eq('target_type', 'user')
        .eq('target_id', userId);

      setProfile({
        ...profileData,
        favorites_count: favCount || 0
      });

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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, listings, loading, error, refetch: fetchProfile };
}
