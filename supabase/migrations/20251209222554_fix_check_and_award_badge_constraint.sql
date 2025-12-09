-- =====================================================
-- CRITICAL FIX: check_and_award_badge ON CONFLICT constraint mismatch
-- =====================================================
-- Issue: ON CONFLICT uses (user_id, badge_id) but constraint is (user_id, badge_code)
-- Solution: Insert id into both badge_id and badge_code, use badge_code in ON CONFLICT
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_award_badge(
    p_user_id UUID,
    p_category TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_count INTEGER;
  v_badge_id TEXT;
  v_threshold INTEGER;
BEGIN
  SELECT current_count INTO v_count
  FROM user_badge_progress
  WHERE user_id = p_user_id
  AND badge_category = p_category;

  IF v_count IS NULL THEN
    RETURN;
  END IF;

  FOR v_badge_id, v_threshold IN
    SELECT id, threshold
    FROM badge_definitions
    WHERE category = p_category
    AND threshold <= v_count
    ORDER BY threshold DESC
  LOOP
    -- Insert badge_id into both badge_id and badge_code columns (they're the same value)
    -- Use badge_code for ON CONFLICT since that's what the unique constraint uses
    INSERT INTO user_badges (user_id, badge_id, badge_code, progress_snapshot, earned_at)
    VALUES (p_user_id, v_badge_id, v_badge_id, v_count, NOW())
    ON CONFLICT (user_id, badge_code) DO NOTHING;
    EXIT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION check_and_award_badge IS 'Checks and awards badge (FIXED: use badge_code in ON CONFLICT)';
