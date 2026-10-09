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
import { processImageBeforeUpload, generateThumbnail, isQRCodeError } from '@/lib/images/processImageBeforeUpload';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { containsUrl, containsForbiddenAppText, isPdfFile, MAX_PDF_SIZE_BYTES } from '@/lib/validations/chat';

interface UseListingChatOptions {
  listingId: number;
  /** For seller: filter by specific buyer. For buyer: ignored (auto-filtered to seller) */
  participantId?: string;
  /** Enable realtime subscriptions */
  enableRealtime?: boolean;
  /** Whether the chat is open/active. Defaults to true */
  isOpen?: boolean;
}

export function useListingChat({
  listingId,
  participantId,
  enableRealtime = true,
  isOpen = true,
}: UseListingChatOptions) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [messages, setMessages] = useState<ListingChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(() => Boolean(isOpen && listingId > 0));
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
    if (!user || !listingId || listingId <= 0 || !isOpen) {
      setLoading(false);
      return;
    }

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
      // "LISTING_NOT_FOUND", "UNAUTHORIZED", and "NETWORK_ERROR" are already logged as warn/info in chat.ts - no need to re-log
      if (
        fetchError.message !== 'LISTING_NOT_FOUND' &&
        fetchError.message !== 'UNAUTHORIZED' &&
        fetchError.message !== 'NETWORK_ERROR'
      ) {
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
  }, [supabase, listingId, participantId, user, isOpen]);

  // Fetch participants (seller only)
  const fetchParticipants = useCallback(async () => {
    if (!listingId || listingId <= 0 || !isOpen) return;
    const { data } = await getListingChatParticipants(supabase, listingId);
    setParticipants(data);
  }, [supabase, listingId, isOpen]);

  // Send a message (with optional image)
  const sendMessage = useCallback(
    async (text: string, receiverId?: string, imageFile?: File | Blob | null): Promise<boolean> => {
      if (!user || !listingId || listingId <= 0 || (!text.trim() && !imageFile)) return false;

      // Block URLs in message text
      if (text.trim() && containsUrl(text)) {
        toast.error('No se permiten enlaces o URLs en los mensajes del chat.');
        return false;
      }

      // Block forbidden app text in message text
      if (text.trim() && containsForbiddenAppText(text)) {
        toast.error('No se permite publicidad de otras apps.');
        return false;
      }

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
          return false;
        }
      }

      setSending(true);

      // Upload file if provided
      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (imageFile) {
        setUploading(true);
        try {
          // Convert Blob to File if needed (from camera capture)
          const file = imageFile instanceof File
            ? imageFile
            : new File([imageFile], 'chat-file', { type: imageFile.type || 'image/webp' });

          const isPdf = isPdfFile(file);

          if (isPdf) {
            // --- PDF path: validate size, upload directly, no processing ---
            if (file.size > MAX_PDF_SIZE_BYTES) {
              toast.error('El archivo PDF no puede superar los 2MB');
              setSending(false);
              setUploading(false);
              return false;
            }

            const timestamp = Date.now();
            const pdfPath = `chat-images/${listingId}/${user.id}/${timestamp}.pdf`;

            const { error: uploadError } = await supabase.storage
              .from('sticker-images')
              .upload(pdfPath, file, { contentType: 'application/pdf', upsert: true });

            if (uploadError) throw uploadError;

            const { data: pdfData } = supabase.storage.from('sticker-images').getPublicUrl(pdfPath);
            imageUrl = pdfData.publicUrl;
            // No thumbnail for PDFs
          } else {
            // --- Image path: existing flow (unchanged) ---
            const processed = await processImageBeforeUpload(file, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1200,
              quality: 0.82,
            });

            const thumbBlob = await generateThumbnail(processed.blob, 300, 0.7).catch((err) => {
              logger.warn('Thumbnail generation failed (non-fatal):', err);
              return null;
            });

            const timestamp = Date.now();
            const basePath = `chat-images/${listingId}/${user.id}/${timestamp}`;
            const imagePath = `${basePath}.webp`;
            const thumbPath = `${basePath}-thumb.webp`;

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
                : Promise.resolve({ data: null, error: null as unknown }),
            ]);

            if (imageUpload.error) throw imageUpload.error;

            const { data: imageUrlData } = supabase.storage.from('sticker-images').getPublicUrl(imagePath);
            imageUrl = imageUrlData.publicUrl;

            if (thumbBlob && !thumbUpload?.error) {
              const { data: thumbUrlData } = supabase.storage.from('sticker-images').getPublicUrl(thumbPath);
              thumbnailUrl = thumbUrlData.publicUrl;
            } else if (thumbUpload?.error) {
              logger.warn('Thumbnail upload failed (non-fatal):', thumbUpload.error);
            }
          }
        } catch (uploadError) {
          if (isQRCodeError(uploadError)) {
            toast.error(
              uploadError instanceof Error
                ? uploadError.message
                : 'Subida bloqueada: No se permiten códigos QR en las imágenes.'
            );
          } else {
            if (
              uploadError instanceof Error &&
              (uploadError.message.includes('excede el límite') ||
                uploadError.message.includes('No se pudo cargar la imagen'))
            ) {
              logger.warnLocal('Validation error uploading chat file:', uploadError.message);
            } else {
              logger.error('Error uploading chat file:', uploadError);
            }
            toast.error('Error al subir el archivo');
          }
          setSending(false);
          setUploading(false);
          return false;
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
        setSending(false);
        return false;
      } else if (messageId) {
        // Determine display message (placeholder for image/PDF-only)
        const isPdfUrl = imageUrl?.endsWith('.pdf');
        const displayMessage = !text.trim() && imageUrl
          ? (isPdfUrl ? '📄 PDF' : '📷 Imagen')
          : text.trim();

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

        setSending(false);
        return true;
      }

      setSending(false);
      return false;
    },
    [supabase, listingId, user, messages, participantId, fetchMessages]
  );

  // Mark messages from a specific sender as read
  const markAsRead = useCallback(async (senderId: string) => {
    if (!listingId || listingId <= 0) return;
    await markListingMessagesRead(supabase, listingId, senderId);
  }, [supabase, listingId]);

  // Initial fetch
  useEffect(() => {
    if (!isOpen || !listingId || listingId <= 0) {
      setLoading(false);
      return;
    }
    void fetchMessages();
  }, [fetchMessages, isOpen, listingId]);

  // Realtime subscription
  useEffect(() => {
    if (!enableRealtime || !user || !isOpen || !listingId || listingId <= 0) return;

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
  }, [supabase, listingId, enableRealtime, user, isOpen, fetchMessages]);

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
