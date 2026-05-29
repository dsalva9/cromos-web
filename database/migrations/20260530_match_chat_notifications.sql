-- ============================================================
-- Notification trigger for the FIRST message in a match conversation
-- ============================================================

CREATE OR REPLACE FUNCTION notify_first_match_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_count integer;
  v_template_title text;
  v_conv match_conversations%ROWTYPE;
BEGIN
  -- Only proceed if this is a match-conversation message
  IF NEW.match_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this is the first message in the conversation
  SELECT COUNT(*) INTO v_msg_count
  FROM trade_chats
  WHERE match_conversation_id = NEW.match_conversation_id;

  IF v_msg_count != 1 THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT * INTO v_conv
  FROM match_conversations
  WHERE id = NEW.match_conversation_id;

  -- Get template title (may be NULL if template was deleted)
  IF v_conv.template_id IS NOT NULL THEN
    SELECT title INTO v_template_title
    FROM collection_templates
    WHERE id = v_conv.template_id;
  END IF;

  -- Insert notification for the receiver
  INSERT INTO notifications (user_id, kind, actor_id, created_at, payload)
  VALUES (
    NEW.receiver_id,
    'match_chat_message',
    NEW.sender_id,
    NOW(),
    jsonb_build_object(
      'match_conversation_id', NEW.match_conversation_id,
      'template_title', COALESCE(v_template_title, ''),
      'message_preview', LEFT(COALESCE(NEW.message, ''), 100)
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger: fires only when the inserted row belongs to a match conversation
CREATE TRIGGER trg_notify_first_match_message
  AFTER INSERT ON trade_chats
  FOR EACH ROW
  WHEN (NEW.match_conversation_id IS NOT NULL)
  EXECUTE FUNCTION notify_first_match_message();
