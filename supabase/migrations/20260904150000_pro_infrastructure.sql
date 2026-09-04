-- ============================================================
-- Phase 2: PRO Infrastructure
-- Tables: pro_subscriptions, pro_trial_claims, pro_config
-- RPCs: is_user_pro, activate_pro_trial, admin_grant/revoke/extend/list/stats/config
-- ============================================================

-- 1. pro_subscriptions
CREATE TABLE IF NOT EXISTS public.pro_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  plan TEXT NOT NULL CHECK (plan IN ('trial_1m', 'monthly', 'yearly', 'admin_grant')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_provider TEXT CHECK (payment_provider IN ('google_play', 'lemonsqueezy', 'admin_grant', NULL)),
  payment_id TEXT,
  device_id TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  grant_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_sub_user ON public.pro_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_sub_active ON public.pro_subscriptions(status) WHERE status IN ('trial', 'active');

ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.pro_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access pro_subscriptions" ON public.pro_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- 2. pro_trial_claims (anti-abuse)
CREATE TABLE IF NOT EXISTS public.pro_trial_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(device_id)
);

ALTER TABLE public.pro_trial_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trial claims" ON public.pro_trial_claims
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access pro_trial_claims" ON public.pro_trial_claims
  FOR ALL USING (auth.role() = 'service_role');

-- 3. pro_config (admin-editable)
CREATE TABLE IF NOT EXISTS public.pro_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.pro_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pro_config" ON public.pro_config
  FOR SELECT USING (true);
CREATE POLICY "Service role full access pro_config" ON public.pro_config
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO public.pro_config (key, value) VALUES
  ('highlight_credits_monthly', '{"total_credits": 800}'::jsonb),
  ('trial_duration_days', '{"default": 30, "patron_bonus_days": 30}'::jsonb),
  ('daily_listing_limit_free', '{"limit": 2}'::jsonb),
  ('extra_listing_rewarded_ads', '{"ads_required": 10}'::jsonb),
  ('extra_listing_price_cents', '{"amount": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RPCs
-- ============================================================

-- is_user_pro: checks active subscription, updates profiles cache
CREATE OR REPLACE FUNCTION public.is_user_pro(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_pro BOOLEAN;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT true, expires_at INTO v_is_pro, v_expires_at
  FROM public.pro_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('trial', 'active')
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  v_is_pro := COALESCE(v_is_pro, false);

  -- Update cache in profiles
  UPDATE public.profiles
  SET is_pro = v_is_pro,
      pro_expires_at = CASE WHEN v_is_pro THEN v_expires_at ELSE NULL END
  WHERE id = p_user_id
    AND (is_pro IS DISTINCT FROM v_is_pro
         OR pro_expires_at IS DISTINCT FROM (CASE WHEN v_is_pro THEN v_expires_at ELSE NULL END));

  RETURN v_is_pro;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- activate_pro_trial: creates trial with anti-abuse
CREATE OR REPLACE FUNCTION public.activate_pro_trial(p_device_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_patron BOOLEAN;
  v_trial_days INT;
  v_patron_bonus INT;
  v_total_days INT;
  v_expires_at TIMESTAMPTZ;
  v_sub_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Check if user already has active pro
  IF EXISTS (
    SELECT 1 FROM public.pro_subscriptions
    WHERE user_id = v_user_id AND status IN ('trial', 'active') AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'already_pro';
  END IF;

  -- Anti-abuse: check if user or device already claimed trial
  IF EXISTS (SELECT 1 FROM public.pro_trial_claims WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'trial_already_claimed_user';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pro_trial_claims WHERE device_id = p_device_id) THEN
    RAISE EXCEPTION 'trial_already_claimed_device';
  END IF;

  -- Get trial duration from config
  SELECT (value->>'default')::int, (value->>'patron_bonus_days')::int
  INTO v_trial_days, v_patron_bonus
  FROM public.pro_config WHERE key = 'trial_duration_days';

  v_trial_days := COALESCE(v_trial_days, 30);
  v_patron_bonus := COALESCE(v_patron_bonus, 30);

  -- Check patron status
  SELECT COALESCE(is_patron, false) INTO v_is_patron
  FROM public.profiles WHERE id = v_user_id;

  v_total_days := v_trial_days + CASE WHEN v_is_patron THEN v_patron_bonus ELSE 0 END;
  v_expires_at := now() + (v_total_days || ' days')::interval;

  -- Create subscription
  INSERT INTO public.pro_subscriptions (user_id, status, plan, expires_at, device_id)
  VALUES (v_user_id, 'trial', 'trial_1m', v_expires_at, p_device_id)
  RETURNING id INTO v_sub_id;

  -- Record trial claim
  INSERT INTO public.pro_trial_claims (user_id, device_id)
  VALUES (v_user_id, p_device_id);

  -- Update profile cache
  UPDATE public.profiles
  SET is_pro = true, pro_expires_at = v_expires_at
  WHERE id = v_user_id;

  -- Grant initial highlight credits
  PERFORM public.purchase_highlight_credits(
    v_user_id,
    (SELECT (value->>'total_credits')::int FROM public.pro_config WHERE key = 'highlight_credits_monthly'),
    'admin_grant',
    'pro_trial_' || v_sub_id::text
  );

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id,
    'expires_at', v_expires_at,
    'trial_days', v_total_days,
    'is_patron_bonus', v_is_patron
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Admin RPCs (all check is_admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_grant_pro(
  p_user_id UUID, p_duration_days INT, p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_expires_at TIMESTAMPTZ;
  v_sub_id UUID;
BEGIN
  -- Admin check
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  v_expires_at := now() + (p_duration_days || ' days')::interval;

  -- Expire any existing active subscriptions
  UPDATE public.pro_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE user_id = p_user_id AND status IN ('trial', 'active');

  -- Create new admin-granted subscription
  INSERT INTO public.pro_subscriptions (
    user_id, status, plan, expires_at,
    payment_provider, granted_by, grant_reason
  )
  VALUES (
    p_user_id, 'active', 'admin_grant', v_expires_at,
    'admin_grant', v_admin_id, p_reason
  )
  RETURNING id INTO v_sub_id;

  -- Update profile
  UPDATE public.profiles
  SET is_pro = true, pro_expires_at = v_expires_at
  WHERE id = p_user_id;

  RETURN jsonb_build_object('subscription_id', v_sub_id, 'expires_at', v_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_revoke_pro(p_user_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.pro_subscriptions
  SET status = 'cancelled',
      grant_reason = COALESCE(grant_reason, '') || ' | Revoked: ' || p_reason,
      updated_at = now()
  WHERE user_id = p_user_id AND status IN ('trial', 'active');

  UPDATE public.profiles
  SET is_pro = false, pro_expires_at = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_extend_pro(p_user_id UUID, p_extra_days INT)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_new_expires TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.pro_subscriptions
  SET expires_at = expires_at + (p_extra_days || ' days')::interval,
      updated_at = now()
  WHERE user_id = p_user_id AND status IN ('trial', 'active')
  RETURNING expires_at INTO v_new_expires;

  IF v_new_expires IS NULL THEN
    RAISE EXCEPTION 'no_active_subscription';
  END IF;

  UPDATE public.profiles
  SET pro_expires_at = v_new_expires
  WHERE id = p_user_id;

  RETURN jsonb_build_object('new_expires_at', v_new_expires);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_pro_subscribers(
  p_status TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_offset INT;
  v_total INT;
  v_rows JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM public.pro_subscriptions s
  WHERE (p_status IS NULL OR s.status = p_status);

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'user_id', s.user_id,
      'nickname', p.nickname,
      'avatar_url', p.avatar_url,
      'status', s.status,
      'plan', s.plan,
      'started_at', s.started_at,
      'expires_at', s.expires_at,
      'payment_provider', s.payment_provider,
      'grant_reason', s.grant_reason
    ) AS row_data
    FROM public.pro_subscriptions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE (p_status IS NULL OR s.status = p_status)
    ORDER BY s.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_get_pro_stats()
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_active INT;
  v_trials INT;
  v_expiring_week INT;
  v_total_ever INT;
  v_paid_ever INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT COUNT(*) INTO v_active
  FROM public.pro_subscriptions
  WHERE status = 'active' AND expires_at > now();

  SELECT COUNT(*) INTO v_trials
  FROM public.pro_subscriptions
  WHERE status = 'trial' AND expires_at > now();

  SELECT COUNT(*) INTO v_expiring_week
  FROM public.pro_subscriptions
  WHERE status IN ('trial', 'active')
    AND expires_at BETWEEN now() AND now() + interval '7 days';

  SELECT COUNT(*) INTO v_total_ever
  FROM public.pro_subscriptions WHERE plan = 'trial_1m';

  SELECT COUNT(*) INTO v_paid_ever
  FROM public.pro_subscriptions WHERE plan IN ('monthly', 'yearly');

  RETURN jsonb_build_object(
    'active_subscribers', v_active,
    'active_trials', v_trials,
    'expiring_this_week', v_expiring_week,
    'conversion_rate', CASE
      WHEN v_total_ever > 0 THEN ROUND((v_paid_ever::numeric / v_total_ever) * 100, 1)
      ELSE 0
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_update_pro_config(p_key TEXT, p_value JSONB)
RETURNS VOID AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.pro_config
  SET value = p_value, updated_at = now(), updated_by = v_admin_id
  WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'config_key_not_found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
