'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

type SupabaseContext = {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuspendedStatus = async (userId: string) => {
      try {
        // Add timeout to prevent hanging on concurrent sessions or slow queries
        const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Query timeout' } }), 5000)
        );

        const queryPromise = supabase
          .from('profiles')
          .select('suspended_at, deleted_at')
          .eq('id', userId)
          .maybeSingle();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        // If there's an error fetching profile, allow through (fail open for non-suspended users)
        if (error) {
          console.error('Error checking suspension status:', error.message || error);
          return true;
        }

        // If no profile data, fail open (allow through)
        if (!data) {
          console.log('No profile data found for user:', userId);
          return true;
        }

        if (data?.suspended_at || data?.deleted_at) {
          // Sign out suspended user
          await supabase.auth.signOut();
          setUser(null);
          return false; // User is suspended
        }
        return true; // User is not suspended
      } catch (err) {
        console.error('Exception checking suspension status:', err);
        return true; // Fail open
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        // Handle invalid refresh token by clearing session
        if (event === 'TOKEN_REFRESHED' && !session) {
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;

        // Only check suspension on specific events (not during recovery/refresh)
        const shouldCheckSuspension =
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'USER_UPDATED';

        // Check if user is suspended when they have an active session
        if (currentUser && shouldCheckSuspension) {
          const isNotSuspended = await checkSuspendedStatus(currentUser.id);
          if (isNotSuspended) {
            setUser(currentUser);
          }
        } else if (currentUser) {
          // For other events, just set the user without checking
          setUser(currentUser);
        } else {
          setUser(currentUser);
        }

        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }: { data: { session: Session | null } }) => {
        const currentUser = session?.user ?? null;

        // Check if user is suspended when they have an active session
        if (currentUser) {
          const isNotSuspended = await checkSuspendedStatus(currentUser.id);
          if (isNotSuspended) {
            setUser(currentUser);
          }
        } else {
          setUser(currentUser);
        }

        setLoading(false);
      })
      .catch(async (error) => {
        // Handle invalid refresh token on initial load
        if (error?.message?.includes('refresh') || error?.message?.includes('Refresh Token')) {
          // Clear the invalid session silently
          await supabase.auth.signOut();
          setUser(null);
        }
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <Context.Provider value={{ supabase, user, loading }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabaseClient() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabaseClient must be used inside SupabaseProvider');
  }
  return context.supabase;
}

export function useUser() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useUser must be used inside SupabaseProvider');
  }
  return { user: context.user, loading: context.loading };
}

// Legacy exports for backward compatibility
export function useSupabase() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return {
    supabase: context.supabase,
    user: context.user,
    session: null, // Not used in new implementation
    loading: context.loading,
  };
}

export function useSession() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSession must be used inside SupabaseProvider');
  }
  return {
    session: context.user ? { user: context.user } : null,
    loading: context.loading,
  };
}
