-- Fix auto-moderation false positives by removing generic phrases like "te voy a", "pegar", and "golpe" from the violence filter.
-- "pegar" is a false positive because it translates to "stick/glue" in Spanish, which is the core action of sticker albums.
-- "te voy a" is a common Spanish phrase prefix (e.g. "te voy a mandar", "te voy a pasar").
-- "golpe" is too generic (e.g. "de golpe").
-- Also fixed a regex bug in matching "asesinar" (originally "asesin(o|ar|at)o").

CREATE OR REPLACE FUNCTION public.auto_moderate_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- A. Check for Insults, Hate Speech, Slurs
  IF NEW.message ~* '\m(maric(o|ó)n|sudaca|panchito|negrata|put[oa]s?|zorras?|gilipollas|cabr(o|ó)n(es)?|mierdas?|fachas?|nazis?|idiotas?|jod[eo]r?)\M' THEN
    v_has_slur := TRUE;
  END IF;

  -- B. Check for Violence / Threats (removed pegar, golpe, te voy a, and fixed asesinato/asesino/asesinar match)
  IF NEW.message ~* '\m(matar|palizas?|asesin(o|ar|ato)|agredir|amenaza)\M' THEN
    v_has_violence := TRUE;
  END IF;

  -- C. Check for Sexual content
  IF NEW.message ~* '\m(pollas?|coñ[os]|conios?|tetas?|follar|sexo|pene|vagina|chupar|correrse|mamadas?|org(i|í)as?|porno)\M' THEN
    v_has_sexual := TRUE;
  END IF;

  -- If any violation was triggered, create a report entry
  IF v_has_slur OR v_has_violence OR v_has_sexual THEN
    
    -- Select the most appropriate reason
    IF v_has_slur THEN
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

COMMENT ON FUNCTION public.auto_moderate_chat_message() IS 'Trigger function to auto-report messages matching offensive, violent, or sexual content filters. Excludes common false positives.';
