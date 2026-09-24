-- ============================================================
-- MIGRATION: Open Rating System + Device Fingerprinting
-- Phase 1 (Tasks 1.1-1.6) + Phase 2 (Tasks 2.1-2.2) + Phase 3 (Task 3.1-3.2)
-- Phase 5.1 (Migrate existing ratings) + Phase 5.3 (Cleanup old triggers)
--
-- Applied to production: 2026-09-24
-- ============================================================

-- ============================================================
-- PHASE 1: Open Rating System Schema Changes
-- ============================================================

-- Task 1.1: Alter user_ratings schema
ALTER TABLE user_ratings 
  ALTER COLUMN context_type DROP NOT NULL,
  ALTER COLUMN context_id DROP NOT NULL;

ALTER TABLE user_ratings DROP CONSTRAINT IF EXISTS user_ratings_context_type_check;
ALTER TABLE user_ratings ADD CONSTRAINT user_ratings_context_type_check 
  CHECK (context_type IS NULL OR context_type IN ('trade', 'listing', 'chat'));

ALTER TABLE user_ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE user_ratings DROP CONSTRAINT IF EXISTS unique_user_rating;
CREATE UNIQUE INDEX idx_user_ratings_unique_pair 
  ON user_ratings (rater_id, rated_id);

-- ============================================================
-- PHASE 2: Device Fingerprinting Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS device_fingerprints (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'android',
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, fingerprint_hash)
);

CREATE INDEX IF NOT EXISTS idx_device_fp_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_device_fp_profile ON device_fingerprints(profile_id);

ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fingerprints" ON device_fingerprints;
CREATE POLICY "Users can view own fingerprints" ON device_fingerprints
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "No direct inserts" ON device_fingerprints;
CREATE POLICY "No direct inserts" ON device_fingerprints
  FOR INSERT WITH CHECK (false);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flagged_source_profile_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
  ADD COLUMN IF NOT EXISTS rating_cooldown_until TIMESTAMPTZ;

-- ============================================================
-- PHASE 5.3: Drop old mutual rating triggers
-- ============================================================

DROP TRIGGER IF EXISTS trigger_check_mutual_ratings ON user_ratings;
DROP TRIGGER IF EXISTS trigger_notify_new_rating ON user_ratings;

-- ============================================================
-- Task 1.2: New RPC upsert_user_rating
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_user_rating(
  p_rated_id UUID,
  p_rating INT,
  p_comment TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_rater_id UUID;
  v_rating_id BIGINT;
  v_account_created_at TIMESTAMPTZ;
  v_msgs_from_rater INT;
  v_msgs_from_rated INT;
  v_cooldown_until TIMESTAMPTZ;
  v_is_update BOOLEAN := false;
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

  IF NOT v_is_update THEN
    INSERT INTO notifications (user_id, kind, actor_id, created_at, payload)
    VALUES (
      p_rated_id,
      'user_rated',
      v_rater_id,
      now(),
      jsonb_build_object('rating', p_rating)
    );
  END IF;

  PERFORM trigger_top_rated_badge_check(p_rated_id);

  RETURN v_rating_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_user_rating IS 'Creates or updates a rating for a user. One rating per user pair. Requires >= 2 mutual chat messages. Account must be >= 7 days old.';

-- ============================================================
-- Helper function for top_rated badge
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_top_rated_badge_check(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_rating_count INTEGER;
  v_completed_trades INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_completed_trades
  FROM trade_listings
  WHERE user_id = p_user_id AND status = 'sold';

  SELECT AVG(rating), COUNT(*) INTO v_avg_rating, v_rating_count
  FROM user_ratings
  WHERE rated_id = p_user_id;

  IF v_completed_trades >= 5 AND v_avg_rating >= 4.5 AND v_rating_count >= 5 THEN
    INSERT INTO user_badge_progress (user_id, badge_category, current_count, updated_at)
    VALUES (p_user_id, 'top_rated', 1, NOW())
    ON CONFLICT (user_id, badge_category)
    DO UPDATE SET
      current_count = 1,
      updated_at = NOW();

    PERFORM check_and_award_badge(p_user_id, 'top_rated');
  END IF;
END;
$$;

-- ============================================================
-- Task 1.4: Anonymous ratings query
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_ratings_anonymous(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  rating INT,
  comment TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.rating, ur.comment, ur.created_at
  FROM user_ratings ur
  WHERE ur.rated_id = p_user_id
  ORDER BY ur.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_user_ratings_anonymous IS 'Gets ratings for a user without revealing rater identity';

-- ============================================================
-- Task 1.5: Get my rating for a user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_rating_for_user(
  p_rated_id UUID
)
RETURNS TABLE(
  rating INT,
  comment TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.rating, ur.comment, ur.updated_at
  FROM user_ratings ur
  WHERE ur.rater_id = auth.uid()
    AND ur.rated_id = p_rated_id
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_my_rating_for_user IS 'Gets the current user rating for a specific user, if any';

-- ============================================================
-- Task 1.6: can_rate_user eligibility check
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_rate_user(
  p_target_id UUID
)
RETURNS TABLE(
  can_rate BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_account_created_at TIMESTAMPTZ;
  v_cooldown_until TIMESTAMPTZ;
  v_msgs_from_caller INT;
  v_msgs_from_target INT;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_authenticated'::TEXT;
    RETURN;
  END IF;

  IF v_caller_id = p_target_id THEN
    RETURN QUERY SELECT false, 'self'::TEXT;
    RETURN;
  END IF;

  SELECT u.created_at INTO v_account_created_at
  FROM auth.users u WHERE u.id = v_caller_id;
  
  IF v_account_created_at > now() - interval '7 days' THEN
    RETURN QUERY SELECT false, 'account_too_new'::TEXT;
    RETURN;
  END IF;

  SELECT p.rating_cooldown_until INTO v_cooldown_until
  FROM profiles p WHERE p.id = v_caller_id;
  
  IF v_cooldown_until IS NOT NULL AND v_cooldown_until > now() THEN
    RETURN QUERY SELECT false, 'rating_cooldown'::TEXT;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_msgs_from_caller
  FROM trade_chats
  WHERE sender_id = v_caller_id
    AND receiver_id = p_target_id
    AND is_system = false;

  SELECT COUNT(*) INTO v_msgs_from_target
  FROM trade_chats
  WHERE sender_id = p_target_id
    AND receiver_id = v_caller_id
    AND is_system = false;

  IF v_msgs_from_caller < 2 OR v_msgs_from_target < 2 THEN
    RETURN QUERY SELECT false, 'no_mutual_chat'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.can_rate_user IS 'Checks if the current user can rate the target user';

-- ============================================================
-- Task 2.3: RPC register_device_fingerprint
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_device_fingerprint(
  p_fingerprint_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_suspicious_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO device_fingerprints (profile_id, fingerprint_hash, platform, first_seen_at, last_seen_at)
  VALUES (v_user_id, p_fingerprint_hash, 'android', now(), now())
  ON CONFLICT (profile_id, fingerprint_hash) DO UPDATE SET
    last_seen_at = now();

  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND is_flagged = true) THEN
    RETURN jsonb_build_object('flagged', true, 'reason', 'already_flagged');
  END IF;

  SELECT p.id, p.rating_avg, p.rating_count, p.is_suspended, p.is_flagged
  INTO v_suspicious_profile
  FROM device_fingerprints df
  JOIN profiles p ON p.id = df.profile_id
  WHERE df.fingerprint_hash = p_fingerprint_hash
    AND df.profile_id <> v_user_id
    AND (
      p.is_suspended = true
      OR p.is_flagged = true
      OR (p.rating_avg < 2.0 AND p.rating_count >= 3)
    )
  LIMIT 1;

  IF v_suspicious_profile IS NOT NULL THEN
    UPDATE profiles
    SET 
      is_flagged = true,
      flagged_at = now(),
      flagged_source_profile_id = v_suspicious_profile.id,
      flagged_reason = 'device_match_with_flagged_account',
      rating_cooldown_until = now() + interval '14 days'
    WHERE id = v_user_id;

    RETURN jsonb_build_object('flagged', true, 'reason', 'device_match');
  END IF;

  RETURN jsonb_build_object('flagged', false);
END;
$$;

COMMENT ON FUNCTION public.register_device_fingerprint IS 'Registers a device fingerprint and checks for suspicious multi-accounting';

-- ============================================================
-- Task 3.1: Chat blocking trigger for flagged profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_flagged_chat_restriction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_profile_id UUID;
BEGIN
  SELECT flagged_source_profile_id INTO v_source_profile_id
  FROM profiles
  WHERE id = NEW.sender_id AND is_flagged = true;

  IF v_source_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.receiver_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trade_chats
    WHERE (sender_id = v_source_profile_id AND receiver_id = NEW.receiver_id)
       OR (sender_id = NEW.receiver_id AND receiver_id = v_source_profile_id)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No puedes enviar mensajes a este usuario';
  END IF;

  IF NEW.listing_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trade_chats
    WHERE listing_id = NEW.listing_id
      AND (sender_id = v_source_profile_id OR receiver_id = v_source_profile_id)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No puedes enviar mensajes en este anuncio';
  END IF;

  IF NEW.match_conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trade_chats
    WHERE match_conversation_id = NEW.match_conversation_id
      AND (sender_id = v_source_profile_id OR receiver_id = v_source_profile_id)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'No puedes enviar mensajes a este usuario';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flagged_chat_restriction ON trade_chats;
CREATE TRIGGER trg_flagged_chat_restriction
  BEFORE INSERT ON trade_chats
  FOR EACH ROW
  EXECUTE FUNCTION check_flagged_chat_restriction();

-- ============================================================
-- PHASE 5.1: Migrate existing ratings
-- ============================================================

UPDATE profiles p
SET 
  rating_avg = COALESCE(sub.avg_rating, 0),
  rating_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT rated_id, AVG(rating)::NUMERIC(3,2) as avg_rating, COUNT(*) as cnt
  FROM user_ratings
  GROUP BY rated_id
) sub
WHERE p.id = sub.rated_id;

UPDATE profiles
SET rating_avg = 0, rating_count = 0
WHERE id NOT IN (SELECT DISTINCT rated_id FROM user_ratings)
  AND rating_count > 0;
