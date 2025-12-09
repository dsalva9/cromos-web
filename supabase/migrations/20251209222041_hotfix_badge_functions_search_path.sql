-- =====================================================
-- HOTFIX: Fix badge functions search_path
-- =====================================================
-- Issue: increment_badge_progress missing 'extensions' in search_path
--        causing ON CONFLICT constraint resolution issues
-- =====================================================

-- Fix increment_badge_progress to include extensions in search_path
CREATE OR REPLACE FUNCTION increment_badge_progress(
    p_user_id UUID,
    p_category TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
BEGIN
  INSERT INTO user_badge_progress (user_id, badge_category, current_count, updated_at)
  VALUES (p_user_id, p_category, 1, NOW())
  ON CONFLICT (user_id, badge_category)
  DO UPDATE SET
    current_count = user_badge_progress.current_count + 1,
    updated_at = NOW();

  PERFORM check_and_award_badge(p_user_id, p_category);
END;
$$;

-- Fix trigger_collector_badge to not assign VOID return value
CREATE OR REPLACE FUNCTION trigger_collector_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'auth', 'extensions'
AS $$
BEGIN
    -- Increment progress (function returns VOID, don't assign)
    PERFORM increment_badge_progress(NEW.user_id, 'collector');

    -- Check and award badge is already called inside increment_badge_progress
    -- No need to call it again here

    RETURN NEW;
END;
$$;

-- Fix trigger_completionist_badge to not assign VOID return value
CREATE OR REPLACE FUNCTION trigger_completionist_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
    v_total_slots INTEGER;
    v_completed_slots INTEGER;
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
            -- Increment progress (function returns VOID, don't assign)
            PERFORM increment_badge_progress(NEW.user_id, 'completionist');

            -- Check and award badge is already called inside increment_badge_progress
            -- No need to call it again here
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION increment_badge_progress IS 'Increments badge progress with proper search_path';
COMMENT ON FUNCTION trigger_collector_badge IS 'Trigger for collector badge on template copy';
COMMENT ON FUNCTION trigger_completionist_badge IS 'Trigger for completionist badge (FIXED: removed VOID assignment)';
