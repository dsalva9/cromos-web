/**
 * OneSignal Configuration
 * Centralized config for OneSignal push notifications
 */

export const ONESIGNAL_CONFIG = {
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '3b9eb764-f440-404d-949a-1468356afc18',
  
  // Safari Web ID (if different from app ID)
  safariWebId: undefined,
  
  // Notification settings
  autoResubscribe: true,
  autoRegister: false, // We'll manually prompt for permission
  
  // Service worker path (for web)
  serviceWorkerPath: '/OneSignalSDKWorker.js',
  serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
  
  // Prompt settings — native slidedown is disabled.
  // We use a custom in-app NotificationPromptBanner instead.
} as const;

/**
 * Notification categories and their display settings
 */
export const NOTIFICATION_CATEGORIES = {
  chat_unread: {
    icon: '💬',
    priority: 'high',
    sound: true,
  },
  listing_chat: {
    icon: '💬',
    priority: 'high',
    sound: true,
  },
  listing_reserved: {
    icon: '🛒',
    priority: 'high',
    sound: true,
  },
  listing_completed: {
    icon: '✅',
    priority: 'high',
    sound: true,
  },
  user_rated: {
    icon: '⭐',
    priority: 'default',
    sound: false,
  },
  template_rated: {
    icon: '⭐',
    priority: 'default',
    sound: false,
  },
  badge_earned: {
    icon: '🏆',
    priority: 'default',
    sound: true,
  },
  proposal_accepted: {
    icon: '✅',
    priority: 'high',
    sound: true,
  },
  proposal_rejected: {
    icon: '❌',
    priority: 'default',
    sound: false,
  },
  finalization_requested: {
    icon: '📋',
    priority: 'high',
    sound: true,
  },
  admin_action: {
    icon: '🛡️',
    priority: 'high',
    sound: true,
  },
} as const;

export type NotificationKind = keyof typeof NOTIFICATION_CATEGORIES;
