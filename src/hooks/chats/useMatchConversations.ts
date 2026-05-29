import { useState, useEffect, useCallback } from 'react';
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

export function useMatchConversations() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [conversations, setConversations] = useState<MatchConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const [convResult, unread] = await Promise.all([
      getMatchConversations(supabase),
      getMatchUnreadTotal(supabase),
    ]);

    if (convResult.error) {
      setError(convResult.error.message);
      logger.error('Error fetching match conversations:', convResult.error);
    } else {
      setConversations(convResult.data);
    }

    setUnreadTotal(unread);
    setLoading(false);
  }, [supabase, user]);

  // Initial fetch
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Realtime: listen for updates to match_conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`match-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_conversations',
        },
        () => {
          void fetchConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    unreadTotal,
    refresh: fetchConversations,
  };
}
