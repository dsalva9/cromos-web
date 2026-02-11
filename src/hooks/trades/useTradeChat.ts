import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface TradeChatMessage {
  id: number;
  trade_id: number | null;
  sender_id: string | null;
  message: string;
  created_at: string;
  sender_nickname?: string;
}

interface UseTradeChatParams {
  tradeId: number | null;
  enabled?: boolean;
}

interface UseTradeChatReturn {
  messages: TradeChatMessage[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  sendMessage: (text: string) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const INITIAL_LOAD_LIMIT = 50;
const LOAD_MORE_LIMIT = 50;

/**
 * Hook for trade chat messages with realtime updates.
 *
 * Powered by React Query for the initial fetch. Realtime inserts and
 * optimistic sends update the query cache directly via setQueryData.
 * Load-more (older messages) prepends to the cache via cursor pagination.
 */
export const useTradeChat = ({
  tradeId,
  enabled = true,
}: UseTradeChatParams): UseTradeChatReturn => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const oldestMessageIdRef = useRef<number | null>(null);
  const hasMoreRef = useRef(false);

  const queryKey = QUERY_KEYS.tradeChat(tradeId);

  // ── Initial fetch ──
  const {
    data,
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<TradeChatMessage[]> => {
      if (!tradeId || !user) return [];

      const { data, error: fetchError } = await supabase
        .from('trade_chats')
        .select(
          `
          id,
          trade_id,
          sender_id,
          message,
          created_at,
          profiles!trade_chats_sender_id_fkey (nickname)
        `
        )
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: false })
        .limit(INITIAL_LOAD_LIMIT);

      if (fetchError) throw fetchError;

      const transformed: TradeChatMessage[] =
        data?.map((msg) => ({
          id: msg.id,
          trade_id: msg.trade_id,
          sender_id: msg.sender_id,
          message: msg.message,
          created_at: msg.created_at,
          sender_nickname:
            (msg.profiles as { nickname?: string } | null)?.nickname ||
            'Usuario',
        })) || [];

      // Reverse to show oldest first
      const reversed = transformed.reverse();

      // Track oldest for load-more cursor
      if (transformed.length > 0) {
        oldestMessageIdRef.current = Math.min(
          ...transformed.map((m) => m.id)
        );
      }
      hasMoreRef.current = transformed.length === INITIAL_LOAD_LIMIT;

      return reversed;
    },
    enabled: !!tradeId && enabled && !!user,
  });

  const messages = useMemo(() => data ?? [], [data]);
  const loading = isLoading;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Error al cargar mensajes'
    : null;
  const hasMore = hasMoreRef.current;

  // ── Load more (older messages) ──
  const loadMore = useCallback(async () => {
    if (loading || !hasMoreRef.current || !tradeId || !user) return;

    const currentOldest = oldestMessageIdRef.current;
    if (!currentOldest) return;

    try {
      const query = supabase
        .from('trade_chats')
        .select(
          `
          id,
          trade_id,
          sender_id,
          message,
          created_at,
          profiles!trade_chats_sender_id_fkey (nickname)
        `
        )
        .eq('trade_id', tradeId)
        .lt('id', currentOldest)
        .order('created_at', { ascending: false })
        .limit(LOAD_MORE_LIMIT);

      const { data: olderData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const olderMsgs: TradeChatMessage[] =
        olderData?.map((msg) => ({
          id: msg.id,
          trade_id: msg.trade_id,
          sender_id: msg.sender_id,
          message: msg.message,
          created_at: msg.created_at,
          sender_nickname:
            (msg.profiles as { nickname?: string } | null)?.nickname ||
            'Usuario',
        })) || [];

      // Reverse to oldest-first, then prepend
      const reversed = olderMsgs.reverse();

      hasMoreRef.current = olderMsgs.length === LOAD_MORE_LIMIT;

      if (olderMsgs.length > 0) {
        oldestMessageIdRef.current = Math.min(
          ...olderMsgs.map((m) => m.id)
        );
      }

      // Prepend to cache
      queryClient.setQueryData<TradeChatMessage[]>(queryKey, (old) => [
        ...reversed,
        ...(old ?? []),
      ]);
    } catch (err) {
      logger.error('Error loading older messages:', err);
    }
  }, [loading, tradeId, user, supabase, queryClient, queryKey]);

  // ── Send message (optimistic) ──
  const sendMessage = useCallback(
    async (text: string) => {
      if (!tradeId || !user || !text.trim()) return;

      const trimmedText = text.trim();
      if (trimmedText.length > 500) {
        throw new Error('El mensaje no puede superar los 500 caracteres');
      }

      const optimisticMessage: TradeChatMessage = {
        id: Date.now(), // Temporary ID
        trade_id: tradeId,
        sender_id: user.id,
        message: trimmedText,
        created_at: new Date().toISOString(),
        sender_nickname: 'Tú',
      };

      // Optimistic append
      queryClient.setQueryData<TradeChatMessage[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticMessage,
      ]);

      try {
        const { data: insertedData, error: insertError } = await supabase
          .from('trade_chats')
          .insert({
            trade_id: tradeId,
            sender_id: user.id,
            message: trimmedText,
          })
          .select()
          .single();

        if (insertError) {
          logger.error('Supabase insert error:', insertError);
          throw insertError;
        }

        // Replace optimistic message with real one
        if (insertedData) {
          queryClient.setQueryData<TradeChatMessage[]>(queryKey, (old) =>
            (old ?? []).map((msg) =>
              msg.id === optimisticMessage.id
                ? { ...optimisticMessage, id: insertedData.id }
                : msg
            )
          );
        }
      } catch (err) {
        logger.error('Error sending message:', err);
        // Remove optimistic message on error
        queryClient.setQueryData<TradeChatMessage[]>(queryKey, (old) =>
          (old ?? []).filter((msg) => msg.id !== optimisticMessage.id)
        );
        const errorMessage =
          err instanceof Error ? err.message : 'Error al enviar mensaje';
        throw new Error(errorMessage);
      }
    },
    [supabase, tradeId, user, queryClient, queryKey]
  );

  // ── Mark as read (debounced) ──
  const markAsRead = useCallback(async () => {
    if (!tradeId || !user) return;

    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    markAsReadTimeoutRef.current = setTimeout(async () => {
      try {
        const { error: markError } = await supabase.rpc('mark_trade_read', {
          p_trade_id: tradeId,
        });

        if (markError) {
          logger.error('Error marking trade as read:', markError);
        }
      } catch (err) {
        logger.error('Error marking trade as read:', err);
      }
    }, 400);
  }, [supabase, tradeId, user]);

  // ── Refresh (full reload) ──
  const refresh = useCallback(async () => {
    oldestMessageIdRef.current = null;
    hasMoreRef.current = false;
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!tradeId || !enabled || !user) return;

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`trade-chat-${tradeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_chats',
          filter: `trade_id=eq.${tradeId}`,
        },
        async (payload) => {
          // Fetch the new message with sender profile
          const { data: newMsgData } = await supabase
            .from('trade_chats')
            .select(
              `
              id,
              trade_id,
              sender_id,
              message,
              created_at,
              profiles!trade_chats_sender_id_fkey (nickname)
            `
            )
            .eq('id', payload.new.id)
            .single();

          if (newMsgData) {
            const newMessage: TradeChatMessage = {
              id: newMsgData.id,
              trade_id: newMsgData.trade_id,
              sender_id: newMsgData.sender_id,
              message: newMsgData.message,
              created_at: newMsgData.created_at,
              sender_nickname:
                (newMsgData.profiles as { nickname?: string } | null)
                  ?.nickname || 'Usuario',
            };

            // Only add if not already in messages (avoid duplicates from optimistic updates)
            queryClient.setQueryData<TradeChatMessage[]>(queryKey, (old) => {
              const prev = old ?? [];
              const exists = prev.some((msg) => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase, tradeId, enabled, user, queryClient, queryKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
    refresh,
  };
};
