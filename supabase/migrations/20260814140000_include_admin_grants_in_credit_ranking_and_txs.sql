-- Migration: Include admin grant credits in credit ranking and provide global transactions RPC
-- 1. Update admin_get_credit_ranking to include admin_credits and all sources in total_credits
DROP FUNCTION IF EXISTS public.admin_get_credit_ranking(INT);

CREATE OR REPLACE FUNCTION public.admin_get_credit_ranking(
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  nickname TEXT,
  email TEXT,
  purchase_credits BIGINT,
  reward_credits BIGINT,
  admin_credits BIGINT,
  total_credits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.nickname, 'Unknown')::TEXT as nickname,
    COALESCE(u.email, 'Unknown')::TEXT as email,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'ls_purchase' AND hct.amount > 0), 0)::BIGINT as purchase_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'rewarded_ad' AND hct.amount > 0), 0)::BIGINT as reward_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'admin_grant' AND hct.amount > 0), 0)::BIGINT as admin_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.amount > 0), 0)::BIGINT as total_credits
  FROM public.highlight_credit_transactions hct
  JOIN public.profiles p ON hct.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE hct.amount > 0
  GROUP BY p.id, p.nickname, u.email
  ORDER BY total_credits DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_credit_ranking(INT) TO authenticated;

-- 2. Create admin_get_global_credit_transactions for global transactions view
DROP FUNCTION IF EXISTS public.admin_get_global_credit_transactions(INT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_get_global_credit_transactions(
  p_limit INT DEFAULT 50,
  p_source TEXT DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  user_id UUID,
  nickname TEXT,
  email TEXT,
  amount INT,
  balance_after INT,
  credit_source TEXT,
  ls_order_id TEXT,
  listing_id BIGINT,
  listing_title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    hct.id,
    hct.user_id,
    COALESCE(p.nickname, 'Unknown')::TEXT AS nickname,
    COALESCE(u.email, 'Unknown')::TEXT AS email,
    hct.amount,
    hct.balance_after,
    hct.credit_source,
    hct.ls_order_id,
    hct.listing_id,
    tl.title AS listing_title,
    hct.description,
    hct.created_at
  FROM public.highlight_credit_transactions hct
  LEFT JOIN public.profiles p ON hct.user_id = p.id
  LEFT JOIN auth.users u ON hct.user_id = u.id
  LEFT JOIN public.trade_listings tl ON tl.id = hct.listing_id
  WHERE (p_source IS NULL OR p_source = 'all' OR hct.credit_source = p_source)
  ORDER BY hct.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_global_credit_transactions(INT, TEXT) TO authenticated;

-- 3. Ensure admin_get_user_transactions uses standard is_admin_user check
CREATE OR REPLACE FUNCTION public.admin_get_user_transactions(p_user_id uuid)
 RETURNS TABLE(
   id bigint,
   amount integer,
   balance_after integer,
   credit_source text,
   ls_order_id text,
   listing_id bigint,
   listing_title text,
   description text,
   created_at timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    hct.id,
    hct.amount,
    hct.balance_after,
    hct.credit_source,
    hct.ls_order_id,
    hct.listing_id,
    tl.title AS listing_title,
    hct.description,
    hct.created_at
  FROM public.highlight_credit_transactions hct
  LEFT JOIN public.trade_listings tl ON tl.id = hct.listing_id
  WHERE hct.user_id = p_user_id
  ORDER BY hct.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_transactions(UUID) TO authenticated;
