-- Fix: Resolve column ambiguity in admin_get_user_transactions function
-- Qualifying p.id in the profiles lookup because 'id' matches the 'id' column in the RETURNS TABLE definition.

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
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles p WHERE p.id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'not_admin'; END IF;

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
