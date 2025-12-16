-- =====================================================
-- Migration: Add in-app notification preference checks
-- Date: 2025-12-15
-- Description: Update all notification trigger functions to check
--              should_send_notification() for in_app channel before
--              creating notifications. This ensures user preferences
--              for in-app notifications are respected.
-- =====================================================

-- =====================================================
-- 1. UPDATE LISTING CHAT NOTIFICATIONS
-- =====================================================

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
    v_listing_id BIGINT;
    v_should_send_in_app BOOLEAN;
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

        -- Check if user wants in-app notifications for chat_unread
        SELECT should_send_notification(v_counterparty, 'in_app', 'chat_unread')
        INTO v_should_send_in_app;

        IF NOT v_should_send_in_app THEN
            RETURN NEW;  -- Skip notification creation
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
        ON CONFLICT (user_id, kind, listing_id, template_id, rating_id, trade_id)
        WHERE read_at IS NULL
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

        -- Determine counterparty (if sender is listing owner, notify gets complex -
        -- for now, notify the non-sender)
        IF NEW.sender_id = v_from_user THEN
            -- This shouldn't happen often, but if listing owner sends to themselves, skip
            RETURN NEW;
        ELSE
            v_counterparty := v_from_user; -- Notify listing owner
        END IF;

        -- Check if user wants in-app notifications for listing_chat
        SELECT should_send_notification(v_counterparty, 'in_app', 'listing_chat')
        INTO v_should_send_in_app;

        IF NOT v_should_send_in_app THEN
            RETURN NEW;  -- Skip notification creation
        END IF;

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
        ON CONFLICT (user_id, kind, listing_id, template_id, rating_id, trade_id)
        WHERE read_at IS NULL
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_chat_message ON trade_chats;
CREATE TRIGGER trigger_notify_chat_message
    AFTER INSERT ON trade_chats
    FOR EACH ROW
    EXECUTE FUNCTION notify_chat_message();

COMMENT ON FUNCTION notify_chat_message() IS
    'Trigger function to create/update chat notifications for both trade proposals and listing chats. Respects user in-app notification preferences.';

-- =====================================================
-- 2. UPDATE LISTING STATUS CHANGE NOTIFICATIONS
-- =====================================================

DROP FUNCTION IF EXISTS notify_listing_event(BIGINT, TEXT, UUID, UUID, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION notify_listing_event(
    p_listing_id BIGINT,
    p_kind TEXT,
    p_actor_id UUID,
    p_recipient_id UUID,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_should_send_in_app BOOLEAN;
BEGIN
    -- Don't notify if actor and recipient are the same
    IF p_actor_id = p_recipient_id THEN
        RETURN;
    END IF;

    -- Check if user wants in-app notifications for this kind
    SELECT should_send_notification(p_recipient_id, 'in_app', p_kind)
    INTO v_should_send_in_app;

    IF NOT v_should_send_in_app THEN
        RETURN;  -- Skip notification creation
    END IF;

    -- Insert notification
    INSERT INTO notifications (
        user_id,
        kind,
        listing_id,
        actor_id,
        created_at,
        payload
    )
    VALUES (
        p_recipient_id,
        p_kind,
        p_listing_id,
        p_actor_id,
        NOW(),
        p_payload
    );
END;
$$;

COMMENT ON FUNCTION notify_listing_event IS
    'Helper function to create listing-related notifications for a specific recipient. Respects user in-app notification preferences.';

-- =====================================================
-- 3. UPDATE MUTUAL RATING NOTIFICATIONS
-- =====================================================

DROP FUNCTION IF EXISTS check_mutual_ratings_and_notify() CASCADE;

CREATE OR REPLACE FUNCTION check_mutual_ratings_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_counterparty_id UUID;
  v_counterparty_rating RECORD;
  v_listing_id BIGINT;
  v_listing_title TEXT;
  v_rater_nickname TEXT;
  v_should_send_to_rater BOOLEAN;
  v_should_send_to_rated BOOLEAN;
BEGIN
  -- Only process listing ratings
  IF NEW.context_type != 'listing' THEN
    RETURN NEW;
  END IF;

  v_listing_id := NEW.context_id;

  -- Get listing title
  SELECT title INTO v_listing_title
  FROM trade_listings
  WHERE id = v_listing_id;

  -- Get rater's nickname
  SELECT nickname INTO v_rater_nickname
  FROM profiles
  WHERE id = NEW.rater_id;

  -- Check if the counterparty has also rated
  -- (counterparty rated the rater)
  SELECT * INTO v_counterparty_rating
  FROM user_ratings
  WHERE rater_id = NEW.rated_id
    AND rated_id = NEW.rater_id
    AND context_type = 'listing'
    AND context_id = v_listing_id;

  -- If counterparty has also rated, send notifications to both users
  IF FOUND THEN
    -- Check if users want in-app notifications for user_rated
    SELECT should_send_notification(NEW.rater_id, 'in_app', 'user_rated')
    INTO v_should_send_to_rater;

    SELECT should_send_notification(NEW.rated_id, 'in_app', 'user_rated')
    INTO v_should_send_to_rated;

    -- Notify the user who just rated (about counterparty's rating of them)
    IF v_should_send_to_rater THEN
      INSERT INTO notifications (
        user_id,
        kind,
        listing_id,
        actor_id,
        payload
      ) VALUES (
        NEW.rater_id,
        'user_rated',
        v_listing_id,
        NEW.rated_id,
        jsonb_build_object(
          'rating_value', v_counterparty_rating.rating,
          'has_comment', v_counterparty_rating.comment IS NOT NULL,
          'comment', v_counterparty_rating.comment,
          'listing_title', v_listing_title
        )
      );
    END IF;

    -- Notify the counterparty (about this user's rating of them)
    IF v_should_send_to_rated THEN
      INSERT INTO notifications (
        user_id,
        kind,
        listing_id,
        actor_id,
        payload
      ) VALUES (
        NEW.rated_id,
        'user_rated',
        v_listing_id,
        NEW.rater_id,
        jsonb_build_object(
          'rating_value', NEW.rating,
          'has_comment', NEW.comment IS NOT NULL,
          'comment', NEW.comment,
          'listing_title', v_listing_title
        )
      );
    END IF;

    -- Add system message to the listing chat with both ratings
    PERFORM add_system_message_to_listing_chat(
      v_listing_id,
      format('Ambos usuarios se han valorado. %s: %s estrellas%s. %s: %s estrellas%s.',
        v_rater_nickname,
        NEW.rating,
        CASE WHEN NEW.comment IS NOT NULL THEN format(' - "%s"', NEW.comment) ELSE '' END,
        (SELECT nickname FROM profiles WHERE id = NEW.rated_id),
        v_counterparty_rating.rating,
        CASE WHEN v_counterparty_rating.comment IS NOT NULL THEN format(' - "%s"', v_counterparty_rating.comment) ELSE '' END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on user_ratings
DROP TRIGGER IF EXISTS trigger_check_mutual_ratings ON user_ratings;
CREATE TRIGGER trigger_check_mutual_ratings
  AFTER INSERT ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_ratings_and_notify();

COMMENT ON FUNCTION check_mutual_ratings_and_notify IS 'Checks if both users have rated each other and sends notifications when mutual ratings are complete. Respects user in-app notification preferences.';

-- =====================================================
-- 4. UPDATE TEMPLATE RATING NOTIFICATIONS
-- =====================================================

DROP FUNCTION IF EXISTS notify_template_rating() CASCADE;

CREATE FUNCTION notify_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_template_author UUID;
    v_should_send_in_app BOOLEAN;
BEGIN
    -- collection_templates uses author_id, not user_id
    SELECT ct.author_id
    INTO v_template_author
    FROM collection_templates ct
    WHERE ct.id = NEW.template_id;

    -- If template not found, prevent silent failures
    IF v_template_author IS NULL THEN
        RAISE EXCEPTION 'Template % not found when creating rating notification', NEW.template_id;
    END IF;

    -- Do not notify when author rates their own template (should be prevented upstream)
    IF NEW.user_id = v_template_author THEN
        RETURN NEW;
    END IF;

    -- Check if user wants in-app notifications for template_rated
    SELECT should_send_notification(v_template_author, 'in_app', 'template_rated')
    INTO v_should_send_in_app;

    IF NOT v_should_send_in_app THEN
        RETURN NEW;  -- Skip notification creation
    END IF;

    -- Create notification for the template author
    INSERT INTO notifications (
        user_id,
        kind,
        template_id,
        rating_id,
        actor_id,
        created_at,
        payload
    )
    VALUES (
        v_template_author,
        'template_rated',
        NEW.template_id,
        NEW.id,
        NEW.user_id,
        NOW(),
        jsonb_build_object(
            'rating_value', NEW.rating,
            'has_comment', NEW.comment IS NOT NULL,
            'comment', NEW.comment
        )
    );

    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_template_rating ON template_ratings;
CREATE TRIGGER trigger_notify_template_rating
    AFTER INSERT ON template_ratings
    FOR EACH ROW
    EXECUTE FUNCTION notify_template_rating();

COMMENT ON FUNCTION notify_template_rating IS
    'Trigger function to notify template authors when they receive a rating (uses collection_templates.author_id). Respects user in-app notification preferences.';

-- =====================================================
-- 5. UPDATE BADGE EARNED NOTIFICATIONS
-- =====================================================

DROP FUNCTION IF EXISTS trigger_notify_badge_earned() CASCADE;

CREATE OR REPLACE FUNCTION trigger_notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
    v_badge_name TEXT;
    v_badge_id TEXT;
    v_user_id UUID;
    v_earned_at TIMESTAMPTZ;
    v_should_send_in_app BOOLEAN;
BEGIN
    -- Store NEW values in local variables to avoid ambiguity
    v_badge_id := NEW.badge_id;
    v_user_id := NEW.user_id;
    v_earned_at := NEW.earned_at;

    -- Get badge display name
    SELECT display_name_es INTO v_badge_name
    FROM badge_definitions
    WHERE id = v_badge_id;

    -- Check if user wants in-app notifications for badge_earned
    SELECT should_send_notification(v_user_id, 'in_app', 'badge_earned')
    INTO v_should_send_in_app;

    IF NOT v_should_send_in_app THEN
        RETURN NEW;  -- Skip notification creation
    END IF;

    -- Create notification for badge earned
    INSERT INTO notifications (
        user_id,
        kind,
        actor_id,
        payload,
        created_at
    ) VALUES (
        v_user_id,
        'badge_earned',
        NULL,  -- No actor for badge notifications (system-generated)
        jsonb_build_object(
            'badge_id', v_badge_id,
            'badge_name', v_badge_name,
            'earned_at', v_earned_at
        ),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON user_badges;
CREATE TRIGGER trigger_notify_badge_earned
    AFTER INSERT ON user_badges
    FOR EACH ROW
    WHEN (NEW.badge_id IS NOT NULL)
    EXECUTE FUNCTION trigger_notify_badge_earned();

COMMENT ON FUNCTION trigger_notify_badge_earned IS
    'Trigger function to notify users when they earn a badge. Respects user in-app notification preferences.';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'In-app notification preference checks added';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Updated functions:';
    RAISE NOTICE '  - notify_chat_message() [listing_chat, chat_unread]';
    RAISE NOTICE '  - notify_listing_event() [listing_reserved, listing_completed]';
    RAISE NOTICE '  - check_mutual_ratings_and_notify() [user_rated]';
    RAISE NOTICE '  - notify_template_rating() [template_rated]';
    RAISE NOTICE '  - trigger_notify_badge_earned() [badge_earned]';
    RAISE NOTICE '';
    RAISE NOTICE 'All trigger functions now check should_send_notification()';
    RAISE NOTICE 'before creating in-app notifications.';
    RAISE NOTICE '==============================================';
END $$;
