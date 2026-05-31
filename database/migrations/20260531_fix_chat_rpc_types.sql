-- ============================================================
-- Fix: Change return types from integer to bigint to match
-- trade_chats.id (bigint) column type.
-- This fixes 400 errors from PostgREST type mismatch.
-- ============================================================

-- Fix get_match_chat_messages: id integer -> bigint
DROP FUNCTION IF EXISTS get_match_chat_messages(bigint, timestamptz, integer);

CREATE OR REPLACE FUNCTION get_match_chat_messages(
  p_conversation_id bigint,
  p_cursor timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  sender_id uuid,
  receiver_id uuid,
  sender_nickname text,
  message text,
  is_read boolean,
  is_system boolean,
  created_at timestamptz,
  image_url text,
  thumbnail_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM match_conversations
    WHERE match_conversations.id = p_conversation_id
      AND (user_a_id = v_me OR user_b_id = v_me)
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    tc.id,
    tc.sender_id,
    tc.receiver_id,
    COALESCE(p.nickname, 'Usuario')::text AS sender_nickname,
    tc.message::text,
    tc.is_read,
    tc.is_system,
    tc.created_at,
    tc.image_url::text,
    tc.thumbnail_url::text
  FROM trade_chats tc
  LEFT JOIN profiles p ON p.id = tc.sender_id
  WHERE tc.match_conversation_id = p_conversation_id
    AND (p_cursor IS NULL OR tc.created_at < p_cursor)
  ORDER BY tc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Fix send_match_message: returns integer -> bigint
DROP FUNCTION IF EXISTS send_match_message(bigint, text, text, text);

CREATE OR REPLACE FUNCTION send_match_message(
  p_conversation_id bigint,
  p_message text,
  p_image_url text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_other_user_id uuid;
  v_msg_id bigint;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF length(trim(p_message)) = 0 AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF length(p_message) > 500 THEN
    RAISE EXCEPTION 'Message too long (max 500 chars)';
  END IF;

  SELECT CASE WHEN user_a_id = v_me THEN user_b_id ELSE user_a_id END
  INTO v_other_user_id
  FROM match_conversations
  WHERE match_conversations.id = p_conversation_id
    AND (user_a_id = v_me OR user_b_id = v_me);

  IF v_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  INSERT INTO trade_chats (
    match_conversation_id, sender_id, receiver_id,
    message, image_url, thumbnail_url, is_read, is_system
  )
  VALUES (
    p_conversation_id, v_me, v_other_user_id,
    trim(p_message), p_image_url, p_thumbnail_url, false, false
  )
  RETURNING trade_chats.id INTO v_msg_id;

  UPDATE match_conversations
  SET last_message = trim(p_message),
      last_message_at = now(),
      last_message_sender_id = v_me
  WHERE match_conversations.id = p_conversation_id;

  RETURN v_msg_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_match_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION send_match_message TO authenticated;

NOTIFY pgrst, 'reload schema';
