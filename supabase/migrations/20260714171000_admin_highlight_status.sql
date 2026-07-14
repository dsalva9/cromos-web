-- Phase 3: Update admin_get_all_highlights to return listing_status for active filtering
DROP FUNCTION IF EXISTS public.admin_get_all_highlights(text);

CREATE OR REPLACE FUNCTION public.admin_get_all_highlights(p_status text DEFAULT 'all'::text)
 RETURNS TABLE(
   highlight_id bigint,
   listing_id bigint,
   listing_title text,
   listing_status text,
   user_id uuid,
   nickname text,
   duration text,
   credit_source text,
   credits_spent integer,
   price_eur numeric,
   ls_order_id text,
   starts_at timestamp with time zone,
   expires_at timestamp with time zone,
   extra_views integer,
   is_active boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'not_admin'; END IF;

  RETURN QUERY
  SELECT
    lh.id AS highlight_id,
    lh.listing_id,
    tl.title AS listing_title,
    tl.status AS listing_status,
    lh.user_id,
    p.nickname,
    lh.duration,
    COALESCE(
      (SELECT hct.credit_source FROM public.highlight_credit_transactions hct
       WHERE hct.listing_id = lh.listing_id AND hct.user_id = lh.user_id AND hct.amount < 0
       ORDER BY hct.created_at DESC LIMIT 1),
      'ls_purchase'
    ) AS credit_source,
    lh.credits_spent,
    CASE lh.duration
      WHEN '48_hours' THEN 0.99::NUMERIC
      WHEN '7_days'   THEN 2.99::NUMERIC
      ELSE 0::NUMERIC
    END AS price_eur,
    lh.ls_order_id,
    lh.starts_at,
    lh.expires_at,
    GREATEST(0, COALESCE(tl.views_count, 0) - COALESCE(lh.views_at_start, 0)) AS extra_views,
    (lh.expires_at > now()) AS is_active
  FROM public.listing_highlights lh
  JOIN public.trade_listings tl ON tl.id = lh.listing_id
  JOIN public.profiles p ON p.id = lh.user_id
  WHERE
    CASE p_status
      WHEN 'active'  THEN lh.expires_at > now()
      WHEN 'expired' THEN lh.expires_at <= now()
      ELSE true
    END
  ORDER BY (lh.expires_at > now()) DESC, lh.starts_at DESC;
END;
$function$;
