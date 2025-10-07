-- =====================================================
-- Fix Trade Matching Logic and Chat Message Flow
-- Sprint v1.4.2
-- =====================================================

-- 1. Update create_trade_proposal to send message as first chat message
-- =====================================================
-- First drop any existing versions of the function
DROP FUNCTION IF EXISTS public.create_trade_proposal(INTEGER, UUID, TEXT, public.proposal_item[], public.proposal_item[]);
DROP FUNCTION IF EXISTS public.create_trade_proposal(INTEGER, UUID, public.proposal_item[], public.proposal_item[], TEXT);

CREATE OR REPLACE FUNCTION public.create_trade_proposal(
  p_collection_id INTEGER,
  p_to_user UUID,
  p_offer_items public.proposal_item[],
  p_request_items public.proposal_item[],
  p_message TEXT
) RETURNS BIGINT AS $$
DECLARE
  v_from_user_id UUID := auth.uid();
  v_proposal_id BIGINT;
  item public.proposal_item;
BEGIN
  -- 1. Validation
  IF v_from_user_id = p_to_user THEN
    RAISE EXCEPTION 'User cannot create a trade proposal with themselves.';
  END IF;

  -- Ensure the sender (current user) has a profile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_from_user_id) THEN
    RAISE EXCEPTION 'Sender user does not have a profile.';
  END IF;

  -- Ensure the recipient user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_to_user) THEN
    RAISE EXCEPTION 'Recipient user does not exist.';
  END IF;

  -- Ensure both users are part of the collection (assuming a user_collections table)
  IF NOT EXISTS (SELECT 1 FROM public.user_collections uc WHERE uc.user_id = v_from_user_id AND uc.collection_id = p_collection_id) OR
     NOT EXISTS (SELECT 1 FROM public.user_collections uc WHERE uc.user_id = p_to_user AND uc.collection_id = p_collection_id) THEN
    RAISE EXCEPTION 'Both users must be part of the specified collection.';
  END IF;

  -- 2. Insert the main proposal record (message will be in chat, not here)
  INSERT INTO public.trade_proposals (collection_id, from_user, to_user, message, status)
  VALUES (p_collection_id, v_from_user_id, p_to_user, NULL, 'pending')
  RETURNING id INTO v_proposal_id;

  -- 3. Bulk insert the "offer" items
  IF array_length(p_offer_items, 1) > 0 THEN
    INSERT INTO public.trade_proposal_items (proposal_id, sticker_id, quantity, direction)
    SELECT v_proposal_id, (UNNEST(p_offer_items)).sticker_id, (UNNEST(p_offer_items)).quantity, 'offer';
  END IF;

  -- 4. Bulk insert the "request" items
  IF array_length(p_request_items, 1) > 0 THEN
    INSERT INTO public.trade_proposal_items (proposal_id, sticker_id, quantity, direction)
    SELECT v_proposal_id, (UNNEST(p_request_items)).sticker_id, (UNNEST(p_request_items)).quantity, 'request';
  END IF;

  -- 5. If a message was provided, insert it as the first chat message
  IF p_message IS NOT NULL AND p_message <> '' THEN
    INSERT INTO public.trade_chats (trade_id, sender_id, message)
    VALUES (v_proposal_id, v_from_user_id, p_message);
  END IF;

  RETURN v_proposal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix find_mutual_traders to work without 'wanted' flag
-- =====================================================
-- The new logic:
-- - "I want" = stickers where count = 0 (missing)
-- - "I have to offer" = stickers where count > 1 (duplicates)
-- - "They want" = stickers where their count = 0 (missing)
-- - "They have to offer" = stickers where their count > 1 (duplicates)

CREATE OR REPLACE FUNCTION find_mutual_traders(
  p_user_id       UUID,
  p_collection_id INTEGER,
  p_rarity        TEXT DEFAULT NULL,
  p_team          TEXT DEFAULT NULL,
  p_query         TEXT DEFAULT NULL,
  p_min_overlap   INTEGER DEFAULT 1,
  p_limit         INTEGER DEFAULT 20,
  p_offset        INTEGER DEFAULT 0
) RETURNS TABLE (
  match_user_id              UUID,
  nickname                   TEXT,
  overlap_from_them_to_me    BIGINT,
  overlap_from_me_to_them    BIGINT,
  total_mutual_overlap       BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Stickers I'm missing (count = 0)
  my_wants AS (
    SELECT s.id, s.rarity, s.player_name, s.team_id
    FROM stickers s
    LEFT JOIN user_stickers us ON us.sticker_id = s.id AND us.user_id = p_user_id
    LEFT JOIN collection_teams ct ON ct.id = s.team_id
    WHERE s.collection_id = p_collection_id
      AND COALESCE(us.count, 0) = 0
      AND (p_rarity IS NULL OR s.rarity = p_rarity)
      AND (p_team   IS NULL OR ct.team_name ILIKE '%' || p_team || '%')
      AND (p_query  IS NULL OR s.player_name ILIKE '%' || p_query || '%')
  ),
  -- Stickers I have duplicates of (count > 1)
  my_have AS (
    SELECT s.id, s.rarity, s.player_name, s.team_id
    FROM user_stickers us
    JOIN stickers s ON s.id = us.sticker_id
    LEFT JOIN collection_teams ct ON ct.id = s.team_id
    WHERE us.user_id = p_user_id
      AND s.collection_id = p_collection_id
      AND us.count > 1
      AND (p_rarity IS NULL OR s.rarity = p_rarity)
      AND (p_team   IS NULL OR ct.team_name ILIKE '%' || p_team || '%')
      AND (p_query  IS NULL OR s.player_name ILIKE '%' || p_query || '%')
  ),
  -- Candidate users that BOTH have what I want AND want what I have
  other_users AS (
    -- Users who have duplicates of stickers I'm missing
    SELECT DISTINCT us.user_id
    FROM user_stickers us
    JOIN my_wants mw ON mw.id = us.sticker_id
    WHERE us.user_id <> p_user_id
      AND us.count > 1

    INTERSECT

    -- Users who are missing stickers I have duplicates of
    SELECT DISTINCT other_user.id AS user_id
    FROM profiles other_user
    CROSS JOIN my_have mh
    JOIN stickers s ON s.id = mh.id
    LEFT JOIN user_stickers us ON us.sticker_id = mh.id AND us.user_id = other_user.id
    WHERE other_user.id <> p_user_id
      AND s.collection_id = p_collection_id
      AND COALESCE(us.count, 0) = 0
  ),
  -- Count what they can offer me and what I can offer them
  mutual_matches AS (
    SELECT
      ou.user_id AS match_user_id,
      -- What they can offer me: they have duplicates (count > 1) of what I'm missing (count = 0)
      COUNT(DISTINCT CASE
        WHEN th.count > 1 THEN th.sticker_id
        ELSE NULL
      END) AS they_offer_count,
      -- What I can offer them: I have duplicates (count > 1) of what they're missing (count = 0)
      COUNT(DISTINCT CASE
        WHEN COALESCE(tw.count, 0) = 0 THEN mh.id
        ELSE NULL
      END) AS they_want_count
    FROM other_users ou
    CROSS JOIN my_wants
    LEFT JOIN user_stickers th
      ON th.user_id = ou.user_id
     AND th.sticker_id = my_wants.id
    CROSS JOIN my_have mh
    LEFT JOIN user_stickers tw
      ON tw.user_id = ou.user_id
     AND tw.sticker_id = mh.id
    GROUP BY ou.user_id
    HAVING COUNT(DISTINCT CASE WHEN th.count > 1 THEN th.sticker_id ELSE NULL END) >= p_min_overlap
       AND COUNT(DISTINCT CASE WHEN COALESCE(tw.count, 0) = 0 THEN mh.id ELSE NULL END) >= p_min_overlap
  )
  SELECT
    mm.match_user_id,
    COALESCE(p.nickname, 'Usuario') AS nickname,
    mm.they_offer_count            AS overlap_from_them_to_me,
    mm.they_want_count             AS overlap_from_me_to_them,
    (mm.they_offer_count + mm.they_want_count) AS total_mutual_overlap
  FROM mutual_matches mm
  LEFT JOIN profiles p ON p.id = mm.match_user_id
  ORDER BY total_mutual_overlap DESC, mm.match_user_id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix get_mutual_trade_detail to work without 'wanted' flag
-- =====================================================
CREATE OR REPLACE FUNCTION get_mutual_trade_detail(
  p_user_id UUID,
  p_other_user_id UUID,
  p_collection_id INTEGER
) RETURNS TABLE (
  direction TEXT, -- 'they_offer' or 'i_offer'
  sticker_id INTEGER,
  sticker_code TEXT,
  player_name TEXT,
  team_name TEXT,
  rarity TEXT,
  count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- What they can offer me (they have duplicates, I'm missing)
  SELECT
    'they_offer'::TEXT as direction,
    s.id as sticker_id,
    s.code as sticker_code,
    s.player_name,
    COALESCE(ct.team_name, 'Sin equipo') as team_name,
    s.rarity,
    us_them.count
  FROM stickers s
  LEFT JOIN user_stickers us_me ON us_me.sticker_id = s.id AND us_me.user_id = p_user_id
  LEFT JOIN collection_teams ct ON ct.id = s.team_id
  JOIN user_stickers us_them ON us_them.sticker_id = s.id
  WHERE us_them.user_id = p_other_user_id
    AND s.collection_id = p_collection_id
    AND COALESCE(us_me.count, 0) = 0
    AND us_them.count > 1

  UNION ALL

  -- What I can offer them (I have duplicates, they're missing)
  SELECT
    'i_offer'::TEXT as direction,
    s.id as sticker_id,
    s.code as sticker_code,
    s.player_name,
    COALESCE(ct.team_name, 'Sin equipo') as team_name,
    s.rarity,
    us_me.count
  FROM user_stickers us_me
  JOIN stickers s ON s.id = us_me.sticker_id
  LEFT JOIN collection_teams ct ON ct.id = s.team_id
  LEFT JOIN user_stickers us_them ON us_them.sticker_id = s.id AND us_them.user_id = p_other_user_id
  WHERE us_me.user_id = p_user_id
    AND s.collection_id = p_collection_id
    AND us_me.count > 1
    AND COALESCE(us_them.count, 0) = 0

  ORDER BY direction DESC, player_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.create_trade_proposal(INTEGER, UUID, public.proposal_item[], public.proposal_item[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_mutual_traders(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mutual_trade_detail(UUID, UUID, INTEGER) TO authenticated;
