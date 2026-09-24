-- Migration: Delay user rating notifications to the next day
-- Purpose: Protect rater anonymity and prevent timing retaliation during active arguments
-- Deployed: 2026-09-24

-- 1. Table to queue delayed notifications
CREATE TABLE IF NOT EXISTS public.delayed_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating_id BIGINT REFERENCES user_ratings(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  deliver_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_delayed_notifications_pending 
ON public.delayed_notifications (deliver_after) 
WHERE processed_at IS NULL;

ALTER TABLE public.delayed_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage delayed notifications" 
ON public.delayed_notifications 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. Dispatch function that moves matured notifications to public.notifications
CREATE OR REPLACE FUNCTION public.dispatch_delayed_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, user_id, kind, actor_id, rating_id, payload
    FROM public.delayed_notifications
    WHERE processed_at IS NULL
      AND deliver_after <= now()
    ORDER BY deliver_after ASC
    LIMIT 200
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.notifications (
      user_id,
      kind,
      actor_id,
      rating_id,
      created_at,
      payload
    ) VALUES (
      r.user_id,
      r.kind,
      r.actor_id,
      r.rating_id,
      now(),
      r.payload
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.delayed_notifications
    SET processed_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- 3. Update upsert_user_rating to queue delayed notification for next day
CREATE OR REPLACE FUNCTION public.upsert_user_rating(p_rated_id uuid, p_rating integer, p_comment text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_rater_id UUID;
  v_rating_id BIGINT;
  v_account_created_at TIMESTAMPTZ;
  v_msgs_from_rater INT;
  v_msgs_from_rated INT;
  v_cooldown_until TIMESTAMPTZ;
  v_is_update BOOLEAN := false;
  v_deliver_after TIMESTAMPTZ;
BEGIN
  v_rater_id := auth.uid();
  IF v_rater_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_rater_id = p_rated_id THEN
    RAISE EXCEPTION 'No puedes valorarte a ti mismo';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'La valoracion debe ser entre 1 y 5';
  END IF;

  SELECT created_at INTO v_account_created_at
  FROM auth.users WHERE id = v_rater_id;
  
  IF v_account_created_at > now() - interval '7 days' THEN
    RAISE EXCEPTION 'Tu cuenta debe tener al menos 7 dias para valorar usuarios';
  END IF;

  SELECT rating_cooldown_until INTO v_cooldown_until
  FROM profiles WHERE id = v_rater_id;
  
  IF v_cooldown_until IS NOT NULL AND v_cooldown_until > now() THEN
    RAISE EXCEPTION 'Tu cuenta tiene una restriccion temporal para valorar. Intentalo mas tarde.';
  END IF;

  SELECT COUNT(*) INTO v_msgs_from_rater
  FROM trade_chats
  WHERE sender_id = v_rater_id
    AND receiver_id = p_rated_id
    AND is_system = false;

  SELECT COUNT(*) INTO v_msgs_from_rated
  FROM trade_chats
  WHERE sender_id = p_rated_id
    AND receiver_id = v_rater_id
    AND is_system = false;

  IF v_msgs_from_rater < 2 OR v_msgs_from_rated < 2 THEN
    RAISE EXCEPTION 'Debes tener al menos un intercambio de mensajes con este usuario para poder valorarlo';
  END IF;

  INSERT INTO user_ratings (
    rater_id, rated_id, rating, comment, context_type, context_id, updated_at
  ) VALUES (
    v_rater_id, p_rated_id, p_rating, p_comment, NULL, NULL, now()
  )
  ON CONFLICT (rater_id, rated_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    updated_at = now()
  RETURNING id, (xmax <> 0) INTO v_rating_id, v_is_update;

  UPDATE profiles
  SET
    rating_avg = COALESCE(sub.avg_r, 0),
    rating_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT AVG(rating)::NUMERIC(3,2) as avg_r, COUNT(*) as cnt
    FROM user_ratings
    WHERE rated_id = p_rated_id
  ) sub
  WHERE profiles.id = p_rated_id;

  -- Deliver notification next day: at least 12 hours from now, target 09:00 UTC next morning
  v_deliver_after := GREATEST(now() + interval '12 hours', date_trunc('day', now() + interval '1 day') + interval '9 hours');

  IF v_is_update THEN
    -- If a pending delayed notification exists, update its payload
    UPDATE public.delayed_notifications
    SET payload = jsonb_build_object('rating', p_rating)
    WHERE rating_id = v_rating_id
      AND processed_at IS NULL;
  ELSE
    -- Queue delayed notification
    INSERT INTO public.delayed_notifications (
      user_id,
      kind,
      actor_id,
      rating_id,
      payload,
      deliver_after
    ) VALUES (
      p_rated_id,
      'user_rated',
      v_rater_id,
      v_rating_id,
      jsonb_build_object('rating', p_rating),
      v_deliver_after
    );
  END IF;

  PERFORM trigger_top_rated_badge_check(p_rated_id);

  RETURN v_rating_id;
END;
$function$;

-- 4. Schedule hourly cron job to dispatch matured delayed notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-delayed-notifications') THEN
    PERFORM cron.unschedule('dispatch-delayed-notifications');
  END IF;
  PERFORM cron.schedule(
    'dispatch-delayed-notifications',
    '0 * * * *',
    'SELECT public.dispatch_delayed_notifications()'
  );
END $$;
