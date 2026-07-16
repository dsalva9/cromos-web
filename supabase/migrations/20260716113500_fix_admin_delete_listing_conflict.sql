-- Redefine admin_delete_listing with ON CONFLICT DO UPDATE
CREATE OR REPLACE FUNCTION "public"."admin_delete_listing"("p_listing_id" bigint, "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_id UUID;
    v_listing_exists BOOLEAN;
    v_already_deleted BOOLEAN;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can delete listings';
    END IF;

    -- Check if listing exists
    SELECT EXISTS (SELECT 1 FROM trade_listings WHERE id = p_listing_id) INTO v_listing_exists;
    IF NOT v_listing_exists THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Check if already deleted
    SELECT deleted_at IS NOT NULL INTO v_already_deleted
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_already_deleted THEN
        RAISE EXCEPTION 'Listing is already deleted';
    END IF;

    -- Calculate deletion date
    v_scheduled_for := NOW() + INTERVAL '90 days';

    -- Mark listing as deleted (FIXED: Also set status to 'removed')
    UPDATE trade_listings SET
        status = 'removed',  -- Set status so RPC filters work correctly
        deleted_at = NOW(),
        deleted_by = v_admin_id,
        deletion_type = 'admin',
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Schedule permanent deletion (90 days) with conflict handling
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type,
        created_at
    ) VALUES (
        'listing',
        p_listing_id::TEXT,
        'delete',
        v_scheduled_for,
        p_reason,
        v_admin_id,
        'admin',
        NOW()
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = EXCLUDED.scheduled_for,
        reason = EXCLUDED.reason,
        initiated_by = EXCLUDED.initiated_by,
        initiated_by_type = EXCLUDED.initiated_by_type,
        created_at = EXCLUDED.created_at,
        processed_at = NULL;

    -- Log action in audit_log
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'listing',
        p_listing_id,
        'delete',
        v_admin_id,
        'delete_listing',
        'listing',
        p_listing_id,
        p_reason,
        jsonb_build_object(
            'listing_id', p_listing_id,
            'deleted_at', NOW(),
            'status', 'removed',
            'scheduled_for', v_scheduled_for,
            'reason', p_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing deleted (90-day retention)',
        'listing_id', p_listing_id,
        'deleted_at', NOW(),
        'scheduled_for', v_scheduled_for
    );
END;
$$;

-- Redefine admin_delete_template with ON CONFLICT DO UPDATE
CREATE OR REPLACE FUNCTION "public"."admin_delete_template"("p_template_id" bigint, "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_id UUID;
    v_template_exists BOOLEAN;
    v_already_deleted BOOLEAN;
    v_scheduled_for TIMESTAMPTZ;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can delete templates';
    END IF;

    -- Check if template exists
    SELECT EXISTS (SELECT 1 FROM collection_templates WHERE id = p_template_id) INTO v_template_exists;
    IF NOT v_template_exists THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Check if already deleted
    SELECT deleted_at IS NOT NULL INTO v_already_deleted
    FROM collection_templates
    WHERE id = p_template_id;

    IF v_already_deleted THEN
        RAISE EXCEPTION 'Template is already deleted';
    END IF;

    -- Calculate deletion date
    v_scheduled_for := NOW() + INTERVAL '90 days';

    -- Mark template as deleted
    UPDATE collection_templates SET
        deleted_at = NOW(),
        deleted_by = v_admin_id,
        deletion_type = 'admin',
        updated_at = NOW()
    WHERE id = p_template_id;

    -- Schedule permanent deletion (90 days) with conflict handling
    INSERT INTO retention_schedule (
        entity_type,
        entity_id,
        action,
        scheduled_for,
        reason,
        initiated_by,
        initiated_by_type,
        created_at
    ) VALUES (
        'template',
        p_template_id::TEXT,
        'delete',
        v_scheduled_for,
        p_reason,
        v_admin_id,
        'admin',
        NOW()
    )
    ON CONFLICT (entity_type, entity_id, action)
    DO UPDATE SET
        scheduled_for = EXCLUDED.scheduled_for,
        reason = EXCLUDED.reason,
        initiated_by = EXCLUDED.initiated_by,
        initiated_by_type = EXCLUDED.initiated_by_type,
        created_at = EXCLUDED.created_at,
        processed_at = NULL;

    -- Log action in audit_log
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'template',
        p_template_id,
        'delete',
        v_admin_id,
        'delete_template',
        'template',
        p_template_id,
        p_reason,
        jsonb_build_object(
            'template_id', p_template_id,
            'deleted_at', NOW(),
            'scheduled_for', v_scheduled_for,
            'reason', p_reason
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Template deleted (90-day retention, albums preserved)',
        'template_id', p_template_id,
        'deleted_at', NOW(),
        'scheduled_for', v_scheduled_for,
        'note', 'User albums (copies) are preserved as independent entities'
    );
END;
$$;
