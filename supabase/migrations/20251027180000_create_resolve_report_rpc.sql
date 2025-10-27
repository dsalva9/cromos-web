-- =====================================================
-- ADMIN MODERATION: Recreate resolve_report RPC
-- =====================================================
-- Purpose: Provide single-report resolution workflow with audit logging
-- Dependencies: log_moderation_action, reports, trade_listings, collection_templates, profiles
-- =====================================================

-- Expand audit_log entity constraint to cover moderation contexts
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_entity_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_entity_check
  CHECK (
    entity IN (
      'collection',
      'page',
      'sticker',
      'image',
      'user',
      'team',
      'listing',
      'template',
      'report',
      'moderation'
    )
  );

-- Recreate log_moderation_action helper with full column coverage
DROP FUNCTION IF EXISTS log_moderation_action(TEXT, TEXT, BIGINT, TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION log_moderation_action(
    p_moderation_action_type TEXT,
    p_moderated_entity_type TEXT,
    p_moderated_entity_id BIGINT,
    p_moderation_reason TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id BIGINT;
    v_admin_nickname TEXT;
    v_effective_entity TEXT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    -- Get admin nickname
    SELECT nickname INTO v_admin_nickname
    FROM profiles
    WHERE id = auth.uid();

    v_effective_entity := COALESCE(p_moderated_entity_type, 'moderation');

    -- Insert into audit log with legacy and moderation columns populated
    INSERT INTO audit_log (
        user_id,
        admin_id,
        admin_nickname,
        entity,
        entity_id,
        action,
        before_json,
        after_json,
        entity_type,
        old_values,
        new_values,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        created_at
    ) VALUES (
        auth.uid(),
        auth.uid(),
        v_admin_nickname,
        v_effective_entity,
        p_moderated_entity_id,
        'moderation',
        p_old_values,
        p_new_values,
        p_moderated_entity_type,
        p_old_values,
        p_new_values,
        p_moderation_action_type,
        p_moderated_entity_type,
        p_moderated_entity_id,
        p_moderation_reason,
        NOW()
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

DROP FUNCTION IF EXISTS resolve_report(BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION resolve_report(
    p_report_id BIGINT,
    p_action TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
    v_actor_id UUID;
    v_actor_role TEXT;
    v_actor_sub TEXT;
    v_actor_claims TEXT;
BEGIN
    -- Derive caller identity from JWT
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

    -- Require authentication unless running with service_role
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

    -- Validate action
    IF p_action NOT IN ('dismiss', 'remove_content', 'suspend_user') THEN
        RAISE EXCEPTION 'Invalid action. Must be one of: dismiss, remove_content, suspend_user';
    END IF;

    -- Lock the report row for update
    SELECT r.*, r.target_id::TEXT AS target_id_text
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

    -- Perform moderation action
    IF p_action = 'remove_content' THEN
        IF v_report.target_type = 'listing' THEN
            SELECT jsonb_build_object(
                'status', status,
                'title', title,
                'user_id', user_id
            )
            INTO v_old_entity
            FROM trade_listings
        WHERE id = v_report.target_id;

            IF v_old_entity IS NULL THEN
                RAISE EXCEPTION 'Listing not found for report %', p_report_id;
            END IF;

            UPDATE trade_listings
            SET status = 'removed',
                updated_at = NOW()
            WHERE id = v_report.target_id;

            v_new_entity := jsonb_build_object('status', 'removed');

            PERFORM log_moderation_action(
                'remove_content',
                'listing',
                v_report.target_id,
                p_admin_notes,
                v_old_entity,
                v_new_entity
            );
        ELSIF v_report.target_type = 'template' THEN
            SELECT jsonb_build_object(
                'is_public', is_public,
                'title', title,
                'author_id', author_id
            )
            INTO v_old_entity
            FROM collection_templates
            WHERE id = v_report.target_id;

            IF v_old_entity IS NULL THEN
                RAISE EXCEPTION 'Template not found for report %', p_report_id;
            END IF;

            UPDATE collection_templates
            SET is_public = FALSE,
                updated_at = NOW()
            WHERE id = v_report.target_id;

            v_new_entity := jsonb_build_object('is_public', FALSE);

            PERFORM log_moderation_action(
                'remove_content',
                'template',
                v_report.target_id,
                p_admin_notes,
                v_old_entity,
                v_new_entity
            );
        ELSE
            RAISE EXCEPTION 'remove_content action not supported for target type %', v_report.target_type;
        END IF;
    ELSIF p_action = 'suspend_user' THEN
        IF v_report.target_type <> 'user' THEN
            RAISE EXCEPTION 'suspend_user action requires a user report';
        END IF;

        BEGIN
            v_target_uuid := v_report.target_id_text::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Report target_id % is not a valid UUID', v_report.target_id_text;
        END;

        SELECT jsonb_build_object(
            'is_suspended', p.is_suspended,
            'nickname', p.nickname,
            'email', au.email
        )
        INTO v_old_entity
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE p.id = v_target_uuid;

        IF v_old_entity IS NULL THEN
            RAISE EXCEPTION 'User not found for report %', p_report_id;
        END IF;

        UPDATE profiles
        SET is_suspended = TRUE,
            updated_at = NOW()
        WHERE id = v_target_uuid;

        SELECT COUNT(*)
        INTO v_removed_listings
        FROM trade_listings
        WHERE user_id = v_target_uuid AND status = 'active';

        IF v_removed_listings > 0 THEN
            UPDATE trade_listings
            SET status = 'removed',
                updated_at = NOW()
            WHERE user_id = v_target_uuid AND status = 'active';
        END IF;

        v_new_entity := jsonb_build_object(
            'is_suspended', TRUE,
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

    -- Update the report
    UPDATE reports
    SET status = v_new_status,
        admin_notes = p_admin_notes,
        admin_id = v_actor_id,
        updated_at = NOW()
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
$$;

GRANT EXECUTE ON FUNCTION resolve_report(BIGINT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION resolve_report(BIGINT, TEXT, TEXT) IS 'Resolves a report with moderation action and audit logging.';
