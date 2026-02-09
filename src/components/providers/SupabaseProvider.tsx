'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type SupabaseContext = {
  supabase: ReturnType<typeof createClient>;
  user: User | null;
  loading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

/**
 * SupabaseProvider - Optimized for performance
 * 
 * Key optimization: User is set IMMEDIATELY on auth state change.
 * Suspension check is done NON-BLOCKING in the background.
 * If user is suspended, they get signed out asynchronously.
 * 
 * This removes 200-500ms of blocking time from the initial render.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Non-blocking suspension check - runs in background
  const checkSuspendedStatusAsync = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('suspended_at, deleted_at')
        .eq('id', userId)
        .maybeSingle();

      // If query fails, fail open (let user through)
      if (error) {
        console.error('Error checking suspension status:', error.message);
        return;
      }

      // If suspended or deleted, sign out
      if (data?.suspended_at || data?.deleted_at) {
        console.log('User is suspended/deleted, signing out');
        await supabase.auth.signOut();
        setUser(null);
      }
    } catch (err) {
      console.error('Exception checking suspension status:', err);
      // Fail open - don't sign out on errors
    }
  }, [supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        // Handle invalid refresh token by clearing session
        if (event === 'TOKEN_REFRESHED' && !session) {
          supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;

        // Set user IMMEDIATELY - no blocking
        setUser(currentUser);
        setLoading(false);

        // Check suspension in background (non-blocking) on specific events
        const shouldCheckSuspension =
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'USER_UPDATED';

        if (currentUser && shouldCheckSuspension) {
          // Fire and forget - don't await
          checkSuspendedStatusAsync(currentUser.id);
        }
      }
    );

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        const currentUser = session?.user ?? null;

        // Set user IMMEDIATELY
        setUser(currentUser);
        setLoading(false);

        // Check suspension in background for logged-in users
        if (currentUser) {
          checkSuspendedStatusAsync(currentUser.id);
        }
      })
      .catch((error) => {
        // Handle invalid refresh token on initial load
        if (error?.message?.includes('refresh') || error?.message?.includes('Refresh Token')) {
          supabase.auth.signOut();
          setUser(null);
        }
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, checkSuspendedStatusAsync]);

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

