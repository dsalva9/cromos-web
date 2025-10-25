-- =====================================================
-- SPRINT 15: Notifications for Listing Workflow
-- =====================================================
-- Purpose: Add notifications for listing reservations and completions
-- Version: v1.5.0
-- Date: 2025-10-25
-- =====================================================

-- -----------------------------------------------
-- Helper function: Notify listing participants
-- -----------------------------------------------

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
BEGIN
    -- Don't notify if actor and recipient are the same
    IF p_actor_id = p_recipient_id THEN
        RETURN;
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
    'Helper function to create listing-related notifications for a specific recipient.';

-- -----------------------------------------------
-- Trigger: Listing status change notifications
-- -----------------------------------------------

DROP FUNCTION IF EXISTS notify_listing_status_change() CASCADE;

CREATE OR REPLACE FUNCTION notify_listing_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_seller_id UUID;
    v_buyer_id UUID;
    v_notification_kind TEXT;
BEGIN
    -- Only process status changes
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_seller_id := NEW.user_id;

    -- Handle reservation status
    IF NEW.status = 'reserved' AND OLD.status = 'active' THEN
        -- Get buyer from reserved_by
        v_buyer_id := NEW.reserved_by;

        IF v_buyer_id IS NOT NULL THEN
            -- Notify buyer that listing was reserved for them
            PERFORM notify_listing_event(
                p_listing_id := NEW.id,
                p_kind := 'listing_reserved',
                p_actor_id := v_seller_id,
                p_recipient_id := v_buyer_id,
                p_payload := jsonb_build_object(
                    'listing_title', NEW.title,
                    'reserved_until', NEW.reserved_until
                )
            );

            -- Also notify seller (confirmation)
            PERFORM notify_listing_event(
                p_listing_id := NEW.id,
                p_kind := 'listing_reserved',
                p_actor_id := v_buyer_id,
                p_recipient_id := v_seller_id,
                p_payload := jsonb_build_object(
                    'listing_title', NEW.title,
                    'reserved_until', NEW.reserved_until,
                    'is_seller', TRUE
                )
            );
        END IF;

    -- Handle completion status
    ELSIF NEW.status = 'completed' AND OLD.status IN ('reserved', 'active') THEN
        v_buyer_id := NEW.reserved_by;

        IF v_buyer_id IS NOT NULL THEN
            -- Notify buyer of completion
            PERFORM notify_listing_event(
                p_listing_id := NEW.id,
                p_kind := 'listing_completed',
                p_actor_id := v_seller_id,
                p_recipient_id := v_buyer_id,
                p_payload := jsonb_build_object(
                    'listing_title', NEW.title,
                    'completed_at', NOW()
                )
            );

            -- Notify seller of completion
            PERFORM notify_listing_event(
                p_listing_id := NEW.id,
                p_kind := 'listing_completed',
                p_actor_id := v_buyer_id,
                p_recipient_id := v_seller_id,
                p_payload := jsonb_build_object(
                    'listing_title', NEW.title,
                    'completed_at', NOW(),
                    'is_seller', TRUE
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on trade_listings
DROP TRIGGER IF EXISTS trigger_notify_listing_status_change ON trade_listings;
CREATE TRIGGER trigger_notify_listing_status_change
    AFTER UPDATE ON trade_listings
    FOR EACH ROW
    EXECUTE FUNCTION notify_listing_status_change();

COMMENT ON FUNCTION notify_listing_status_change() IS
    'Trigger function to notify buyers and sellers when listing status changes (reserved, completed).';

-- =============================================
-- VERIFICATION QUERIES (commented out)
-- =============================================

-- Test listing reservation notification:
-- UPDATE trade_listings
-- SET status = 'reserved', reserved_by = '<buyer_id>', reserved_until = NOW() + INTERVAL '7 days'
-- WHERE id = <listing_id>;

-- Test listing completion notification:
-- UPDATE trade_listings
-- SET status = 'completed'
-- WHERE id = <listing_id>;
