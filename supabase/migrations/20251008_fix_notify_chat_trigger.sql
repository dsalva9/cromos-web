-- Migration: Fix notify_chat_message trigger ON CONFLICT clause
-- Description: Remove WHERE clause from ON CONFLICT since partial index already has WHERE condition
-- Version: v1.4.4 hotfix
-- Date: 2025-10-08

-- Drop and recreate the notify_chat_message trigger function
DROP FUNCTION IF EXISTS notify_chat_message() CASCADE;

CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_recipient_id UUID;
  v_status TEXT;
BEGIN
  -- Get trade details and determine recipient
  SELECT
    CASE WHEN tp.from_user = NEW.sender_id THEN tp.to_user ELSE tp.from_user END,
    tp.status
  INTO v_recipient_id, v_status
  FROM trade_proposals tp
  WHERE tp.id = NEW.trade_id;

  -- Only notify for pending or accepted trades
  IF v_status NOT IN ('pending', 'accepted') THEN
    RETURN NEW;
  END IF;

  -- Check if an unread notification already exists for this user/trade/kind
  -- If so, update it. If not, insert a new one.
  -- We can't use ON CONFLICT with a partial unique index in the WHERE clause,
  -- so we use conditional logic instead.
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_recipient_id
      AND trade_id = NEW.trade_id
      AND kind = 'chat_unread'
      AND read_at IS NULL
  ) THEN
    -- Update existing unread notification
    UPDATE notifications
    SET created_at = NOW(),
        metadata = jsonb_build_object(
          'last_message_id', NEW.id,
          'last_sender_id', NEW.sender_id
        )
    WHERE user_id = v_recipient_id
      AND trade_id = NEW.trade_id
      AND kind = 'chat_unread'
      AND read_at IS NULL;
  ELSE
    -- Insert new notification
    INSERT INTO notifications (
      user_id,
      kind,
      trade_id,
      created_at,
      metadata
    ) VALUES (
      v_recipient_id,
      'chat_unread',
      NEW.trade_id,
      NOW(),
      jsonb_build_object(
        'last_message_id', NEW.id,
        'last_sender_id', NEW.sender_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_chat_message ON trade_chats;

CREATE TRIGGER trigger_notify_chat_message
  AFTER INSERT ON trade_chats
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();

-- Add comment
COMMENT ON FUNCTION notify_chat_message() IS
  'Trigger function that creates or updates chat_unread notifications when a new message is sent';
