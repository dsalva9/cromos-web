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
import { processImageBeforeUpload, generateThumbnail } from '@/lib/images/processImageBeforeUpload';
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch initial messages
  const fetchMessages = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;

    if (!options?.silent && messagesRef.current.length === 0) {
      setLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await getListingChats(
      supabase,
      listingId,
      participantId
    );

    if (fetchError) {
      setError(fetchError.message);
      // "LISTING_NOT_FOUND" and "NETWORK_ERROR" are already logged as warn in chat.ts - no need to re-log
      if (fetchError.message !== 'LISTING_NOT_FOUND' && fetchError.message !== 'NETWORK_ERROR') {
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

  // Send a message (with optional image)
  const sendMessage = useCallback(
    async (text: string, receiverId?: string, imageFile?: File | Blob | null) => {
      if (!user || (!text.trim() && !imageFile)) return;

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

      // Upload image if provided
      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (imageFile) {
        setUploading(true);
        try {
          // Convert Blob to File if needed (from camera capture)
          const file = imageFile instanceof File
            ? imageFile
            : new File([imageFile], 'chat-image.webp', { type: imageFile.type || 'image/webp' });

          // Process image: 1200px max, 500KB target, WebP
          const processed = await processImageBeforeUpload(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1200,
            quality: 0.82,
          });

          // Generate thumbnail: 300px wide (non-fatal, fallback to null)
          const thumbBlob = await generateThumbnail(processed.blob, 300, 0.7).catch((err) => {
            logger.warn('Thumbnail generation failed (non-fatal):', err);
            return null;
          });

          // Build storage paths
          const timestamp = Date.now();
          const basePath = `chat-images/${listingId}/${user.id}/${timestamp}`;
          const imagePath = `${basePath}.webp`;
          const thumbPath = `${basePath}-thumb.webp`;

          // Upload full image and conditionally upload thumbnail in parallel
          const [imageUpload, thumbUpload] = await Promise.all([
            supabase.storage.from('sticker-images').upload(imagePath, processed.blob, {
              contentType: 'image/webp',
              upsert: true,
            }),
            thumbBlob
              ? supabase.storage.from('sticker-images').upload(thumbPath, thumbBlob, {
                  contentType: 'image/webp',
                  upsert: true,
                })
              : Promise.resolve({ data: null, error: null } as any),
          ]);

          if (imageUpload.error) throw imageUpload.error;

          // Get public URLs
          const { data: imageUrlData } = supabase.storage.from('sticker-images').getPublicUrl(imagePath);
          imageUrl = imageUrlData.publicUrl;

          if (thumbBlob && !thumbUpload?.error) {
            const { data: thumbUrlData } = supabase.storage.from('sticker-images').getPublicUrl(thumbPath);
            thumbnailUrl = thumbUrlData.publicUrl;
          } else if (thumbUpload?.error) {
            logger.warn('Thumbnail upload failed (non-fatal):', thumbUpload.error);
          }
        } catch (uploadError) {
          logger.error('Error uploading chat image:', uploadError);
          toast.error('Error al subir la imagen');
          setSending(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      const { messageId, error: sendError } = await sendListingMessage(
        supabase,
        listingId,
        targetReceiverId,
        text,
        imageUrl,
        thumbnailUrl
      );

      if (sendError) {
        toast.error(sendError.message);
      } else if (messageId) {
        // Determine display message (placeholder for image-only)
        const displayMessage = !text.trim() && imageUrl ? '📷 Imagen' : text.trim();

        // Optimistically add message
        const optimisticMessage: ListingChatMessage = {
          id: messageId,
          sender_id: user.id,
          receiver_id: targetReceiverId,
          sender_nickname: 'Tú',
          message: displayMessage,
          is_read: false,
          is_system: false,
          created_at: new Date().toISOString(),
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
        };
        setMessages(prev => [...prev, optimisticMessage]);

        // Refresh to get actual data silently
        setTimeout(() => {
          void fetchMessages({ silent: true });
        }, 500);
      }

      setSending(false);
    },
    [supabase, listingId, user, messages, participantId, fetchMessages]
  );

  // Auto-scroll to bottom on all platforms
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark messages from a specific sender as read
  const markAsRead = useCallback(async (senderId: string) => {
    await markListingMessagesRead(supabase, listingId, senderId);
  }, [supabase, listingId]);

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
          // Refresh messages when new message arrives silently
          void fetchMessages({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, listingId, enableRealtime, user, fetchMessages]);

  // Note: auto-scroll is handled by the page component which owns the
  // chat container ref. messagesEndRef is still available for manual use.

  return {
    messages,
    participants,
    loading,
    sending,
    uploading,
    error,
    sendMessage,
    fetchParticipants,
    refetch: fetchMessages,
    messagesEndRef,
    markAsRead,
  };
}
