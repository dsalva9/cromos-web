-- =============================================================================
-- Migration: Marketplace Daily Listing Limit System (Phase 1 of Pro)
-- =============================================================================
-- Adds a daily cap of 2 free listings per user. Pro users are unlimited.
-- Users can unlock extra listings by watching 5 rewarded ads or paying 0.50€.
-- =============================================================================

-- 1. Add is_pro columns to profiles (needed by quota check, populated in Phase 2)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;

-- 2. Table: listing_unlock_transactions
-- Records extra listing unlocks earned via ads or purchases
CREATE TABLE IF NOT EXISTS listing_unlock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unlock_source TEXT NOT NULL CHECK (unlock_source IN ('rewarded_ads', 'purchase', 'admin_grant')),
  amount INT NOT NULL DEFAULT 1,
  payment_id TEXT,                    -- Google Play order ID or LemonSqueezy order ID
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_listing_unlock_user_date
  ON listing_unlock_transactions(user_id, created_at);

ALTER TABLE listing_unlock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks"
  ON listing_unlock_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocks"
  ON listing_unlock_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Table: listing_ad_unlock_progress
-- Tracks rewarded ad views towards an unlock (need 5 to unlock 1 listing)
CREATE TABLE IF NOT EXISTS listing_ad_unlock_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ads_watched INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_listing_ad_progress_user_date
  ON listing_ad_unlock_progress(user_id, created_at);

ALTER TABLE listing_ad_unlock_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad progress"
  ON listing_ad_unlock_progress FOR SELECT
  USING (auth.uid() = user_id);

-- 4. RPC: get_my_daily_listing_quota
-- Returns quota info for the authenticated user
CREATE OR REPLACE FUNCTION get_my_daily_listing_quota()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_pro BOOLEAN;
  v_used INT;
  v_base_limit INT := 2;
  v_extra_unlocks INT;
  v_total_limit INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check Pro status from cached column
  SELECT COALESCE(is_pro, false) INTO v_is_pro
  FROM profiles WHERE id = v_user_id;

  -- Count today's listings (Spain timezone as reference)
  SELECT COUNT(*)::int INTO v_used
  FROM trade_listings
  WHERE user_id = v_user_id
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Madrid')
    AND status = 'active';

  -- Count extra unlocks purchased/earned today
  SELECT COALESCE(SUM(amount), 0)::int INTO v_extra_unlocks
  FROM listing_unlock_transactions
  WHERE user_id = v_user_id
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Madrid');

  -- Pro users: unlimited
  IF v_is_pro THEN
    RETURN jsonb_build_object(
      'used', v_used,
      'limit', -1,
      'extra_unlocks', 0,
      'can_create', true,
      'is_pro', true
    );
  END IF;

  v_total_limit := v_base_limit + v_extra_unlocks;

  RETURN jsonb_build_object(
    'used', v_used,
    'limit', v_total_limit,
    'extra_unlocks', v_extra_unlocks,
    'can_create', v_used < v_total_limit,
    'is_pro', false
  );
END;
$$;

COMMENT ON FUNCTION get_my_daily_listing_quota IS
  'Returns the daily listing quota for the authenticated user. Free users: 2/day + extras. Pro: unlimited.';

-- 5. RPC: check_daily_listing_quota (internal helper, raises exception if exceeded)
CREATE OR REPLACE FUNCTION check_daily_listing_quota()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quota jsonb;
BEGIN
  v_quota := get_my_daily_listing_quota();

  IF NOT (v_quota->>'can_create')::boolean THEN
    RAISE EXCEPTION 'daily_listing_limit_reached'
      USING HINT = 'You have reached the daily listing limit. Watch ads or pay to unlock more.';
  END IF;
END;
$$;

-- 6. RPC: record_listing_ad_view
-- Records a rewarded ad view. After 5 views, auto-unlocks 1 extra listing.
CREATE OR REPLACE FUNCTION record_listing_ad_view()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_progress_id UUID;
  v_ads_watched INT;
  v_unlocked BOOLEAN := false;
  v_daily_ad_unlocks INT;
  v_max_ad_unlocks_per_day INT := 5;  -- Max 5 unlocks via ads per day
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check how many ad-based unlocks already earned today
  SELECT COUNT(*)::int INTO v_daily_ad_unlocks
  FROM listing_unlock_transactions
  WHERE user_id = v_user_id
    AND unlock_source = 'rewarded_ads'
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Madrid');

  IF v_daily_ad_unlocks >= v_max_ad_unlocks_per_day THEN
    RAISE EXCEPTION 'daily_ad_unlock_limit_reached'
      USING HINT = 'Maximum ad-based unlocks reached for today.';
  END IF;

  -- Find or create today's progress record
  SELECT id, ads_watched INTO v_progress_id, v_ads_watched
  FROM listing_ad_unlock_progress
  WHERE user_id = v_user_id
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Madrid')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_progress_id IS NULL THEN
    -- Create new progress
    INSERT INTO listing_ad_unlock_progress (user_id, ads_watched)
    VALUES (v_user_id, 1)
    RETURNING id, ads_watched INTO v_progress_id, v_ads_watched;
  ELSE
    -- Increment
    UPDATE listing_ad_unlock_progress
    SET ads_watched = ads_watched + 1
    WHERE id = v_progress_id
    RETURNING ads_watched INTO v_ads_watched;
  END IF;

  -- After 5 ads, grant an unlock and reset progress
  IF v_ads_watched >= 10 THEN
    INSERT INTO listing_unlock_transactions (user_id, unlock_source, amount)
    VALUES (v_user_id, 'rewarded_ads', 1);

    -- Reset progress for next batch
    DELETE FROM listing_ad_unlock_progress WHERE id = v_progress_id;

    v_unlocked := true;
    v_ads_watched := 0;
  END IF;

  RETURN jsonb_build_object(
    'ads_watched', v_ads_watched,
    'ads_required', 10,
    'unlocked', v_unlocked,
    'daily_ad_unlocks_used', v_daily_ad_unlocks + (CASE WHEN v_unlocked THEN 1 ELSE 0 END),
    'daily_ad_unlocks_max', v_max_ad_unlocks_per_day
  );
END;
$$;

COMMENT ON FUNCTION record_listing_ad_view IS
  'Records a rewarded ad view. After 5 views, grants 1 extra listing unlock. Max 5 ad-unlocks per day.';

-- 7. RPC: record_listing_purchase_unlock
-- Records a paid unlock (verified server-side by Edge Function)
CREATE OR REPLACE FUNCTION record_listing_purchase_unlock(
  p_payment_id TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Prevent duplicate processing
  IF EXISTS (
    SELECT 1 FROM listing_unlock_transactions
    WHERE payment_id = p_payment_id
  ) THEN
    RETURN; -- Already processed, idempotent
  END IF;

  INSERT INTO listing_unlock_transactions (user_id, unlock_source, amount, payment_id)
  VALUES (v_user_id, 'purchase', 1, p_payment_id);
END;
$$;

COMMENT ON FUNCTION record_listing_purchase_unlock IS
  'Records a listing unlock from a verified purchase. Called by Edge Function after payment verification.';

-- 8. Update create_trade_listing to enforce daily quota
-- We need to DROP the old function first due to parameter changes not being possible with CREATE OR REPLACE
-- when only adding logic (no signature change needed here, just adding the guard).
CREATE OR REPLACE FUNCTION "public"."create_trade_listing"(
  "p_title" "text",
  "p_description" "text",
  "p_sticker_number" "text",
  "p_collection_name" "text",
  "p_image_url" "text",
  "p_copy_id" bigint,
  "p_slot_id" bigint,
  "p_page_number" integer DEFAULT NULL::integer,
  "p_page_title" "text" DEFAULT NULL::"text",
  "p_slot_variant" "text" DEFAULT NULL::"text",
  "p_global_number" integer DEFAULT NULL::integer,
  "p_is_group" boolean DEFAULT false,
  "p_group_count" integer DEFAULT 1,
  "p_listing_type" "text" DEFAULT 'intercambio'::"text",
  "p_price" numeric DEFAULT NULL::numeric
) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_listing_id BIGINT;
  v_user_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- *** DAILY LISTING LIMIT CHECK ***
  PERFORM check_daily_listing_quota();

  -- Validate listing_type
  IF p_listing_type NOT IN ('intercambio', 'venta', 'ambos') THEN
    RAISE EXCEPTION 'listing_type must be intercambio, venta, or ambos';
  END IF;

  -- Validate price when selling
  IF p_listing_type IN ('venta', 'ambos') AND (p_price IS NULL OR p_price <= 0) THEN
    RAISE EXCEPTION 'Price must be greater than 0 when listing is for sale';
  END IF;

  -- Insert the listing
  INSERT INTO trade_listings (
    user_id,
    title,
    description,
    sticker_number,
    collection_name,
    image_url,
    copy_id,
    slot_id,
    page_number,
    page_title,
    slot_variant,
    global_number,
    is_group,
    group_count,
    listing_type,
    price,
    status
  ) VALUES (
    v_user_id,
    p_title,
    p_description,
    p_sticker_number,
    p_collection_name,
    p_image_url,
    p_copy_id,
    p_slot_id,
    p_page_number,
    p_page_title,
    p_slot_variant,
    p_global_number,
    p_is_group,
    p_group_count,
    p_listing_type,
    p_price,
    'active'
  ) RETURNING id INTO v_listing_id;

  RETURN v_listing_id;
END;
$$;

COMMENT ON FUNCTION "public"."create_trade_listing" IS
  'Creates a new marketplace listing. Enforces daily quota (2/day for free users, unlimited for Pro).';

-- 9. Update publish_duplicate_to_marketplace to enforce daily quota
CREATE OR REPLACE FUNCTION "public"."publish_duplicate_to_marketplace"(
  "p_copy_id" bigint,
  "p_slot_id" bigint,
  "p_title" text,
  "p_description" text DEFAULT NULL,
  "p_image_url" text DEFAULT NULL,
  "p_listing_type" text DEFAULT 'intercambio',
  "p_price" numeric DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_listing_id BIGINT;
    v_user_id UUID;
    v_template_id BIGINT;
    v_current_count INTEGER;
    v_copy_user_id UUID;
    v_slot_status TEXT;
    v_page_number INTEGER;
    v_page_title TEXT;
    v_slot_number INTEGER;
    v_slot_variant TEXT;
    v_global_number INTEGER;
    v_collection_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- *** DAILY LISTING LIMIT CHECK ***
    PERFORM check_daily_listing_quota();

    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;

    -- Validate listing_type
    IF p_listing_type NOT IN ('intercambio', 'venta', 'ambos') THEN
        RAISE EXCEPTION 'listing_type must be intercambio, venta, or ambos';
    END IF;

    -- Validate price when selling
    IF p_listing_type IN ('venta', 'ambos') AND (p_price IS NULL OR p_price <= 0) THEN
        RAISE EXCEPTION 'Price must be greater than 0 when listing is for sale';
    END IF;

    -- Get copy details INCLUDING the title (which is the collection name)
    SELECT user_id, template_id, title
    INTO v_copy_user_id, v_template_id, v_collection_name
    FROM user_template_copies
    WHERE id = p_copy_id;

    IF v_copy_user_id IS NULL THEN
        RAISE EXCEPTION 'Copy not found';
    END IF;

    IF v_copy_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Copy does not belong to you';
    END IF;

    -- Get slot metadata
    SELECT
        tp.page_number,
        tp.title,
        ts.slot_number,
        ts.slot_variant,
        ts.global_number
    INTO
        v_page_number,
        v_page_title,
        v_slot_number,
        v_slot_variant,
        v_global_number
    FROM template_slots ts
    JOIN template_pages tp ON ts.page_id = tp.id
    WHERE ts.id = p_slot_id AND tp.template_id = v_template_id;

    IF v_slot_number IS NULL THEN
        RAISE EXCEPTION 'Slot does not belong to this template';
    END IF;

    SELECT status, count INTO v_slot_status, v_current_count
    FROM user_template_progress
    WHERE user_id = auth.uid() AND copy_id = p_copy_id AND slot_id = p_slot_id;

    IF v_slot_status IS NULL THEN
        RAISE EXCEPTION 'Slot progress not found';
    END IF;

    IF v_slot_status != 'duplicate' OR v_current_count < 1 THEN
        RAISE EXCEPTION 'No duplicates available for this slot';
    END IF;

    -- Create listing WITH collection_name, listing_type, and price
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        image_url,
        status,
        copy_id,
        slot_id,
        sticker_number,
        collection_name,
        page_number,
        page_title,
        slot_variant,
        global_number,
        listing_type,
        price
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_image_url,
        'active',
        p_copy_id,
        p_slot_id,
        CONCAT(v_slot_number::TEXT, COALESCE(v_slot_variant, '')),
        v_collection_name,
        v_page_number,
        v_page_title,
        v_slot_variant,
        v_global_number,
        p_listing_type,
        p_price
    ) RETURNING id INTO v_listing_id;

    RETURN v_listing_id;
END;
$$;

COMMENT ON FUNCTION "public"."publish_duplicate_to_marketplace" IS
  'Creates a marketplace listing from a template duplicate. Enforces daily quota (2/day for free, unlimited for Pro).';
