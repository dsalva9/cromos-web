-- ============================================================
-- Phase 4: Match Chat System — Database Migration
-- ============================================================

-- 1. Create match_conversations table
CREATE TABLE IF NOT EXISTS match_conversations (
  id            bigserial PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  user_a_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id   integer REFERENCES collection_templates(id) ON DELETE SET NULL,
  -- Denormalized for list query performance
  last_message          text,
  last_message_at       timestamptz,
  last_message_sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Unique index on user pair (order-independent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_conv_user_pair
  ON match_conversations(LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_conv_user_a ON match_conversations(user_a_id);
CREATE INDEX IF NOT EXISTS idx_match_conv_user_b ON match_conversations(user_b_id);
CREATE INDEX IF NOT EXISTS idx_match_conv_last_msg ON match_conversations(last_message_at DESC NULLS LAST);

-- 2. Add match_conversation_id to trade_chats
ALTER TABLE trade_chats ADD COLUMN IF NOT EXISTS match_conversation_id bigint
  REFERENCES match_conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trade_chats_match_conv 
  ON trade_chats(match_conversation_id) WHERE match_conversation_id IS NOT NULL;

-- 3. RLS policies for match_conversations
ALTER TABLE match_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON match_conversations FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can insert conversations they're part of"
  ON match_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can update their own conversations"
  ON match_conversations FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- 4. RLS on trade_chats for match messages (already has RLS, just add filter)
-- The existing RLS on trade_chats covers sender_id/receiver_id checks.
-- Match messages use the same sender_id/receiver_id columns.

-- ============================================================
-- RPCs
-- ============================================================

-- 5. get_or_create_match_conversation
CREATE OR REPLACE FUNCTION get_or_create_match_conversation(
  p_other_user_id uuid,
  p_template_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_conv match_conversations%ROWTYPE;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot chat with yourself';
  END IF;

  -- Normalize order for the unique constraint
  v_user_a := LEAST(v_me, p_other_user_id);
  v_user_b := GREATEST(v_me, p_other_user_id);

  -- Try to find existing conversation
  SELECT * INTO v_conv
  FROM match_conversations
  WHERE LEAST(user_a_id, user_b_id) = v_user_a
    AND GREATEST(user_a_id, user_b_id) = v_user_b;

  IF v_conv.id IS NOT NULL THEN
    -- Update template_id if a new one is provided
    IF p_template_id IS NOT NULL AND (v_conv.template_id IS NULL OR v_conv.template_id != p_template_id) THEN
      UPDATE match_conversations SET template_id = p_template_id WHERE id = v_conv.id;
      v_conv.template_id := p_template_id;
    END IF;
    
    RETURN jsonb_build_object(
      'id', v_conv.id,
      'created_at', v_conv.created_at,
      'other_user_id', p_other_user_id,
      'template_id', v_conv.template_id,
      'is_new', false
    );
  END IF;

  -- Create new conversation
  INSERT INTO match_conversations (user_a_id, user_b_id, template_id)
  VALUES (v_user_a, v_user_b, p_template_id)
  RETURNING * INTO v_conv;

  RETURN jsonb_build_object(
    'id', v_conv.id,
    'created_at', v_conv.created_at,
    'other_user_id', p_other_user_id,
    'template_id', v_conv.template_id,
    'is_new', true
  );
END;
$$;

-- 6. get_match_conversations — list all match conversations for current user
CREATE OR REPLACE FUNCTION get_match_conversations()
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  other_user_id uuid,
  other_nickname text,
  other_avatar_url text,
  template_id integer,
  template_title text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
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

  RETURN QUERY
  SELECT
    mc.id,
    mc.created_at,
    CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END AS other_user_id,
    p.nickname::text AS other_nickname,
    p.avatar_url::text AS other_avatar_url,
    mc.template_id,
    t.title::text AS template_title,
    mc.last_message::text,
    mc.last_message_at,
    COALESCE((
      SELECT COUNT(*)
      FROM trade_chats tc
      WHERE tc.match_conversation_id = mc.id
        AND tc.receiver_id = v_me
        AND tc.is_read = false
    ), 0) AS unread_count
  FROM match_conversations mc
  JOIN profiles p ON p.id = CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END
  LEFT JOIN collection_templates t ON t.id = mc.template_id
  WHERE mc.user_a_id = v_me OR mc.user_b_id = v_me
  ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC;
END;
$$;

-- 7. get_match_chat_messages — paginated messages for a conversation
CREATE OR REPLACE FUNCTION get_match_chat_messages(
  p_conversation_id bigint,
  p_cursor timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id integer,
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

  -- Verify user is a participant
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

-- 8. send_match_message
CREATE OR REPLACE FUNCTION send_match_message(
  p_conversation_id bigint,
  p_message text,
  p_image_url text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_other_user_id uuid;
  v_msg_id integer;
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

  -- Get other user from conversation
  SELECT CASE WHEN user_a_id = v_me THEN user_b_id ELSE user_a_id END
  INTO v_other_user_id
  FROM match_conversations
  WHERE match_conversations.id = p_conversation_id
    AND (user_a_id = v_me OR user_b_id = v_me);

  IF v_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  -- Insert message
  INSERT INTO trade_chats (
    match_conversation_id, sender_id, receiver_id,
    message, image_url, thumbnail_url, is_read, is_system
  )
  VALUES (
    p_conversation_id, v_me, v_other_user_id,
    trim(p_message), p_image_url, p_thumbnail_url, false, false
  )
  RETURNING trade_chats.id INTO v_msg_id;

  -- Update conversation denormalized fields
  UPDATE match_conversations
  SET last_message = trim(p_message),
      last_message_at = now(),
      last_message_sender_id = v_me
  WHERE match_conversations.id = p_conversation_id;

  RETURN v_msg_id;
END;
$$;

-- 9. mark_match_messages_read
CREATE OR REPLACE FUNCTION mark_match_messages_read(
  p_conversation_id bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark all messages sent TO me as read
  UPDATE trade_chats
  SET is_read = true
  WHERE match_conversation_id = p_conversation_id
    AND receiver_id = v_me
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 10. get_match_unread_total — total unread across all match conversations
CREATE OR REPLACE FUNCTION get_match_unread_total()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_total integer;
BEGIN
  IF v_me IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer INTO v_total
  FROM trade_chats tc
  JOIN match_conversations mc ON mc.id = tc.match_conversation_id
  WHERE tc.receiver_id = v_me
    AND tc.is_read = false
    AND (mc.user_a_id = v_me OR mc.user_b_id = v_me);

  RETURN COALESCE(v_total, 0);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_match_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION send_match_message TO authenticated;
GRANT EXECUTE ON FUNCTION mark_match_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_unread_total TO authenticated;
