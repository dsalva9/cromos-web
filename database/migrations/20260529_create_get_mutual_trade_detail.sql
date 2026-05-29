-- Migration: Create get_mutual_trade_detail function
-- Returns individual sticker-level overlap between two users for a collection.
-- Used by MatchSpotlight (preview) and MatchDetailDrawer (full detail).

CREATE OR REPLACE FUNCTION public.get_mutual_trade_detail(
  p_user_id uuid,
  p_other_user_id uuid,
  p_collection_id integer  -- template_id
)
RETURNS TABLE(
  slot_id bigint,
  sticker_code text,
  player_name text,
  team_name text,
  rarity text,
  count integer,
  direction text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_copy_id bigint;
  v_their_copy_id bigint;
BEGIN
  SELECT id INTO v_my_copy_id
  FROM user_template_copies
  WHERE user_id = p_user_id AND template_id = p_collection_id
  LIMIT 1;

  SELECT id INTO v_their_copy_id
  FROM user_template_copies
  WHERE user_id = p_other_user_id AND template_id = p_collection_id
  LIMIT 1;

  IF v_my_copy_id IS NULL OR v_their_copy_id IS NULL THEN
    RETURN;
  END IF;

  -- they_offer: slots where I'm missing AND they have duplicates
  RETURN QUERY
  SELECT
    ts.id AS slot_id,
    ts.label AS sticker_code,
    ts.label AS player_name,
    COALESCE(tp.title, '')::text AS team_name,
    COALESCE(ts.slot_variant, 'common')::text AS rarity,
    utp_them.count AS count,
    'they_offer'::text AS direction
  FROM template_slots ts
  JOIN user_template_progress utp_me
    ON utp_me.slot_id = ts.id AND utp_me.copy_id = v_my_copy_id
  JOIN user_template_progress utp_them
    ON utp_them.slot_id = ts.id AND utp_them.copy_id = v_their_copy_id
  LEFT JOIN template_pages tp ON tp.id = ts.page_id
  WHERE ts.template_id = p_collection_id
    AND (utp_me.status = 'missing' OR utp_me.count = 0)
    AND utp_them.count > 1;

  -- i_offer: slots where they're missing AND I have duplicates
  RETURN QUERY
  SELECT
    ts.id AS slot_id,
    ts.label AS sticker_code,
    ts.label AS player_name,
    COALESCE(tp.title, '')::text AS team_name,
    COALESCE(ts.slot_variant, 'common')::text AS rarity,
    utp_me.count AS count,
    'i_offer'::text AS direction
  FROM template_slots ts
  JOIN user_template_progress utp_me
    ON utp_me.slot_id = ts.id AND utp_me.copy_id = v_my_copy_id
  JOIN user_template_progress utp_them
    ON utp_them.slot_id = ts.id AND utp_them.copy_id = v_their_copy_id
  LEFT JOIN template_pages tp ON tp.id = ts.page_id
  WHERE ts.template_id = p_collection_id
    AND (utp_them.status = 'missing' OR utp_them.count = 0)
    AND utp_me.count > 1;
END;
$$;

COMMENT ON FUNCTION get_mutual_trade_detail IS 'Returns individual sticker overlap between two users for a collection.';

GRANT EXECUTE ON FUNCTION public.get_mutual_trade_detail(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mutual_trade_detail(uuid, uuid, integer) TO anon;

NOTIFY pgrst, 'reload schema';
