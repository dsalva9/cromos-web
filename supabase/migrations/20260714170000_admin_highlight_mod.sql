-- Phase 3: Admin Highlights & Credits Moderation Functions
-- Revoke public client execution of purchase_highlight_credits for security
REVOKE EXECUTE ON FUNCTION public.purchase_highlight_credits(uuid, integer, text, text) FROM public, anon, authenticated;

-- Create admin_expire_highlight function
CREATE OR REPLACE FUNCTION public.admin_expire_highlight(p_highlight_id bigint)
 RETURNS boolean
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

  UPDATE public.listing_highlights
  SET expires_at = now()
  WHERE id = p_highlight_id;

  RETURN true;
END;
$function$;

-- Create admin_adjust_user_credits function
CREATE OR REPLACE FUNCTION public.admin_adjust_user_credits(p_user_id uuid, p_amount integer, p_description text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_new_balance INT;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'not_admin'; END IF;

  INSERT INTO public.highlight_credit_balances(user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance    = GREATEST(0, highlight_credit_balances.balance + p_amount),
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.highlight_credit_transactions(
    user_id, amount, balance_after, credit_source, description
  ) VALUES (
    p_user_id, p_amount, v_new_balance, 'admin_grant', p_description
  );

  RETURN v_new_balance;
END;
$function$;

-- Create admin_get_user_transactions function
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
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
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
