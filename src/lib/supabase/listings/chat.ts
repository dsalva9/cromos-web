import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { markListingChatNotificationsRead } from '@/lib/supabase/notifications';

// Schemas for runtime validation
const listingChatMessageSchema = z.object({
  id: z.number(),
  sender_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  sender_nickname: z.string(),
  message: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});

const chatParticipantSchema = z.object({
  user_id: z.string().uuid(),
  nickname: z.string(),
  avatar_url: z.string().nullable(),
  is_owner: z.boolean(),
  last_message: z.string().nullable(),
  last_message_at: z.string().nullable(),
  unread_count: z.number(),
});

export type ListingChatMessage = z.infer<typeof listingChatMessageSchema>;
export type ChatParticipant = z.infer<typeof chatParticipantSchema>;

/**
 * Get chat messages for a listing
 */
export async function getListingChats(
  supabase: SupabaseClient,
  listingId: number,
  participantId?: string
): Promise<{ data: ListingChatMessage[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_listing_chats', {
      p_listing_id: listingId,
      p_participant_id: participantId || null,
    });

    if (error) throw error;

    const validated = z.array(listingChatMessageSchema).parse(data || []);

    return { data: validated, error: null };
  } catch (error) {
    console.error('Error fetching listing chats:', error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error
          : new Error('No se pudieron cargar los mensajes'),
    };
  }
}

/**
 * Send a message in a listing chat
 */
export async function sendListingMessage(
  supabase: SupabaseClient,
  listingId: number,
  receiverId: string,
  message: string
): Promise<{ messageId: number | null; error: Error | null }> {
  try {
    if (!message.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }

    if (message.length > 500) {
      throw new Error('El mensaje no puede exceder 500 caracteres');
    }

    const { data, error } = await supabase.rpc('send_listing_message', {
      p_listing_id: listingId,
      p_receiver_id: receiverId,
      p_message: message.trim(),
    });

    if (error) throw error;

    return { messageId: data as number, error: null };
  } catch (error) {
    console.error('Error sending listing message:', error);
    return {
      messageId: null,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudo enviar el mensaje'),
    };
  }
}

/**
 * Get participants in a listing chat (seller only)
 */
export async function getListingChatParticipants(
  supabase: SupabaseClient,
  listingId: number
): Promise<{ data: ChatParticipant[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_listing_chat_participants', {
      p_listing_id: listingId,
    });

    if (error) throw error;

    const validated = z.array(chatParticipantSchema).parse(data || []);

    return { data: validated, error: null };
  } catch (error) {
    console.error('Error fetching chat participants:', error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error
          : new Error('No se pudieron cargar los participantes'),
    };
  }
}

/**
 * Mark messages from a sender as read
 * Also marks listing chat notifications as read
 */
export async function markListingMessagesRead(
  supabase: SupabaseClient,
  listingId: number,
  senderId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('mark_listing_messages_read', {
      p_listing_id: listingId,
      p_sender_id: senderId,
    });

    if (error) throw error;

    // Also mark listing chat notifications as read
    try {
      await markListingChatNotificationsRead(listingId, senderId);
    } catch (notifError) {
      // Log but don't fail if notification marking fails
      console.warn('Failed to mark chat notifications as read:', notifError);
    }

    return { count: (data as number) || 0, error: null };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return {
      count: 0,
      error:
        error instanceof Error
          ? error
          : new Error('No se pudieron marcar los mensajes como leídos'),
    };
  }
}
