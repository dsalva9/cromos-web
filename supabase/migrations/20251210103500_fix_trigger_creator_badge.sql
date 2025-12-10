-- =====================================================
-- FIX: trigger_creator_badge assignment error
-- =====================================================
-- Purpose: Fix "invalid input syntax for type integer: """ error caused by 
-- attempting to assign a VOID return from increment_badge_progress to an INTEGER variable.
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_creator_badge()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    -- Increment progress (column is author_id, not creator_id)
    -- Changed from assignment (v_new_count := ...) to PERFORM because the function returns void
    PERFORM increment_badge_progress(NEW.author_id, 'creator');

    -- Check and award badge
    PERFORM check_and_award_badge(NEW.author_id, 'creator');

    RETURN NEW;
END;
$function$;
