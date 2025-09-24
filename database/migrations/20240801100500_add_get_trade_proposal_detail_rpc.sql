-- RPC function to get the full detail of a single trade proposal

CREATE OR REPLACE FUNCTION public.get_trade_proposal_detail(
  p_proposal_id BIGINT
)
RETURNS JSONB
AS $$
DECLARE
  v_proposal_details JSONB;
  v_proposal_items JSONB;
BEGIN
  -- 1. Get the proposal header.
  -- RLS policy ensures the user can only select their own proposals.
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
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', tpi.id,
        'sticker_id', tpi.sticker_id,
        'direction', tpi.direction,
        'quantity', tpi.quantity,
        'sticker_code', s.code,
        'player_name', s.player_name,
        'team_name', COALESCE(ct.team_name, 'Sin equipo'),
        'rarity', s.rarity
      ) ORDER BY tpi.direction, s.code
    )
  INTO v_proposal_items
  FROM public.trade_proposal_items tpi
  JOIN public.stickers s ON tpi.sticker_id = s.id
  LEFT JOIN public.collection_teams ct ON s.team_id = ct.id
  WHERE tpi.proposal_id = p_proposal_id;

  -- 3. Combine and return as a single JSON object.
  RETURN jsonb_build_object('proposal', v_proposal_details, 'items', COALESCE(v_proposal_items, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trade_proposal_detail(BIGINT) TO authenticated;
