/**
 * useNotifications Hook
 * Manages notifications with realtime updates and caching.
 *
 * Powered by React Query — data fetching, caching, and background
 * refetching are automatic. Mutations use optimistic updates.
 * Realtime subscriptions trigger cache invalidation.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseProvider';
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
  const { user } = useUser();
  const queryClient = useQueryClient();

  // ── Lightweight count poll ──
  // Only polls the cheap COUNT(*) query every 60s for the header badge.
  // OneSignal push handles instant user awareness.
  const {
    data: unreadCountData,
  } = useQuery({
    queryKey: QUERY_KEYS.notificationCount(),
    queryFn: fetchUnreadCount,
    enabled: !!user,
    staleTime: 60_000, // 60s — count is cheap, no need to refetch aggressively
    refetchInterval: 60_000, // Poll count only every 60s
    refetchIntervalInBackground: false,
  });

  // ── Full notification list (on-demand) ──
  // Only fetches when the user opens the notification dropdown or navigates
  // to the notifications page. Does NOT auto-poll.
  const {
    data: notificationsList,
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.notifications(),
    queryFn: fetchNotifications,
    enabled: !!user,
    staleTime: 30_000, // 30s — fresh enough for the dropdown
    // No refetchInterval — only refetches on invalidation or window focus
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

  const unreadCount = unreadCountData ?? 0;

  // ── Format & filter by preferences ──
  const formattedNotifications = useMemo(() => {
    const rawNotifications = notificationsList ?? [];
    const formatted = rawNotifications.map(formatNotification);

    if (preferences) {
      return formatted.filter((notification) => {
        return checkNotificationEnabled(preferences, notification.kind, 'in_app');
      });
    }

    return formatted;
  }, [notificationsList, preferences]);

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

    // Optimistic update — list
    queryClient.setQueryData<AppNotification[]>(QUERY_KEYS.notifications(), (old) => {
      if (!old) return old;
      return old.map((n) => ({
        ...n,
        readAt: n.readAt || new Date().toISOString(),
      }));
    });
    // Optimistic update — count
    queryClient.setQueryData<number>(QUERY_KEYS.notificationCount(), 0);

    try {
      await markAllRead();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al marcar como leídas';
      logger.warnLocal('Error marking all as read:', errorMessage);
      if (!isTransientNetworkError(err)) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationCount() });
      }
    }
  }, [user, queryClient]);

  const handleMarkAsRead = useCallback(
    async (notificationId: number) => {
      if (!user) return;

      // Optimistic update — list
      queryClient.setQueryData<AppNotification[]>(QUERY_KEYS.notifications(), (old) => {
        if (!old) return old;
        return old.map((n) =>
          n.id === notificationId
            ? { ...n, readAt: n.readAt || new Date().toISOString() }
            : n
        );
      });
      // Optimistic update — count
      queryClient.setQueryData<number>(QUERY_KEYS.notificationCount(), (old) =>
        Math.max(0, (old ?? 0) - 1)
      );

      try {
        await markRead(notificationId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al marcar como leída';
        logger.warnLocal('Error marking notification as read:', errorMessage);
        if (!isTransientNetworkError(err)) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationCount() });
        }
      }
    },
    [user, queryClient]
  );

  const handleMarkListingChatAsRead = useCallback(
    async (listingId: number, participantId: string) => {
      if (!user) return;

      // Optimistic update — list
      queryClient.setQueryData<AppNotification[]>(QUERY_KEYS.notifications(), (old) => {
        if (!old) return old;
        return old.map((n) =>
          n.kind === 'listing_chat' &&
            n.listingId === listingId &&
            n.actor?.id === participantId
            ? { ...n, readAt: n.readAt || new Date().toISOString() }
            : n
        );
      });

      try {
        await markListingChatNotificationsRead(listingId, participantId);
        // Refetch both to get accurate state
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationCount() });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al marcar chat como leído';
        logger.warnLocal('Error marking listing chat as read:', errorMessage);
        if (!isTransientNetworkError(err)) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationCount() });
        }
      }
    },
    [user, queryClient]
  );

  // Notifications use 30s polling via refetchInterval above.
  // OneSignal push notifications handle instant user awareness.

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationCount() }),
      ]);
    },
    markAllAsRead: handleMarkAllAsRead,
    markAsRead: handleMarkAsRead,
    markListingChatAsRead: handleMarkListingChatAsRead,
    clearError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications() });
    },
  };
}
