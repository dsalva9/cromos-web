-- Migration: Automated Chat Moderation and Instant Admin Report Email Alerts
-- Created: 2026-06-11

-- =========================================================================
-- 0. Ensure unique index exists for ON CONFLICT upsert in moderation trigger
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_reporter_target
  ON public.reports (reporter_id, target_type, target_id);

-- =========================================================================
-- 1. Create Trigger Function for Automated Chat Moderation
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_moderate_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_url BOOLEAN := FALSE;
  v_has_slur BOOLEAN := FALSE;
  v_has_violence BOOLEAN := FALSE;
  v_has_sexual BOOLEAN := FALSE;
  v_reason TEXT := 'other';
  v_desc TEXT := '';
  v_system_reporter_id UUID := 'b644414f-73d8-4dc3-a36c-964a933e4eb8'; -- Admin reporter profile ID
BEGIN
  -- Avoid moderating system messages or empty messages
  IF NEW.is_system = TRUE OR NEW.message IS NULL OR TRIM(NEW.message) = '' THEN
    RETURN NEW;
  END IF;

  -- A. Check for URLs
  IF NEW.message ~* 'https?://|www\.|wa\.me|t\.me' THEN
    v_has_url := TRUE;
  END IF;

  -- B. Check for Insults, Hate Speech, Slurs
  IF NEW.message ~* '\m(maric(o|ó)n|sudaca|panchito|negrata|put[oa]s?|zorras?|gilipollas|cabr(o|ó)n(es)?|mierdas?|fachas?|nazis?|idiotas?|jod[eo]r?)\M' THEN
    v_has_slur := TRUE;
  END IF;

  -- C. Check for Violence / Threats
  IF NEW.message ~* '\m(matar|palizas?|asesin(o|ar|at)o|te voy a|pegar|golpe|agredir|amenaza)\M' THEN
    v_has_violence := TRUE;
  END IF;

  -- D. Check for Sexual content
  IF NEW.message ~* '\m(pollas?|coñ[os]|conios?|tetas?|follar|sexo|pene|vagina|chupar|correrse|mamadas?|org(i|í)as?|porno)\M' THEN
    v_has_sexual := TRUE;
  END IF;

  -- If any violation was triggered, create a report entry
  IF v_has_url OR v_has_slur OR v_has_violence OR v_has_sexual THEN
    
    -- Select the most appropriate reason
    IF v_has_url THEN
      v_reason := 'spam';
      v_desc := 'Automated Report: Enlace externo detectado.';
    ELSIF v_has_slur THEN
      v_reason := 'offensive_language';
      v_desc := 'Automated Report: Lenguaje ofensivo/insulto detectado.';
    ELSIF v_has_violence THEN
      v_reason := 'harassment';
      v_desc := 'Automated Report: Lenguaje violento/amenaza detectado.';
    ELSIF v_has_sexual THEN
      v_reason := 'inappropriate_content';
      v_desc := 'Automated Report: Contenido sexual inapropiado detectado.';
    END IF;

    v_desc := v_desc || ' Mensaje original: "' || NEW.message || '" (Mensaje ID: ' || NEW.id || ')';

    -- Insert directly into reports table (bypassing RPC check constraints and auth restrictions)
    -- Target is the user who sent the message. If already reported by system, append details and reset status to pending.
    INSERT INTO public.reports (
      reporter_id,
      target_type,
      target_id,
      reason,
      description
    ) VALUES (
      v_system_reporter_id,
      'user',
      NEW.sender_id::TEXT,
      v_reason,
      v_desc
    )
    ON CONFLICT (reporter_id, target_type, target_id)
    DO UPDATE SET
      reason = CASE 
        WHEN reports.reason = 'other' THEN EXCLUDED.reason 
        ELSE reports.reason 
      END,
      description = reports.description || E'\n' || EXCLUDED.description,
      status = 'pending',
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_moderate_chat_message() IS 'Triggers automatic content moderation checks for links, offensive language, threats, and sexual terms.';

-- Create the trigger on trade_chats
DROP TRIGGER IF EXISTS trigger_auto_moderate_chat ON public.trade_chats;
CREATE TRIGGER trigger_auto_moderate_chat
  AFTER INSERT ON public.trade_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_moderate_chat_message();

-- =========================================================================
-- 2. Create Trigger Function to Notify Admin via Edge Function on any Report
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-admin-report-email';
  v_service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o'; -- Anon or Service Role key for pg_net request
BEGIN
  -- Only trigger email notification on INSERT, or on UPDATE if description changed and status is reset to pending
  IF (TG_OP = 'INSERT') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND (OLD.status != 'pending' OR NEW.description != OLD.description)) THEN
    
    -- Invoke the send-admin-report-email Edge Function via pg_net
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'report_id', NEW.id,
        'target_type', NEW.target_type,
        'target_id', NEW.target_id,
        'reason', NEW.reason,
        'description', NEW.description,
        'created_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_admin_on_new_report() IS 'Invokes the send-admin-report-email Edge Function to alert administrators instantly of any new reports.';

-- Create the trigger on reports (supporting UPDATE for subsequent violations)
DROP TRIGGER IF EXISTS trigger_notify_admin_on_report ON public.reports;
CREATE TRIGGER trigger_notify_admin_on_report
  AFTER INSERT OR UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_new_report();
