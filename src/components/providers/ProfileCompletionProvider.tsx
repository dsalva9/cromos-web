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

type MinimalProfile = {
  nickname: string | null;
  postcode: string | null;
  avatar_url: string | null;
};

interface ProfileCompletionContextValue {
  profile: MinimalProfile | null;
  isComplete: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (changes: Partial<MinimalProfile>) => void;
}

const ProfileCompletionContext =
  createContext<ProfileCompletionContextValue | null>(null);

function normalizeProfile(profile: MinimalProfile | null) {
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
  };
}

function computeIsComplete(profile: MinimalProfile | null) {
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

export function ProfileCompletionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useUser();
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<MinimalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, postcode, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfile(
        data
          ? {
              nickname: data.nickname ?? null,
              postcode: data.postcode ?? null,
              avatar_url: data.avatar_url ?? null,
            }
          : { nickname: null, postcode: null, avatar_url: null }
      );
    } catch (error) {
      logger.error('Error fetching profile completion status', error);
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
        logger.error('Error loading profile completion status', error);
      }
    };

    void loadProfile();
  }, [authLoading, fetchProfile, user]);

  const updateProfile = useCallback(
    (changes: Partial<MinimalProfile>) => {
      setProfile(prev => {
        const next = {
          nickname: changes.nickname ?? prev?.nickname ?? null,
          postcode: changes.postcode ?? prev?.postcode ?? null,
          avatar_url: changes.avatar_url ?? prev?.avatar_url ?? null,
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
