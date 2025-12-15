-- =====================================================
-- Fix check_self_report trigger to handle TEXT target_id
-- =====================================================
-- Issue: The trigger was comparing BIGINT columns with TEXT target_id
-- without casting, causing "operator does not exist: bigint = text" error
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_self_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Prevent users from reporting themselves
  IF NEW.reporter_id = (
    CASE
      WHEN NEW.target_type = 'user' THEN NEW.target_id::uuid
      WHEN NEW.target_type = 'listing' THEN (SELECT user_id FROM trade_listings WHERE id = NEW.target_id::bigint)
      WHEN NEW.target_type = 'template' THEN (SELECT author_id FROM collection_templates WHERE id = NEW.target_id::bigint)
      WHEN NEW.target_type = 'rating' THEN (SELECT rated_id FROM user_ratings WHERE id = NEW.target_id::bigint)
      ELSE NULL
    END
  ) THEN
    RAISE EXCEPTION 'You cannot report your own content';
  END IF;

  RETURN NEW;
END;
$function$;
