/**
 * useNotifications Hook
 * Sprint 15: Notifications System
 * Manages notifications with realtime updates and caching
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import type { AppNotification, FormattedNotification } from '@/types/notifications';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markRead,
  markListingChatNotificationsRead,
} from '@/lib/supabase/notifications';
import { formatNotification, groupNotificationsByCategory } from '@/lib/notifications/formatter';

interface UseNotificationsReturn {
  // Data
  notifications: FormattedNotification[];
  unreadNotifications: FormattedNotification[];
  readNotifications: FormattedNotification[];
  unreadCount: number;

  // Grouped data
  groupedByCategory: ReturnType<typeof groupNotificationsByCategory>;

  // State
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markListingChatAsRead: (listingId: number, participantId: string) => Promise<void>;
  clearError: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notifications from database
   */
  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [notificationsData, count] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar las notificaciones';
      setError(errorMessage);
      logger.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await markAllRead();

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al marcar como leídas';
      setError(errorMessage);
      logger.error('Error marking all as read:', err);
      // Refresh to get actual state
      await refresh();
    }
  }, [user, refresh]);

  /**
   * Mark a single notification as read
   */
  const handleMarkAsRead = useCallback(
    async (notificationId: number) => {
      if (!user) return;

      try {
        await markRead(notificationId);

        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: n.readAt || new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al marcar como leída';
        setError(errorMessage);
        logger.error('Error marking notification as read:', err);
        // Refresh to get actual state
        await refresh();
      }
    },
    [user, refresh]
  );

  /**
   * Mark listing chat notifications as read
   */
  const handleMarkListingChatAsRead = useCallback(
    async (listingId: number, participantId: string) => {
      if (!user) return;

      try {
        await markListingChatNotificationsRead(listingId, participantId);

        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.kind === 'listing_chat' &&
            n.listingId === listingId &&
            n.actor?.id === participantId
              ? { ...n, readAt: n.readAt || new Date().toISOString() }
              : n
          )
        );

        // Refresh count
        const count = await fetchUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al marcar chat como leído';
        setError(errorMessage);
        logger.error('Error marking listing chat as read:', err);
        await refresh();
      }
    },
    [user, refresh]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Format notifications for display
   */
  const formattedNotifications = useMemo(() => {
    return notifications.map(formatNotification);
  }, [notifications]);

  /**
   * Filter unread notifications
   */
  const unreadNotifications = useMemo(() => {
    return formattedNotifications.filter((n) => !n.readAt);
  }, [formattedNotifications]);

  /**
   * Filter read notifications
   */
  const readNotifications = useMemo(() => {
    return formattedNotifications.filter((n) => n.readAt);
  }, [formattedNotifications]);

  /**
   * Group notifications by category
   */
  const groupedByCategory = useMemo(() => {
    return groupNotificationsByCategory(formattedNotifications);
  }, [formattedNotifications]);

  /**
   * Auto-fetch on mount and when user changes
   */
  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  /**
   * Subscribe to realtime notifications
   */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh notifications when new one arrives
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh when notifications are updated (marked as read)
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refresh]);

  return {
    notifications: formattedNotifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    groupedByCategory,
    loading,
    error,
    refresh,
    markAllAsRead: handleMarkAllAsRead,
    markAsRead: handleMarkAsRead,
    markListingChatAsRead: handleMarkListingChatAsRead,
    clearError,
  };
}
