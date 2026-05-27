-- Fix: get_trade_proposal_detail was joining on the legacy `public.stickers` table
-- which no longer exists. Updated to join on `template_slots` + `template_pages`
-- to retrieve sticker metadata (label, slot_number, page title as team, is_special).

CREATE OR REPLACE FUNCTION "public"."get_trade_proposal_detail"("p_proposal_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_proposal_details JSONB;
  v_proposal_items JSONB;
BEGIN
  -- 1. Get the proposal header.
  SELECT
    jsonb_build_object(
      'id', tp.id,
      'collection_id', tp.collection_id,
      'from_user_id', tp.from_user,
      'from_user_nickname', p_from.nickname,
      'to_user_id', tp.to_user,
      'to_user_nickname', p_to.nickname,
      'status', tp.status,
      'message', tp.message,
      'created_at', tp.created_at,
      'updated_at', tp.updated_at
    )
  INTO v_proposal_details
  FROM public.trade_proposals tp
  JOIN public.profiles p_from ON tp.from_user = p_from.id
  JOIN public.profiles p_to ON tp.to_user = p_to.id
  WHERE tp.id = p_proposal_id;

  IF v_proposal_details IS NULL THEN
    RAISE EXCEPTION 'E404: Proposal not found or user does not have access.';
  END IF;

  -- 2. Get the proposal line items with sticker details.
  -- Joins template_slots instead of the legacy stickers table.
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', tpi.id,
        'sticker_id', tpi.sticker_id,
        'direction', tpi.direction,
        'quantity', tpi.quantity,
        'sticker_code', COALESCE(ts.global_number::TEXT, ts.slot_number::TEXT || COALESCE(ts.slot_variant, '')),
        'player_name', COALESCE(ts.label, 'Cromo #' || ts.slot_number),
        'team_name', COALESCE(tpg.title, 'Sin equipo'),
        'rarity', CASE WHEN ts.is_special THEN 'special' ELSE 'normal' END
      ) ORDER BY tpi.direction, COALESCE(ts.global_number, ts.slot_number)
    )
  INTO v_proposal_items
  FROM public.trade_proposal_items tpi
  LEFT JOIN public.template_slots ts ON tpi.sticker_id = ts.id
  LEFT JOIN public.template_pages tpg ON ts.page_id = tpg.id
  WHERE tpi.proposal_id = p_proposal_id;

  -- 3. Combine and return as a single JSON object.
  RETURN jsonb_build_object('proposal', v_proposal_details, 'items', COALESCE(v_proposal_items, '[]'::jsonb));
END;
$$;
