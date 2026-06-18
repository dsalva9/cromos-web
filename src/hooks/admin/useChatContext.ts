import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface ChatMessage {
  id: number;
  sender_id: string;
  sender_nickname: string;
  message: string;
  image_url: string | null;
  is_system: boolean;
  created_at: string;
  chat_type: string;
}

export function useChatContext() {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChat = useCallback(async (userA: string, userB: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await (supabase.rpc as any)('get_chat_between_users', {
        p_user_a: userA,
        p_user_b: userB,
      });

      if (rpcError) throw rpcError;

      setMessages((data as ChatMessage[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, fetchChat, clearChat };
}
