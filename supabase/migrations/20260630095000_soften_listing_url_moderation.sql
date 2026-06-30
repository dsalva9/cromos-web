-- Migration: Soften listing URL auto-moderation regex to prevent false positives
-- Created: 2026-06-30
-- Description: Redefines public.auto_report_listing_url() to use a case-insensitive, TLD-restricted pattern.

CREATE OR REPLACE FUNCTION public.auto_report_listing_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_system_reporter_id UUID := 'a0e5335c-5fa9-48f9-a563-2923fdba8a3b';
  v_text_to_check TEXT;
  v_matched_url TEXT;
  -- Softened URL pattern: matches http(s)://, www. or common domain extensions (e.g. .com, .es, .pt)
  v_url_pattern TEXT := '(?i)(https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|es|pt|net|org|co|eu|online|store|shop|xyz|club|website|site|me|us|uk|biz|info|edu|gov|gob|app|dev|io|link|cat|ar|mx|cl|pe|ve|ec|uy|py|bo|sv|gt|hn|ni|cr|pa|do|pr)(/[^\s]*)?)';
BEGIN
  -- Combine title, description AND collection_name for URL check
  v_text_to_check := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.collection_name, '');

  v_matched_url := substring(v_text_to_check FROM v_url_pattern);

  IF v_matched_url IS NOT NULL THEN
    IF NEW.user_id = v_system_reporter_id THEN
      RETURN NEW;
    END IF;

    -- Insert directly into reports table. If already reported by system, update description and reset status to pending.
    INSERT INTO reports (reporter_id, target_type, target_id, reason, description, status)
    VALUES (
      v_system_reporter_id,
      'listing',
      NEW.id::TEXT,
      'spam',
      'Auto-detectado: URL encontrada en el anuncio: ' || v_matched_url,
      'pending'
    )
    ON CONFLICT (reporter_id, target_type, target_id)
    DO UPDATE SET
      description = EXCLUDED.description,
      status = 'pending',
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.auto_report_listing_url() IS 'Trigger function: auto-reports listings containing links or common domain patterns. Softened in June 2026 to ignore false positives like country codes (e.g., EE.UU), lists (e.g., 2.Ghana), or punctuation.';
