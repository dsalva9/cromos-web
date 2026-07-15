-- Migration: Allow admins to view all users' credit balances
-- By default, Row Level Security only allows users to see their own balance.

CREATE POLICY "Admins can select all credit balances"
  ON public.highlight_credit_balances FOR SELECT
  USING (public.is_admin_user());
