-- Fix search_path for gamification functions (badges, XP, levels)
-- These functions handle XP awards and badge progression

-- Fix award_xp
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_action_type text,
  p_xp_amount integer,
  p_description text DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Insert XP history record
  INSERT INTO xp_history (user_id, action_type, xp_earned, description, created_at)
  VALUES (p_user_id, p_action_type, p_xp_amount, p_description, NOW());

  -- Update user's total XP
  UPDATE profiles
  SET xp_total = xp_total + p_xp_amount
  WHERE id = p_user_id;
END;
$$;

-- Fix update_user_level (trigger function)
CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level integer;
  v_xp_for_level integer;
BEGIN
  -- Calculate new level based on total XP
  v_new_level := calculate_level_from_xp(NEW.xp_total);

  -- Calculate XP needed for current level
  v_xp_for_level := (v_new_level - 1) * 100; -- Adjust formula as needed

  -- Update level and current XP
  NEW.level := v_new_level;
  NEW.xp_current := NEW.xp_total - v_xp_for_level;

  -- Award level up notification/badge if level increased
  IF OLD.level IS NOT NULL AND v_new_level > OLD.level THEN
    INSERT INTO notifications (user_id, kind, payload, created_at)
    VALUES (
      NEW.id,
      'level_up',
      jsonb_build_object('new_level', v_new_level, 'old_level', OLD.level),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix calculate_level_from_xp
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Simple level calculation: level = floor(xp / 100) + 1
  -- Adjust formula based on your game design
  RETURN GREATEST(1, (total_xp / 100) + 1);
END;
$$;

-- Fix check_and_award_badge
CREATE OR REPLACE FUNCTION public.check_and_award_badge(
  p_user_id uuid,
  p_category text
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer;
  v_badge_id text;
  v_threshold integer;
BEGIN
  -- Get current count for this category
  SELECT current_count INTO v_count
  FROM user_badge_progress
  WHERE user_id = p_user_id
  AND badge_category = p_category;

  -- If no progress record, exit
  IF v_count IS NULL THEN
    RETURN;
  END IF;

  -- Check which badges should be awarded
  FOR v_badge_id, v_threshold IN
    SELECT id, threshold
    FROM badge_definitions
    WHERE category = p_category
    AND threshold <= v_count
    ORDER BY threshold DESC
  LOOP
    -- Award badge if not already earned
    INSERT INTO user_badges (user_id, badge_id, progress_snapshot, earned_at)
    VALUES (p_user_id, v_badge_id, v_count, NOW())
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    -- Exit after awarding highest eligible badge
    EXIT;
  END LOOP;
END;
$$;

-- Fix increment_badge_progress
CREATE OR REPLACE FUNCTION public.increment_badge_progress(
  p_user_id uuid,
  p_category text
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO user_badge_progress (user_id, badge_category, current_count, updated_at)
  VALUES (p_user_id, p_category, 1, NOW())
  ON CONFLICT (user_id, badge_category)
  DO UPDATE SET
    current_count = user_badge_progress.current_count + 1,
    updated_at = NOW();

  -- Check if new badges should be awarded
  PERFORM check_and_award_badge(p_user_id, p_category);
END;
$$;

-- Fix refresh_leaderboard
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
END;
$$;

-- Fix update_login_streak
CREATE OR REPLACE FUNCTION public.update_login_streak(p_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_last_login date;
  v_current_streak integer;
BEGIN
  SELECT last_login_date, login_streak_days
  INTO v_last_login, v_current_streak
  FROM profiles
  WHERE id = p_user_id;

  IF v_last_login = CURRENT_DATE THEN
    -- Already logged in today, no update needed
    RETURN;
  ELSIF v_last_login = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day login, increment streak
    UPDATE profiles
    SET
      login_streak_days = login_streak_days + 1,
      last_login_date = CURRENT_DATE,
      longest_login_streak = GREATEST(longest_login_streak, login_streak_days + 1)
    WHERE id = p_user_id;
  ELSE
    -- Streak broken, reset to 1
    UPDATE profiles
    SET
      login_streak_days = 1,
      last_login_date = CURRENT_DATE
    WHERE id = p_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.award_xp IS 'Awards XP to a user and records it in history. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.update_user_level IS 'Trigger function to update user level based on XP. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.calculate_level_from_xp IS 'Calculates level from total XP. IMMUTABLE with search_path set.';
COMMENT ON FUNCTION public.check_and_award_badge IS 'Checks progress and awards badges. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.increment_badge_progress IS 'Increments badge progress counter. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.refresh_leaderboard IS 'Refreshes the leaderboard materialized view. SECURITY DEFINER with search_path set.';
COMMENT ON FUNCTION public.update_login_streak IS 'Updates user login streak. SECURITY DEFINER with search_path set.';
