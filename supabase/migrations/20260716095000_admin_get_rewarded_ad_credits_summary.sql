-- Migration: Create public.admin_get_rewarded_ad_credits_summary
-- Retrieves stats on which users gained credits via rewarded ads in a given lookback period.

CREATE OR REPLACE FUNCTION public.admin_get_rewarded_ad_credits_summary(
  p_days INT
)
RETURNS TABLE(
  user_id UUID,
  nickname TEXT,
  email TEXT,
  amount INT,
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
    p.id as user_id,
    COALESCE(p.nickname, 'Unknown')::TEXT as nickname,
    COALESCE(u.email, 'Unknown')::TEXT as email,
    hct.amount,
    hct.created_at
  FROM public.highlight_credit_transactions hct
  JOIN public.profiles p ON hct.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE hct.amount > 0 
    AND hct.credit_source = 'rewarded_ad'
    AND hct.created_at >= now() - (p_days * INTERVAL '1 day')
  ORDER BY hct.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_rewarded_ad_credits_summary(INT) TO authenticated;
