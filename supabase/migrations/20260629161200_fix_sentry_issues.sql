-- Migration: Fix auto_report_listing_url unique constraint duplicate key violation on update
-- When a user edits/updates a listing containing a URL multiple times or when it has already been reported by the system,
-- the insert into reports table fails with a unique constraint error (unique_user_target_report).
-- This fix uses ON CONFLICT to update the description and reset status to pending instead of failing the transaction.

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
  v_url_pattern TEXT := '(https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(/[^\s]*)?)';
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
