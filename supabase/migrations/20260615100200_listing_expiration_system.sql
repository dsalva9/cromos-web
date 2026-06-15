-- Migration: Listing expiration system
-- Feature 4B: Auto-expire inactive listings with 25-day detection + 5-day warning + reactivation

-- ============================================================
-- 1. Add expiration tracking columns to trade_listings
-- ============================================================
ALTER TABLE public.trade_listings
    ADD COLUMN IF NOT EXISTS last_owner_interaction_at timestamptz,
    ADD COLUMN IF NOT EXISTS expiry_warning_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS expiry_scheduled_at timestamptz;

COMMENT ON COLUMN public.trade_listings.last_owner_interaction_at IS 'Last time the owner interacted with this listing (reply to chat, edit, reactivate). Used for expiration tracking.';
COMMENT ON COLUMN public.trade_listings.expiry_warning_sent_at IS 'When the 5-day expiration warning email was sent. NULL if no warning sent.';
COMMENT ON COLUMN public.trade_listings.expiry_scheduled_at IS 'When the listing will be auto-removed (expiry_warning_sent_at + 5 days). NULL if no pending expiration.';

-- Add 'expired' to the allowed statuses (for auto-removed listings)
-- Actually we'll use 'removed' status with deletion_type='system' to reuse existing infrastructure

-- Index for the cron job to find stale listings efficiently
CREATE INDEX idx_listings_expiry_active
    ON public.trade_listings (last_owner_interaction_at)
    WHERE status = 'active' AND deleted_at IS NULL AND expiry_warning_sent_at IS NULL;

CREATE INDEX idx_listings_expiry_scheduled
    ON public.trade_listings (expiry_scheduled_at)
    WHERE expiry_scheduled_at IS NOT NULL AND status = 'active' AND deleted_at IS NULL;

-- ============================================================
-- 2. Backfill last_owner_interaction_at from existing data
-- ============================================================
-- Set last_owner_interaction_at to the most recent of:
-- - The listing's updated_at
-- - The listing's created_at  
-- - The last chat reply by the listing owner
UPDATE public.trade_listings tl
SET last_owner_interaction_at = GREATEST(
    tl.updated_at,
    tl.created_at,
    (
        SELECT MAX(tc.created_at)
        FROM trade_chats tc
        WHERE tc.listing_id = tl.id
          AND tc.sender_id = tl.user_id
          AND tc.is_system = false
    )
)
WHERE tl.last_owner_interaction_at IS NULL;

-- Set default for new listings
ALTER TABLE public.trade_listings
    ALTER COLUMN last_owner_interaction_at SET DEFAULT now();

-- ============================================================
-- 3. Reactivate listing RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.reactivate_listing(
    p_listing_id bigint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only the listing owner can reactivate
    IF NOT EXISTS (
        SELECT 1 FROM trade_listings
        WHERE id = p_listing_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to reactivate this listing';
    END IF;

    UPDATE trade_listings
    SET
        last_owner_interaction_at = now(),
        expiry_warning_sent_at = NULL,
        expiry_scheduled_at = NULL
    WHERE id = p_listing_id
      AND user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.reactivate_listing IS 'Reactivates a listing that was marked for expiration. Clears the warning and gives 30 more days.';

-- ============================================================
-- 4. Update notify_chat_message to track owner interaction
--    This is done by also updating last_owner_interaction_at
--    when the listing owner sends a chat reply.
-- ============================================================
-- Note: We need to update notify_chat_message to also set
-- last_owner_interaction_at when the owner replies.
-- The push notification fix migration (20260615100000) already redefines
-- this function, so we do a CREATE OR REPLACE here that includes both fixes.

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

-- ============================================================
-- 5. Add UPDATE trigger on notifications for push re-firing
--    When a notification's created_at is bumped (new message in
--    existing unread notification), re-fire the push notification.
-- ============================================================
CREATE OR REPLACE TRIGGER trigger_send_push_on_notification_update
    AFTER UPDATE OF created_at ON public.notifications
    FOR EACH ROW
    WHEN (NEW.read_at IS NULL AND OLD.created_at IS DISTINCT FROM NEW.created_at)
    EXECUTE FUNCTION public.send_push_notification_trigger();

-- Also re-fire email notification on update (the email function has its own 6-hour cooldown)
CREATE OR REPLACE TRIGGER trigger_send_email_on_notification_update
    AFTER UPDATE OF created_at ON public.notifications
    FOR EACH ROW
    WHEN (NEW.read_at IS NULL AND OLD.created_at IS DISTINCT FROM NEW.created_at)
    EXECUTE FUNCTION public.send_email_notification_trigger();

-- ============================================================
-- 6. Grant permissions
-- ============================================================
GRANT ALL ON FUNCTION public.reactivate_listing(bigint) TO authenticated;
