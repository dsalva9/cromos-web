import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useSupabaseClient,
  useUser,
} from '@/components/providers/SupabaseProvider';
import {
  getListingChats,
  sendListingMessage,
  getListingChatParticipants,
  markListingMessagesRead,
  ListingChatMessage,
  ChatParticipant,
} from '@/lib/supabase/listings/chat';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

interface UseListingChatOptions {
  listingId: number;
  /** For seller: filter by specific buyer. For buyer: ignored (auto-filtered to seller) */
  participantId?: string;
  /** Enable realtime subscriptions */
  enableRealtime?: boolean;
}

export function useListingChat({
  listingId,
  participantId,
  enableRealtime = true,
}: UseListingChatOptions) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [messages, setMessages] = useState<ListingChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getListingChats(
      supabase,
      listingId,
      participantId
    );

    if (fetchError) {
      setError(fetchError.message);
      // "LISTING_NOT_FOUND" is already logged as warn in chat.ts - no need to re-log
      if (fetchError.message !== 'LISTING_NOT_FOUND') {
        logger.error('Error fetching messages:', fetchError.message);
      }
    } else {
      setMessages(data);

      // Auto-mark messages as read if we have a participant filter
      if (participantId && data.length > 0) {
        const unreadMessages = data.filter(
          msg => msg.receiver_id === user.id && !msg.is_read
        );
        if (unreadMessages.length > 0) {
          await markListingMessagesRead(supabase, listingId, participantId);
        }
      }
    }

    setLoading(false);
  }, [supabase, listingId, participantId, user]);

  // Fetch participants (seller only)
  const fetchParticipants = useCallback(async () => {
    const { data } = await getListingChatParticipants(supabase, listingId);
    setParticipants(data);
  }, [supabase, listingId]);

  // Send a message
  const sendMessage = useCallback(
    async (text: string, receiverId?: string) => {
      if (!user || !text.trim()) return;

      // Determine receiver
      let targetReceiverId = receiverId;
      if (!targetReceiverId) {
        // Buyer sending to seller - need to extract from messages
        const sellerMessage = messages.find(m => m.sender_id !== user.id);
        if (sellerMessage && sellerMessage.sender_id) {
          targetReceiverId = sellerMessage.sender_id;
        } else if (participantId) {
          targetReceiverId = participantId;
        } else {
          toast.error('No se pudo determinar el destinatario');
          return;
        }
      }

      setSending(true);

      const { messageId, error: sendError } = await sendListingMessage(
        supabase,
        listingId,
        targetReceiverId,
        text
      );

      if (sendError) {
        toast.error(sendError.message);
      } else if (messageId) {
        // Optimistically add message
        const optimisticMessage: ListingChatMessage = {
          id: messageId,
          sender_id: user.id,
          receiver_id: targetReceiverId,
          sender_nickname: 'Tú',
          message: text.trim(),
          is_read: false,
          is_system: false,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMessage]);

        // Refresh to get actual data
        setTimeout(() => {
          void fetchMessages();
        }, 500);
      }

      setSending(false);
    },
    [supabase, listingId, user, messages, participantId, fetchMessages]
  );

  // Auto-scroll to bottom (mobile only)
  const scrollToBottom = useCallback(() => {
    // Only auto-scroll on mobile devices
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!enableRealtime || !user) return;

    const channel = supabase
      .channel(`listing-chat-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_chats',
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          // Refresh messages when new message arrives
          void fetchMessages();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, listingId, enableRealtime, user, fetchMessages]);

  // Scroll to bottom when messages change (mobile only)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, scrollToBottom]);

  return {
    messages,
    participants,
    loading,
    sending,
    error,
    sendMessage,
    fetchParticipants,
    refetch: fetchMessages,
    messagesEndRef,
  };
}
