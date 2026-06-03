-- ============================================================
-- Fix match chat notification trigger to fire on EVERY message
-- (same behaviour as marketplace's notify_chat_message trigger)
--
-- Problems solved:
--   1. Old trigger only fired on the first message in a conversation,
--      so the receiver of a reply never got a notification.
--   2. No match_conversation_id column on notifications → couldn't
--      do per-conversation upsert for dedup.
-- ============================================================

-- Step 1: Add match_conversation_id column to notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS match_conversation_id bigint
  REFERENCES match_conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_match_conversation_id
  ON notifications (match_conversation_id);

-- Step 2: Back-fill existing match_chat_message notifications
--         so the new unique index doesn't choke on them.
UPDATE notifications
SET match_conversation_id = (payload->>'match_conversation_id')::bigint
WHERE kind = 'match_chat_message'
  AND match_conversation_id IS NULL
  AND payload->>'match_conversation_id' IS NOT NULL;

-- Step 3: Deduplicate existing unread notifications.
--         The old index used bare columns (NULLs never conflict), so duplicates
--         already exist.  Keep only the newest per group.
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, kind,
        COALESCE(listing_id, 0),
        COALESCE(template_id, 0),
        COALESCE(rating_id, 0),
        COALESCE(trade_id, 0),
        COALESCE(match_conversation_id, 0)
      ORDER BY created_at DESC
    ) AS rn
  FROM notifications
  WHERE read_at IS NULL
)
DELETE FROM notifications
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- Step 4: Rebuild the unique partial index to include match_conversation_id.
--         The index uses COALESCE so that NULL columns compare as 0 / ''
--         (NULLs are not considered equal in btree unique indexes).
DROP INDEX IF EXISTS idx_notifications_unique_unread;

CREATE UNIQUE INDEX idx_notifications_unique_unread
  ON notifications (
    user_id,
    kind,
    COALESCE(listing_id, 0),
    COALESCE(template_id, 0),
    COALESCE(rating_id, 0),
    COALESCE(trade_id, 0),
    COALESCE(match_conversation_id, 0)
  )
  WHERE read_at IS NULL;

-- Step 5: Drop the old trigger (fires only on the first message)
DROP TRIGGER IF EXISTS trg_notify_first_match_message ON trade_chats;

-- Step 6: Replace the function with one that fires on EVERY message
--         and upserts the notification (same pattern as notify_chat_message).
CREATE OR REPLACE FUNCTION notify_match_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv          match_conversations%ROWTYPE;
  v_counterparty  uuid;
  v_template_title text;
BEGIN
  -- Only proceed if this is a match-conversation message
  IF NEW.match_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip system messages (same as marketplace)
  IF NEW.is_system THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT * INTO v_conv
  FROM match_conversations
  WHERE id = NEW.match_conversation_id;

  IF v_conv IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine counterparty (the other user in the conversation)
  IF NEW.sender_id = v_conv.user_a_id THEN
    v_counterparty := v_conv.user_b_id;
  ELSIF NEW.sender_id = v_conv.user_b_id THEN
    v_counterparty := v_conv.user_a_id;
  ELSE
    -- Sender is not a participant (shouldn't happen, but be safe)
    RETURN NEW;
  END IF;

  -- Get template title (may be NULL)
  IF v_conv.template_id IS NOT NULL THEN
    SELECT title INTO v_template_title
    FROM collection_templates
    WHERE id = v_conv.template_id;
  END IF;

  -- Upsert notification for the counterparty
  -- If an unread notification already exists for this user + conversation, update it;
  -- otherwise insert a new one.
  INSERT INTO notifications (
    user_id,
    kind,
    match_conversation_id,
    actor_id,
    created_at,
    payload
  )
  VALUES (
    v_counterparty,
    'match_chat_message',
    NEW.match_conversation_id,
    NEW.sender_id,
    NOW(),
    jsonb_build_object(
      'match_conversation_id', NEW.match_conversation_id,
      'template_title', COALESCE(v_template_title, ''),
      'message_preview', LEFT(COALESCE(NEW.message, ''), 100)
    )
  )
  ON CONFLICT (
    user_id,
    kind,
    COALESCE(listing_id, 0),
    COALESCE(template_id, 0),
    COALESCE(rating_id, 0),
    COALESCE(trade_id, 0),
    COALESCE(match_conversation_id, 0)
  )
  WHERE read_at IS NULL
  DO UPDATE SET
    created_at = NOW(),
    actor_id   = NEW.sender_id,
    payload    = jsonb_build_object(
      'match_conversation_id', NEW.match_conversation_id,
      'template_title', COALESCE(v_template_title, ''),
      'message_preview', LEFT(COALESCE(NEW.message, ''), 100),
      'last_message_at', NOW()
    );

  RETURN NEW;
END;
$$;

-- Step 7: Create the new trigger (fires on every match message, not just the first)
CREATE TRIGGER trg_notify_match_chat_message
  AFTER INSERT ON trade_chats
  FOR EACH ROW
  WHEN (NEW.match_conversation_id IS NOT NULL)
  EXECUTE FUNCTION notify_match_chat_message();

-- Step 8: Clean up the old function
DROP FUNCTION IF EXISTS notify_first_match_message();
