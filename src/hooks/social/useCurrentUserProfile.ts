import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface MinimalUserProfile {
  nickname: string;
  avatar_url: string | null;
}

/**
 * Minimal hook to fetch current user's profile for header display
 * Only fetches nickname and avatar to minimize overhead
 */
export function useCurrentUserProfile() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<MinimalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single();

        if (cancelled) return;

        if (error) throw error;

        setProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to email-based nickname
        setProfile({
          nickname: user.email?.split('@')[0] || 'Usuario',
          avatar_url: null,
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  return { profile, loading };
}
