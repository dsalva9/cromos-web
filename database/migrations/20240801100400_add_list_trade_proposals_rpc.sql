-- RPC function to list trade proposals for a user's inbox or outbox

CREATE OR REPLACE FUNCTION public.list_trade_proposals(
  p_user_id UUID,
  p_box TEXT, -- 'inbox' or 'outbox'
  p_limit INTEGER,
  p_offset INTEGER
)
RETURNS TABLE (
  id BIGINT,
  collection_id INTEGER,
  from_user_id UUID,
  from_user_nickname TEXT,
  to_user_id UUID,
  to_user_nickname TEXT,
  status TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  offer_item_count BIGINT,
  request_item_count BIGINT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.id,
    tp.collection_id,
    tp.from_user AS from_user_id,
    p_from.nickname AS from_user_nickname,
    tp.to_user AS to_user_id,
    p_to.nickname AS to_user_nickname,
    tp.status,
    tp.message,
    tp.created_at,
    tp.updated_at,
    (SELECT count(*) FROM public.trade_proposal_items WHERE proposal_id = tp.id AND direction = 'offer') AS offer_item_count,
    (SELECT count(*) FROM public.trade_proposal_items WHERE proposal_id = tp.id AND direction = 'request') AS request_item_count
  FROM public.trade_proposals AS tp
  JOIN public.profiles AS p_from ON tp.from_user = p_from.id
  JOIN public.profiles AS p_to ON tp.to_user = p_to.id
  WHERE (p_box = 'inbox' AND tp.to_user = p_user_id) OR (p_box = 'outbox' AND tp.from_user = p_user_id)
  ORDER BY tp.created_at DESC, tp.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.list_trade_proposals(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
