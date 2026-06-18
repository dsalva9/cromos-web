import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useSupabaseClient,
  useUser,
} from '@/components/providers/SupabaseProvider';
import {
  getMatchConversations,
  getMatchUnreadTotal,
  MatchConversation,
} from '@/lib/supabase/matches/chat';
import { logger } from '@/lib/logger';

function isAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('not authenticated') || lower.includes('jwt') || lower.includes('token');
}

export function useMatchConversations() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [conversations, setConversations] = useState<MatchConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const authFailedRef = useRef(false);

  const handleAuthError = useCallback(async () => {
    // Attempt a session refresh before giving up
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Session is valid — the error was transient, allow retry on next poll
      authFailedRef.current = false;
      return;
    }

    // Session is truly gone — redirect to login
    authFailedRef.current = true;
    const locale = window.location.pathname.match(/^\/(es|en|pt)(\/|$)/)?.[1] || 'es';
    window.location.href = `/${locale}/login`;
  }, [supabase]);

  const fetchConversations = useCallback(async (options?: { silent?: boolean }) => {
    if (!user || authFailedRef.current) return;

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    const [convResult, unread] = await Promise.all([
      getMatchConversations(supabase),
      getMatchUnreadTotal(supabase),
    ]);

    if (convResult.error) {
      setError(convResult.error.message);
      if (isAuthError(convResult.error.message)) {
        logger.warnLocal('Auth error in useMatchConversations, attempting refresh:', convResult.error.message);
        void handleAuthError();
      } else {
        logger.error('Error fetching match conversations:', convResult.error);
      }
    } else {
      setConversations(convResult.data);
    }

    setUnreadTotal(unread);
    setLoading(false);
  }, [supabase, user, handleAuthError]);

  // Initial fetch
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Poll for conversation updates every 10s (replaces unfiltered realtime subscription)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      // Stop polling if auth has failed to avoid hammering Supabase
      if (authFailedRef.current) return;
      void fetchConversations({ silent: true });
    }, 10_000);
    return () => clearInterval(interval);
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    unreadTotal,
    refresh: fetchConversations,
  };
}
