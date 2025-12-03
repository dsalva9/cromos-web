-- =====================================================
-- Fix get_notifications RPC to include joined data
-- =====================================================

-- Drop the existing function first to allow changing return type
DROP FUNCTION IF EXISTS public.get_notifications();

CREATE OR REPLACE FUNCTION public.get_notifications()
RETURNS TABLE(
  id bigint,
  user_id uuid,
  kind text,
  trade_id bigint,
  listing_id bigint,
  template_id bigint,
  rating_id bigint,
  actor_id uuid,
  created_at timestamp with time zone,
  read_at timestamp with time zone,
  payload jsonb,
  actor_nickname text,
  actor_avatar_url text,
  proposal_from_user uuid,
  proposal_to_user uuid,
  proposal_status text,
  from_user_nickname text,
  to_user_nickname text,
  listing_title text,
  listing_status text,
  template_name text,
  template_status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.kind,
    n.trade_id,
    n.listing_id,
    n.template_id,
    n.rating_id,
    n.actor_id,
    n.created_at,
    n.read_at,
    n.payload,
    -- Actor info
    actor.nickname AS actor_nickname,
    actor.avatar_url AS actor_avatar_url,
    -- Trade proposal info
    tp.from_user AS proposal_from_user,
    tp.to_user AS proposal_to_user,
    tp.status AS proposal_status,
    from_user.nickname AS from_user_nickname,
    to_user.nickname AS to_user_nickname,
    -- Listing info
    tl.title AS listing_title,
    tl.status AS listing_status,
    -- Template info
    ct.title AS template_name,
    ct.status AS template_status
  FROM notifications n
  LEFT JOIN profiles actor ON n.actor_id = actor.id
  LEFT JOIN trade_proposals tp ON n.trade_id = tp.id
  LEFT JOIN profiles from_user ON tp.from_user = from_user.id
  LEFT JOIN profiles to_user ON tp.to_user = to_user.id
  LEFT JOIN trade_listings tl ON n.listing_id = tl.id
  LEFT JOIN collection_templates ct ON n.template_id = ct.id
  WHERE n.user_id = auth.uid()
  ORDER BY n.created_at DESC;
END;
$$;
