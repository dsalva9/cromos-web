-- Migration: add get_user_trade_overlap
-- Purpose: New SECURITY DEFINER RPC to calculate sticker overlap between two users.
-- This bypasses RLS on user_template_copies and user_template_progress,
-- which only allow users to read their own data.
-- Used by UserTradeMatchSection on the user profile page.

CREATE OR REPLACE FUNCTION public.get_user_trade_overlap(
  p_my_user_id UUID,
  p_their_user_id UUID
)
RETURNS TABLE (
  template_id BIGINT,
  collection_name TEXT,
  they_have_for_you BIGINT,
  you_have_for_them BIGINT,
  total_overlap BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow authenticated users to call this for themselves
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF auth.uid() <> p_my_user_id THEN
    RAISE EXCEPTION 'You can only query your own trade overlaps';
  END IF;

  -- Don't allow querying yourself
  IF p_my_user_id = p_their_user_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH shared AS (
    SELECT
      mc.template_id,
      ct.title AS collection_name,
      mc.id AS my_copy_id,
      tc.id AS their_copy_id
    FROM user_template_copies mc
    JOIN user_template_copies tc
      ON tc.template_id = mc.template_id
      AND tc.user_id = p_their_user_id
    JOIN collection_templates ct ON ct.id = mc.template_id
    WHERE mc.user_id = p_my_user_id
      AND mc.template_id IS NOT NULL
  ),
  overlap_calc AS (
    SELECT
      s.template_id,
      s.collection_name,
      COUNT(CASE
        WHEN tp.count > 1 AND (mp.count IS NULL OR mp.count = 0)
        THEN 1
      END) AS they_have_for_you,
      COUNT(CASE
        WHEN mp.count > 1 AND (tp.count IS NULL OR tp.count = 0)
        THEN 1
      END) AS you_have_for_them
    FROM shared s
    JOIN template_slots ts ON ts.template_id = s.template_id
    LEFT JOIN user_template_progress mp
      ON mp.copy_id = s.my_copy_id AND mp.slot_id = ts.id
    LEFT JOIN user_template_progress tp
      ON tp.copy_id = s.their_copy_id AND tp.slot_id = ts.id
    GROUP BY s.template_id, s.collection_name
  )
  SELECT
    oc.template_id,
    oc.collection_name,
    oc.they_have_for_you,
    oc.you_have_for_them,
    (oc.they_have_for_you + oc.you_have_for_them) AS total_overlap
  FROM overlap_calc oc
  WHERE oc.they_have_for_you > 0 OR oc.you_have_for_them > 0
  ORDER BY (oc.they_have_for_you + oc.you_have_for_them) DESC;
END;
$$;

ALTER FUNCTION public.get_user_trade_overlap(UUID, UUID) OWNER TO postgres;

COMMENT ON FUNCTION public.get_user_trade_overlap(UUID, UUID)
IS 'Returns mutual sticker overlap between two users across all shared collections. Used by UserTradeMatchSection on user profile pages.';

-- Grant access to authenticated users (required for client-side RPC calls)
GRANT EXECUTE ON FUNCTION public.get_user_trade_overlap(UUID, UUID) TO authenticated;
