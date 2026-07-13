-- =============================================================================
-- Migration: Highlighted Listings System
-- Phase 1: Tables, RLS, RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. highlight_credit_balances — user credit wallet
-- ---------------------------------------------------------------------------
CREATE TABLE public.highlight_credit_balances (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.highlight_credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance"
  ON public.highlight_credit_balances FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. highlight_credit_transactions — full audit log of credits in/out
-- ---------------------------------------------------------------------------
CREATE TABLE public.highlight_credit_transactions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        INT NOT NULL,          -- positive = credit, negative = debit
  balance_after INT NOT NULL,
  credit_source TEXT NOT NULL
    CHECK (credit_source IN ('ls_purchase', 'rewarded_ad', 'admin_grant', 'refund')),
  ls_order_id   TEXT,                  -- LemonSqueezy order ID (for ls_purchase)
  listing_id    BIGINT REFERENCES public.trade_listings(id) ON DELETE SET NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_highlight_credit_txns_user
  ON public.highlight_credit_transactions(user_id, created_at DESC);

ALTER TABLE public.highlight_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.highlight_credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. listing_highlights — active and past highlights
-- ---------------------------------------------------------------------------
CREATE TABLE public.listing_highlights (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id    BIGINT NOT NULL REFERENCES public.trade_listings(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration      TEXT NOT NULL CHECK (duration IN ('48_hours', '7_days')),
  credits_spent INT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  views_at_start INT NOT NULL DEFAULT 0,   -- snapshot of views_count at activation
  ls_order_id   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by listing_id (uniqueness of active highlights enforced in RPCs)
CREATE INDEX idx_listing_highlights_by_listing
  ON public.listing_highlights(listing_id, expires_at DESC);

CREATE INDEX idx_listing_highlights_user
  ON public.listing_highlights(user_id, created_at DESC);

ALTER TABLE public.listing_highlights ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed to display highlight badges in marketplace)
CREATE POLICY "Anyone can see highlights"
  ON public.listing_highlights FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 4. payment_events — webhook idempotency log
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  ls_event_id  TEXT,
  payload      JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_ls_event_unique UNIQUE (ls_event_id)
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- Admins only — no user policies needed

-- =============================================================================
-- RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC: purchase_highlight_credits
-- Called by the lemon-webhook edge function after a successful order.
-- Grants credits to the user's wallet and records the transaction.
-- Returns the new balance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_highlight_credits(
  p_user_id    UUID,
  p_amount     INT,
  p_source     TEXT,
  p_ls_order_id TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Upsert balance row
  INSERT INTO public.highlight_credit_balances(user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance     = highlight_credit_balances.balance + EXCLUDED.balance,
        updated_at  = now()
  RETURNING balance INTO v_new_balance;

  -- Record transaction
  INSERT INTO public.highlight_credit_transactions(
    user_id, amount, balance_after, credit_source, ls_order_id, description
  )
  VALUES (
    p_user_id,
    p_amount,
    v_new_balance,
    p_source,
    p_ls_order_id,
    CASE
      WHEN p_source = 'ls_purchase' THEN 'LemonSqueezy purchase – ' || p_amount || ' credits'
      WHEN p_source = 'rewarded_ad' THEN 'Rewarded ad – ' || p_amount || ' credits'
      WHEN p_source = 'admin_grant' THEN 'Admin grant – ' || p_amount || ' credits'
      ELSE p_amount || ' credits credited'
    END
  );

  RETURN v_new_balance;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: activate_highlight
-- Called by the webhook (auto) or by a user spending credits manually.
-- Validates ownership, listing status, no existing active highlight,
-- and sufficient credit balance. Debits credits and creates the highlight row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_highlight(
  p_listing_id BIGINT,
  p_duration   TEXT  -- '48_hours' or '7_days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id    UUID;
  v_listing      RECORD;
  v_credits_cost INT;
  v_duration_hrs INT;
  v_current_balance INT;
  v_new_balance  INT;
  v_expires_at   TIMESTAMPTZ;
  v_highlight_id BIGINT;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Validate duration
  IF p_duration NOT IN ('48_hours', '7_days') THEN
    RAISE EXCEPTION 'invalid_duration';
  END IF;

  v_credits_cost := CASE p_duration WHEN '48_hours' THEN 100 ELSE 300 END;
  v_duration_hrs := CASE p_duration WHEN '48_hours' THEN 48 ELSE 168 END;

  -- Fetch listing
  SELECT id, user_id, status, views_count
  INTO v_listing
  FROM public.trade_listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  -- Must be owner
  IF v_listing.user_id != v_caller_id THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  -- Listing must be active
  IF v_listing.status != 'active' THEN
    RAISE EXCEPTION 'listing_not_active';
  END IF;

  -- Check no existing active highlight
  IF EXISTS (
    SELECT 1 FROM public.listing_highlights
    WHERE listing_id = p_listing_id
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'already_highlighted';
  END IF;

  -- Check credit balance
  SELECT COALESCE(balance, 0)
  INTO v_current_balance
  FROM public.highlight_credit_balances
  WHERE user_id = v_caller_id;

  v_current_balance := COALESCE(v_current_balance, 0);

  IF v_current_balance < v_credits_cost THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  -- Debit credits
  UPDATE public.highlight_credit_balances
  SET balance    = balance - v_credits_cost,
      updated_at = now()
  WHERE user_id = v_caller_id
  RETURNING balance INTO v_new_balance;

  -- Record debit transaction
  INSERT INTO public.highlight_credit_transactions(
    user_id, amount, balance_after, credit_source, listing_id, description
  )
  VALUES (
    v_caller_id,
    -v_credits_cost,
    v_new_balance,
    'ls_purchase',  -- debit source mirrors the credit source
    p_listing_id,
    'Highlight activated – ' || p_duration
  );

  -- Create highlight row
  v_expires_at := now() + (v_duration_hrs || ' hours')::INTERVAL;

  INSERT INTO public.listing_highlights(
    listing_id, user_id, duration, credits_spent,
    starts_at, expires_at, views_at_start
  )
  VALUES (
    p_listing_id, v_caller_id, p_duration, v_credits_cost,
    now(), v_expires_at, COALESCE(v_listing.views_count, 0)
  )
  RETURNING id INTO v_highlight_id;

  RETURN jsonb_build_object(
    'highlight_id', v_highlight_id,
    'expires_at',   v_expires_at,
    'duration',     p_duration,
    'credits_remaining', v_new_balance
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: activate_highlight_for_user
-- SECURITY DEFINER version called by the webhook (server-side, on behalf of user).
-- Same logic as activate_highlight but takes explicit user_id and skips auth check.
-- Used ONLY by the lemon-webhook edge function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_highlight_for_user(
  p_user_id    UUID,
  p_listing_id BIGINT,
  p_duration   TEXT,
  p_ls_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing      RECORD;
  v_credits_cost INT;
  v_duration_hrs INT;
  v_current_balance INT;
  v_new_balance  INT;
  v_expires_at   TIMESTAMPTZ;
  v_highlight_id BIGINT;
BEGIN
  IF p_duration NOT IN ('48_hours', '7_days') THEN
    RAISE EXCEPTION 'invalid_duration';
  END IF;

  v_credits_cost := CASE p_duration WHEN '48_hours' THEN 100 ELSE 300 END;
  v_duration_hrs := CASE p_duration WHEN '48_hours' THEN 48 ELSE 168 END;

  SELECT id, user_id, status, views_count
  INTO v_listing
  FROM public.trade_listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'listing_not_found'; END IF;
  IF v_listing.user_id != p_user_id THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF v_listing.status != 'active' THEN RAISE EXCEPTION 'listing_not_active'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.listing_highlights
    WHERE listing_id = p_listing_id AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'already_highlighted';
  END IF;

  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM public.highlight_credit_balances WHERE user_id = p_user_id;
  v_current_balance := COALESCE(v_current_balance, 0);

  IF v_current_balance < v_credits_cost THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  UPDATE public.highlight_credit_balances
  SET balance = balance - v_credits_cost, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.highlight_credit_transactions(
    user_id, amount, balance_after, credit_source, ls_order_id, listing_id, description
  )
  VALUES (
    p_user_id, -v_credits_cost, v_new_balance, 'ls_purchase',
    p_ls_order_id, p_listing_id, 'Highlight activated via webhook – ' || p_duration
  );

  v_expires_at := now() + (v_duration_hrs || ' hours')::INTERVAL;

  INSERT INTO public.listing_highlights(
    listing_id, user_id, duration, credits_spent,
    starts_at, expires_at, views_at_start, ls_order_id
  )
  VALUES (
    p_listing_id, p_user_id, p_duration, v_credits_cost,
    now(), v_expires_at, COALESCE(v_listing.views_count, 0), p_ls_order_id
  )
  RETURNING id INTO v_highlight_id;

  RETURN jsonb_build_object(
    'highlight_id',       v_highlight_id,
    'expires_at',         v_expires_at,
    'duration',           p_duration,
    'credits_remaining',  v_new_balance
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: get_highlight_info
-- Returns active highlight info for a listing (null if not highlighted).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_highlight_info(p_listing_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_listing_views INT;
BEGIN
  SELECT lh.*, tl.views_count
  INTO v_row
  FROM public.listing_highlights lh
  JOIN public.trade_listings tl ON tl.id = lh.listing_id
  WHERE lh.listing_id = p_listing_id
    AND lh.expires_at > now()
  ORDER BY lh.expires_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'is_highlighted', true,
    'duration',       v_row.duration,
    'starts_at',      v_row.starts_at,
    'expires_at',     v_row.expires_at,
    'extra_views',    GREATEST(0, COALESCE(v_row.views_count, 0) - COALESCE(v_row.views_at_start, 0))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: get_my_highlight_credits
-- Returns the current user's credit balance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_highlight_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INT;
BEGIN
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM public.highlight_credit_balances
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object('balance', COALESCE(v_balance, 0));
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin_get_all_highlights (admin-only)
-- Returns all highlights with user and listing info.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_highlights(
  p_status TEXT DEFAULT 'all'  -- 'all', 'active', 'expired'
)
RETURNS TABLE (
  highlight_id   BIGINT,
  listing_id     BIGINT,
  listing_title  TEXT,
  user_id        UUID,
  nickname       TEXT,
  duration       TEXT,
  credit_source  TEXT,
  credits_spent  INT,
  price_eur      NUMERIC,
  ls_order_id    TEXT,
  starts_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  extra_views    INT,
  is_active      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    lh.id                AS highlight_id,
    lh.listing_id,
    tl.title             AS listing_title,
    lh.user_id,
    p.nickname,
    lh.duration,
    COALESCE(
      (SELECT hct.credit_source FROM public.highlight_credit_transactions hct
       WHERE hct.listing_id = lh.listing_id
         AND hct.user_id = lh.user_id
         AND hct.amount < 0
       ORDER BY hct.created_at DESC LIMIT 1),
      'ls_purchase'
    )                    AS credit_source,
    lh.credits_spent,
    CASE lh.duration
      WHEN '48_hours' THEN 0.99::NUMERIC
      WHEN '7_days'   THEN 2.99::NUMERIC
      ELSE 0::NUMERIC
    END                  AS price_eur,
    lh.ls_order_id,
    lh.starts_at,
    lh.expires_at,
    GREATEST(0, COALESCE(tl.views_count, 0) - COALESCE(lh.views_at_start, 0)) AS extra_views,
    (lh.expires_at > now()) AS is_active
  FROM public.listing_highlights lh
  JOIN public.trade_listings tl ON tl.id = lh.listing_id
  JOIN public.profiles p ON p.id = lh.user_id
  WHERE
    CASE p_status
      WHEN 'active'  THEN lh.expires_at > now()
      WHEN 'expired' THEN lh.expires_at <= now()
      ELSE true
    END
  ORDER BY
    (lh.expires_at > now()) DESC,
    lh.starts_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin_get_user_highlights (admin-only)
-- Returns all highlights (active + past) for a specific user.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_user_highlights(p_user_id UUID)
RETURNS TABLE (
  highlight_id   BIGINT,
  listing_id     BIGINT,
  listing_title  TEXT,
  duration       TEXT,
  credit_source  TEXT,
  credits_spent  INT,
  price_eur      NUMERIC,
  ls_order_id    TEXT,
  starts_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  extra_views    INT,
  is_active      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    lh.id                AS highlight_id,
    lh.listing_id,
    tl.title             AS listing_title,
    lh.duration,
    COALESCE(
      (SELECT hct.credit_source FROM public.highlight_credit_transactions hct
       WHERE hct.listing_id = lh.listing_id
         AND hct.user_id = lh.user_id
         AND hct.amount < 0
       ORDER BY hct.created_at DESC LIMIT 1),
      'ls_purchase'
    )                    AS credit_source,
    lh.credits_spent,
    CASE lh.duration
      WHEN '48_hours' THEN 0.99::NUMERIC
      WHEN '7_days'   THEN 2.99::NUMERIC
      ELSE 0::NUMERIC
    END                  AS price_eur,
    lh.ls_order_id,
    lh.starts_at,
    lh.expires_at,
    GREATEST(0, COALESCE(tl.views_count, 0) - COALESCE(lh.views_at_start, 0)) AS extra_views,
    (lh.expires_at > now()) AS is_active
  FROM public.listing_highlights lh
  JOIN public.trade_listings tl ON tl.id = lh.listing_id
  WHERE lh.user_id = p_user_id
  ORDER BY lh.starts_at DESC;
END;
$$;

-- =============================================================================
-- Modified RPC: list_trade_listings_with_collection_filter
-- Adds is_highlighted to output and boosts highlighted listings in ORDER BY.
-- The LEFT JOIN on an empty table at deploy time has zero impact on ordering.
-- =============================================================================

-- Drop first because return type changed (added is_highlighted column)
DROP FUNCTION IF EXISTS public.list_trade_listings_with_collection_filter(integer,integer,text,text,boolean,bigint[],text,boolean);

CREATE OR REPLACE FUNCTION public.list_trade_listings_with_collection_filter(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL::text,
  p_viewer_postcode text DEFAULT NULL::text,
  p_sort_by_distance boolean DEFAULT false,
  p_collection_ids bigint[] DEFAULT NULL::bigint[],
  p_country_code text DEFAULT NULL::text,
  p_is_group boolean DEFAULT NULL::boolean
)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  author_nickname text,
  author_avatar_url text,
  author_postcode text,
  title text,
  description text,
  sticker_number text,
  collection_name text,
  image_url text,
  thumbnail_url text,
  status text,
  views_count integer,
  created_at timestamp with time zone,
  copy_id bigint,
  slot_id bigint,
  distance_km numeric,
  match_score integer,
  is_group boolean,
  group_count integer,
  author_completed_trades integer,
  is_highlighted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_viewer_id UUID;
    v_viewer_lat NUMERIC;
    v_viewer_lon NUMERIC;
    v_template_ids BIGINT[];
    v_search_query tsquery;
    v_viewer_country TEXT;
BEGIN
    v_viewer_id := auth.uid();

    IF v_viewer_id IS NOT NULL THEN
      SELECT prof.country_code INTO v_viewer_country
      FROM profiles prof WHERE prof.id = v_viewer_id;
      v_viewer_country := COALESCE(v_viewer_country, 'ES');
    END IF;

    IF p_sort_by_distance AND p_viewer_postcode IS NOT NULL THEN
        SELECT lat, lon
        INTO v_viewer_lat, v_viewer_lon
        FROM postal_codes
        WHERE postcode = p_viewer_postcode
          AND country = COALESCE(v_viewer_country, 'ES')
        LIMIT 1;
    END IF;

    IF p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT utc.template_id)
        INTO v_template_ids
        FROM user_template_copies utc
        WHERE utc.id = ANY(p_collection_ids);
    END IF;

    IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
        SELECT to_tsquery('spanish', string_agg(token || ':*', ' & '))
        INTO v_search_query
        FROM unnest(string_to_array(trim(regexp_replace(regexp_replace(p_search, '[&|!():*]', '', 'g'), '\s+', ' ', 'g')), ' ')) as token;
    END IF;

    RETURN QUERY
    SELECT
        tl.id,
        tl.user_id,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar_url,
        p.postcode AS author_postcode,
        tl.title,
        tl.description,
        tl.sticker_number,
        tl.collection_name,
        tl.image_url,
        tl.thumbnail_url,
        tl.status,
        tl.views_count,
        tl.created_at,
        tl.copy_id,
        tl.slot_id,
        CASE
            WHEN v_viewer_lat IS NOT NULL AND v_viewer_lon IS NOT NULL AND pc.lat IS NOT NULL THEN
                ROUND(haversine_distance(v_viewer_lat, v_viewer_lon, pc.lat, pc.lon)::NUMERIC, 1)
            ELSE NULL
        END AS distance_km,
        CASE
            WHEN v_template_ids IS NOT NULL AND (
                EXISTS (
                    SELECT 1 FROM user_template_copies utc2
                    WHERE utc2.id = tl.copy_id
                    AND utc2.template_id = ANY(v_template_ids)
                )
                OR (tl.is_group = true AND EXISTS (
                    SELECT 1 FROM listing_pack_items lpi
                    WHERE lpi.listing_id = tl.id
                    AND lpi.template_id = ANY(v_template_ids)
                ))
            ) THEN 2
            WHEN p_collection_ids IS NULL THEN 0
            ELSE -1
        END AS match_score,
        tl.is_group,
        tl.group_count,
        p.completed_trades AS author_completed_trades,
        -- is_highlighted: true if there's an active highlight row for this listing
        (EXISTS (
          SELECT 1 FROM public.listing_highlights lh
          WHERE lh.listing_id = tl.id
            AND lh.expires_at > now()
        )) AS is_highlighted
    FROM trade_listings tl
    INNER JOIN profiles p ON p.id = tl.user_id
    LEFT JOIN postal_codes pc
        ON pc.postcode = p.postcode
        AND pc.country = p.country_code
    WHERE
        tl.status = 'active'
        AND (v_viewer_id IS NULL OR tl.user_id != v_viewer_id)
        -- Filter out ignored users
        AND (v_viewer_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM ignored_users iu
            WHERE iu.user_id = v_viewer_id
            AND iu.ignored_user_id = tl.user_id
        ))
        -- Filter out ignored listings
        AND (v_viewer_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM ignored_listings il
            WHERE il.user_id = v_viewer_id
            AND il.listing_id = tl.id
        ))
        AND (p_country_code IS NULL OR tl.country_code = p_country_code)
        AND (p_is_group IS NULL OR tl.is_group = p_is_group)
        AND (
            p_search IS NULL
            OR (v_search_query IS NOT NULL AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '') || ' ' || COALESCE(tl.description, '')) @@ v_search_query)
            OR (length(p_search) < 4 AND (tl.title ILIKE '%' || p_search || '%' OR tl.collection_name ILIKE '%' || p_search || '%' OR tl.description ILIKE '%' || p_search || '%'))
            OR (tl.title ILIKE '%' || p_search || '%' OR tl.collection_name ILIKE '%' || p_search || '%' OR tl.description ILIKE '%' || p_search || '%')
        )
        AND (
            p_collection_ids IS NULL
            OR EXISTS (
                SELECT 1 FROM user_template_copies utc2
                WHERE utc2.id = tl.copy_id
                AND utc2.template_id = ANY(v_template_ids)
            )
            OR (tl.is_group = true AND EXISTS (
                SELECT 1 FROM listing_pack_items lpi
                WHERE lpi.listing_id = tl.id
                AND lpi.template_id = ANY(v_template_ids)
            ))
        )
    ORDER BY
        -- Highlighted listings surface to the top first
        (EXISTS (
          SELECT 1 FROM public.listing_highlights lh2
          WHERE lh2.listing_id = tl.id AND lh2.expires_at > now()
        )) DESC,
        match_score DESC,
        CASE WHEN p_sort_by_distance THEN 0 ELSE 1 END ASC,
        CASE
            WHEN p_sort_by_distance AND v_viewer_lat IS NOT NULL THEN
                COALESCE(haversine_distance(v_viewer_lat, v_viewer_lon, pc.lat, pc.lon), 999999)
            ELSE 999999
        END ASC NULLS LAST,
        tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;
