-- Migration: Soften Moderation Regex + Report System Enhancements
-- Created: 2026-06-18
-- Changes:
--   A. Soften auto_moderate_chat_message regex (remove false positives)
--   B. Add resolved_at column to reports
--   C. Create list_all_reports RPC
--   D. Create get_chat_between_users RPC
--   E. Create get_user_report_summary RPC
--   F. Update resolve_report to set resolved_at
--   G. Update notify_admin_on_new_report to pass reporter_id

-- =========================================================================
-- A. Soften auto_moderate_chat_message() regex
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

  -- B. Check for Insults, Hate Speech, Slurs (softened: removed mierdas?, idiotas?, jod[eo]r?)
  IF NEW.message ~* '\m(maric(o|ó)n|sudaca|panchito|negrata|put[oa]s?|zorras?|gilipollas|cabr(o|ó)n(es)?|fachas?|nazis?)\M' THEN
    v_has_slur := TRUE;
  END IF;

  -- C. Check for Violence / Threats (softened: removed pegar, golpe; made "te voy a" more specific)
  IF NEW.message ~* '\m(matar|palizas?|asesin(o|ar|at)o|te voy a dar|te voy a hacer|agredir|amenaza)\M' THEN
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

COMMENT ON FUNCTION public.auto_moderate_chat_message() IS 'Triggers automatic content moderation checks for links, offensive language, threats, and sexual terms. Softened in June 2026 to reduce false positives.';

-- =========================================================================
-- B. Add resolved_at column to reports
-- =========================================================================
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- =========================================================================
-- C. Create list_all_reports RPC (admin-only)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.list_all_reports(
  p_status TEXT DEFAULT 'all',
  p_target_user_id UUID DEFAULT NULL,
  p_reporter_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  report_id bigint,
  reporter_id uuid,
  reporter_nickname text,
  entity_type text,
  entity_id text,
  entity_title text,
  reason text,
  description text,
  status text,
  admin_notes text,
  admin_nickname text,
  created_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
BEGIN
  SELECT profiles.is_admin INTO v_user_is_admin
  FROM profiles
  WHERE profiles.id = auth.uid();

  IF NOT v_user_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    r.id AS report_id,
    r.reporter_id,
    p.nickname AS reporter_nickname,
    r.target_type AS entity_type,
    r.target_id AS entity_id,
    CASE
      WHEN r.target_type = 'listing' THEN (
        SELECT tl.title FROM trade_listings tl WHERE tl.id = r.target_id::bigint
      )
      WHEN r.target_type = 'template' THEN (
        SELECT ct.title FROM collection_templates ct WHERE ct.id = r.target_id::bigint
      )
      WHEN r.target_type = 'user' THEN (
        SELECT prof.nickname FROM profiles prof WHERE prof.id = r.target_id::uuid
      )
      ELSE 'Unknown'
    END AS entity_title,
    r.reason,
    r.description,
    r.status,
    r.admin_notes,
    adm.nickname AS admin_nickname,
    r.created_at,
    r.resolved_at
  FROM reports r
  LEFT JOIN profiles p ON r.reporter_id = p.id
  LEFT JOIN profiles adm ON r.admin_id = adm.id
  WHERE
    (p_status = 'all' OR r.status = p_status)
    AND (p_target_user_id IS NULL OR (r.target_type = 'user' AND r.target_id = p_target_user_id::TEXT))
    AND (p_reporter_user_id IS NULL OR r.reporter_id = p_reporter_user_id)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.list_all_reports(TEXT, UUID, UUID, INTEGER, INTEGER) IS 'Admin-only: Lists all reports with filtering by status, target user, and reporter.';

-- =========================================================================
-- D. Create get_chat_between_users RPC (admin-only)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_chat_between_users(
  p_user_a UUID,
  p_user_b UUID
)
RETURNS TABLE(
  id bigint,
  sender_id uuid,
  sender_nickname text,
  message text,
  image_url text,
  is_system boolean,
  created_at timestamptz,
  chat_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
BEGIN
  SELECT profiles.is_admin INTO v_user_is_admin
  FROM profiles
  WHERE profiles.id = auth.uid();

  IF NOT v_user_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    tc.id,
    tc.sender_id,
    COALESCE(p.nickname, 'Unknown') AS sender_nickname,
    tc.message,
    tc.image_url,
    tc.is_system,
    tc.created_at,
    CASE
      WHEN tc.listing_id IS NOT NULL THEN 'listing'::text
      WHEN tc.match_conversation_id IS NOT NULL THEN 'match'::text
      ELSE 'unknown'::text
    END AS chat_type
  FROM trade_chats tc
  LEFT JOIN profiles p ON tc.sender_id = p.id
  WHERE
    -- Listing chats (direct messages between users on a listing)
    (
      (tc.sender_id = p_user_a AND tc.receiver_id = p_user_b)
      OR (tc.sender_id = p_user_b AND tc.receiver_id = p_user_a)
    )
    OR
    -- Match conversation chats
    (
      tc.match_conversation_id IN (
        SELECT mc.id FROM match_conversations mc
        WHERE (mc.user_a_id = p_user_a AND mc.user_b_id = p_user_b)
           OR (mc.user_a_id = p_user_b AND mc.user_b_id = p_user_a)
      )
    )
  ORDER BY tc.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_chat_between_users(UUID, UUID) IS 'Admin-only: Returns all chat messages between two users across listing and match conversations.';

-- =========================================================================
-- E. Create get_user_report_summary RPC (admin-only)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_user_report_summary(
  p_user_id UUID
)
RETURNS TABLE(
  total_reports bigint,
  pending_reports bigint,
  resolved_reports bigint,
  dismissed_reports bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
BEGIN
  SELECT profiles.is_admin INTO v_user_is_admin
  FROM profiles
  WHERE profiles.id = auth.uid();

  IF NOT v_user_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_reports,
    COUNT(*) FILTER (WHERE r.status = 'pending')::bigint AS pending_reports,
    COUNT(*) FILTER (WHERE r.status = 'resolved')::bigint AS resolved_reports,
    COUNT(*) FILTER (WHERE r.status = 'dismissed')::bigint AS dismissed_reports
  FROM reports r
  WHERE r.target_type = 'user' AND r.target_id = p_user_id::TEXT;
END;
$$;

COMMENT ON FUNCTION public.get_user_report_summary(UUID) IS 'Admin-only: Returns report count summary for a specific user.';

-- =========================================================================
-- H. Update get_report_details_with_context to include completed_transactions
-- =========================================================================
CREATE OR REPLACE FUNCTION "public"."get_report_details_with_context"("p_report_id" bigint) RETURNS TABLE("report" "jsonb", "reported_content" "jsonb", "reported_user_history" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_rowcount INTEGER;
BEGIN
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    WITH report_row AS (
        SELECT
            r.*,
            r.target_id::TEXT AS target_id_text
        FROM reports r
        WHERE r.id = p_report_id
    )
    SELECT
        jsonb_build_object(
            'id', rr.id,
            'entity_type', rr.target_type,
            'entity_id', rr.target_id_text,
            'reason', rr.reason,
            'description', rr.description,
            'reporter_nickname', rp.nickname,
            'created_at', rr.created_at
        ) AS report,
        CASE
            WHEN rr.target_type = 'listing' THEN (
                SELECT jsonb_build_object(
                    'id', tl.id,
                    'title', tl.title,
                    'description', tl.description,
                    'status', tl.status,
                    'user_nickname', p.nickname,
                    'user_id', tl.user_id
                )
                FROM trade_listings tl
                JOIN profiles p ON tl.user_id = p.id
                WHERE rr.target_id_text IS NOT NULL
                  AND tl.id::TEXT = rr.target_id_text
            )
            WHEN rr.target_type = 'template' THEN (
                SELECT jsonb_build_object(
                    'id', ct.id,
                    'title', ct.title,
                    'description', ct.description,
                    'is_public', ct.is_public,
                    'rating_avg', ct.rating_avg,
                    'author_nickname', p.nickname,
                    'author_id', ct.author_id
                )
                FROM collection_templates ct
                JOIN profiles p ON ct.author_id = p.id
                WHERE rr.target_id_text IS NOT NULL
                  AND ct.id::TEXT = rr.target_id_text
            )
            WHEN rr.target_type = 'user' THEN (
                SELECT jsonb_build_object(
                    'id', u.id,
                    'nickname', u.nickname,
                    'email', au.email,
                    'is_suspended', u.is_suspended,
                    'rating_avg', u.rating_avg
                )
                FROM profiles u
                LEFT JOIN auth.users au ON au.id = u.id
                WHERE rr.target_id_text IS NOT NULL
                  AND u.id::TEXT = rr.target_id_text
            )
            ELSE NULL::jsonb
        END AS reported_content,
        CASE
            WHEN rr.target_type = 'user' THEN (
                SELECT jsonb_build_object(
                    'total_reports_received', (
                        SELECT COUNT(*)
                        FROM reports r2
                        WHERE r2.target_type = 'user'
                          AND r2.target_id::TEXT = rr.target_id_text
                    ),
                    'total_listings', (
                        SELECT COUNT(*)
                        FROM trade_listings tl2
                        WHERE rr.target_id_text IS NOT NULL
                          AND tl2.user_id::TEXT = rr.target_id_text
                    ),
                    'completed_transactions', (
                        SELECT completed_trades
                        FROM profiles
                        WHERE id = rr.target_id_text::uuid
                    ),
                    'total_templates_created', (
                        SELECT COUNT(*)
                        FROM collection_templates ct2
                        WHERE rr.target_id_text IS NOT NULL
                          AND ct2.author_id::TEXT = rr.target_id_text
                    ),
                    'rating_avg', (
                        SELECT AVG(ur.rating)
                        FROM user_ratings ur
                        WHERE rr.target_id_text IS NOT NULL
                          AND ur.rated_id::TEXT = rr.target_id_text
                    )
                )
            )
            ELSE NULL::jsonb
        END AS reported_user_history
    FROM report_row rr
    LEFT JOIN profiles rp ON rr.reporter_id = rp.id;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;

    IF v_rowcount = 0 THEN
        RAISE EXCEPTION 'Report not found';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_report_details_with_context(bigint) IS 'Gets detailed report information with context about the reported content. Now includes completed_transactions count.';

-- =========================================================================
-- F. Update resolve_report to set resolved_at
-- =========================================================================
CREATE OR REPLACE FUNCTION "public"."resolve_report"("p_report_id" bigint, "p_action" "text", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $_$
DECLARE
    v_is_admin BOOLEAN;
    v_report RECORD;
    v_new_status TEXT;
    v_old_report JSONB;
    v_new_report JSONB;
    v_old_entity JSONB;
    v_new_entity JSONB;
    v_removed_listings INTEGER := 0;
    v_target_uuid UUID;
    v_target_bigint BIGINT;
    v_user_to_suspend UUID;
    v_actor_id UUID;
    v_actor_role TEXT;
    v_actor_sub TEXT;
    v_actor_claims TEXT;
BEGIN
    v_actor_role := current_setting('request.jwt.claim.role', true);
    v_actor_sub := current_setting('request.jwt.claim.sub', true);
    v_actor_claims := current_setting('request.jwt.claims', true);

    IF v_actor_sub IS NOT NULL THEN
        BEGIN
            IF v_actor_sub ~* '^[0-9a-f-]{36}$' THEN
                v_actor_id := v_actor_sub::uuid;
            ELSE
                v_actor_id := NULL;
            END IF;
        EXCEPTION WHEN invalid_text_representation THEN
            v_actor_id := NULL;
        END;
    END IF;

    IF v_actor_id IS NULL AND v_actor_claims IS NOT NULL THEN
        BEGIN
            v_actor_id := (v_actor_claims::jsonb ->> 'sub')::uuid;
        EXCEPTION WHEN others THEN
            v_actor_id := NULL;
        END;
    END IF;

    IF v_actor_role IS NULL AND v_actor_claims IS NOT NULL THEN
        v_actor_role := (v_actor_claims::jsonb ->> 'role');
    END IF;

    IF v_actor_role IS DISTINCT FROM 'service_role' THEN
        IF v_actor_id IS NULL THEN
            SELECT auth.uid() INTO v_actor_id;
        END IF;

        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required (role %, sub %)', v_actor_role, v_actor_sub;
        END IF;

        SELECT is_admin INTO v_is_admin
        FROM profiles
        WHERE id = v_actor_id;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Access denied. Admin role required.';
        END IF;
    ELSE
        v_is_admin := TRUE;
    END IF;

    IF p_action NOT IN ('dismiss', 'remove_content', 'suspend_user') THEN
        RAISE EXCEPTION 'Invalid action. Must be one of: dismiss, remove_content, suspend_user';
    END IF;

    SELECT r.*
    INTO v_report
    FROM reports r
    WHERE r.id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;

    IF v_report.status NOT IN ('pending', 'reviewing') THEN
        RAISE EXCEPTION 'Report already resolved or dismissed';
    END IF;

    v_old_report := jsonb_build_object(
        'status', v_report.status,
        'admin_notes', v_report.admin_notes,
        'action', p_action
    );

    v_new_status := CASE WHEN p_action = 'dismiss' THEN 'dismissed' ELSE 'resolved' END;

    IF p_action = 'remove_content' THEN
        IF v_report.target_type = 'listing' THEN
            v_target_bigint := v_report.target_id::BIGINT;

            SELECT jsonb_build_object(
                'status', status,
                'deleted_at', deleted_at,
                'title', title,
                'user_id', user_id
            )
            INTO v_old_entity
            FROM trade_listings
            WHERE id = v_target_bigint;

            IF v_old_entity IS NULL THEN
                RAISE EXCEPTION 'Listing not found for report %', p_report_id;
            END IF;

            UPDATE trade_listings
            SET deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_target_bigint;

            v_new_entity := jsonb_build_object('deleted_at', NOW());

            INSERT INTO retention_schedule (
                entity_type, entity_id, action, scheduled_for, reason,
                initiated_by, initiated_by_type
            ) VALUES (
                'listing', v_target_bigint::TEXT, 'delete',
                NOW() + INTERVAL '90 days',
                COALESCE(p_admin_notes, 'Content removed via moderation'),
                v_actor_id, 'admin'
            ) ON CONFLICT DO NOTHING;

            PERFORM log_moderation_action(
                'remove_content',
                'listing',
                v_target_bigint,
                p_admin_notes,
                v_old_entity,
                v_new_entity
            );
        ELSIF v_report.target_type = 'template' THEN
            v_target_bigint := v_report.target_id::BIGINT;

            SELECT jsonb_build_object(
                'is_public', is_public,
                'deleted_at', deleted_at,
                'title', title,
                'author_id', author_id
            )
            INTO v_old_entity
            FROM collection_templates
            WHERE id = v_target_bigint;

            IF v_old_entity IS NULL THEN
                RAISE EXCEPTION 'Template not found for report %', p_report_id;
            END IF;

            UPDATE collection_templates
            SET is_public = FALSE,
                deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_target_bigint;

            v_new_entity := jsonb_build_object('is_public', FALSE, 'deleted_at', NOW());

            INSERT INTO retention_schedule (
                entity_type, entity_id, action, scheduled_for, reason,
                initiated_by, initiated_by_type
            ) VALUES (
                'template', v_target_bigint::TEXT, 'delete',
                NOW() + INTERVAL '90 days',
                COALESCE(p_admin_notes, 'Content removed via moderation'),
                v_actor_id, 'admin'
            ) ON CONFLICT DO NOTHING;

            PERFORM log_moderation_action(
                'remove_content',
                'template',
                v_target_bigint,
                p_admin_notes,
                v_old_entity,
                v_new_entity
            );
        ELSE
            RAISE EXCEPTION 'remove_content action not supported for target type %', v_report.target_type;
        END IF;
    ELSIF p_action = 'suspend_user' THEN
        IF v_report.target_type = 'user' THEN
            BEGIN
                v_user_to_suspend := v_report.target_id::uuid;
            EXCEPTION WHEN invalid_text_representation THEN
                RAISE EXCEPTION 'Report target_id % is not a valid UUID', v_report.target_id;
            END;
        ELSIF v_report.target_type = 'listing' THEN
            v_target_bigint := v_report.target_id::BIGINT;
            SELECT user_id INTO v_user_to_suspend
            FROM trade_listings
            WHERE id = v_target_bigint;

            IF v_user_to_suspend IS NULL THEN
                RAISE EXCEPTION 'Listing not found or user not found for report %', p_report_id;
            END IF;
        ELSIF v_report.target_type = 'template' THEN
            v_target_bigint := v_report.target_id::BIGINT;
            SELECT author_id INTO v_user_to_suspend
            FROM collection_templates
            WHERE id = v_target_bigint;

            IF v_user_to_suspend IS NULL THEN
                RAISE EXCEPTION 'Template not found or author not found for report %', p_report_id;
            END IF;
        ELSE
            RAISE EXCEPTION 'suspend_user action not supported for target type %', v_report.target_type;
        END IF;

        SELECT jsonb_build_object(
            'is_suspended', p.is_suspended,
            'nickname', p.nickname,
            'email', au.email
        )
        INTO v_old_entity
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.id = v_user_to_suspend;

        IF v_old_entity IS NULL THEN
            RAISE EXCEPTION 'User not found for suspension';
        END IF;

        UPDATE profiles
        SET is_suspended = TRUE,
            suspended_at = NOW(),
            suspended_by = v_actor_id,
            suspension_reason = COALESCE(p_admin_notes, 'Suspended via report moderation'),
            updated_at = NOW()
        WHERE id = v_user_to_suspend;

        SELECT COUNT(*)
        INTO v_removed_listings
        FROM trade_listings
        WHERE user_id = v_user_to_suspend AND status = 'active' AND deleted_at IS NULL;

        IF v_removed_listings > 0 THEN
            UPDATE trade_listings
            SET deleted_at = NOW(),
                updated_at = NOW()
            WHERE user_id = v_user_to_suspend AND status = 'active' AND deleted_at IS NULL;
        END IF;

        v_new_entity := jsonb_build_object(
            'is_suspended', TRUE,
            'suspended_at', NOW(),
            'removed_listings', v_removed_listings
        );

        PERFORM log_moderation_action(
            'suspend_user',
            'user',
            NULL,
            p_admin_notes,
            v_old_entity,
            v_new_entity
        );
    END IF;

    UPDATE reports
    SET status = v_new_status,
        admin_notes = p_admin_notes,
        admin_id = v_actor_id,
        updated_at = NOW(),
        resolved_at = NOW()
    WHERE id = p_report_id;

    v_new_report := jsonb_build_object(
        'status', v_new_status,
        'admin_notes', p_admin_notes,
        'action', p_action
    );

    PERFORM log_moderation_action(
        'resolve_report',
        'report',
        p_report_id,
        p_admin_notes,
        v_old_report,
        v_new_report
    );
END;
$_$;

COMMENT ON FUNCTION public.resolve_report(bigint, text, text) IS 'Resolves a report with moderation action and audit logging. Now also sets resolved_at timestamp.';

-- =========================================================================
-- G. Update notify_admin_on_new_report to pass reporter_id
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
        'reporter_id', NEW.reporter_id,
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

COMMENT ON FUNCTION public.notify_admin_on_new_report() IS 'Invokes the send-admin-report-email Edge Function to alert administrators instantly of any new reports. Now includes reporter_id in payload.';
