-- Migration: Include extra-listing rewarded ad views in admin_get_rewarded_ad_credits_summary
-- Combines highlight credit ad views, completed 10-ad listing unlocks, and partial listing unlock ad views.

DROP FUNCTION IF EXISTS public.admin_get_rewarded_ad_credits_summary(INT);

CREATE OR REPLACE FUNCTION public.admin_get_rewarded_ad_credits_summary(
  p_days INT
)
RETURNS TABLE(
  user_id UUID,
  nickname TEXT,
  email TEXT,
  amount INT,
  ads_watched INT,
  reward_type TEXT,
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
  -- 1. Rewarded ads watched for highlight credits (1 ad per transaction)
  SELECT 
    p.id AS user_id,
    COALESCE(p.nickname, 'Unknown')::TEXT AS nickname,
    COALESCE(u.email, 'Unknown')::TEXT AS email,
    hct.amount::INT AS amount,
    1::INT AS ads_watched,
    'highlight_credits'::TEXT AS reward_type,
    hct.created_at
  FROM public.highlight_credit_transactions hct
  JOIN public.profiles p ON hct.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE hct.amount > 0 
    AND hct.credit_source = 'rewarded_ad'
    AND hct.created_at >= now() - (p_days * INTERVAL '1 day')

  UNION ALL

  -- 2. Completed 10-ad batches to unlock extra daily listings (10 ads per unlock)
  SELECT 
    p.id AS user_id,
    COALESCE(p.nickname, 'Unknown')::TEXT AS nickname,
    COALESCE(u.email, 'Unknown')::TEXT AS email,
    lut.amount::INT AS amount,
    (lut.amount * 10)::INT AS ads_watched,
    'listing_unlock'::TEXT AS reward_type,
    lut.created_at
  FROM public.listing_unlock_transactions lut
  JOIN public.profiles p ON lut.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE lut.unlock_source = 'rewarded_ads'
    AND lut.created_at >= now() - (p_days * INTERVAL '1 day')

  UNION ALL

  -- 3. In-progress ad views toward an extra listing unlock (< 10 ads watched)
  SELECT 
    p.id AS user_id,
    COALESCE(p.nickname, 'Unknown')::TEXT AS nickname,
    COALESCE(u.email, 'Unknown')::TEXT AS email,
    0::INT AS amount,
    lap.ads_watched::INT AS ads_watched,
    'listing_unlock_progress'::TEXT AS reward_type,
    lap.created_at
  FROM public.listing_ad_unlock_progress lap
  JOIN public.profiles p ON lap.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE lap.ads_watched > 0
    AND lap.created_at >= now() - (p_days * INTERVAL '1 day')

  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_rewarded_ad_credits_summary(INT) TO authenticated;
