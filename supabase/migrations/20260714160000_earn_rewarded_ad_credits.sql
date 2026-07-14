-- Phase 2B: Secure client-side rewarded ad credit grant function
-- Called by the Android app after a user completes a rewarded ad.
-- Uses auth.uid() internally -- no user_id parameter to prevent abuse.

CREATE OR REPLACE FUNCTION public.earn_rewarded_ad_credits()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_new_balance INT;
  v_credits INT := 20;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Upsert balance
  INSERT INTO public.highlight_credit_balances(user_id, balance, updated_at)
  VALUES (v_user_id, v_credits, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance    = highlight_credit_balances.balance + v_credits,
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Audit trail
  INSERT INTO public.highlight_credit_transactions(
    user_id, amount, balance_after, credit_source, description
  ) VALUES (
    v_user_id, v_credits, v_new_balance, 'rewarded_ad',
    'Rewarded ad - 20 credits'
  );

  RETURN jsonb_build_object('balance', v_new_balance, 'granted', v_credits);
END;
$function$;
