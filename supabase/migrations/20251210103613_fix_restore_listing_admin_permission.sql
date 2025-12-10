-- =====================================================
-- FIX: Allow admins to restore any listing
-- =====================================================
-- Purpose: Update restore_listing to allow admins to restore any listing, not just their own
-- =====================================================

DROP FUNCTION IF EXISTS restore_listing(BIGINT);

CREATE OR REPLACE FUNCTION restore_listing(
    p_listing_id BIGINT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    previous_status TEXT,
    new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_record RECORD;
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Not authenticated'::TEXT, ''::TEXT, ''::TEXT;
        RETURN;
    END IF;

    -- Get listing details
    SELECT * INTO v_listing_record FROM trade_listings WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Listing not found'::TEXT, ''::TEXT, ''::TEXT;
        RETURN;
    END IF;

    -- Accept both 'ELIMINADO' and 'removed' as deleted statuses
    IF v_listing_record.status NOT IN ('ELIMINADO', 'removed') THEN
        RETURN QUERY SELECT false, 'Only deleted listings can be restored'::TEXT,
                     v_listing_record.status::TEXT, v_listing_record.status::TEXT;
        RETURN;
    END IF;

    -- Check permissions: must be listing owner OR admin
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;

    IF v_listing_record.user_id != v_user_id AND NOT COALESCE(v_is_admin, false) THEN
        RETURN QUERY SELECT false, 'Permission denied: Must be listing owner or admin'::TEXT, ''::TEXT, ''::TEXT;
        RETURN;
    END IF;

    -- Restore the listing to active status
    UPDATE trade_listings
    SET
        status = 'active',
        deleted_at = NULL,
        deletion_type = NULL
    WHERE id = p_listing_id;

    -- Log the restoration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'moderation_logs') THEN
        INSERT INTO moderation_logs (
            action_type,
            entity_type,
            entity_id,
            performed_by,
            reason,
            metadata
        ) VALUES (
            'listing_restored',
            'listing',
            p_listing_id::TEXT,
            v_user_id,
            'Listing restored from soft delete',
            jsonb_build_object(
                'previous_status', v_listing_record.status,
                'previous_deleted_at', v_listing_record.deleted_at,
                'previous_deletion_type', v_listing_record.deletion_type,
                'restored_by_admin', v_is_admin
            )
        );
    END IF;

    -- Return success
    RETURN QUERY SELECT true, 'Listing restored successfully'::TEXT, v_listing_record.status::TEXT, 'active'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_listing(BIGINT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION restore_listing IS 'Restores a soft-deleted listing - accessible by listing owner or admin';
