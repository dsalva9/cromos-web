/**
 * Deep Linking Handler for OneSignal Notifications
 * Routes users to the correct page when clicking push notifications
 */

import { Capacitor } from '@capacitor/core';
import type { NotificationKind } from './config';

export interface NotificationData {
  notification_kind: NotificationKind;
  listing_id?: number;
  template_id?: number;
  trade_id?: number;
  rating_id?: number;
  badge_id?: string;
  deep_link?: string;
}

/**
 * Generate deep link path from notification data
 * Returns just the path, not the full URL
 */
export function generateDeepLinkPath(data: NotificationData): string {
  // If explicit deep link is provided, extract the path
  if (data.deep_link) {
    try {
      const url = new URL(data.deep_link);
      return url.pathname + url.search + url.hash;
    } catch {
      // If it's already a path, return it
      return data.deep_link;
    }
  }

  // Route based on notification kind and associated IDs
  switch (data.notification_kind) {
    case 'chat_unread':
    case 'proposal_accepted':
    case 'proposal_rejected':
    case 'finalization_requested':
      if (data.trade_id) {
        return `/trades/${data.trade_id}`;
      }
      return '/trades';

    case 'listing_chat':
      // For chat notifications, go directly to the chat
      if (data.listing_id) {
        return `/marketplace/${data.listing_id}/chat`;
      }
      return '/marketplace';

    case 'listing_reserved':
    case 'listing_completed':
      if (data.listing_id) {
        return `/marketplace/${data.listing_id}`;
      }
      return '/marketplace';

    case 'template_rated':
      if (data.template_id) {
        return `/plantillas/${data.template_id}`;
      }
      return '/plantillas';

    case 'user_rated':
      return '/profile';

    case 'badge_earned':
      if (data.badge_id) {
        return `/profile?badge=${data.badge_id}#badges`;
      }
      return '/profile#badges';

    case 'admin_action':
      return '/profile';

    default:
      return '/profile/notifications';
  }
}

/**
 * Handle notification click event
 * Called when user clicks a push notification
 *
 * For native apps (Capacitor), navigates within the app using Next.js router
 * For web, uses window.location to navigate
 */
export function handleNotificationClick(data: NotificationData): void {
  const deepLinkPath = generateDeepLinkPath(data);

  if (typeof window === 'undefined') {
    return;
  }

  console.log('[Deep Linking] Navigating to:', deepLinkPath);

  // Check if running in a native app (Capacitor)
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // For native apps, use pushState to navigate within the app
    // This keeps the user in the app instead of opening the browser
    window.history.pushState({}, '', deepLinkPath);

    // Trigger a popstate event to let Next.js router handle the navigation
    const popStateEvent = new PopStateEvent('popstate', { state: {} });
    window.dispatchEvent(popStateEvent);

    // Also manually reload the page to ensure navigation happens
    window.location.href = deepLinkPath;
  } else {
    // For web, just navigate normally
    window.location.href = deepLinkPath;
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
    badge_id: data.badge_id as string | undefined,
    deep_link: data.deep_link as string | undefined,
  };
}
