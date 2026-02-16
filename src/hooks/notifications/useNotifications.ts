/**
 * useNotifications Hook
 * Manages notifications with realtime updates and caching.
 *
 * Powered by React Query — data fetching, caching, and background
 * refetching are automatic. Mutations use optimistic updates.
 * Realtime subscriptions trigger cache invalidation.
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { AppNotification, FormattedNotification } from '@/types/notifications';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markRead,
  markListingChatNotificationsRead,
  isTransientNetworkError,
} from '@/lib/supabase/notifications';
import { formatNotification, groupNotificationsByCategory } from '@/lib/notifications/formatter';
import { fetchNotificationPreferences, checkNotificationEnabled } from '@/lib/supabase/notification-preferences';
import type { GranularNotificationPreferences } from '@/types/notifications';

interface NotificationsData {
  notifications: AppNotification[];
  unreadCount: number;
}

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
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // ── Main data query ──
  const {
    data: notificationsData,
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.notifications(),
    queryFn: async (): Promise<NotificationsData> => {
      const [notifications, unreadCount] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
      return { notifications, unreadCount };
    },
    enabled: !!user,
    staleTime: 30_000, // 30s — notifications should feel fresh
  });

  // ── Preferences query ──
  const { data: preferences } = useQuery({
    queryKey: QUERY_KEYS.notificationPreferences(),
    queryFn: async (): Promise<GranularNotificationPreferences | null> => {
      try {
        return await fetchNotificationPreferences();
      } catch (err) {
        logger.error('Error fetching notification preferences:', err);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min — preferences rarely change
  });

  const unreadCount = notificationsData?.unreadCount ?? 0;

  // ── Format & filter by preferences ──
  const formattedNotifications = useMemo(() => {
    const rawNotifications = notificationsData?.notifications ?? [];
    const formatted = rawNotifications.map(formatNotification);

    if (preferences) {
      return formatted.filter((notification) => {
        return checkNotificationEnabled(preferences, notification.kind, 'in_app');
      });
    }

    return formatted;
  }, [notificationsData, preferences]);

  const unreadNotifications = useMemo(
    () => formattedNotifications.filter((n) => !n.readAt),
    [formattedNotifications]
  );

  const readNotifications = useMemo(
    () => formattedNotifications.filter((n) => n.readAt),
    [formattedNotifications]
  );

  const groupedByCategory = useMemo(
    () => groupNotificationsByCategory(formattedNotifications),
    [formattedNotifications]
  );

  // ── Mutations ──

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;

    // Optimistic update
    queryClient.setQueryData<NotificationsData>(QUERY_KEYS.notifications(), (old) => {
      if (!old) return old;
      return {
        notifications: old.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        })),
        unreadCount: 0,
      };
    });

    try {
      await markAllRead();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al marcar como leídas';
      logger.error('Error marking all as read:', errorMessage);
      // Only rollback on non-network errors; network errors keep the optimistic update
      if (!isTransientNetworkError(err)) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
      }
    }
  }, [user, queryClient]);

  const handleMarkAsRead = useCallback(
    async (notificationId: number) => {
      if (!user) return;

      // Optimistic update
      queryClient.setQueryData<NotificationsData>(QUERY_KEYS.notifications(), (old) => {
        if (!old) return old;
        return {
          notifications: old.notifications.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: n.readAt || new Date().toISOString() }
              : n
          ),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      });

      try {
        await markRead(notificationId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al marcar como leída';
        logger.error('Error marking notification as read:', errorMessage);
        // Only rollback on non-network errors; network errors keep the optimistic update
        if (!isTransientNetworkError(err)) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
        }
      }
    },
    [user, queryClient]
  );

  const handleMarkListingChatAsRead = useCallback(
    async (listingId: number, participantId: string) => {
      if (!user) return;

      // Optimistic update
      queryClient.setQueryData<NotificationsData>(QUERY_KEYS.notifications(), (old) => {
        if (!old) return old;
        return {
          notifications: old.notifications.map((n) =>
            n.kind === 'listing_chat' &&
              n.listingId === listingId &&
              n.actor?.id === participantId
              ? { ...n, readAt: n.readAt || new Date().toISOString() }
              : n
          ),
          unreadCount: old.unreadCount, // Will be corrected by refetch below
        };
      });

      try {
        await markListingChatNotificationsRead(listingId, participantId);
        // Refetch to get accurate count
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al marcar chat como leído';
        logger.error('Error marking listing chat as read:', errorMessage);
        // Only rollback on non-network errors; network errors keep the optimistic update
        if (!isTransientNetworkError(err)) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
        }
      }
    },
    [user, queryClient]
  );

  // ── Realtime subscription ──
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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, queryClient]);

  const loading = isLoading;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Error al cargar las notificaciones')
    : null;

  return {
    notifications: formattedNotifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    groupedByCategory,
    loading,
    error,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
    },
    markAllAsRead: handleMarkAllAsRead,
    markAsRead: handleMarkAsRead,
    markListingChatAsRead: handleMarkListingChatAsRead,
    clearError: () => {
      // Error is derived from queryError; clearing requires a refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
    },
  };
}
