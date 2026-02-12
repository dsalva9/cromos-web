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
import { isProfileComplete } from '@/lib/profile/isProfileComplete';

/**
 * localStorage key used to persist the "profile completed" flag across
 * full-page navigations (window.location.href).  Without this, the
 * in-memory React state resets on every hard nav, creating a race window
 * where `isComplete` reads `false` before the DB query returns.
 */
const COMPLETED_LOCK_KEY = 'profile_completed';

/**
 * Extended profile type - now includes is_admin to eliminate
 * the separate admin check query in SiteHeader
 */
type UserProfile = {
  nickname: string | null;
  postcode: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  suspended_at: string | null;
  deleted_at: string | null;
};

interface ProfileCompletionContextValue {
  profile: UserProfile | null;
  isComplete: boolean;
  isAdmin: boolean;
  loading: boolean;
  /** Whether the initial profile fetch has completed at least once */
  initialFetchDone: boolean;
  refresh: () => Promise<void>;
  updateProfile: (changes: Partial<UserProfile>) => void;
  /** Durably lock isComplete=true for this session (prevents race-condition redirects) */
  markComplete: () => void;
}

const ProfileCompletionContext =
  createContext<ProfileCompletionContextValue | null>(null);

function computeIsComplete(profile: UserProfile | null) {
  if (!profile) return false;
  return isProfileComplete(
    profile.nickname,
    profile.postcode,
    profile.avatar_url
  );
}

/** Read the persisted completion lock from localStorage. */
function readCompletedLock(): boolean {
  try {
    return localStorage.getItem(COMPLETED_LOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Persist the completion lock to localStorage. */
function writeCompletedLock(value: boolean) {
  try {
    if (value) {
      localStorage.setItem(COMPLETED_LOCK_KEY, 'true');
    } else {
      localStorage.removeItem(COMPLETED_LOCK_KEY);
    }
  } catch {
    // localStorage unavailable (SSR, private mode) — non-critical
  }
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
  // Once true, isComplete stays true for the rest of this session.
  // This prevents transient false readings during re-fetch after profile save.
  // Initialise from localStorage so the flag survives full-page navigations.
  const [completedLock, setCompletedLock] = useState(() => readCompletedLock());
  /** Track whether the first profile fetch has resolved. */
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  /** Helper to durably set the completed lock (state + localStorage). */
  const lockComplete = useCallback(() => {
    setCompletedLock(true);
    writeCompletedLock(true);
  }, []);

  /** Helper to clear the completed lock (sign-out / profile genuinely incomplete). */
  const unlockComplete = useCallback(() => {
    setCompletedLock(false);
    writeCompletedLock(false);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // If profile is already locked as complete, skip loading=true
    // to avoid a transient isComplete=false flicker while re-fetching.
    if (!completedLock) {
      setLoading(true);
    }

    try {
      // Single query for ALL profile data - eliminates redundant queries
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, postcode, avatar_url, is_admin, suspended_at, deleted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const profileData: UserProfile = data
        ? {
          nickname: data.nickname ?? null,
          postcode: data.postcode ?? null,
          avatar_url: data.avatar_url ?? null,
          is_admin: data.is_admin ?? false,
          suspended_at: data.suspended_at ?? null,
          deleted_at: data.deleted_at ?? null,
        }
        : { nickname: null, postcode: null, avatar_url: null, is_admin: false, suspended_at: null, deleted_at: null };

      setProfile(profileData);

      // Check suspension/deletion status (merged from SupabaseProvider)
      if (data?.suspended_at || data?.deleted_at) {
        logger.info('User is suspended/deleted, signing out');
        unlockComplete();
        await supabase.auth.signOut();
        return;
      }

      // Auto-lock if fetched data confirms profile is complete
      if (computeIsComplete(profileData)) {
        lockComplete();
      } else {
        // Profile is genuinely incomplete — clear any stale lock
        unlockComplete();
      }
    } catch (error) {
      logger.error('Error fetching profile', error);
      // Don't clear profile if locked — preserve optimistic state
      if (!completedLock) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  }, [supabase, user, completedLock, lockComplete, unlockComplete]);

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user) {
        setProfile(null);
        setLoading(false);
        // Clear the persisted lock when the user signs out
        unlockComplete();
        setInitialFetchDone(false);
        return;
      }

      try {
        await fetchProfile();
      } catch (error) {
        logger.error('Error loading profile', error);
      }
    };

    void loadProfile();
  }, [authLoading, fetchProfile, user, unlockComplete]);

  const updateProfile = useCallback(
    (changes: Partial<UserProfile>) => {
      setProfile(prev => {
        const next: UserProfile = {
          nickname: changes.nickname ?? prev?.nickname ?? null,
          postcode: changes.postcode ?? prev?.postcode ?? null,
          avatar_url: changes.avatar_url ?? prev?.avatar_url ?? null,
          is_admin: changes.is_admin ?? prev?.is_admin ?? false,
          suspended_at: changes.suspended_at ?? prev?.suspended_at ?? null,
          deleted_at: changes.deleted_at ?? prev?.deleted_at ?? null,
        };
        // Auto-lock if the optimistic update makes profile complete
        if (computeIsComplete(next)) {
          lockComplete();
        }
        return next;
      });
    },
    [lockComplete]
  );

  const markComplete = useCallback(() => {
    lockComplete();
  }, [lockComplete]);

  const rawIsComplete = computeIsComplete(profile);
  // completedLock is sticky: once true, isComplete stays true
  const isComplete = completedLock || rawIsComplete;

  const contextValue = useMemo<ProfileCompletionContextValue>(
    () => ({
      profile,
      isComplete,
      isAdmin: profile?.is_admin ?? false,
      loading,
      initialFetchDone,
      refresh: fetchProfile,
      updateProfile,
      markComplete,
    }),
    [fetchProfile, initialFetchDone, isComplete, loading, markComplete, profile, updateProfile]
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
