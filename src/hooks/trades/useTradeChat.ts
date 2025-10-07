import { useState, useCallback, useEffect, useRef } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TradeChatMessage {
  id: number;
  trade_id: number;
  sender_id: string;
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

export const useTradeChat = ({
  tradeId,
  enabled = true,
}: UseTradeChatParams): UseTradeChatReturn => {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [messages, setMessages] = useState<TradeChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial messages
  const loadMessages = useCallback(
    async (initial = true) => {
      if (!tradeId || !enabled || !user) return;

      setLoading(true);
      setError(null);

      try {
        let query = supabase
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
          .order('created_at', { ascending: false });

        if (initial) {
          query = query.limit(INITIAL_LOAD_LIMIT);
        } else if (oldestMessageId) {
          query = query.lt('id', oldestMessageId).limit(LOAD_MORE_LIMIT);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Transform data to include sender nickname
        const transformedMessages: TradeChatMessage[] =
          data?.map(msg => ({
            id: msg.id,
            trade_id: msg.trade_id,
            sender_id: msg.sender_id,
            message: msg.message,
            created_at: msg.created_at,
            sender_nickname: (msg.profiles as { nickname?: string } | null)?.nickname || 'Usuario',
          })) || [];

        // Reverse to show oldest first
        const reversedMessages = transformedMessages.reverse();

        setMessages(prev =>
          initial ? reversedMessages : [...reversedMessages, ...prev]
        );

        setHasMore(transformedMessages.length === (initial ? INITIAL_LOAD_LIMIT : LOAD_MORE_LIMIT));

        if (transformedMessages.length > 0) {
          setOldestMessageId(Math.min(...transformedMessages.map(m => m.id)));
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError(
          err instanceof Error ? err.message : 'Error al cargar mensajes'
        );
      } finally {
        setLoading(false);
      }
    },
    [supabase, tradeId, enabled, user, oldestMessageId]
  );

  // Load more (older) messages
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await loadMessages(false);
  }, [loading, hasMore, loadMessages]);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!tradeId || !user || !text.trim()) return;

      const trimmedText = text.trim();
      if (trimmedText.length > 500) {
        throw new Error('El mensaje no puede superar los 500 caracteres');
      }

      // Create optimistic message
      const optimisticMessage: TradeChatMessage = {
        id: Date.now(), // Temporary ID
        trade_id: tradeId,
        sender_id: user.id,
        message: trimmedText,
        created_at: new Date().toISOString(),
        sender_nickname: 'Tú', // Will be replaced by realtime
      };

      // Add optimistically to UI
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        const { data, error: insertError } = await supabase
          .from('trade_chats')
          .insert({
            trade_id: tradeId,
            sender_id: user.id,
            message: trimmedText,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Replace optimistic message with real one (has correct ID)
        if (data) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === optimisticMessage.id
                ? {
                    ...optimisticMessage,
                    id: data.id,
                  }
                : msg
            )
          );
        }
      } catch (err) {
        console.error('Error sending message:', err);
        // Remove optimistic message on error
        setMessages(prev =>
          prev.filter(msg => msg.id !== optimisticMessage.id)
        );
        throw new Error('Error al enviar mensaje');
      }
    },
    [supabase, tradeId, user]
  );

  // Mark as read (debounced)
  const markAsRead = useCallback(async () => {
    if (!tradeId || !user) return;

    // Clear existing timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    // Debounce mark as read by 400ms
    markAsReadTimeoutRef.current = setTimeout(async () => {
      try {
        const { error: markError } = await supabase.rpc('mark_trade_read', {
          p_trade_id: tradeId,
        });

        if (markError) {
          console.error('Error marking trade as read:', markError);
        }
      } catch (err) {
        console.error('Error marking trade as read:', err);
      }
    }, 400);
  }, [supabase, tradeId, user]);

  // Refresh messages (full reload)
  const refresh = useCallback(async () => {
    setOldestMessageId(null);
    await loadMessages(true);
  }, [loadMessages]);

  // Initial load
  useEffect(() => {
    if (tradeId && enabled && user) {
      loadMessages(true);
    } else {
      setMessages([]);
      setHasMore(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, enabled, user, supabase]);

  // Realtime subscription
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
        async payload => {
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
                (newMsgData.profiles as { nickname?: string } | null)?.nickname || 'Usuario',
            };

            // Only add if not already in messages (avoid duplicates from optimistic updates)
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
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
  }, [supabase, tradeId, enabled, user]);

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
