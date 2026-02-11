/**
 * Notification Preferences Client Library
 * Manages granular user notification settings per channel and type
 */

import { createClient } from '@/lib/supabase/client';
import type {
  GranularNotificationPreferences,
  NotificationChannel,
  NotificationKind,
} from '@/types/notifications';
import { getDefaultPreferences } from '@/lib/notifications/config';
import { logger } from '@/lib/logger';

// Legacy interface for backward compatibility
export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
}

/**
 * Fetch granular notification preferences for the current user
 */
export async function fetchNotificationPreferences(): Promise<GranularNotificationPreferences> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_notification_preferences');

  if (error) {
    logger.error('Error fetching notification preferences:', error);
    // Return defaults on error
    return getDefaultPreferences();
  }

  return data as unknown as GranularNotificationPreferences;
}

/**
 * Update granular notification preferences for the current user
 */
export async function updateNotificationPreferences(
  preferences: GranularNotificationPreferences
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('update_notification_preferences', {
    p_preferences: preferences as unknown as import('@/types/database').Json,
  });

  if (error) {
    logger.error('Error updating notification preferences:', error);
    throw new Error('Error al actualizar las preferencias de notificación');
  }
}

/**
 * Check if a specific notification type is enabled for a channel
 */
export function checkNotificationEnabled(
  preferences: GranularNotificationPreferences,
  kind: NotificationKind,
  channel: NotificationChannel
): boolean {
  return preferences[channel][kind] ?? true;
}

/**
 * Toggle a specific notification type for a channel
 */
export function toggleNotificationPreference(
  preferences: GranularNotificationPreferences,
  kind: NotificationKind,
  channel: NotificationChannel,
  enabled: boolean
): GranularNotificationPreferences {
  return {
    ...preferences,
    [channel]: {
      ...preferences[channel],
      [kind]: enabled,
    },
  };
}

/**
 * Enable all notifications for a channel
 */
export function enableAllForChannel(
  preferences: GranularNotificationPreferences,
  channel: NotificationChannel
): GranularNotificationPreferences {
  const updatedChannel = { ...preferences[channel] };
  Object.keys(updatedChannel).forEach((key) => {
    updatedChannel[key as NotificationKind] = true;
  });

  return {
    ...preferences,
    [channel]: updatedChannel,
  };
}

/**
 * Disable all notifications for a channel
 */
export function disableAllForChannel(
  preferences: GranularNotificationPreferences,
  channel: NotificationChannel
): GranularNotificationPreferences {
  const updatedChannel = { ...preferences[channel] };
  Object.keys(updatedChannel).forEach((key) => {
    updatedChannel[key as NotificationKind] = false;
  });

  return {
    ...preferences,
    [channel]: updatedChannel,
  };
}

/**
 * Update OneSignal player ID for the current user
 */
export async function updateOneSignalPlayerId(playerId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('update_onesignal_player_id', {
    p_player_id: playerId,
  });

  if (error) {
    logger.error('Error updating OneSignal player ID:', error);
    throw new Error('Error al actualizar el ID de notificaciones push');
  }
}
