-- =====================================================
-- ADMIN MODERATION: Extend moderation RPCs with audit log
-- =====================================================
-- Purpose: Modify existing moderation RPCs to log actions
-- Note: Updates user management and report handling RPCs
-- =====================================================

-- FUNCTION 1: admin_update_user_role_v2 (with audit logging)
-- Updates a user's role and logs the action
CREATE OR REPLACE FUNCTION admin_update_user_role_v2(
    p_user_id UUID,
    p_is_admin BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_is_admin BOOLEAN;
    v_audit_id BIGINT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Prevent admins from removing their own admin status
    IF p_user_id = auth.uid() AND p_is_admin = FALSE THEN
        RAISE EXCEPTION 'Admins cannot remove their own admin status';
    END IF;
    
    -- Get current role
    SELECT is_admin INTO v_old_is_admin
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update user role
    UPDATE profiles
    SET is_admin = p_is_admin, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the action
    PERFORM log_moderation_action(
        'update_user_role',
        'user',
        p_user_id::BIGINT,
        p_reason,
        jsonb_build_object('is_admin', v_old_is_admin),
        jsonb_build_object('is_admin', p_is_admin)
    );
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update user role';
    END IF;
END;
$$;

-- FUNCTION 2: admin_suspend_user_v2 (with audit logging)
-- Suspends or unsuspends a user and logs the action
CREATE OR REPLACE FUNCTION admin_suspend_user_v2(
    p_user_id UUID,
    p_is_suspended BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_is_suspended BOOLEAN;
    v_audit_id BIGINT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Prevent admins from suspending themselves
    IF p_user_id = auth.uid() AND p_is_suspended = TRUE THEN
        RAISE EXCEPTION 'Admins cannot suspend themselves';
    END IF;
    
    -- Get current suspension status
    SELECT is_suspended INTO v_old_is_suspended
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update user suspension status
    UPDATE profiles
    SET is_suspended = p_is_suspended, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the action
    PERFORM log_moderation_action(
        CASE WHEN p_is_suspended THEN 'suspend_user' ELSE 'unsuspend_user' END,
        'user',
        p_user_id::BIGINT,
        p_reason,
        jsonb_build_object('is_suspended', v_old_is_suspended),
        jsonb_build_object('is_suspended', p_is_suspended)
    );
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update user suspension status';
    END IF;
END;
$$;

-- FUNCTION 3: admin_delete_user_v2 (with audit logging)
-- Deletes a user and logs the action
CREATE OR REPLACE FUNCTION admin_delete_user_v2(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_data JSONB;
    v_audit_id BIGINT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Prevent admins from deleting themselves
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Admins cannot delete themselves';
    END IF;
    
    -- Get user data for audit
    SELECT jsonb_build_object(
        'nickname', nickname,
        'is_admin', is_admin,
        'is_suspended', is_suspended,
        'rating_avg', rating_avg,
        'rating_count', rating_count
    ) INTO v_user_data
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_user_data IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Log the action before deletion
    PERFORM log_moderation_action(
        'delete_user',
        'user',
        p_user_id::BIGINT,
        p_reason,
        v_user_data,
        NULL
    );
    
    -- Delete the user (this will cascade to related tables)
    DELETE FROM profiles
    WHERE id = p_user_id;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to delete user';
    END IF;
END;
$$;

-- FUNCTION 4: update_report_status_v2 (with audit logging)
-- Updates the status of a report and logs the action
CREATE OR REPLACE FUNCTION update_report_status_v2(
    p_report_id BIGINT,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_old_admin_notes TEXT;
    v_report_data JSONB;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Validate status
    IF p_status NOT IN ('pending', 'reviewing', 'resolved', 'dismissed') THEN
        RAISE EXCEPTION 'Invalid status. Must be one of: pending, reviewing, resolved, dismissed';
    END IF;
    
    -- Get current report data
    SELECT status, admin_notes, jsonb_build_object(
        'reporter_id', reporter_id,
        'target_type', target_type,
        'target_id', target_id,
        'reason', reason,
        'description', description
    ) INTO v_old_status, v_old_admin_notes, v_report_data
    FROM reports
    WHERE id = p_report_id;
    
    IF v_report_data IS NULL THEN
        RAISE EXCEPTION 'Report not found';
    END IF;
    
    -- Update the report
    UPDATE reports
    SET 
        status = p_status, 
        admin_notes = p_admin_notes,
        admin_id = auth.uid(),
        updated_at = NOW()
    WHERE id = p_report_id;
    
    -- Log the action
    PERFORM log_moderation_action(
        'update_report_status',
        'report',
        p_report_id,
        p_admin_notes,
        jsonb_build_object(
            'status', v_old_status,
            'admin_notes', v_old_admin_notes,
            'report_data', v_report_data
        ),
        jsonb_build_object(
            'status', p_status,
            'admin_notes', p_admin_notes
        )
    );
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update report';
    END IF;
END;
$$;

-- FUNCTION 5: admin_delete_content_v2 (new with audit logging)
-- Deletes content (listing, template, rating) and logs the action
CREATE OR REPLACE FUNCTION admin_delete_content_v2(
    p_content_type TEXT,
    p_content_id BIGINT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_content_data JSONB;
    v_audit_id BIGINT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Validate content type
    IF p_content_type NOT IN ('listing', 'template', 'rating') THEN
        RAISE EXCEPTION 'Invalid content type. Must be one of: listing, template, rating';
    END IF;
    
    -- Get content data for audit
    IF p_content_type = 'listing' THEN
        SELECT jsonb_build_object(
            'user_id', user_id,
            'title', title,
            'description', description,
            'status', status
        ) INTO v_content_data
        FROM trade_listings
        WHERE id = p_content_id;
        
        -- Log the action before deletion
        PERFORM log_moderation_action(
            'delete_listing',
            'listing',
            p_content_id,
            p_reason,
            v_content_data,
            NULL
        );
        
        -- Delete the listing
        DELETE FROM trade_listings WHERE id = p_content_id;
        
    ELSIF p_content_type = 'template' THEN
        SELECT jsonb_build_object(
            'author_id', author_id,
            'title', title,
            'description', description,
            'is_public', is_public,
            'rating_avg', rating_avg,
            'rating_count', rating_count
        ) INTO v_content_data
        FROM collection_templates
        WHERE id = p_content_id;
        
        -- Log the action before deletion
        PERFORM log_moderation_action(
            'delete_template',
            'template',
            p_content_id,
            p_reason,
            v_content_data,
            NULL
        );
        
        -- Delete the template
        DELETE FROM collection_templates WHERE id = p_content_id;
        
    ELSIF p_content_type = 'rating' THEN
        SELECT jsonb_build_object(
            'rater_id', rater_id,
            'rated_id', rated_id,
            'rating', rating,
            'comment', comment,
            'context_type', context_type,
            'context_id', context_id
        ) INTO v_content_data
        FROM user_ratings
        WHERE id = p_content_id;
        
        -- Log the action before deletion
        PERFORM log_moderation_action(
            'delete_user_rating',
            'rating',
            p_content_id,
            p_reason,
            v_content_data,
            NULL
        );
        
        -- Delete the rating
        DELETE FROM user_ratings WHERE id = p_content_id;
    END IF;
    
    IF v_content_data IS NULL THEN
        RAISE EXCEPTION 'Content not found';
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_update_user_role_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION update_report_status_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_content_v2 TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION admin_update_user_role_v2 IS 'Updates a user''s role and logs the action';
COMMENT ON FUNCTION admin_suspend_user_v2 IS 'Suspends or unsuspends a user and logs the action';
COMMENT ON FUNCTION admin_delete_user_v2 IS 'Deletes a user and logs the action';
COMMENT ON FUNCTION update_report_status_v2 IS 'Updates the status of a report and logs the action';
COMMENT ON FUNCTION admin_delete_content_v2 IS 'Deletes content (listing, template, rating) and logs the action';