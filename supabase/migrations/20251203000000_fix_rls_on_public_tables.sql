-- Enable RLS on postal_codes table
-- This table contains reference data (postal codes with lat/lon) and should be publicly readable
ALTER TABLE public.postal_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to postal codes
CREATE POLICY "Postal codes are publicly readable"
  ON public.postal_codes
  FOR SELECT
  TO public
  USING (true);

-- Enable RLS on xp_history table
-- This table tracks XP awards and should only be readable by the user who earned the XP
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own XP history
CREATE POLICY "Users can view their own XP history"
  ON public.xp_history
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Admin users can view all XP history
CREATE POLICY "Admins can view all XP history"
  ON public.xp_history
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE public.postal_codes IS 'Reference data for postal codes with lat/lon coordinates. Public read-only access.';
COMMENT ON TABLE public.xp_history IS 'Tracks XP awards for users. Users can only view their own history.';
