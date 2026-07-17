-- =============================================================================
-- Migration: Reduce rewarded-ad credits from 20 to 10 per ad
-- Existing balances are honoured — only future grants are affected.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.earn_rewarded_ad_credits(
  p_user_id UUID DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_new_balance INT;
  v_credits INT := 10;
  v_daily_total INT;
BEGIN
  -- ── User resolution ──────────────────────────────────────────────
  IF p_user_id IS NOT NULL THEN
    -- Only the service_role may pass an explicit user id
    IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    v_user_id := p_user_id;
  ELSE
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'not_authenticated';
    END IF;
  END IF;

  -- ── SSV idempotency ──────────────────────────────────────────────
  IF p_transaction_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.highlight_credit_transactions
      WHERE ssv_transaction_id = p_transaction_id
    ) THEN
      RETURN jsonb_build_object(
        'balance',   (SELECT balance FROM public.highlight_credit_balances WHERE user_id = v_user_id),
        'granted',   0,
        'duplicate', true
      );
    END IF;
  END IF;

  -- ── Rate limit (60 s) ────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.highlight_credit_transactions
    WHERE user_id = v_user_id
      AND credit_source = 'rewarded_ad'
      AND created_at > now() - INTERVAL '60 seconds'
  ) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- ── Daily cap (300 credits) ──────────────────────────────────────
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_total
  FROM public.highlight_credit_transactions
  WHERE user_id = v_user_id
    AND credit_source = 'rewarded_ad'
    AND created_at >= date_trunc('day', now());

  IF v_daily_total >= 300 THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;

  -- ── Upsert balance ──────────────────────────────────────────────
  INSERT INTO public.highlight_credit_balances(user_id, balance, updated_at)
  VALUES (v_user_id, v_credits, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance    = highlight_credit_balances.balance + v_credits,
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- ── Audit trail ─────────────────────────────────────────────────
  INSERT INTO public.highlight_credit_transactions(
    user_id, amount, balance_after, credit_source, ssv_transaction_id, description
  ) VALUES (
    v_user_id, v_credits, v_new_balance, 'rewarded_ad',
    p_transaction_id,
    'Rewarded ad - 10 credits'
  );

  RETURN jsonb_build_object('balance', v_new_balance, 'granted', v_credits);
END;
$function$;
