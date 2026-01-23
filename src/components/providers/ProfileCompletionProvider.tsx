'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useSupabaseClient,
  useUser,
} from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

/**
 * Extended profile type - now includes is_admin to eliminate
 * the separate admin check query in SiteHeader
 */
type UserProfile = {
  nickname: string | null;
  postcode: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

interface ProfileCompletionContextValue {
  profile: UserProfile | null;
  isComplete: boolean;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (changes: Partial<UserProfile>) => void;
}

const ProfileCompletionContext =
  createContext<ProfileCompletionContextValue | null>(null);

function normalizeProfile(profile: UserProfile | null) {
  if (!profile) return null;
  const nickname =
    typeof profile.nickname === 'string' ? profile.nickname.trim() : null;
  const postcode =
    typeof profile.postcode === 'string' ? profile.postcode.trim() : null;
  const avatarUrl =
    typeof profile.avatar_url === 'string' ? profile.avatar_url.trim() : null;
  return {
    nickname: nickname && nickname.length > 0 ? nickname : null,
    postcode: postcode && postcode.length > 0 ? postcode : null,
    avatar_url: avatarUrl && avatarUrl.length > 0 ? avatarUrl : null,
    is_admin: profile.is_admin ?? false,
  };
}

function computeIsComplete(profile: UserProfile | null) {
  const normalized = normalizeProfile(profile);
  if (!normalized) return false;

  const nickname = normalized.nickname;
  const postcode = normalized.postcode;
  const avatarUrl = normalized.avatar_url;

  if (!nickname || !postcode || !avatarUrl) return false;
  const nicknameLower = nickname.toLowerCase();
  const postcodeLower = postcode.toLowerCase();

  const hasPlaceholderNickname =
    nicknameLower === 'sin nombre' || nicknameLower.startsWith('pending_');
  const hasPlaceholderPostcode = postcodeLower === 'pending';

  if (hasPlaceholderNickname || hasPlaceholderPostcode) return false;

  return true;
}

/**
 * ProfileCompletionProvider - Optimized unified profile context
 * 
 * Now fetches ALL profile data in a SINGLE query:
 * - nickname, postcode, avatar_url (for profile completion)
 * - is_admin (for navigation/header - eliminates separate query)
 * 
 * This removes the redundant admin check query from SiteHeader.
 */
export function ProfileCompletionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useUser();
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Single query for ALL profile data - eliminates redundant queries
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, postcode, avatar_url, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const profileData: UserProfile = data
        ? {
          nickname: data.nickname ?? null,
          postcode: data.postcode ?? null,
          avatar_url: data.avatar_url ?? null,
          is_admin: data.is_admin ?? false,
        }
        : { nickname: null, postcode: null, avatar_url: null, is_admin: false };

      setProfile(profileData);
    } catch (error) {
      logger.error('Error fetching profile', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await fetchProfile();
      } catch (error) {
        logger.error('Error loading profile', error);
      }
    };

    void loadProfile();
  }, [authLoading, fetchProfile, user]);

  const updateProfile = useCallback(
    (changes: Partial<UserProfile>) => {
      setProfile(prev => {
        const next: UserProfile = {
          nickname: changes.nickname ?? prev?.nickname ?? null,
          postcode: changes.postcode ?? prev?.postcode ?? null,
          avatar_url: changes.avatar_url ?? prev?.avatar_url ?? null,
          is_admin: changes.is_admin ?? prev?.is_admin ?? false,
        };
        return next;
      });
    },
    []
  );

  const contextValue = useMemo<ProfileCompletionContextValue>(
    () => ({
      profile,
      isComplete: computeIsComplete(profile),
      isAdmin: profile?.is_admin ?? false,
      loading,
      refresh: fetchProfile,
      updateProfile,
    }),
    [fetchProfile, loading, profile, updateProfile]
  );

  return (
    <ProfileCompletionContext.Provider value={contextValue}>
      {children}
    </ProfileCompletionContext.Provider>
  );
}

export function useProfileCompletion() {
  const context = useContext(ProfileCompletionContext);
  if (!context) {
    throw new Error(
      'useProfileCompletion must be used within a ProfileCompletionProvider'
    );
  }
  return context;
}
