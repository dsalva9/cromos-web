-- =====================================================
-- Fix System Message Notifications
-- =====================================================
-- Purpose: Don't create notifications for system messages that
--          aren't visible to the recipient
-- Date: 2025-12-16
-- =====================================================

-- Update the notify_chat_message function to check for system messages
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

        -- Skip if this is a system message not visible to counterparty
        -- System messages should NOT trigger listing_chat notifications
        IF NEW.is_system THEN
            RETURN NEW;
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

COMMENT ON FUNCTION notify_chat_message() IS
    'Trigger function to create/update chat notifications for both trade proposals and listing chats. Skips system messages for listing chats.';
