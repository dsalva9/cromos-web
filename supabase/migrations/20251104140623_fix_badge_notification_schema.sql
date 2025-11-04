-- Fix Badge Notification to Match Actual Notifications Schema
-- The notifications table uses specific FK columns, not generic related_id/related_type

-- =====================================================
-- 1. Add badge_earned to kind constraint
-- =====================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN (
        -- Legacy trade notifications
        'chat_unread',
        'proposal_accepted',
        'proposal_rejected',
        'finalization_requested',
        -- Marketplace notifications
        'listing_chat',
        'listing_reserved',
        'listing_completed',
        -- Rating notifications
        'user_rated',
        'template_rated',
        -- Badge notifications
        'badge_earned',
        -- Admin notifications
        'admin_action'
    ));

-- =====================================================
-- 2. Fix the notification trigger
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
    v_badge_name TEXT;
    v_badge_id TEXT;
    v_user_id UUID;
    v_earned_at TIMESTAMPTZ;
BEGIN
    -- Store NEW values in local variables to avoid ambiguity
    v_badge_id := NEW.badge_id;
    v_user_id := NEW.user_id;
    v_earned_at := NEW.earned_at;

    -- Get badge display name
    SELECT display_name_es INTO v_badge_name
    FROM badge_definitions
    WHERE id = v_badge_id;

    -- Create notification matching actual schema
    -- The notifications table uses: user_id, kind, trade_id, listing_id, template_id, rating_id, actor_id, payload
    -- We'll store badge info in payload since there's no badge_id column
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
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure it uses the fixed function
DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON user_badges;
CREATE TRIGGER trigger_notify_badge_earned
    AFTER INSERT ON user_badges
    FOR EACH ROW
    WHEN (NEW.badge_id IS NOT NULL)
    EXECUTE FUNCTION trigger_notify_badge_earned();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Badge notification trigger fixed to match actual schema';
    RAISE NOTICE 'Removed: related_id, related_type, message, is_read';
    RAISE NOTICE 'Using: user_id, kind, actor_id, payload';
END $$;
