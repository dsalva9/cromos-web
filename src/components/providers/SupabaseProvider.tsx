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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
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
