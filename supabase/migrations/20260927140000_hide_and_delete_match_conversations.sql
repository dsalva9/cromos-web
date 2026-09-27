-- Migration: Hide and delete match conversations
-- Allows users to hide and delete match chat conversations, mirroring marketplace chats with full delete support

-- 1. Add deleted_at columns to match_conversations
ALTER TABLE public.match_conversations 
  ADD COLUMN IF NOT EXISTS user_a_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_b_deleted_at timestamptz;

-- 2. Ensure foreign key from hidden_conversations to match_conversations exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'hidden_conversations_match_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.hidden_conversations
      ADD CONSTRAINT hidden_conversations_match_conversation_id_fkey
      FOREIGN KEY (match_conversation_id) REFERENCES public.match_conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. RPC: hide_match_conversation
CREATE OR REPLACE FUNCTION public.hide_match_conversation(
    p_conversation_id bigint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM match_conversations
    WHERE id = p_conversation_id
      AND (user_a_id = v_me OR user_b_id = v_me)
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  INSERT INTO hidden_conversations (user_id, match_conversation_id)
  VALUES (v_me, p_conversation_id)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hide_match_conversation(bigint) TO authenticated;

-- 4. RPC: unhide_match_conversation
CREATE OR REPLACE FUNCTION public.unhide_match_conversation(
    p_conversation_id bigint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM hidden_conversations
  WHERE user_id = auth.uid()
    AND match_conversation_id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unhide_match_conversation(bigint) TO authenticated;

-- 5. RPC: delete_match_conversation
CREATE OR REPLACE FUNCTION public.delete_match_conversation(
    p_conversation_id bigint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_user_a_id uuid;
  v_user_b_id uuid;
  v_other_deleted_at timestamptz;
  v_other_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_a_id, user_b_id,
         CASE WHEN user_a_id = v_me THEN user_b_deleted_at ELSE user_a_deleted_at END,
         CASE WHEN user_a_id = v_me THEN user_b_id ELSE user_a_id END
  INTO v_user_a_id, v_user_b_id, v_other_deleted_at, v_other_id
  FROM match_conversations
  WHERE id = p_conversation_id
    AND (user_a_id = v_me OR user_b_id = v_me);

  IF v_user_a_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  -- Remove from hidden_conversations for this user if it was hidden
  DELETE FROM hidden_conversations
  WHERE user_id = v_me
    AND match_conversation_id = p_conversation_id;

  -- Delete unread notifications for this user in this conversation
  DELETE FROM notifications
  WHERE user_id = v_me
    AND match_conversation_id = p_conversation_id;

  -- Set user deletion timestamp
  IF v_user_a_id = v_me THEN
    UPDATE match_conversations
    SET user_a_deleted_at = now()
    WHERE id = p_conversation_id;
  ELSE
    UPDATE match_conversations
    SET user_b_deleted_at = now()
    WHERE id = p_conversation_id;
  END IF;

  -- If the other user has ALSO deleted it, OR the other user is deleted/suspended:
  IF v_other_deleted_at IS NOT NULL OR EXISTS (
    SELECT 1 FROM profiles WHERE id = v_other_id AND (deleted_at IS NOT NULL OR is_suspended = true)
  ) THEN
    -- If no trade confirmations reference this conversation, we can completely remove it
    IF NOT EXISTS (
      SELECT 1 FROM trade_confirmations WHERE match_conversation_id = p_conversation_id
    ) THEN
      DELETE FROM match_conversations WHERE id = p_conversation_id;
    ELSE
      -- Otherwise delete messages to reclaim storage
      DELETE FROM trade_chats WHERE match_conversation_id = p_conversation_id;
      UPDATE match_conversations SET last_message = NULL, last_message_at = NULL WHERE id = p_conversation_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_match_conversation(bigint) TO authenticated;

-- 6. Updated get_match_conversations()
DROP FUNCTION IF EXISTS public.get_match_conversations();

CREATE OR REPLACE FUNCTION public.get_match_conversations()
RETURNS TABLE (
  id BIGINT,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_nickname TEXT,
  other_avatar_url TEXT,
  template_id INTEGER,
  template_title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  other_is_patron BOOLEAN,
  other_user_is_deleted BOOLEAN,
  other_is_pro BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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
    COALESCE(p.nickname, 'Usuario eliminado')::text AS other_nickname,
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
        AND tc.created_at > COALESCE(CASE WHEN mc.user_a_id = v_me THEN mc.user_a_deleted_at ELSE mc.user_b_deleted_at END, '1970-01-01'::timestamptz)
    ), 0) AS unread_count,
    COALESCE(p.is_patron, false) AS other_is_patron,
    (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.is_suspended = true) AS other_user_is_deleted,
    COALESCE(p.is_pro, false) AS other_is_pro
  FROM match_conversations mc
  LEFT JOIN profiles p ON p.id = CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END
  LEFT JOIN collection_templates t ON t.id = mc.template_id
  WHERE (mc.user_a_id = v_me OR mc.user_b_id = v_me)
    -- Filter out hidden conversations
    AND NOT EXISTS (
      SELECT 1 FROM hidden_conversations hc
      WHERE hc.user_id = v_me
        AND hc.match_conversation_id = mc.id
    )
    -- Filter out deleted conversations unless a new message arrived after deletion
    AND (
      (mc.user_a_id = v_me AND (mc.user_a_deleted_at IS NULL OR (mc.last_message_at IS NOT NULL AND mc.last_message_at > mc.user_a_deleted_at)))
      OR
      (mc.user_b_id = v_me AND (mc.user_b_deleted_at IS NULL OR (mc.last_message_at IS NOT NULL AND mc.last_message_at > mc.user_b_deleted_at)))
    )
  ORDER BY
    (CASE WHEN COALESCE((
      SELECT COUNT(*)
      FROM trade_chats tc2
      WHERE tc2.match_conversation_id = mc.id
        AND tc2.receiver_id = v_me
        AND tc2.is_read = false
        AND tc2.created_at > COALESCE(CASE WHEN mc.user_a_id = v_me THEN mc.user_a_deleted_at ELSE mc.user_b_deleted_at END, '1970-01-01'::timestamptz)
    ), 0) > 0 AND COALESCE(p.is_pro, false) THEN 1 ELSE 0 END) DESC,
    mc.last_message_at DESC NULLS LAST,
    mc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_conversations() TO authenticated;

-- 7. Updated get_match_chat_messages()
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

-- 8. Updated send_match_message() with auto-unhide and reset
CREATE OR REPLACE FUNCTION public.send_match_message(
    p_conversation_id bigint, 
    p_message text, 
    p_image_url text DEFAULT NULL::text, 
    p_thumbnail_url text DEFAULT NULL::text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Message too long (max 2000 chars)';
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

  -- Block sending if other participant is deleted or suspended
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_other_user_id
    AND (deleted_at IS NOT NULL OR is_suspended = true)
  ) THEN
    RAISE EXCEPTION 'Cannot send message: user is no longer available';
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

  -- Auto-unhide for receiver and sender
  DELETE FROM hidden_conversations
  WHERE match_conversation_id = p_conversation_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_match_message(bigint, text, text, text) TO authenticated;

-- 9. RPC: get_hidden_match_conversations()
CREATE OR REPLACE FUNCTION public.get_hidden_match_conversations()
RETURNS TABLE(
    match_conversation_id bigint,
    template_id integer,
    template_title text,
    other_user_id uuid,
    other_nickname text,
    other_avatar_url text,
    hidden_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    hc.match_conversation_id,
    mc.template_id,
    t.title::text AS template_title,
    CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END AS other_user_id,
    COALESCE(p.nickname, 'Usuario')::text AS other_nickname,
    p.avatar_url::text AS other_avatar_url,
    hc.hidden_at
  FROM hidden_conversations hc
  JOIN match_conversations mc ON mc.id = hc.match_conversation_id
  LEFT JOIN profiles p ON p.id = CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END
  LEFT JOIN collection_templates t ON t.id = mc.template_id
  WHERE hc.user_id = v_me
    AND hc.match_conversation_id IS NOT NULL
  ORDER BY hc.hidden_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hidden_match_conversations() TO authenticated;

-- 10. Updated get_match_unread_total()
CREATE OR REPLACE FUNCTION public.get_match_unread_total()
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
    AND (mc.user_a_id = v_me OR mc.user_b_id = v_me)
    -- Exclude hidden
    AND NOT EXISTS (
      SELECT 1 FROM hidden_conversations hc
      WHERE hc.user_id = v_me
        AND hc.match_conversation_id = mc.id
    )
    -- Exclude deleted
    AND (
      (mc.user_a_id = v_me AND (mc.user_a_deleted_at IS NULL OR tc.created_at > mc.user_a_deleted_at))
      OR
      (mc.user_b_id = v_me AND (mc.user_b_deleted_at IS NULL OR tc.created_at > mc.user_b_deleted_at))
    );

  RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_unread_total TO authenticated;
