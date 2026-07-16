-- Fix admin_adjust_user_credits to avoid check constraint violation when amount is negative
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
  VALUES (p_user_id, GREATEST(0, p_amount), now())
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
