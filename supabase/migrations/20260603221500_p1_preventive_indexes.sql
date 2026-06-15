-- P1: Preventive indexes for notification and conversation queries
--
-- These indexes cover the primary access patterns that were contributing
-- to excessive buffer usage under load:
--
-- 1. Notifications: (user_id, created_at DESC) for the ORDER BY in get_notifications
-- 2. Trade chats: (listing_id, receiver_id) for the conversation aggregation

-- Notifications: support ORDER BY created_at DESC per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications (user_id, created_at DESC);

-- Trade chats: support receiver-side lookups in get_user_conversations
CREATE INDEX IF NOT EXISTS idx_trade_chats_listing_receiver
ON public.trade_chats (listing_id, receiver_id)
WHERE listing_id IS NOT NULL;
