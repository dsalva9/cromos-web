-- =====================================================
-- Allow suspending users from listing/template reports
-- =====================================================
-- Feature: Admins can suspend the content owner when reviewing listing/template reports
-- Changes: suspend_user action now works for all report types, not just user reports
-- Logic:
--   - User reports: Suspend the reported user
--   - Listing reports: Suspend the listing owner (user_id)
--   - Template reports: Suspend the template author (author_id)
-- =====================================================

CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id bigint, p_action text, p_admin_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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

    -- Perform moderation action
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

            -- Use soft deletion with deleted_at timestamp for data retention
            UPDATE trade_listings
            SET deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_target_bigint;

            v_new_entity := jsonb_build_object('deleted_at', NOW());

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

            -- Use soft deletion with deleted_at timestamp for data retention
            UPDATE collection_templates
            SET is_public = FALSE,
                deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_target_bigint;

            v_new_entity := jsonb_build_object('is_public', FALSE, 'deleted_at', NOW());

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
        -- Determine which user to suspend based on report type
        IF v_report.target_type = 'user' THEN
            BEGIN
                v_user_to_suspend := v_report.target_id::uuid;
            EXCEPTION WHEN invalid_text_representation THEN
                RAISE EXCEPTION 'Report target_id % is not a valid UUID', v_report.target_id;
            END;
        ELSIF v_report.target_type = 'listing' THEN
            -- Get the user_id from the listing
            v_target_bigint := v_report.target_id::BIGINT;
            SELECT user_id INTO v_user_to_suspend
            FROM trade_listings
            WHERE id = v_target_bigint;

            IF v_user_to_suspend IS NULL THEN
                RAISE EXCEPTION 'Listing not found or user not found for report %', p_report_id;
            END IF;
        ELSIF v_report.target_type = 'template' THEN
            -- Get the author_id from the template
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

        -- Get user info before suspension
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

        -- Suspend the user
        UPDATE profiles
        SET is_suspended = TRUE,
            updated_at = NOW()
        WHERE id = v_user_to_suspend;

        -- Soft delete all active listings from the suspended user
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
$function$;
