-- Migration: Add postcode to profiles for location-based features
-- Date: 2025-10-23
-- Sprint: 10 - Social UI enhancements

BEGIN;

-- Add postcode column if it does not exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postcode TEXT;

-- Optional index to speed up postcode lookups
CREATE INDEX IF NOT EXISTS idx_profiles_postcode
  ON public.profiles (postcode)
  WHERE postcode IS NOT NULL;

COMMENT ON COLUMN public.profiles.postcode IS
  'Optional 5-digit postcode used for approximate location matching';

COMMIT;
