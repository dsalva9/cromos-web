/**
 * Notification Configuration
 * Defines all notification types with their metadata and default preferences
 */

import type {
  NotificationKind,
  NotificationCategory,
  NotificationTypeConfig,
  GranularNotificationPreferences,
} from '@/types/notifications';

/**
 * Complete configuration for all notification types
 * NOTE: Trade/Intercambios notifications are LEGACY and should NOT be implemented in new features
 */
export const NOTIFICATION_TYPE_CONFIGS: NotificationTypeConfig[] = [
  // Marketplace notifications
  {
    kind: 'listing_chat',
    label: 'Mensajes de chat',
    description: 'Nuevos mensajes sobre tus listados',
    category: 'marketplace',
    priority: 'low',
  },
  {
    kind: 'listing_reserved',
    label: 'Artículo reservado',
    description: 'Cuando alguien reserva tu listado',
    category: 'marketplace',
    priority: 'high',
  },
  {
    kind: 'listing_completed',
    label: 'Transacción completada',
    description: 'Cuando una transacción se completa',
    category: 'marketplace',
    priority: 'high',
  },

  // Community notifications
  {
    kind: 'user_rated',
    label: 'Te han valorado',
    description: 'Cuando otro usuario te valora',
    category: 'community',
    priority: 'high',
  },
  {
    kind: 'badge_earned',
    label: 'Insignia ganada',
    description: 'Cuando obtienes una nueva insignia',
    category: 'community',
    priority: 'high',
  },
  {
    kind: 'template_rated',
    label: 'Valoración de plantilla',
    description: 'Cuando alguien valora tu plantilla',
    category: 'community',
    priority: 'low',
  },

  // System notifications
  {
    kind: 'system_message',
    label: 'Mensaje del sistema',
    description: 'Mensajes importantes del sistema',
    category: 'system',
    priority: 'high',
  },
  {
    kind: 'level_up',
    label: 'Subida de nivel',
    description: 'Cuando subes de nivel',
    category: 'system',
    priority: 'high',
  },

  // Hidden system notifications (always enabled, not configurable by users)
  // admin_action - Always enabled, never shown in UI

  // LEGACY: Trade notifications (kept for backward compatibility, not shown in UI)
  // chat_unread, proposal_accepted, proposal_rejected, finalization_requested
];

/**
 * Get notification type configuration by kind
 */
export function getNotificationTypeConfig(kind: NotificationKind): NotificationTypeConfig | undefined {
  return NOTIFICATION_TYPE_CONFIGS.find((config) => config.kind === kind);
}

/**
 * Get all notification types for a specific category
 */
export function getCategoryNotificationTypes(category: NotificationCategory): NotificationTypeConfig[] {
  return NOTIFICATION_TYPE_CONFIGS.filter((config) => config.category === category);
}

/**
 * Hidden notification types that are always enabled and not configurable
 */
const HIDDEN_ALWAYS_ENABLED: NotificationKind[] = ['admin_action'];

/**
 * Legacy notification types (kept for backward compatibility, not shown in UI)
 */
const LEGACY_TYPES: NotificationKind[] = [
  'chat_unread',
  'proposal_accepted',
  'proposal_rejected',
  'finalization_requested',
];

/**
 * Get default preferences with smart defaults
 * High-priority notifications enabled by default
 * Low-priority notifications disabled for push/email, enabled for in-app
 * Hidden notifications (admin_action) always enabled on all channels
 * Legacy trade notifications disabled on all channels
 */
export function getDefaultPreferences(): GranularNotificationPreferences {
  const preferences: GranularNotificationPreferences = {
    in_app: {} as Record<NotificationKind, boolean>,
    push: {} as Record<NotificationKind, boolean>,
    email: {} as Record<NotificationKind, boolean>,
  };

  // Set preferences for configurable notifications
  NOTIFICATION_TYPE_CONFIGS.forEach((config) => {
    if (config.priority === 'high') {
      // High priority: enabled on all channels
      preferences.in_app[config.kind] = true;
      preferences.push[config.kind] = true;
      preferences.email[config.kind] = true;
    } else {
      // Low priority: enabled only in-app
      preferences.in_app[config.kind] = true;
      preferences.push[config.kind] = false;
      preferences.email[config.kind] = false;
    }
  });

  // Always enable hidden system notifications (not configurable)
  HIDDEN_ALWAYS_ENABLED.forEach((kind) => {
    preferences.in_app[kind] = true;
    preferences.push[kind] = true;
    preferences.email[kind] = true;
  });

  // Disable legacy trade notifications by default
  LEGACY_TYPES.forEach((kind) => {
    preferences.in_app[kind] = false;
    preferences.push[kind] = false;
    preferences.email[kind] = false;
  });

  return preferences;
}

/**
 * Check if a notification type should be hidden from UI
 */
export function isHiddenNotificationType(kind: NotificationKind): boolean {
  return HIDDEN_ALWAYS_ENABLED.includes(kind) || LEGACY_TYPES.includes(kind);
}

/**
 * Get category display information
 * NOTE: Only includes active categories (excludes legacy trades and hidden admin notifications)
 */
export const CATEGORY_INFO: Record<
  NotificationCategory,
  { label: string; description: string; icon: string }
> = {
  marketplace: {
    label: 'Marketplace',
    description: 'Notificaciones sobre listados y transacciones',
    icon: 'ShoppingCart',
  },
  templates: {
    label: 'Plantillas',
    description: 'Notificaciones sobre tus plantillas',
    icon: 'FileText',
  },
  community: {
    label: 'Comunidad',
    description: 'Valoraciones, insignias y plantillas',
    icon: 'Users',
  },
  trades: {
    label: 'Intercambios (Legacy)',
    description: 'Sistema de intercambios (deprecado)',
    icon: 'Repeat',
  },
  system: {
    label: 'Sistema',
    description: 'Mensajes del sistema y niveles',
    icon: 'Bell',
  },
};

/**
 * Get channel display information
 */
export const CHANNEL_INFO: Record<
  'in_app' | 'push' | 'email',
  { label: string; description: string; icon: string }
> = {
  in_app: {
    label: 'En la App',
    description: 'Notificaciones dentro de la aplicación',
    icon: 'Bell',
  },
  push: {
    label: 'Push',
    description: 'Notificaciones push en tu dispositivo',
    icon: 'Smartphone',
  },
  email: {
    label: 'Email',
    description: 'Notificaciones por correo electrónico',
    icon: 'Mail',
  },
};
