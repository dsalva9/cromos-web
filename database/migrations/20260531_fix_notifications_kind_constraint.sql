-- ============================================================
-- Fix: Add 'match_chat_message' to notifications kind CHECK constraint
-- The notify_first_match_message() trigger inserts notifications
-- with kind = 'match_chat_message', but this value was missing
-- from the CHECK constraint, causing INSERT failures (400 errors).
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (
  kind = ANY (ARRAY[
    'chat_unread',
    'proposal_accepted',
    'proposal_rejected',
    'finalization_requested',
    'listing_chat',
    'listing_reserved',
    'listing_completed',
    'user_rated',
    'template_rated',
    'badge_earned',
    'admin_action',
    'system_message',
    'level_up',
    'trade_confirmation_request',
    'trade_confirmed',
    'match_chat_message'
  ])
);
