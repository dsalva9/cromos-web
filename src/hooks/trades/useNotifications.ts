import { useState, useCallback, useEffect } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';

export interface Notification {
  id: number;
  kind: 'chat_unread' | 'proposal_accepted' | 'proposal_rejected' | 'finalization_requested';
  trade_id: number;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, any>;
  proposal_from_user: string;
  proposal_to_user: string;
  proposal_status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  from_user_nickname: string | null;
  to_user_nickname: string | null;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_notifications');

      if (rpcError) throw new Error('Error al cargar las notificaciones.');

      setNotifications(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_notification_count');

      if (rpcError) throw new Error('Error al cargar el contador.');

      setUnreadCount(data || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      // Don't set error state for background count fetches
    }
  }, [supabase, user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error: rpcError } = await supabase.rpc('mark_all_notifications_read');

      if (rpcError) throw new Error('Error al marcar como leídas.');

      // Update local state immediately (optimistic)
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error desconocido.'
      );
      // Refresh to get actual state
      await fetchNotifications();
      await fetchUnreadCount();
    }
  }, [supabase, user, fetchNotifications, fetchUnreadCount]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setError(null);
  }, []);

  // Auto-fetch unread count on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAllAsRead,
    clearNotifications,
  };
};
