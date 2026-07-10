-- ============================================================
-- Login tracking infrastructure
-- Creates user_login_history table + record_user_login RPC
-- ============================================================

-- 1. Create user_login_history table
CREATE TABLE IF NOT EXISTS public.user_login_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  login_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Unique: one record per user per day (idempotent inserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_login_history_user_date
  ON public.user_login_history(user_id, login_date);

-- Query index for retention cohort analysis
CREATE INDEX IF NOT EXISTS idx_login_history_date
  ON public.user_login_history(login_date);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id
  ON public.user_login_history(user_id);

-- Enable RLS
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own login history
CREATE POLICY "Users can read own login history"
  ON public.user_login_history FOR SELECT
  USING (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE — only via RPC

-- 2. record_user_login RPC (called client-side on every sign-in, idempotent)
CREATE OR REPLACE FUNCTION public.record_user_login()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Guard: must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Update login streak on profiles (fixes previously inert dead code)
  PERFORM public.update_login_streak(auth.uid());

  -- Insert a login record for today (idempotent — conflicts ignored)
  INSERT INTO public.user_login_history (user_id, logged_in_at, login_date)
  VALUES (auth.uid(), NOW(), CURRENT_DATE)
  ON CONFLICT (user_id, login_date) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_login() TO authenticated;

COMMENT ON FUNCTION public.record_user_login() IS
  'Records a user login event for today (idempotent). Also fixes login streak tracking.';

COMMENT ON TABLE public.user_login_history IS
  'One row per user per day they logged in. Used for cohort retention analysis.';
