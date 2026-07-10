-- Migration: Create admin_archive_expired_listing function
-- Allows admins to manually trigger archiving of an expired listing,
-- updating its status to 'archived', clearing deleted_at, and marking
-- the retention schedule entry as processed.

CREATE OR REPLACE FUNCTION public.admin_archive_expired_listing(p_listing_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_admin_id UUID;
    v_schedule_id BIGINT;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can archive listings';
    END IF;

    -- Update listing status to archived, clear deleted_at, and update timestamp
    UPDATE public.trade_listings SET
        status = 'archived',
        deleted_at = NULL,
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Mark retention schedule entry as processed
    UPDATE public.retention_schedule
    SET processed_at = NOW()
    WHERE entity_id = p_listing_id::TEXT
      AND entity_type = 'listing'
      AND reason = 'expired'
      AND processed_at IS NULL
    RETURNING id INTO v_schedule_id;

    -- Add audit log
    INSERT INTO public.audit_log (
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
        'moderation',
        p_listing_id,
        'moderation',
        v_admin_id,
        'archive_listing',
        'listing',
        p_listing_id,
        'Admin initiated manual archiving of expired listing',
        jsonb_build_object(
            'listing_id', p_listing_id,
            'archived_by_admin', v_admin_id,
            'archived_at', NOW()
        ),
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_archive_expired_listing(bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_expired_listing(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_expired_listing(bigint) TO service_role;
