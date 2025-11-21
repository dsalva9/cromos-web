-- Fixes applied during Phase 06 Execution (Agent) - 2025-11-21

-- 1. Enable Realtime for notifications
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Fix notify_new_proposal trigger (add payload)
CREATE OR REPLACE FUNCTION public.notify_new_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, kind, trade_id, actor_id, created_at, payload)
  VALUES (
    NEW.to_user,
    'new_proposal',
    NEW.id,
    NEW.from_user,
    NOW(),
    jsonb_build_object('from_user', NEW.from_user)
  );
  RETURN NEW;
END;
$$;

-- 3. Fix notify_new_rating trigger (add payload and use valid kind 'user_rated')
CREATE OR REPLACE FUNCTION public.notify_new_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, kind, rating_id, actor_id, created_at, payload)
  VALUES (
    NEW.rated_id,
    'user_rated',
    NEW.id,
    NEW.rater_id,
    NOW(),
    jsonb_build_object('rating', NEW.rating)
  );
  RETURN NEW;
END;
$$;

-- 4. Fix trigger_top_rated_badge (use correct column 'rated_id')
CREATE OR REPLACE FUNCTION public.trigger_top_rated_badge()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_avg_rating NUMERIC;
    v_rating_count INTEGER;
    v_completed_trades INTEGER;
BEGIN
    -- Check if this user qualifies for Top Rated
    -- Must have: 5+ completed trades AND 4.5+ average rating

    -- Get completed trades count
    SELECT COUNT(*) INTO v_completed_trades
    FROM trade_listings
    WHERE user_id = NEW.rated_id AND status = 'sold';

    -- Get average rating and count
    SELECT AVG(rating), COUNT(*) INTO v_avg_rating, v_rating_count
    FROM user_ratings
    WHERE rated_id = NEW.rated_id;

    -- Check if qualifies
    IF v_completed_trades >= 5 AND v_avg_rating >= 4.5 AND v_rating_count >= 5 THEN
        -- Set progress to 1 (this is a special badge with threshold 1)
        INSERT INTO user_badge_progress (user_id, badge_category, current_count, updated_at)
        VALUES (NEW.rated_id, 'top_rated', 1, NOW())
        ON CONFLICT (user_id, badge_category)
        DO UPDATE SET
            current_count = 1,
            updated_at = NOW();

        -- Award badge if not already earned
        PERFORM check_and_award_badge(NEW.rated_id, 'top_rated');
    END IF;

    RETURN NEW;
END;
$function$;
