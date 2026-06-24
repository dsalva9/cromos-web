-- Raise send_match_message message character limit to 2000
CREATE OR REPLACE FUNCTION public.send_match_message(
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

-- Drop and recreate get_mutual_trade_detail function to add slot_number and global_number
DROP FUNCTION IF EXISTS public.get_mutual_trade_detail(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.get_mutual_trade_detail(
  p_user_id uuid,
  p_other_user_id uuid,
  p_collection_id integer  -- template_id
)
RETURNS TABLE(
  slot_id bigint,
  sticker_code text,
  player_name text,
  team_name text,
  rarity text,
  count integer,
  direction text,
  slot_number integer,
  global_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_copy_id bigint;
  v_their_copy_id bigint;
BEGIN
  SELECT id INTO v_my_copy_id
  FROM user_template_copies
  WHERE user_id = p_user_id AND template_id = p_collection_id
  LIMIT 1;

  SELECT id INTO v_their_copy_id
  FROM user_template_copies
  WHERE user_id = p_other_user_id AND template_id = p_collection_id
  LIMIT 1;

  IF v_my_copy_id IS NULL OR v_their_copy_id IS NULL THEN
    RETURN;
  END IF;

  -- they_offer: slots where I'm missing AND they have duplicates
  RETURN QUERY
  SELECT
    ts.id AS slot_id,
    ts.label AS sticker_code,
    ts.label AS player_name,
    COALESCE(tp.title, '')::text AS team_name,
    COALESCE(ts.slot_variant, 'common')::text AS rarity,
    utp_them.count AS count,
    'they_offer'::text AS direction,
    ts.slot_number AS slot_number,
    ts.global_number AS global_number
  FROM template_slots ts
  JOIN user_template_progress utp_me
    ON utp_me.slot_id = ts.id AND utp_me.copy_id = v_my_copy_id
  JOIN user_template_progress utp_them
    ON utp_them.slot_id = ts.id AND utp_them.copy_id = v_their_copy_id
  LEFT JOIN template_pages tp ON tp.id = ts.page_id
  WHERE ts.template_id = p_collection_id
    AND (utp_me.status = 'missing' OR utp_me.count = 0)
    AND utp_them.count > 1;

  -- i_offer: slots where they're missing AND I have duplicates
  RETURN QUERY
  SELECT
    ts.id AS slot_id,
    ts.label AS sticker_code,
    ts.label AS player_name,
    COALESCE(tp.title, '')::text AS team_name,
    COALESCE(ts.slot_variant, 'common')::text AS rarity,
    utp_me.count AS count,
    'i_offer'::text AS direction,
    ts.slot_number AS slot_number,
    ts.global_number AS global_number
  FROM template_slots ts
  JOIN user_template_progress utp_me
    ON utp_me.slot_id = ts.id AND utp_me.copy_id = v_my_copy_id
  JOIN user_template_progress utp_them
    ON utp_them.slot_id = ts.id AND utp_them.copy_id = v_their_copy_id
  LEFT JOIN template_pages tp ON tp.id = ts.page_id
  WHERE ts.template_id = p_collection_id
    AND (utp_them.status = 'missing' OR utp_them.count = 0)
    AND utp_me.count > 1;
END;
$$;

COMMENT ON FUNCTION get_mutual_trade_detail IS 'Returns individual sticker overlap between two users for a collection.';

GRANT EXECUTE ON FUNCTION public.get_mutual_trade_detail(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mutual_trade_detail(uuid, uuid, integer) TO anon;

NOTIFY pgrst, 'reload schema';
