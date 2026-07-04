import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useSupabaseClient,
  useUser,
} from '@/components/providers/SupabaseProvider';
import {
  getMatchChatMessages,
  sendMatchMessage,
  markMatchMessagesRead,
  MatchChatMessage,
} from '@/lib/supabase/matches/chat';
import { processImageBeforeUpload, generateThumbnail, isQRCodeError } from '@/lib/images/processImageBeforeUpload';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { containsUrl, containsForbiddenAppText, isPdfFile, MAX_PDF_SIZE_BYTES } from '@/lib/validations/chat';

interface UseMatchChatOptions {
  conversationId: number | null;
  enableRealtime?: boolean;
}

export function useMatchChat({
  conversationId,
  enableRealtime = true,
}: UseMatchChatOptions) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ---- Fetch messages ----
  const fetchMessages = useCallback(async (options?: { silent?: boolean }) => {
    if (!user || !conversationId) return;

    if (!options?.silent && messagesRef.current.length === 0) {
      setLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await getMatchChatMessages(
      supabase,
      conversationId
    );

    if (fetchError) {
      setError(fetchError.message);
    } else {
      // Messages come in DESC order from RPC, reverse for display
      setMessages(data.reverse());
      setHasMore(data.length >= 50);

      // Auto-mark as read
      if (data.length > 0) {
        const hasUnread = data.some(m => m.receiver_id === user.id && !m.is_read);
        if (hasUnread) {
          await markMatchMessagesRead(supabase, conversationId);
        }
      }
    }

    setLoading(false);
  }, [supabase, conversationId, user]);

  // ---- Load more (older messages) ----
  const loadMore = useCallback(async () => {
    if (!user || !conversationId || messages.length === 0) return;

    const oldestMsg = messages[0];
    const { data } = await getMatchChatMessages(
      supabase,
      conversationId,
      oldestMsg.created_at
    );

    if (data.length > 0) {
      setMessages(prev => [...data.reverse(), ...prev]);
    }
    setHasMore(data.length >= 50);
  }, [supabase, conversationId, user, messages]);

  // ---- Send message ----
  const sendMessage = useCallback(
    async (text: string, imageFile?: File | Blob | null) => {
      if (!user || !conversationId || (!text.trim() && !imageFile)) return;

      // Block URLs in message text
      if (text.trim() && containsUrl(text)) {
        toast.error('No se permiten enlaces o URLs en los mensajes del chat.');
        return;
      }

      // Block forbidden app text in message text
      if (text.trim() && containsForbiddenAppText(text)) {
        toast.error('No se permite publicidad de otras apps.');
        return;
      }

      setSending(true);

      // Upload file if provided
      let imageUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (imageFile) {
        setUploading(true);
        try {
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
              return;
            }

            const timestamp = Date.now();
            const pdfPath = `chat-images/match/${conversationId}/${user.id}/${timestamp}.pdf`;

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
            const basePath = `chat-images/match/${conversationId}/${user.id}/${timestamp}`;
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
                : Promise.resolve({ data: null, error: null } as any),
            ]);

            if (imageUpload.error) throw imageUpload.error;

            const { data: imgData } = supabase.storage.from('sticker-images').getPublicUrl(imagePath);
            imageUrl = imgData.publicUrl;

            if (thumbBlob && !thumbUpload?.error) {
              const { data: thumbData } = supabase.storage.from('sticker-images').getPublicUrl(thumbPath);
              thumbnailUrl = thumbData.publicUrl;
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
          return;
        } finally {
          setUploading(false);
        }
      }

      const isPdfUrl = imageUrl?.endsWith('.pdf');
      const displayMessage = !text.trim() && imageUrl
        ? (isPdfUrl ? '📄 PDF' : '📷 Imagen')
        : text.trim();

      const { messageId, error: sendError } = await sendMatchMessage(
        supabase,
        conversationId,
        text,
        imageUrl,
        thumbnailUrl
      );

      if (sendError) {
        toast.error(sendError.message);
      } else if (messageId) {
        // Optimistic add
        const optimisticMsg: MatchChatMessage = {
          id: messageId,
          sender_id: user.id,
          receiver_id: null,
          sender_nickname: 'Tú',
          message: displayMessage,
          is_read: false,
          is_system: false,
          created_at: new Date().toISOString(),
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
        };
        setMessages(prev => [...prev, optimisticMsg]);

        // Refresh after a short delay silently
        setTimeout(() => {
          void fetchMessages({ silent: true });
        }, 500);
      }

      setSending(false);
    },
    [supabase, conversationId, user, fetchMessages]
  );

  // ---- Mark as read ----
  const markAsRead = useCallback(async () => {
    if (!conversationId) return;
    await markMatchMessagesRead(supabase, conversationId);
  }, [supabase, conversationId]);

  // ---- Initial fetch ----
  useEffect(() => {
    if (conversationId) {
      void fetchMessages();
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [conversationId, fetchMessages]);

  // ---- Realtime subscription ----
  useEffect(() => {
    if (!enableRealtime || !user || !conversationId) return;

    const channel = supabase
      .channel(`match-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_chats',
          filter: `match_conversation_id=eq.${conversationId}`,
        },
        () => {
          void fetchMessages({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, enableRealtime, user, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    uploading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
    messagesEndRef,
    refetch: fetchMessages,
  };
}
