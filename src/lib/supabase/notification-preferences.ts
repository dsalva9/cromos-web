/**
 * Notification Preferences Client Library
 * Manages user notification settings for push and email
 */

import { createClient } from '@/lib/supabase/client';

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
}

/**
 * Fetch notification preferences for the current user
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_notification_preferences');

  if (error) {
    console.error('Error fetching notification preferences:', error);
    // Return defaults on error
    return {
      push_enabled: true,
      email_enabled: true,
    };
  }

  return data as NotificationPreferences;
}

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('update_notification_preferences', {
    p_preferences: preferences,
  });

  if (error) {
    console.error('Error updating notification preferences:', error);
    throw new Error('Error al actualizar las preferencias de notificación');
  }
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
    console.error('Error updating OneSignal player ID:', error);
    throw new Error('Error al actualizar el ID de notificaciones push');
  }
}
