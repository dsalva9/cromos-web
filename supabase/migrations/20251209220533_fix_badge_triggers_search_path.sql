-- =====================================================
-- FIX: Add 'auth' schema to search_path for badge trigger functions
-- =====================================================
-- Issue: Badge trigger functions use auth-dependent functions
--        but don't have 'auth' in search_path
-- Fix: Add 'auth' to search_path for proper constraint resolution
-- =====================================================

-- Fix trigger_collector_badge to include 'auth' in search_path
CREATE OR REPLACE FUNCTION trigger_collector_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Increment progress
    v_new_count := increment_badge_progress(NEW.user_id, 'collector');

    -- Check and award badge
    PERFORM check_and_award_badge(NEW.user_id, 'collector');

    RETURN NEW;
END;
$$;

-- Fix trigger_completionist_badge to include 'auth' in search_path
CREATE OR REPLACE FUNCTION trigger_completionist_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
    v_new_count INTEGER;
    v_total_slots INTEGER;
    v_completed_slots INTEGER;
    v_was_complete BOOLEAN := FALSE;
    v_is_complete BOOLEAN := FALSE;
BEGIN
    -- Only process if status changed from 'missing' to 'owned' or 'duplicate'
    IF (OLD.status = 'missing' OR OLD.status IS NULL) AND
       (NEW.status = 'owned' OR NEW.status = 'duplicate') THEN

        -- Check if collection was complete before this update
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status != 'missing') as completed
        INTO v_total_slots, v_completed_slots
        FROM user_template_progress
        WHERE user_id = NEW.user_id
          AND copy_id = NEW.copy_id;

        -- Check if collection is now 100% complete
        -- All slots must be owned or duplicate (none missing)
        v_is_complete := (v_completed_slots = v_total_slots);

        -- If collection just became complete, award badge
        IF v_is_complete THEN
            -- Increment progress
            v_new_count := increment_badge_progress(NEW.user_id, 'completionist');

            -- Check and award badge
            PERFORM check_and_award_badge(NEW.user_id, 'completionist');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_collector_badge IS 'Awards collector badge when templates are copied (FIXED: Added auth to search_path)';
COMMENT ON FUNCTION trigger_completionist_badge IS 'Awards completionist badge when templates are completed (FIXED: Added auth to search_path)';
