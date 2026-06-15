-- Rebuild idx_notifications_unique_unread to exclude non-unique notification kinds
-- Kinds like 'badge_earned', 'level_up', 'admin_action', and 'system_message' have all ID columns set to NULL (which coalesces to 0)
-- and thus would conflict with each other if a user has more than one unread.

-- 1. Drop the old unique index
DROP INDEX IF EXISTS public.idx_notifications_unique_unread;

-- 2. Recreate the unique index with kind filter
CREATE UNIQUE INDEX idx_notifications_unique_unread
  ON public.notifications (
    user_id,
    kind,
    COALESCE(listing_id, 0),
    COALESCE(template_id, 0),
    COALESCE(rating_id, 0),
    COALESCE(trade_id, 0),
    COALESCE(match_conversation_id, 0)
  )
  WHERE read_at IS NULL
    AND kind NOT IN ('badge_earned', 'level_up', 'admin_action', 'system_message');

-- 3. Update notify_chat_message trigger function to match the new ON CONFLICT predicate
CREATE OR REPLACE FUNCTION public.notify_chat_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
    v_from_user UUID;
    v_to_user UUID;
    v_counterparty UUID;
    v_status TEXT;
    v_listing_id BIGINT;
BEGIN
    -- Check if this is a trade chat or listing chat
    IF NEW.trade_id IS NOT NULL THEN
        -- Legacy trade chat notification
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

        -- Skip if this is a system message not visible to counterparty
        IF NEW.is_system AND NEW.visible_to_user_id IS NOT NULL AND NEW.visible_to_user_id != v_counterparty THEN
            RETURN NEW;
        END IF;

        -- Upsert notification for counterparty (one per trade, update created_at if still unread)
        INSERT INTO notifications (user_id, kind, trade_id, actor_id, created_at, payload)
        VALUES (
            v_counterparty,
            'chat_unread',
            NEW.trade_id,
            NEW.sender_id,
            NOW(),
            jsonb_build_object('sender_id', NEW.sender_id)
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
          AND kind NOT IN ('badge_earned', 'level_up', 'admin_action', 'system_message')
        DO UPDATE SET
            created_at = NOW(),
            actor_id = NEW.sender_id,
            payload = notifications.payload || jsonb_build_object('last_message_at', NOW());

    ELSIF NEW.listing_id IS NOT NULL THEN
        -- New listing chat notification
        SELECT tl.user_id
        INTO v_from_user
        FROM trade_listings tl
        WHERE tl.id = NEW.listing_id;

        -- Determine counterparty: BIDIRECTIONAL notifications
        IF NEW.sender_id = v_from_user THEN
            -- Listing owner is replying → notify the buyer
            v_counterparty := NEW.receiver_id;

            -- Track owner interaction for expiration system
            UPDATE trade_listings
            SET last_owner_interaction_at = NOW()
            WHERE id = NEW.listing_id;
        ELSE
            -- Buyer is messaging → notify the listing owner
            v_counterparty := v_from_user;
        END IF;

        -- Skip if counterparty is NULL or same as sender
        IF v_counterparty IS NULL OR v_counterparty = NEW.sender_id THEN
            RETURN NEW;
        END IF;

        -- Skip system messages
        IF NEW.is_system THEN
            RETURN NEW;
        END IF;

        -- Auto-unhide: if the receiver has hidden this conversation, unhide it
        DELETE FROM hidden_conversations
        WHERE user_id = v_counterparty
          AND listing_id = NEW.listing_id
          AND counterparty_id = NEW.sender_id;

        -- Upsert notification for listing chat
        INSERT INTO notifications (user_id, kind, listing_id, actor_id, created_at, payload)
        VALUES (
            v_counterparty,
            'listing_chat',
            NEW.listing_id,
            NEW.sender_id,
            NOW(),
            jsonb_build_object(
                'sender_id', NEW.sender_id,
                'message_preview', LEFT(NEW.message, 100)
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
          AND kind NOT IN ('badge_earned', 'level_up', 'admin_action', 'system_message')
        DO UPDATE SET
            created_at = NOW(),
            actor_id = NEW.sender_id,
            payload = notifications.payload || jsonb_build_object(
                'last_message_at', NOW(),
                'message_preview', LEFT(NEW.message, 100)
            );
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Update notify_match_chat_message trigger function to match the new ON CONFLICT predicate
CREATE OR REPLACE FUNCTION public.notify_match_chat_message()
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
    AND kind NOT IN ('badge_earned', 'level_up', 'admin_action', 'system_message')
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
