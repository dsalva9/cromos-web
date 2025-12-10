-- =====================================================
-- ADMIN PANEL: Add restore_template RPC function
-- =====================================================
-- Purpose: Allow admins to restore soft-deleted templates
-- =====================================================

-- FUNCTION: restore_template
-- Restores a soft-deleted template (similar to restore_listing)
CREATE OR REPLACE FUNCTION restore_template(
    p_template_id BIGINT
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
    v_template_record RECORD;
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Not authenticated'::TEXT, ''::TEXT, ''::TEXT;
        RETURN;
    END IF;

    -- Check if user is admin or template owner
    SELECT
        ct.author_id = v_user_id OR p.is_admin,
        ct.deleted_at IS NOT NULL,
        p.is_admin
    INTO
        v_template_record
    FROM collection_templates ct
    JOIN profiles p ON p.id = v_user_id
    WHERE ct.id = p_template_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Template not found'::TEXT, ''::TEXT, ''::TEXT;
        RETURN;
    END IF;

    -- Get template details
    SELECT * INTO v_template_record FROM collection_templates WHERE id = p_template_id;

    -- Check if template is deleted
    IF v_template_record.deleted_at IS NULL THEN
        RETURN QUERY SELECT false, 'Template is not deleted'::TEXT, 'active'::TEXT, 'active'::TEXT;
        RETURN;
    END IF;

    -- Check permissions
    SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_user_id;

    IF v_template_record.author_id != v_user_id AND NOT v_is_admin THEN
        RETURN QUERY SELECT false, 'Permission denied - must be template owner or admin'::TEXT, ''::TEXT, ''::TEXT;
        RETURN;
    END IF;

    -- Restore the template
    UPDATE collection_templates
    SET
        deleted_at = NULL,
        deletion_type = NULL
    WHERE id = p_template_id;

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
            'template_restored',
            'template',
            p_template_id::TEXT,
            v_user_id,
            'Template restored from soft delete',
            jsonb_build_object(
                'previous_deleted_at', v_template_record.deleted_at,
                'previous_deletion_type', v_template_record.deletion_type
            )
        );
    END IF;

    -- Return success
    RETURN QUERY SELECT true, 'Template restored successfully'::TEXT, 'deleted'::TEXT, 'active'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION restore_template(BIGINT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION restore_template IS 'Restores a soft-deleted template - accessible by template owner or admin';
