/**
 * Deep Linking Handler for OneSignal Notifications
 * Routes users to the correct page when clicking push notifications
 */

import type { NotificationKind } from './config';

export interface NotificationData {
  notification_kind: NotificationKind;
  listing_id?: number;
  template_id?: number;
  trade_id?: number;
  rating_id?: number;
  deep_link?: string;
}

/**
 * Generate deep link URL from notification data
 */
export function generateDeepLink(data: NotificationData): string {
  // If explicit deep link is provided, use it
  if (data.deep_link) {
    return data.deep_link;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cromos.vercel.app';

  // Route based on notification kind and associated IDs
  switch (data.notification_kind) {
    case 'chat_unread':
    case 'proposal_accepted':
    case 'proposal_rejected':
    case 'finalization_requested':
      if (data.trade_id) {
        return `${baseUrl}/trades/${data.trade_id}`;
      }
      return `${baseUrl}/trades`;

    case 'listing_chat':
    case 'listing_reserved':
    case 'listing_completed':
      if (data.listing_id) {
        return `${baseUrl}/marketplace/${data.listing_id}`;
      }
      return `${baseUrl}/marketplace`;

    case 'template_rated':
      if (data.template_id) {
        return `${baseUrl}/plantillas/${data.template_id}`;
      }
      return `${baseUrl}/plantillas`;

    case 'user_rated':
      return `${baseUrl}/profile`;

    case 'badge_earned':
      return `${baseUrl}/profile/badges`;

    case 'admin_action':
      return `${baseUrl}/profile`;

    default:
      return `${baseUrl}/profile/notifications`;
  }
}

/**
 * Handle notification click event
 * Called when user clicks a push notification
 */
export function handleNotificationClick(data: NotificationData): void {
  const deepLink = generateDeepLink(data);
  
  // For web, navigate to the URL
  if (typeof window !== 'undefined') {
    window.location.href = deepLink;
  }
}

/**
 * Parse notification data from OneSignal payload
 */
export function parseNotificationData(payload: unknown): NotificationData | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;

  return {
    notification_kind: data.notification_kind as NotificationKind,
    listing_id: data.listing_id ? Number(data.listing_id) : undefined,
    template_id: data.template_id ? Number(data.template_id) : undefined,
    trade_id: data.trade_id ? Number(data.trade_id) : undefined,
    rating_id: data.rating_id ? Number(data.rating_id) : undefined,
    deep_link: data.deep_link as string | undefined,
  };
}
