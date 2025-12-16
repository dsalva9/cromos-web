/**
 * Notification Formatter
 * Sprint 15: Notifications System
 * Converts raw notifications into user-friendly display text
 */

import type {
  AppNotification,
  FormattedNotification,
} from '@/types/notifications';
import { getNotificationCategory, getNotificationIcon } from '@/types/notifications';

interface NotificationFormat {
  title: string;
  body: string;
  href: string | null;
}

/**
 * Format a notification for display
 */
export function formatNotification(notification: AppNotification): FormattedNotification {
  const format = getNotificationFormat(notification);

  return {
    ...notification,
    title: format.title,
    body: format.body,
    href: format.href,
    icon: getNotificationIcon(notification.kind),
    category: getNotificationCategory(notification.kind),
  };
}

/**
 * Get formatted title and body for notification
 */
function getNotificationFormat(notification: AppNotification): NotificationFormat {
  const actorName = notification.actor?.nickname || 'Alguien';

  switch (notification.kind) {
    case 'listing_chat':
      return {
        title: 'Nuevo mensaje',
        body: `${actorName} te ha enviado un mensaje sobre "${notification.listingTitle || 'un artículo'}"`,
        href: notification.listingId
          ? `/marketplace/${notification.listingId}/chat?participant=${notification.actor?.id}`
          : null,
      };

    case 'listing_reserved':
      const isSeller = notification.payload?.is_seller === true;
      return {
        title: 'Artículo reservado',
        body: isSeller
          ? `Has reservado "${notification.listingTitle || 'el artículo'}" para ${actorName}`
          : `${actorName} ha reservado "${notification.listingTitle || 'un artículo'}" para ti`,
        href: notification.listingId ? `/marketplace/${notification.listingId}` : null,
      };

    case 'listing_completed':
      const isSellerCompleted = notification.payload?.is_seller === true;
      const needsConfirmation = notification.payload?.needs_confirmation === true;
      return {
        title: needsConfirmation ? 'Confirma la transacción' : 'Transacción completada',
        body: needsConfirmation
          ? `${actorName} ha marcado "${notification.listingTitle || 'el artículo'}" como completado. Confirma que todo está correcto.`
          : isSellerCompleted
          ? `La transacción de "${notification.listingTitle || 'tu artículo'}" se ha completado`
          : `Tu compra de "${notification.listingTitle || 'el artículo'}" se ha completado`,
        href: notification.listingId ? `/marketplace/${notification.listingId}` : null,
      };

    case 'user_rated':
      const ratingValue = notification.payload?.rating_value || 0;
      const stars = '⭐'.repeat(Math.floor(ratingValue as number));
      return {
        title: 'Nueva valoración recibida',
        body: `${actorName} te ha valorado con ${stars} (${ratingValue}/5)`,
        href: notification.listingId ? `/marketplace/${notification.listingId}` : null,
      };

    case 'template_rated':
      const templateRating = notification.payload?.rating_value || 0;
      const templateStars = '⭐'.repeat(Math.floor(templateRating as number));
      return {
        title: 'Valoración de plantilla',
        body: `${actorName} ha valorado tu plantilla "${notification.templateName || 'una plantilla'}" con ${templateStars} (${templateRating}/5)`,
        href: notification.templateId ? `/templates/${notification.templateId}` : null,
      };

    case 'chat_unread':
      return {
        title: 'Mensaje de intercambio',
        body: `${actorName} te ha enviado un mensaje`,
        href: notification.tradeId ? `/trades/${notification.tradeId}` : null,
      };

    case 'proposal_accepted':
      return {
        title: 'Propuesta aceptada',
        body: `${notification.toUserNickname || actorName} ha aceptado tu propuesta de intercambio`,
        href: notification.tradeId ? `/trades/${notification.tradeId}` : null,
      };

    case 'proposal_rejected':
      return {
        title: 'Propuesta rechazada',
        body: `${notification.toUserNickname || actorName} ha rechazado tu propuesta de intercambio`,
        href: notification.tradeId ? `/trades/${notification.tradeId}` : null,
      };

    case 'finalization_requested':
      return {
        title: 'Solicitud de finalización',
        body: `${actorName} ha solicitado finalizar el intercambio`,
        href: notification.tradeId ? `/trades/${notification.tradeId}` : null,
      };

    case 'badge_earned':
      const badgeName = notification.payload?.badge_name as string || 'una insignia';
      const badgeId = notification.payload?.badge_id as string;
      return {
        title: '¡Nueva insignia ganada!',
        body: `Has ganado la insignia "${badgeName}"`,
        href: badgeId ? `/profile?badge=${badgeId}#badges` : `/profile#badges`,
      };

    case 'admin_action':
      return {
        title: 'Acción administrativa',
        body: notification.payload?.reason as string || 'Un administrador ha tomado una acción en tu cuenta',
        href: null,
      };

    default:
      return {
        title: 'Notificación',
        body: 'Tienes una nueva notificación',
        href: null,
      };
  }
}

/**
 * Group notifications by category
 */
export function groupNotificationsByCategory(notifications: FormattedNotification[]) {
  return notifications.reduce(
    (acc, notification) => {
      acc[notification.category].push(notification);
      return acc;
    },
    {
      marketplace: [] as FormattedNotification[],
      templates: [] as FormattedNotification[],
      community: [] as FormattedNotification[],
      system: [] as FormattedNotification[],
      trades: [] as FormattedNotification[],
    }
  );
}

/**
 * Get relative time string (e.g., "hace 5 minutos")
 */
export function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace unos segundos';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `hace ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
}
