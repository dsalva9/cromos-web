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
        const { data, error } = await supabase
          .from('profiles')
          .select('is_suspended')
          .eq('id', userId)
          .maybeSingle();

        // If there's an error fetching profile, allow through (fail open for non-suspended users)
        if (error) {
          console.error('Error checking suspension status:', error);
          return true;
        }

        // If no profile data, fail open (allow through)
        if (!data) {
          console.log('No profile data found for user:', userId);
          return true;
        }

        if (data?.is_suspended) {
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
      async (_event: string, session: Session | null) => {
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
