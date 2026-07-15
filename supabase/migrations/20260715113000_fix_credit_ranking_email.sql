-- Fix: profiles table has no email column; email lives in auth.users.
-- Join auth.users to retrieve it.
CREATE OR REPLACE FUNCTION public.admin_get_credit_ranking(
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  nickname TEXT,
  email TEXT,
  purchase_credits BIGINT,
  reward_credits BIGINT,
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
    COALESCE(p.nickname, 'Unknown') as nickname,
    COALESCE(u.email, 'Unknown') as email,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'ls_purchase' AND hct.amount > 0), 0)::BIGINT as purchase_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source = 'rewarded_ad' AND hct.amount > 0), 0)::BIGINT as reward_credits,
    COALESCE(SUM(hct.amount) FILTER (WHERE hct.credit_source IN ('ls_purchase', 'rewarded_ad') AND hct.amount > 0), 0)::BIGINT as total_credits
  FROM public.highlight_credit_transactions hct
  JOIN public.profiles p ON hct.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE hct.amount > 0 AND hct.credit_source IN ('ls_purchase', 'rewarded_ad')
  GROUP BY p.id, p.nickname, u.email
  ORDER BY total_credits DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_credit_ranking(INT) TO authenticated;
