import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface MatchConversation {
  id: number;
  created_at: string;
  other_user_id: string;
  other_nickname: string;
  other_avatar_url: string | null;
  template_id: number | null;
  template_title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface MatchChatMessage {
  id: number;
  sender_id: string | null;
  receiver_id: string | null;
  sender_nickname: string | null;
  message: string;
  is_read: boolean;
  is_system: boolean;
  created_at: string;
  image_url: string | null;
  thumbnail_url: string | null;
}

export interface CreateConversationResult {
  id: number;
  created_at: string;
  other_user_id: string;
  template_id: number | null;
  is_new: boolean;
}

// ------------------------------------------------------------------
// RPC wrappers
// ------------------------------------------------------------------

export async function getOrCreateMatchConversation(
  supabase: SupabaseClient,
  otherUserId: string,
  templateId?: number | null
): Promise<{ data: CreateConversationResult | null; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_or_create_match_conversation', {
      p_other_user_id: otherUserId,
      p_template_id: templateId ?? null,
    });

    if (error) throw error;
    return { data: data as CreateConversationResult, error: null };
  } catch (error) {
    logger.error('Error creating match conversation:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to create conversation'),
    };
  }
}

export async function getMatchConversations(
  supabase: SupabaseClient
): Promise<{ data: MatchConversation[]; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_match_conversations');
    if (error) throw error;
    return { data: (data || []) as MatchConversation[], error: null };
  } catch (error) {
    logger.error('Error fetching match conversations:', error);
    return { data: [], error: error instanceof Error ? error : new Error('Failed to fetch conversations') };
  }
}

export async function getMatchChatMessages(
  supabase: SupabaseClient,
  conversationId: number,
  cursor?: string | null,
  limit: number = 50
): Promise<{ data: MatchChatMessage[]; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_match_chat_messages', {
      p_conversation_id: conversationId,
      p_cursor: cursor ?? null,
      p_limit: limit,
    });

    if (error) throw error;
    return { data: (data || []) as MatchChatMessage[], error: null };
  } catch (error) {
    logger.error('Error fetching match chat messages:', error);
    return { data: [], error: error instanceof Error ? error : new Error('Failed to fetch messages') };
  }
}

export async function sendMatchMessage(
  supabase: SupabaseClient,
  conversationId: number,
  message: string,
  imageUrl?: string | null,
  thumbnailUrl?: string | null
): Promise<{ messageId: number | null; error: Error | null }> {
  try {
    const finalMessage = !message.trim() && imageUrl ? '📷 Imagen' : message;

    if (!finalMessage.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }
    if (finalMessage.length > 500) {
      throw new Error('El mensaje no puede exceder 500 caracteres');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('send_match_message', {
      p_conversation_id: conversationId,
      p_message: finalMessage.trim(),
      p_image_url: imageUrl ?? null,
      p_thumbnail_url: thumbnailUrl ?? null,
    });

    if (error) throw error;
    return { messageId: data as number, error: null };
  } catch (error) {
    logger.error('Error sending match message:', error);
    return {
      messageId: null,
      error: error instanceof Error ? error : new Error('No se pudo enviar el mensaje'),
    };
  }
}

export async function markMatchMessagesRead(
  supabase: SupabaseClient,
  conversationId: number
): Promise<{ count: number; error: Error | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('mark_match_messages_read', {
      p_conversation_id: conversationId,
    });

    if (error) throw error;
    return { count: (data as number) || 0, error: null };
  } catch (error) {
    logger.error('Error marking match messages as read:', error);
    return { count: 0, error: error instanceof Error ? error : new Error('Failed to mark as read') };
  }
}

export async function getMatchUnreadTotal(
  supabase: SupabaseClient
): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_match_unread_total');
    if (error) throw error;
    return (data as number) || 0;
  } catch {
    return 0;
  }
}
