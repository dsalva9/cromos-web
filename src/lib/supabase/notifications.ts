/**
 * Supabase Client for Notifications
 * Sprint 15: Notifications System
 */

import { createClient } from '@/lib/supabase/client';
import type { AppNotification, RawNotification, NotificationKind } from '@/types/notifications';
import { z } from 'zod';

/**
 * Zod schema for validating raw notification data
 */
const rawNotificationSchema = z.object({
  id: z.number(),
  kind: z.string(),
  trade_id: z.number().nullish(),
  listing_id: z.number().nullish(),
  template_id: z.number().nullish(),
  rating_id: z.number().nullish(),
  created_at: z.string(),
  read_at: z.string().nullish(),
  payload: z.record(z.string(), z.unknown()),
  actor_id: z.string().nullish(),
  actor_nickname: z.string().nullish(),
  actor_avatar_url: z.string().nullish(),
  proposal_from_user: z.string().nullish(),
  proposal_to_user: z.string().nullish(),
  proposal_status: z.string().nullish(),
  from_user_nickname: z.string().nullish(),
  to_user_nickname: z.string().nullish(),
  listing_title: z.string().nullish(),
  listing_status: z.string().nullish(),
  template_name: z.string().nullish(),
  template_status: z.string().nullish(),
});

/**
 * Transform raw notification from database to AppNotification
 */
function transformNotification(raw: RawNotification): AppNotification {
  return {
    id: raw.id,
    kind: raw.kind as NotificationKind,
    createdAt: raw.created_at,
    readAt: raw.read_at ?? null,
    tradeId: raw.trade_id ?? null,
    listingId: raw.listing_id ?? null,
    templateId: raw.template_id ?? null,
    ratingId: raw.rating_id ?? null,
    actor: raw.actor_id
      ? {
          id: raw.actor_id,
          nickname: raw.actor_nickname || 'Usuario desconocido',
          avatarUrl: raw.actor_avatar_url ?? null,
        }
      : null,
    payload: raw.payload,
    proposalFromUser: raw.proposal_from_user ?? null,
    proposalToUser: raw.proposal_to_user ?? null,
    proposalStatus: raw.proposal_status ?? null,
    fromUserNickname: raw.from_user_nickname ?? null,
    toUserNickname: raw.to_user_nickname ?? null,
    listingTitle: raw.listing_title ?? null,
    listingStatus: raw.listing_status ?? null,
    templateName: raw.template_name ?? null,
    templateStatus: raw.template_status ?? null,
  };
}

/**
 * Fetch all notifications for the current user
 */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_notifications');

  if (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Error al cargar las notificaciones');
  }

  if (!data) {
    return [];
  }

  // Validate and transform data
  const validatedData = z.array(rawNotificationSchema).parse(data);
  return validatedData.map(transformNotification);
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_notification_count');

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Mark all notifications as read
 */
export async function markAllRead(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('mark_all_notifications_read');

  if (error) {
    console.error('Error marking all as read:', error);
    throw new Error('Error al marcar notificaciones como leídas');
  }
}

/**
 * Mark a single notification as read
 */
export async function markRead(notificationId: number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Error al marcar la notificación como leída');
  }
}

/**
 * Mark listing chat notifications as read for a specific participant
 */
export async function markListingChatNotificationsRead(
  listingId: number,
  participantId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('mark_listing_chat_notifications_read', {
    p_listing_id: listingId,
    p_participant_id: participantId,
  });

  if (error) {
    console.error('Error marking listing chat notifications as read:', error);
    throw new Error('Error al marcar las notificaciones de chat como leídas');
  }
}

/**
 * Subscribe to realtime notification events
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: AppNotification) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        try {
          // Transform the new notification
          const raw = payload.new as RawNotification;
          const validated = rawNotificationSchema.parse(raw);
          const notification = transformNotification(validated);
          onNotification(notification);
        } catch (error) {
          console.error('Error processing realtime notification:', error);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
