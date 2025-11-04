/**
 * Notification Types
 * Sprint 15: Notifications System
 */

/**
 * All possible notification kinds in the system
 */
export type NotificationKind =
  // Legacy trade notifications
  | 'chat_unread'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'finalization_requested'
  // Marketplace listing notifications
  | 'listing_chat'
  | 'listing_reserved'
  | 'listing_completed'
  // Rating notifications
  | 'user_rated'
  | 'template_rated'
  // Badge notifications
  | 'badge_earned'
  // Admin notifications
  | 'admin_action';

/**
 * Actor information (who triggered the notification)
 */
export interface NotificationActor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

/**
 * Core notification interface
 */
export interface AppNotification {
  id: number;
  kind: NotificationKind;
  createdAt: string;
  readAt: string | null;

  // Related entities
  tradeId?: number | null;
  listingId?: number | null;
  templateId?: number | null;
  ratingId?: number | null;

  // Actor who triggered this notification
  actor: NotificationActor | null;

  // Additional structured data
  payload: Record<string, unknown>;

  // Enriched data from joins
  // Trade data (legacy)
  proposalFromUser?: string | null;
  proposalToUser?: string | null;
  proposalStatus?: string | null;
  fromUserNickname?: string | null;
  toUserNickname?: string | null;

  // Listing data
  listingTitle?: string | null;
  listingStatus?: string | null;

  // Template data
  templateName?: string | null;
  templateStatus?: string | null;
}

/**
 * Raw notification from database RPC
 */
export interface RawNotification {
  id: number;
  kind: string;
  trade_id: number | null;
  listing_id: number | null;
  template_id: number | null;
  rating_id: number | null;
  created_at: string;
  read_at: string | null;
  payload: Record<string, unknown>;

  // Actor
  actor_id: string | null;
  actor_nickname: string | null;
  actor_avatar_url: string | null;

  // Trade data
  proposal_from_user: string | null;
  proposal_to_user: string | null;
  proposal_status: string | null;
  from_user_nickname: string | null;
  to_user_nickname: string | null;

  // Listing data
  listing_title: string | null;
  listing_status: string | null;

  // Template data
  template_name: string | null;
  template_status: string | null;
}

/**
 * Formatted notification for display
 */
export interface FormattedNotification extends AppNotification {
  title: string;
  body: string;
  href: string | null;
  icon: string;
  category: NotificationCategory;
}

/**
 * Notification categories for grouping
 */
export type NotificationCategory =
  | 'marketplace'
  | 'templates'
  | 'community'
  | 'system'
  | 'trades';

/**
 * Grouped notifications by category
 */
export interface GroupedNotifications {
  marketplace: FormattedNotification[];
  templates: FormattedNotification[];
  community: FormattedNotification[];
  system: FormattedNotification[];
  trades: FormattedNotification[];
}

/**
 * Helper type guards
 */

export function isListingNotification(kind: NotificationKind): boolean {
  return ['listing_chat', 'listing_reserved', 'listing_completed'].includes(kind);
}

export function isTemplateNotification(kind: NotificationKind): boolean {
  return kind === 'template_rated';
}

export function isTradeNotification(kind: NotificationKind): boolean {
  return ['chat_unread', 'proposal_accepted', 'proposal_rejected', 'finalization_requested'].includes(kind);
}

export function isRatingNotification(kind: NotificationKind): boolean {
  return ['user_rated', 'template_rated'].includes(kind);
}

export function isChatNotification(kind: NotificationKind): boolean {
  return kind === 'listing_chat' || kind === 'chat_unread';
}

/**
 * Get notification category from kind
 */
export function getNotificationCategory(kind: NotificationKind): NotificationCategory {
  if (isListingNotification(kind)) return 'marketplace';
  if (isTemplateNotification(kind)) return 'templates';
  if (isRatingNotification(kind)) return 'community';
  if (isTradeNotification(kind)) return 'trades';
  return 'system';
}

/**
 * Get icon name for notification kind
 */
export function getNotificationIcon(kind: NotificationKind): string {
  switch (kind) {
    case 'listing_chat':
    case 'chat_unread':
      return 'MessageSquare';
    case 'listing_reserved':
    case 'listing_completed':
      return 'ShoppingCart';
    case 'user_rated':
    case 'template_rated':
      return 'Star';
    case 'badge_earned':
      return 'Award';
    case 'proposal_accepted':
      return 'CheckCircle';
    case 'proposal_rejected':
      return 'XCircle';
    case 'finalization_requested':
      return 'AlertCircle';
    case 'admin_action':
      return 'Shield';
    default:
      return 'Bell';
  }
}
