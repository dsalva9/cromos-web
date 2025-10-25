-- =====================================================
-- SPRINT 15: Notifications System Reboot
-- =====================================================
-- Purpose: Modernize notifications to support marketplace chats,
--          reservations, ratings, and template activity
-- Version: v1.5.0
-- Date: 2025-10-25
-- =====================================================

-- =============================================
-- PART 1: SCHEMA ALTERATIONS
-- =============================================

-- Add new columns to notifications table
DO $$
BEGIN
    -- Add listing_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'listing_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN listing_id BIGINT REFERENCES trade_listings(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON notifications(listing_id);
    END IF;

    -- Add template_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN template_id BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_notifications_template_id ON notifications(template_id);
    END IF;

    -- Add rating_id foreign key (for user ratings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'rating_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN rating_id BIGINT;
        CREATE INDEX IF NOT EXISTS idx_notifications_rating_id ON notifications(rating_id);
    END IF;

    -- Add actor_id to track who triggered the notification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'actor_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
    END IF;

    -- Rename metadata to payload if not already renamed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN metadata TO payload;
    END IF;

    -- Ensure payload column has proper default
    ALTER TABLE notifications ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
END $$;

-- Drop old kind constraint and create new one with extended types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN (
        -- Legacy trade notifications
        'chat_unread',
        'proposal_accepted',
        'proposal_rejected',
        'finalization_requested',
        -- New marketplace notifications
        'listing_chat',
        'listing_reserved',
        'listing_completed',
        -- Rating notifications
        'user_rated',
        'template_rated',
        -- Future admin notifications
        'admin_action'
    ));

-- Drop old unique index for chat_unread (trade-specific)
DROP INDEX IF EXISTS idx_notifications_user_trade_kind_unread_unique;

-- Create new composite unique index to prevent duplicate unread notifications per entity
-- This prevents multiple unread notifications for the same listing/template/rating
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_unread
    ON notifications(user_id, kind, listing_id, template_id, rating_id, trade_id)
    WHERE read_at IS NULL;

-- Add GIN index on payload for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin ON notifications USING GIN(payload);

-- Update table comment
COMMENT ON TABLE notifications IS
    'User notifications for trades, marketplace listings, chats, reservations, ratings, and template activity. Prevents duplicate unread notifications per entity.';

-- Add column comments
COMMENT ON COLUMN notifications.listing_id IS 'Foreign key to trade_listings for listing-related notifications';
COMMENT ON COLUMN notifications.template_id IS 'Foreign key to collection_templates for template-related notifications';
COMMENT ON COLUMN notifications.rating_id IS 'Reference to user_ratings or template_ratings';
COMMENT ON COLUMN notifications.actor_id IS 'User who triggered the notification (e.g., sender of message, rater)';
COMMENT ON COLUMN notifications.payload IS 'Structured metadata for the notification in JSONB format';

-- =============================================
-- PART 2: UPDATE RPC FUNCTIONS
-- =============================================

-- -----------------------------------------------
-- RPC: get_notifications (enriched version)
-- -----------------------------------------------

DROP FUNCTION IF EXISTS get_notifications();

CREATE OR REPLACE FUNCTION get_notifications()
RETURNS TABLE (
    id BIGINT,
    kind TEXT,
    trade_id BIGINT,
    listing_id BIGINT,
    template_id BIGINT,
    rating_id BIGINT,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    payload JSONB,
    -- Actor information (who triggered the notification)
    actor_id UUID,
    actor_nickname TEXT,
    actor_avatar_url TEXT,
    -- Legacy trade proposal data (for backwards compatibility)
    proposal_from_user UUID,
    proposal_to_user UUID,
    proposal_status TEXT,
    from_user_nickname TEXT,
    to_user_nickname TEXT,
    -- Listing data
    listing_title TEXT,
    listing_status TEXT,
    -- Template data
    template_name TEXT,
    template_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.kind,
        n.trade_id,
        n.listing_id,
        n.template_id,
        n.rating_id,
        n.created_at,
        n.read_at,
        n.payload,
        -- Actor information
        n.actor_id,
        p_actor.nickname AS actor_nickname,
        p_actor.avatar_url AS actor_avatar_url,
        -- Legacy trade data
        tp.from_user AS proposal_from_user,
        tp.to_user AS proposal_to_user,
        tp.status AS proposal_status,
        p_from.nickname AS from_user_nickname,
        p_to.nickname AS to_user_nickname,
        -- Listing data
        tl.title AS listing_title,
        tl.status AS listing_status,
        -- Template data
        ct.title AS template_name,
        NULL::TEXT AS template_status
    FROM notifications n
    -- Join actor profile
    LEFT JOIN profiles p_actor ON p_actor.id = n.actor_id
    -- Join trade proposal data (legacy)
    LEFT JOIN trade_proposals tp ON tp.id = n.trade_id
    LEFT JOIN profiles p_from ON p_from.id = tp.from_user
    LEFT JOIN profiles p_to ON p_to.id = tp.to_user
    -- Join listing data
    LEFT JOIN trade_listings tl ON tl.id = n.listing_id
    -- Join template data
    LEFT JOIN collection_templates ct ON ct.id = n.template_id
    WHERE n.user_id = auth.uid()
    ORDER BY
        CASE WHEN n.read_at IS NULL THEN 0 ELSE 1 END, -- Unread first
        n.created_at DESC; -- Newest first
END;
$$;

REVOKE ALL ON FUNCTION get_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_notifications() TO authenticated;

COMMENT ON FUNCTION get_notifications() IS
    'Returns enriched notifications for the current user with actor, listing, template, and trade details. Ordered by unread first, then by creation date descending.';

-- -----------------------------------------------
-- RPC: mark_notification_read (single item)
-- -----------------------------------------------

DROP FUNCTION IF EXISTS mark_notification_read(BIGINT);

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = p_notification_id
        AND user_id = auth.uid()
        AND read_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION mark_notification_read(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_notification_read(BIGINT) TO authenticated;

COMMENT ON FUNCTION mark_notification_read(BIGINT) IS
    'Marks a single notification as read for the current user.';

-- -----------------------------------------------
-- RPC: mark_listing_chat_notifications_read
-- -----------------------------------------------

DROP FUNCTION IF EXISTS mark_listing_chat_notifications_read(BIGINT, UUID);

CREATE OR REPLACE FUNCTION mark_listing_chat_notifications_read(
    p_listing_id BIGINT,
    p_participant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = auth.uid()
        AND kind = 'listing_chat'
        AND listing_id = p_listing_id
        AND actor_id = p_participant_id
        AND read_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION mark_listing_chat_notifications_read(BIGINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_listing_chat_notifications_read(BIGINT, UUID) TO authenticated;

COMMENT ON FUNCTION mark_listing_chat_notifications_read(BIGINT, UUID) IS
    'Marks all chat notifications as read for a specific listing and participant.';

-- =============================================
-- PART 3: TRIGGER FUNCTIONS
-- =============================================

-- -----------------------------------------------
-- Trigger: Listing chat notifications
-- -----------------------------------------------

-- Update the existing notify_chat_message function to handle listings
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
    'Trigger function to create/update chat notifications for both trade proposals and listing chats.';

-- -----------------------------------------------
-- Trigger: User rating notifications
-- -----------------------------------------------

DROP FUNCTION IF EXISTS notify_user_rating() CASCADE;

CREATE OR REPLACE FUNCTION notify_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    -- Don't notify if rating yourself (shouldn't be possible, but safety check)
    IF NEW.rater_id = NEW.rated_id THEN
        RETURN NEW;
    END IF;

    -- Create notification for the rated user
    INSERT INTO notifications (
        user_id,
        kind,
        rating_id,
        actor_id,
        listing_id,
        created_at,
        payload
    )
    VALUES (
        NEW.rated_id,
        'user_rated',
        NEW.id,
        NEW.rater_id,
        CASE WHEN NEW.context_type = 'listing' THEN NEW.context_id ELSE NULL END,
        NOW(),
        jsonb_build_object(
            'rating_value', NEW.rating,
            'context_type', NEW.context_type,
            'context_id', NEW.context_id,
            'has_comment', NEW.comment IS NOT NULL
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger on user_ratings
DROP TRIGGER IF EXISTS trigger_notify_user_rating ON user_ratings;
CREATE TRIGGER trigger_notify_user_rating
    AFTER INSERT ON user_ratings
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_rating();

COMMENT ON FUNCTION notify_user_rating() IS
    'Trigger function to notify users when they receive a rating.';

-- -----------------------------------------------
-- Trigger: Template rating notifications
-- -----------------------------------------------

DROP FUNCTION IF EXISTS notify_template_rating() CASCADE;

CREATE OR REPLACE FUNCTION notify_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_template_author UUID;
BEGIN
    -- Get template author
    SELECT user_id INTO v_template_author
    FROM collection_templates
    WHERE id = NEW.template_id;

    -- Don't notify if rating your own template
    IF NEW.user_id = v_template_author THEN
        RETURN NEW;
    END IF;

    -- Create notification for template author
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
            'has_comment', NEW.comment IS NOT NULL
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger on template_ratings
DROP TRIGGER IF EXISTS trigger_notify_template_rating ON template_ratings;
CREATE TRIGGER trigger_notify_template_rating
    AFTER INSERT ON template_ratings
    FOR EACH ROW
    EXECUTE FUNCTION notify_template_rating();

COMMENT ON FUNCTION notify_template_rating() IS
    'Trigger function to notify template authors when they receive a rating.';

-- =============================================
-- PART 4: BACKFILL AND CLEANUP
-- =============================================

-- Mark any old notifications without proper actor_id
-- (They'll still display, just without actor info)
UPDATE notifications
SET actor_id = NULL
WHERE actor_id IS NULL AND kind IN ('chat_unread', 'proposal_accepted', 'proposal_rejected');

-- =============================================
-- PART 5: VERIFICATION QUERIES (commented out)
-- =============================================

-- Test queries (uncomment to verify):
-- SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM get_notifications();
-- SELECT get_notification_count();

-- Test notification creation:
-- INSERT INTO user_ratings (rater_id, rated_id, rating, context_type, context_id)
-- VALUES (auth.uid(), '<some_user_id>', 5, 'listing', 123);

-- INSERT INTO template_ratings (user_id, template_id, rating)
-- VALUES (auth.uid(), <template_id>, 4);
