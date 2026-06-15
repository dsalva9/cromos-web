-- Migration: Hidden conversations and ignored listings
-- Features 3 & 4A: Allow users to hide chat conversations and ignore marketplace listings

-- ============================================================
-- 1. hidden_conversations table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hidden_conversations (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- For marketplace chats: identified by listing_id + counterparty_id
    listing_id bigint REFERENCES public.trade_listings(id) ON DELETE CASCADE,
    counterparty_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- For match chats (future-proof, not used in this migration scope)
    match_conversation_id bigint,
    hidden_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraints to prevent duplicate hides
CREATE UNIQUE INDEX idx_hidden_conv_marketplace
    ON public.hidden_conversations (user_id, listing_id, counterparty_id)
    WHERE listing_id IS NOT NULL;

CREATE UNIQUE INDEX idx_hidden_conv_match
    ON public.hidden_conversations (user_id, match_conversation_id)
    WHERE match_conversation_id IS NOT NULL;

-- Index for quick lookups when filtering conversations
CREATE INDEX idx_hidden_conv_user_id ON public.hidden_conversations (user_id);

ALTER TABLE public.hidden_conversations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own hidden conversations
CREATE POLICY "Users can view own hidden conversations"
    ON public.hidden_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can hide their own conversations"
    ON public.hidden_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide their own conversations"
    ON public.hidden_conversations FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.hidden_conversations IS 'Tracks conversations hidden by users. Hidden chats reappear when a new message is received.';

-- ============================================================
-- 2. ignored_listings table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ignored_listings (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id bigint NOT NULL REFERENCES public.trade_listings(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_ignored_listings_user_id ON public.ignored_listings (user_id);

ALTER TABLE public.ignored_listings ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own ignored listings
CREATE POLICY "Users can view own ignored listings"
    ON public.ignored_listings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can ignore listings"
    ON public.ignored_listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unignore listings"
    ON public.ignored_listings FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.ignored_listings IS 'Listings ignored/hidden by users. Ignored listings are hidden from marketplace browse and from /chats.';

-- ============================================================
-- 3. RPCs for hide/unhide conversations
-- ============================================================
CREATE OR REPLACE FUNCTION public.hide_conversation(
    p_listing_id bigint,
    p_counterparty_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO hidden_conversations (user_id, listing_id, counterparty_id)
    VALUES (auth.uid(), p_listing_id, p_counterparty_id)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unhide_conversation(
    p_listing_id bigint,
    p_counterparty_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM hidden_conversations
    WHERE user_id = auth.uid()
      AND listing_id = p_listing_id
      AND counterparty_id = p_counterparty_id;
END;
$$;

COMMENT ON FUNCTION public.hide_conversation IS 'Hides a marketplace conversation from the /chats page. It will reappear if a new message is received.';
COMMENT ON FUNCTION public.unhide_conversation IS 'Unhides a previously hidden marketplace conversation.';

-- ============================================================
-- 4. RPCs for ignore/unignore listings
-- ============================================================
CREATE OR REPLACE FUNCTION public.ignore_listing(
    p_listing_id bigint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Don't let owners ignore their own listings
    IF EXISTS (SELECT 1 FROM trade_listings WHERE id = p_listing_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Cannot ignore your own listing';
    END IF;

    INSERT INTO ignored_listings (user_id, listing_id)
    VALUES (auth.uid(), p_listing_id)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unignore_listing(
    p_listing_id bigint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM ignored_listings
    WHERE user_id = auth.uid()
      AND listing_id = p_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ignored_listings()
RETURNS TABLE(
    listing_id bigint,
    listing_title text,
    listing_description text,
    listing_status text,
    collection_name text,
    ignored_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        il.listing_id,
        tl.title,
        tl.description,
        tl.status,
        tl.collection_name,
        il.created_at
    FROM ignored_listings il
    JOIN trade_listings tl ON tl.id = il.listing_id
    WHERE il.user_id = auth.uid()
      AND tl.deleted_at IS NULL
    ORDER BY il.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.ignore_listing IS 'Ignores a marketplace listing — hides it from browse and from /chats.';
COMMENT ON FUNCTION public.unignore_listing IS 'Removes a listing from the ignored list.';
COMMENT ON FUNCTION public.get_ignored_listings IS 'Returns all listings ignored by the current user, for the settings page.';

-- ============================================================
-- 5. Update get_user_conversations to filter hidden & ignored
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_conversations()
 RETURNS TABLE(listing_id bigint, listing_title text, listing_image_url text, listing_status text, counterparty_id uuid, counterparty_nickname text, counterparty_avatar_url text, last_message text, last_message_at timestamp with time zone, unread_count bigint, is_seller boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  WITH
  -- Step 1: Find only the user's listing IDs via indexes
  user_listing_ids AS (
    SELECT DISTINCT tc.listing_id AS lid
    FROM trade_chats tc
    WHERE tc.listing_id IS NOT NULL
      AND (tc.sender_id = v_user_id OR tc.receiver_id = v_user_id)
  ),
  owned_listing_ids AS (
    SELECT tl.id AS lid
    FROM trade_listings tl
    WHERE tl.user_id = v_user_id
      AND EXISTS (
        SELECT 1 FROM trade_chats tc2
        WHERE tc2.listing_id = tl.id AND tc2.listing_id IS NOT NULL
      )
  ),
  all_listing_ids AS (
    SELECT lid FROM user_listing_ids
    UNION
    SELECT lid FROM owned_listing_ids
  ),
  -- Step 2: Build conversations from only the user's listings
  user_chats AS (
    SELECT DISTINCT
      tc.listing_id AS uc_listing_id,
      CASE
        WHEN tl.user_id = v_user_id THEN tc.sender_id
        ELSE tl.user_id
      END AS uc_counterparty_id,
      tl.user_id = v_user_id AS uc_is_seller
    FROM all_listing_ids ali
    JOIN trade_chats tc ON tc.listing_id = ali.lid
    JOIN trade_listings tl ON tc.listing_id = tl.id
    WHERE tc.sender_id = v_user_id
      OR tc.receiver_id = v_user_id
      OR tl.user_id = v_user_id
  ),
  last_messages AS (
    SELECT
      uc.uc_listing_id,
      uc.uc_counterparty_id,
      tc.message AS lm_message,
      tc.created_at AS lm_created_at,
      ROW_NUMBER() OVER (
        PARTITION BY uc.uc_listing_id, uc.uc_counterparty_id
        ORDER BY tc.created_at DESC
      ) AS rn
    FROM user_chats uc
    JOIN trade_chats tc ON tc.listing_id = uc.uc_listing_id
    WHERE tc.is_system = FALSE
    AND (
      (uc.uc_is_seller = TRUE AND tc.sender_id = uc.uc_counterparty_id)
      OR (uc.uc_is_seller = FALSE AND tc.receiver_id = v_user_id)
      OR (uc.uc_is_seller = FALSE AND tc.sender_id = v_user_id)
      OR (uc.uc_is_seller = TRUE AND tc.receiver_id = v_user_id)
    )
  ),
  unread_counts AS (
    SELECT
      uc.uc_listing_id,
      uc.uc_counterparty_id,
      COUNT(*) AS uc_unread
    FROM user_chats uc
    JOIN trade_chats tc ON tc.listing_id = uc.uc_listing_id
    WHERE tc.is_read = FALSE
    AND tc.receiver_id = v_user_id
    AND (
      (uc.uc_is_seller = TRUE AND tc.sender_id = uc.uc_counterparty_id)
      OR (uc.uc_is_seller = FALSE AND tc.sender_id = uc.uc_counterparty_id)
    )
    GROUP BY uc.uc_listing_id, uc.uc_counterparty_id
  )
  SELECT
    uc.uc_listing_id,
    tl.title,
    tl.image_url,
    tl.status,
    uc.uc_counterparty_id,
    p.nickname,
    p.avatar_url,
    COALESCE(lm.lm_message, '')::text,
    lm.lm_created_at,
    COALESCE(uc_count.uc_unread, 0)::bigint,
    uc.uc_is_seller
  FROM user_chats uc
  JOIN trade_listings tl ON tl.id = uc.uc_listing_id
  JOIN profiles p ON p.id = uc.uc_counterparty_id
  LEFT JOIN last_messages lm ON lm.uc_listing_id = uc.uc_listing_id
    AND lm.uc_counterparty_id = uc.uc_counterparty_id
    AND lm.rn = 1
  LEFT JOIN unread_counts uc_count ON uc_count.uc_listing_id = uc.uc_listing_id
    AND uc_count.uc_counterparty_id = uc.uc_counterparty_id
  WHERE uc.uc_counterparty_id != v_user_id
    AND p.is_suspended = false
    -- Filter out hidden conversations
    AND NOT EXISTS (
      SELECT 1 FROM hidden_conversations hc
      WHERE hc.user_id = v_user_id
        AND hc.listing_id = uc.uc_listing_id
        AND hc.counterparty_id = uc.uc_counterparty_id
    )
    -- Filter out conversations about ignored listings
    AND NOT EXISTS (
      SELECT 1 FROM ignored_listings il
      WHERE il.user_id = v_user_id
        AND il.listing_id = uc.uc_listing_id
    )
  ORDER BY COALESCE(lm.lm_created_at, tl.created_at) DESC;
END;
$function$;

-- ============================================================
-- 6. Grant permissions
-- ============================================================
GRANT ALL ON FUNCTION public.hide_conversation(bigint, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unhide_conversation(bigint, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.ignore_listing(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.unignore_listing(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_ignored_listings() TO authenticated;

GRANT ALL ON TABLE public.hidden_conversations TO authenticated;
GRANT ALL ON TABLE public.ignored_listings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.hidden_conversations_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ignored_listings_id_seq TO authenticated;
