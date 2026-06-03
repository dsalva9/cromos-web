-- Migration: Fix validate_profile_postcode to support country-aware postcode validation.
-- Before this migration, the trigger only validated postcodes against Spain ('ES').

CREATE OR REPLACE FUNCTION "public"."validate_profile_postcode"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If postcode is provided, validate it exists in postal_codes table for the given country
  IF NEW.postcode IS NOT NULL AND TRIM(NEW.postcode) <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM postal_codes
      WHERE postcode = NEW.postcode
      AND country = COALESCE(NEW.country_code, 'ES')
    ) THEN
      RAISE EXCEPTION 'Invalid postcode: % not found in database for country %', NEW.postcode, COALESCE(NEW.country_code, 'ES');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
