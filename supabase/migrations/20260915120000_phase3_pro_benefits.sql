-- Phase 3: PRO Benefits + Subscription Infrastructure
-- Adds webhook columns, updates chat ordering, trial config

-- 1. Add webhook tracking columns to pro_subscriptions
ALTER TABLE pro_subscriptions ADD COLUMN IF NOT EXISTS google_purchase_token TEXT;
ALTER TABLE pro_subscriptions ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pro_subs_google_token ON pro_subscriptions(google_purchase_token) WHERE google_purchase_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pro_subs_ls_id ON pro_subscriptions(ls_subscription_id) WHERE ls_subscription_id IS NOT NULL;

-- 2. Trial config: 7 days, 200 credits
UPDATE pro_config SET value = '{"default": 7, "patron_bonus_days": 30}'::jsonb WHERE key = 'trial_duration_days';
INSERT INTO pro_config (key, value) VALUES ('highlight_credits_trial', '{"total_credits": 200}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Updated activate_pro_trial with 7-day default and trial credits
CREATE OR REPLACE FUNCTION public.activate_pro_trial(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_patron BOOLEAN;
  v_trial_days INT;
  v_patron_bonus INT;
  v_total_days INT;
  v_expires_at TIMESTAMPTZ;
  v_sub_id UUID;
  v_trial_credits INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pro_subscriptions
    WHERE user_id = v_user_id AND status IN ('trial', 'active') AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'already_pro';
  END IF;

  IF EXISTS (SELECT 1 FROM public.pro_trial_claims WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'trial_already_claimed_user';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pro_trial_claims WHERE device_id = p_device_id) THEN
    RAISE EXCEPTION 'trial_already_claimed_device';
  END IF;

  SELECT (value->>'default')::int, (value->>'patron_bonus_days')::int
  INTO v_trial_days, v_patron_bonus
  FROM public.pro_config WHERE key = 'trial_duration_days';

  v_trial_days := COALESCE(v_trial_days, 7);
  v_patron_bonus := COALESCE(v_patron_bonus, 30);

  SELECT COALESCE(is_patron, false) INTO v_is_patron
  FROM public.profiles WHERE id = v_user_id;

  v_total_days := v_trial_days + CASE WHEN v_is_patron THEN v_patron_bonus ELSE 0 END;
  v_expires_at := now() + (v_total_days || ' days')::interval;

  INSERT INTO public.pro_subscriptions (user_id, status, plan, expires_at, device_id)
  VALUES (v_user_id, 'trial', 'trial_7d', v_expires_at, p_device_id)
  RETURNING id INTO v_sub_id;

  INSERT INTO public.pro_trial_claims (user_id, device_id)
  VALUES (v_user_id, p_device_id);

  UPDATE public.profiles
  SET is_pro = true, pro_expires_at = v_expires_at
  WHERE id = v_user_id;

  v_trial_credits := COALESCE(
    (SELECT (value->>'total_credits')::int FROM public.pro_config WHERE key = 'highlight_credits_trial'),
    200
  );

  PERFORM public.purchase_highlight_credits(
    v_user_id,
    v_trial_credits,
    'admin_grant',
    'pro_trial_' || v_sub_id::text
  );

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id,
    'expires_at', v_expires_at,
    'trial_days', v_total_days,
    'is_patron_bonus', v_is_patron,
    'highlight_credits', v_trial_credits
  );
END;
$$;

-- 4. Updated get_match_conversations with PRO priority ordering
DROP FUNCTION IF EXISTS public.get_match_conversations();

CREATE OR REPLACE FUNCTION public.get_match_conversations()
RETURNS TABLE (
  id BIGINT,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_nickname TEXT,
  other_avatar_url TEXT,
  template_id INTEGER,
  template_title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  other_is_patron BOOLEAN,
  other_user_is_deleted BOOLEAN,
  other_is_pro BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    mc.id,
    mc.created_at,
    CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END AS other_user_id,
    COALESCE(p.nickname, 'Usuario eliminado')::text AS other_nickname,
    p.avatar_url::text AS other_avatar_url,
    mc.template_id,
    t.title::text AS template_title,
    mc.last_message::text,
    mc.last_message_at,
    COALESCE((
      SELECT COUNT(*)
      FROM trade_chats tc
      WHERE tc.match_conversation_id = mc.id
        AND tc.receiver_id = v_me
        AND tc.is_read = false
    ), 0) AS unread_count,
    COALESCE(p.is_patron, false) AS other_is_patron,
    (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.is_suspended = true) AS other_user_is_deleted,
    COALESCE(p.is_pro, false) AS other_is_pro
  FROM match_conversations mc
  LEFT JOIN profiles p ON p.id = CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END
  LEFT JOIN collection_templates t ON t.id = mc.template_id
  WHERE mc.user_a_id = v_me OR mc.user_b_id = v_me
  ORDER BY
    (CASE WHEN COALESCE((
      SELECT COUNT(*)
      FROM trade_chats tc2
      WHERE tc2.match_conversation_id = mc.id
        AND tc2.receiver_id = v_me
        AND tc2.is_read = false
    ), 0) > 0 AND COALESCE(p.is_pro, false) THEN 1 ELSE 0 END) DESC,
    mc.last_message_at DESC NULLS LAST,
    mc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_conversations() TO authenticated;

-- Allow 'trial_7d' in pro_subscriptions plan check constraint
ALTER TABLE public.pro_subscriptions DROP CONSTRAINT IF EXISTS pro_subscriptions_plan_check;
ALTER TABLE public.pro_subscriptions ADD CONSTRAINT pro_subscriptions_plan_check 
  CHECK (plan IN ('trial_1m', 'trial_7d', 'monthly', 'yearly', 'admin_grant'));
