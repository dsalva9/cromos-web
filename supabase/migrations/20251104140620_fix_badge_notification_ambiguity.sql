-- Fix Badge Notification Trigger Ambiguity
-- This migration fixes the "column reference badge_id is ambiguous" error

-- =====================================================
-- FIX: Notification Trigger
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

    -- Create notification with unambiguous column references
    INSERT INTO notifications (
        user_id,
        kind,
        related_id,
        related_type,
        message,
        metadata,
        is_read,
        created_at
    ) VALUES (
        v_user_id,
        'badge_earned',
        v_badge_id,
        'badge',
        '¡Has ganado una nueva insignia: ' || v_badge_name || '!',
        jsonb_build_object(
            'badge_id', v_badge_id,
            'badge_name', v_badge_name,
            'earned_at', v_earned_at
        ),
        FALSE,
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
    RAISE NOTICE 'Badge notification trigger fix applied successfully';
    RAISE NOTICE 'Ambiguous column references resolved using local variables';
END $$;
