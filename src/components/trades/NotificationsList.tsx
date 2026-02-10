'use client';

import { useEffect } from 'react';
import {
  useNotifications,
  type Notification,
} from '@/hooks/trades/useNotifications';
import { useUser } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { UserLink } from '@/components/ui/user-link';
import {
  Bell,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from '@/hooks/use-router';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsListProps {
  onNotificationClick?: (notification: Notification) => void;
}

function getNotificationIcon(kind: Notification['kind']) {
  switch (kind) {
    case 'chat_unread':
      return <MessageSquare className="h-5 w-5 text-blue-400" />;
    case 'proposal_accepted':
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    case 'proposal_rejected':
      return <XCircle className="h-5 w-5 text-red-400" />;
    case 'finalization_requested':
      return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    default:
      return <Bell className="h-5 w-5 text-gray-400" />;
  }
}

function getNotificationTitle(notification: Notification): string {
  switch (notification.kind) {
    case 'chat_unread':
      return 'Nuevo mensaje';
    case 'proposal_accepted':
      return 'Propuesta aceptada';
    case 'proposal_rejected':
      return 'Propuesta rechazada';
    case 'finalization_requested':
      return 'Solicitud de finalización';
    default:
      return 'Notificación';
  }
}

function getCounterpartyInfo(notification: Notification) {
  const counterpartyNickname =
    notification.proposal_from_user === notification.metadata?.sender_id ||
      notification.proposal_from_user === notification.metadata?.requester_id
      ? notification.from_user_nickname || 'Usuario'
      : notification.to_user_nickname || 'Usuario';

  const counterpartyUserId =
    notification.proposal_from_user === notification.metadata?.sender_id ||
      notification.proposal_from_user === notification.metadata?.requester_id
      ? notification.proposal_from_user
      : notification.proposal_to_user;

  return { counterpartyNickname, counterpartyUserId };
}

function getNotificationDescriptionText(notification: Notification): string {

  switch (notification.kind) {
    case 'chat_unread':
      return 'te ha enviado un mensaje';
    case 'proposal_accepted':
      return 'ha aceptado tu propuesta';
    case 'proposal_rejected':
      return 'ha rechazado tu propuesta';
    case 'finalization_requested':
      return 'ha marcado el intercambio como finalizado';
    default:
      return 'Nueva actividad en tus intercambios';
  }
}

export function NotificationsList({
  onNotificationClick,
}: NotificationsListProps) {
  const router = useRouter();
  const { user } = useUser();
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if it's unread
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    } else {
      // Determine the correct tab based on who sent the proposal
      // If current user is the sender (from_user), they should see it in "Enviadas" (outbox/sent tab)
      // If current user is the receiver (to_user), they should see it in "Recibidas" (inbox tab)
      const isSender = notification.proposal_from_user === user?.id;
      const tab = isSender ? 'sent' : undefined; // undefined defaults to inbox

      // Build URL with tradeId and optionally tab
      const url = new URL(`/trades/proposals`, window.location.origin);
      url.searchParams.set('tradeId', notification.trade_id.toString());
      if (tab) {
        url.searchParams.set('tab', tab);
      }

      router.push(url.pathname + url.search);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <ModernCard
            key={i}
            className="bg-white border-2 border-black animate-pulse shadow-xl"
          >
            <ModernCardContent className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded-md w-1/2"></div>
            </ModernCardContent>
          </ModernCard>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ModernCard className="bg-white dark:bg-gray-800 border-2 border-black shadow-xl">
        <ModernCardContent className="p-6 text-center">
          <p className="text-[#E84D4D] font-bold">{error}</p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.read_at);
  const readNotifications = notifications.filter(n => n.read_at);

  if (notifications.length === 0) {
    return (
      <ModernCard className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-xl">
        <ModernCardContent className="p-8 text-center text-gray-600 dark:text-gray-400">
          <Bell className="mx-auto h-12 w-12 mb-4" />
          <p className="font-bold">No tienes notificaciones.</p>
          <p className="text-sm mt-2">
            Aquí aparecerán las actualizaciones de tus intercambios.
          </p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mark all as read button */}
      {unreadNotifications.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="border-2 border-black font-bold uppercase rounded-md shadow-lg bg-gray-50 text-gray-900 dark:text-white hover:bg-gray-100"
          >
            Marcar todo como leído
          </Button>
        </div>
      )}

      {/* Unread notifications */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase text-gray-900 dark:text-white">Nuevas</h2>
          <div className="grid gap-4">
            {unreadNotifications.map(notification => (
              <ModernCard
                key={notification.id}
                className="bg-white dark:bg-gray-800 border-2 border-[#FFC000] shadow-xl hover:shadow-2xl transition-all cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <ModernCardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.kind)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                            {getNotificationTitle(notification)}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <UserLink
                              userId={
                                getCounterpartyInfo(notification)
                                  .counterpartyUserId || ''
                              }
                              nickname={
                                getCounterpartyInfo(notification)
                                  .counterpartyNickname
                              }
                              variant="subtle"
                              disabled={
                                !getCounterpartyInfo(notification)
                                  .counterpartyUserId
                              }
                            />{' '}
                            {getNotificationDescriptionText(notification)}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                                locale: es,
                              }
                            )}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        </div>
      )}

      {/* Read notifications */}
      {readNotifications.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase text-gray-600">
            Anteriores
          </h2>
          <div className="grid gap-4">
            {readNotifications.map(notification => (
              <ModernCard
                key={notification.id}
                className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all cursor-pointer opacity-75 hover:opacity-100"
                onClick={() => handleNotificationClick(notification)}
              >
                <ModernCardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1 opacity-50">
                      {getNotificationIcon(notification.kind)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-700 text-sm">
                            {getNotificationTitle(notification)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <UserLink
                              userId={
                                getCounterpartyInfo(notification)
                                  .counterpartyUserId || ''
                              }
                              nickname={
                                getCounterpartyInfo(notification)
                                  .counterpartyNickname
                              }
                              variant="subtle"
                              disabled={
                                !getCounterpartyInfo(notification)
                                  .counterpartyUserId
                              }
                            />{' '}
                            {getNotificationDescriptionText(notification)}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                                locale: es,
                              }
                            )}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
