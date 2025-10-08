-- Migration: Notifications System
-- Description: Add notifications table with triggers for chat messages, proposal status changes, and finalization requests
-- Version: v1.4.4
-- Date: 2025-10-08

-- =============================================
-- PART 1: CREATE TABLE
-- =============================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('chat_unread', 'proposal_accepted', 'proposal_rejected', 'finalization_requested')),
  trade_id BIGINT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_kind_read
  ON notifications(user_id, kind, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_trade_kind_read
  ON notifications(user_id, trade_id, kind, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_trade_id
  ON notifications(trade_id);

-- Add table comment
COMMENT ON TABLE notifications IS
  'Stores user notifications for chat messages, proposal status changes, and finalization requests. Coalesced per-trade (one chat_unread notification per trade).';

-- =============================================
-- PART 2: ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can only insert their own notifications (via triggers/RPCs)
DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy
  ON notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can only update their own notifications
DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can only delete their own notifications
DROP POLICY IF EXISTS notifications_delete_policy ON notifications;
CREATE POLICY notifications_delete_policy
  ON notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- PART 3: TRIGGER FUNCTIONS
-- =============================================

-- -----------------------------------------------
-- Trigger: Chat message creates/updates notification
-- -----------------------------------------------

DROP FUNCTION IF EXISTS notify_chat_message() CASCADE;

CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_from_user UUID;
  v_to_user UUID;
  v_counterparty UUID;
  v_status TEXT;
BEGIN
  -- Get trade details
  SELECT tp.from_user, tp.to_user, tp.status
  INTO v_from_user, v_to_user, v_status
  FROM trade_proposals tp
  WHERE tp.id = NEW.trade_id;

  -- Only notify for pending or accepted trades
  IF v_status NOT IN ('pending', 'accepted') THEN
    RETURN NEW;
  END IF;

  -- Determine counterparty (recipient of notification)
  IF NEW.sender_id = v_from_user THEN
    v_counterparty := v_to_user;
  ELSE
    v_counterparty := v_from_user;
  END IF;

  -- Upsert notification for counterparty (one per trade, update created_at if still unread)
  INSERT INTO notifications (user_id, kind, trade_id, created_at, metadata)
  VALUES (
    v_counterparty,
    'chat_unread',
    NEW.trade_id,
    NOW(),
    jsonb_build_object('sender_id', NEW.sender_id)
  )
  ON CONFLICT (user_id, trade_id, kind)
  WHERE read_at IS NULL
  DO UPDATE SET
    created_at = NOW(),
    metadata = notifications.metadata || jsonb_build_object('last_message_at', NOW());

  RETURN NEW;
END;
$$;

-- Note: We need a unique partial index to support ON CONFLICT for chat_unread
DROP INDEX IF EXISTS idx_notifications_user_trade_kind_unread_unique;
CREATE UNIQUE INDEX idx_notifications_user_trade_kind_unread_unique
  ON notifications(user_id, trade_id, kind)
  WHERE kind = 'chat_unread' AND read_at IS NULL;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_chat_message ON trade_chats;
CREATE TRIGGER trigger_notify_chat_message
  AFTER INSERT ON trade_chats
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();

-- -----------------------------------------------
-- Trigger: Proposal status change creates notification
-- -----------------------------------------------

DROP FUNCTION IF EXISTS notify_proposal_status_change() CASCADE;

CREATE OR REPLACE FUNCTION notify_proposal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_notification_kind TEXT;
  v_recipient_id UUID;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification kind and recipient
  CASE NEW.status
    WHEN 'accepted' THEN
      v_notification_kind := 'proposal_accepted';
      v_recipient_id := NEW.from_user; -- Notify the sender
    WHEN 'rejected' THEN
      v_notification_kind := 'proposal_rejected';
      v_recipient_id := NEW.from_user; -- Notify the sender
    ELSE
      -- Don't notify for other status changes (pending, cancelled)
      RETURN NEW;
  END CASE;

  -- Insert notification
  INSERT INTO notifications (user_id, kind, trade_id, created_at, metadata)
  VALUES (
    v_recipient_id,
    v_notification_kind,
    NEW.id,
    NOW(),
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_proposal_status_change ON trade_proposals;
CREATE TRIGGER trigger_notify_proposal_status_change
  AFTER UPDATE ON trade_proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_proposal_status_change();

-- -----------------------------------------------
-- Trigger: Finalization creates notification for counterparty
-- -----------------------------------------------

DROP FUNCTION IF EXISTS notify_finalization_requested() CASCADE;

CREATE OR REPLACE FUNCTION notify_finalization_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_from_user UUID;
  v_to_user UUID;
  v_counterparty UUID;
  v_already_finalized BOOLEAN;
BEGIN
  -- Get trade participants
  SELECT tp.from_user, tp.to_user
  INTO v_from_user, v_to_user
  FROM trade_proposals tp
  WHERE tp.id = NEW.trade_id;

  -- Determine counterparty
  IF NEW.user_id = v_from_user THEN
    v_counterparty := v_to_user;
  ELSE
    v_counterparty := v_from_user;
  END IF;

  -- Check if counterparty has already finalized
  SELECT EXISTS(
    SELECT 1 FROM trade_finalizations
    WHERE trade_id = NEW.trade_id AND user_id = v_counterparty
  ) INTO v_already_finalized;

  -- Only notify if counterparty hasn't finalized yet
  IF NOT v_already_finalized THEN
    INSERT INTO notifications (user_id, kind, trade_id, created_at, metadata)
    VALUES (
      v_counterparty,
      'finalization_requested',
      NEW.trade_id,
      NOW(),
      jsonb_build_object('requester_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_finalization_requested ON trade_finalizations;
CREATE TRIGGER trigger_notify_finalization_requested
  AFTER INSERT ON trade_finalizations
  FOR EACH ROW
  EXECUTE FUNCTION notify_finalization_requested();

-- =============================================
-- PART 4: RPC FUNCTIONS
-- =============================================

-- -----------------------------------------------
-- RPC: get_notifications
-- -----------------------------------------------

DROP FUNCTION IF EXISTS get_notifications();

CREATE OR REPLACE FUNCTION get_notifications()
RETURNS TABLE (
  id BIGINT,
  kind TEXT,
  trade_id BIGINT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  -- Enriched data from joins
  proposal_from_user UUID,
  proposal_to_user UUID,
  proposal_status TEXT,
  from_user_nickname TEXT,
  to_user_nickname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.kind,
    n.trade_id,
    n.created_at,
    n.read_at,
    n.metadata,
    tp.from_user AS proposal_from_user,
    tp.to_user AS proposal_to_user,
    tp.status AS proposal_status,
    p_from.nickname AS from_user_nickname,
    p_to.nickname AS to_user_nickname
  FROM notifications n
  LEFT JOIN trade_proposals tp ON tp.id = n.trade_id
  LEFT JOIN profiles p_from ON p_from.id = tp.from_user
  LEFT JOIN profiles p_to ON p_to.id = tp.to_user
  WHERE n.user_id = auth.uid()
  ORDER BY
    CASE WHEN n.read_at IS NULL THEN 0 ELSE 1 END, -- Unread first
    n.created_at DESC; -- Newest first
END;
$$;

REVOKE ALL ON FUNCTION get_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_notifications() TO authenticated;

COMMENT ON FUNCTION get_notifications() IS
  'Returns all notifications for the current user, ordered by unread first, then by creation date descending.';

-- -----------------------------------------------
-- RPC: mark_all_notifications_read
-- -----------------------------------------------

DROP FUNCTION IF EXISTS mark_all_notifications_read();

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

COMMENT ON FUNCTION mark_all_notifications_read() IS
  'Marks all unread notifications as read for the current user.';

-- -----------------------------------------------
-- RPC: get_notification_count
-- -----------------------------------------------

DROP FUNCTION IF EXISTS get_notification_count();

CREATE OR REPLACE FUNCTION get_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND read_at IS NULL;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION get_notification_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_notification_count() TO authenticated;

COMMENT ON FUNCTION get_notification_count() IS
  'Returns the count of unread notifications for the current user.';

-- =============================================
-- VERIFICATION QUERIES (commented out - for testing)
-- =============================================

-- Test queries (uncomment to verify):
-- SELECT * FROM notifications;
-- SELECT * FROM get_notifications();
-- SELECT get_notification_count();
-- SELECT mark_all_notifications_read();
