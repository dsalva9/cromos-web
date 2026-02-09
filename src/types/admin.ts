// =====================================================
// ADMIN DATA TYPES
// =====================================================
// Type definitions for admin dashboard data retention features

export interface SuspendedUser {
  user_id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  suspended_at: string;
  suspended_by: string | null;
  suspended_by_nickname: string | null;
  suspension_reason: string | null;
  is_pending_deletion: boolean;
  scheduled_deletion_date: string | null;
  days_until_deletion: number | null;
}

export interface PendingDeletionUser {
  user_id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  deleted_at: string;
  scheduled_for: string;
  days_remaining: number;
  deletion_reason: string | null;
  initiated_by_type: string;
  legal_hold_until: string | null;
  retention_schedule_id: number;
}

export interface PendingDeletionListing {
  listing_id: number;
  title: string;
  collection_name: string | null;
  seller_id: string;
  seller_nickname: string | null;
  deleted_at: string;
  scheduled_for: string;
  days_remaining: number;
  deletion_type: string;
  deletion_reason: string | null;
  legal_hold_until: string | null;
  retention_schedule_id: number;
}

export interface PendingDeletionTemplate {
  template_id: number;
  title: string;
  author_id: string | null;
  author_nickname: string | null;
  deleted_at: string;
  scheduled_for: string;
  days_remaining: number;
  deletion_type: string;
  deletion_reason: string | null;
  rating_avg: number | null;
  rating_count: number;
  legal_hold_until: string | null;
  retention_schedule_id: number;
}

export interface PermanentDeleteResponse {
  success: boolean;
  message: string;
  deleted_at?: string;
  deleted_by_admin?: string;
}

export interface PermanentDeleteUserResponse extends PermanentDeleteResponse {
  user_id: string;
  nickname: string;
}

export interface PermanentDeleteListingResponse extends PermanentDeleteResponse {
  listing_id: string;
  title: string;
  deleted_chat_count: number;
  deleted_transaction_count: number;
}

export interface PermanentDeleteTemplateResponse extends PermanentDeleteResponse {
  template_id: string;
  title: string;
  deleted_slot_count: number;
  deleted_page_count: number;
  deleted_rating_count: number;
}
