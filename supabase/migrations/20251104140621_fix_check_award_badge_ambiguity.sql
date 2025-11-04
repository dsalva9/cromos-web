-- Fix check_and_award_badge Function Ambiguity
-- This migration fixes the "column reference badge_id is ambiguous" error in check_and_award_badge

-- =====================================================
-- FIX: check_and_award_badge Function
-- =====================================================

-- The issue: The function returns a column named 'badge_id', which creates
-- ambiguity when querying the user_badges table which also has a 'badge_id' column

CREATE OR REPLACE FUNCTION check_and_award_badge(
    p_user_id UUID,
    p_category TEXT
) RETURNS TABLE(badge_awarded BOOLEAN, badge_id TEXT, badge_name TEXT) AS $$
DECLARE
    v_current_count INTEGER;
    v_badge RECORD;
    v_already_earned BOOLEAN;
BEGIN
    -- Get current progress
    SELECT current_count INTO v_current_count
    FROM user_badge_progress
    WHERE user_id = p_user_id AND badge_category = p_category;

    -- If no progress found, nothing to award
    IF v_current_count IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Find the highest tier badge this user qualifies for but hasn't earned yet
    FOR v_badge IN
        SELECT bd.id, bd.display_name_es, bd.threshold, bd.tier
        FROM badge_definitions bd
        WHERE bd.category = p_category
            AND bd.threshold <= v_current_count
        ORDER BY bd.threshold DESC
        LIMIT 1
    LOOP
        -- Check if already earned (use fully qualified column name to avoid ambiguity)
        SELECT EXISTS(
            SELECT 1 FROM user_badges ub
            WHERE ub.user_id = p_user_id AND ub.badge_id = v_badge.id
        ) INTO v_already_earned;

        -- Award badge if not already earned
        IF NOT v_already_earned THEN
            INSERT INTO user_badges (user_id, badge_id, progress_snapshot, earned_at)
            VALUES (p_user_id, v_badge.id, v_current_count, NOW());

            RETURN QUERY SELECT TRUE, v_badge.id, v_badge.display_name_es;
            RETURN;
        END IF;
    END LOOP;

    -- No new badge to award
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'check_and_award_badge function fix applied successfully';
    RAISE NOTICE 'Added table alias (ub) to avoid column ambiguity';
END $$;
