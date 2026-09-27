-- Migration: Fix get_match_chat_messages ambiguous id column reference
-- Qualifies match_conversations.id explicitly to avoid collision with RETURNS TABLE (id bigint) OUT parameter

CREATE OR REPLACE FUNCTION public.get_match_chat_messages(
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
  v_deleted_at timestamptz;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a participant and get deleted_at
  SELECT CASE WHEN mc.user_a_id = v_me THEN mc.user_a_deleted_at ELSE mc.user_b_deleted_at END
  INTO v_deleted_at
  FROM match_conversations mc
  WHERE mc.id = p_conversation_id
    AND (mc.user_a_id = v_me OR mc.user_b_id = v_me);

  IF NOT FOUND THEN
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
    AND (v_deleted_at IS NULL OR tc.created_at > v_deleted_at)
    AND (p_cursor IS NULL OR tc.created_at < p_cursor)
  ORDER BY tc.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_chat_messages(bigint, timestamptz, integer) TO authenticated;
