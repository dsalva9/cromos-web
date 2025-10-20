-- =====================================================
-- ADMIN MODERATION: Create moderation action RPCs
-- =====================================================
-- Purpose: Provide bulk moderation actions and workflows
-- Note: Creates RPCs for bulk actions and advanced moderation
-- =====================================================

-- FUNCTION 1: bulk_update_report_status
-- Updates multiple reports at once and logs the action
CREATE OR REPLACE FUNCTION bulk_update_report_status(
    p_report_ids BIGINT[],
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    report_id BIGINT,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report_id BIGINT;
    v_old_status TEXT;
    v_old_admin_notes TEXT;
    v_report_data JSONB;
    v_success BOOLEAN;
    v_error_message TEXT;
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
    
    -- Create temporary table for results
    CREATE TEMPORARY TABLE IF NOT EXISTS bulk_results (
        report_id BIGINT,
        success BOOLEAN,
        error_message TEXT
    );
    
    -- Clear temporary table
    TRUNCATE TABLE bulk_results;
    
    -- Process each report
    FOREACH v_report_id IN ARRAY p_report_ids
    LOOP
        v_success := FALSE;
        v_error_message := NULL;
        
        BEGIN
            -- Get current report data
            SELECT status, admin_notes, jsonb_build_object(
                'reporter_id', reporter_id,
                'target_type', target_type,
                'target_id', target_id,
                'reason', reason,
                'description', description
            ) INTO v_old_status, v_old_admin_notes, v_report_data
            FROM reports
            WHERE id = v_report_id;
            
            IF v_report_data IS NULL THEN
                v_error_message := 'Report not found';
            ELSE
                -- Update the report
                UPDATE reports
                SET 
                    status = p_status, 
                    admin_notes = p_admin_notes,
                    admin_id = auth.uid(),
                    updated_at = NOW()
                WHERE id = v_report_id;
                
                IF FOUND THEN
                    -- Log the action
                    PERFORM log_moderation_action(
                        'bulk_update_report_status',
                        'report',
                        v_report_id,
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
                    
                    v_success := TRUE;
                ELSE
                    v_error_message := 'Failed to update report';
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_message := SQLERRM;
        END;
        
        -- Insert result into temporary table
        INSERT INTO bulk_results (report_id, success, error_message)
        VALUES (v_report_id, v_success, v_error_message);
    END LOOP;
    
    -- Return results
    RETURN QUERY
    SELECT report_id, success, error_message
    FROM bulk_results;
    
    -- Clean up temporary table
    DROP TABLE IF EXISTS bulk_results;
END;
$$;

-- FUNCTION 2: bulk_suspend_users
-- Suspends or unsuspends multiple users at once and logs the action
CREATE OR REPLACE FUNCTION bulk_suspend_users(
    p_user_ids UUID[],
    p_is_suspended BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_old_is_suspended BOOLEAN;
    v_user_data JSONB;
    v_success BOOLEAN;
    v_error_message TEXT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Create temporary table for results
    CREATE TEMPORARY TABLE IF NOT EXISTS bulk_results (
        user_id UUID,
        success BOOLEAN,
        error_message TEXT
    );
    
    -- Clear temporary table
    TRUNCATE TABLE bulk_results;
    
    -- Process each user
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        v_success := FALSE;
        v_error_message := NULL;
        
        BEGIN
            -- Prevent admins from suspending themselves
            IF v_user_id = auth.uid() AND p_is_suspended = TRUE THEN
                v_error_message := 'Admins cannot suspend themselves';
            ELSE
                -- Get current suspension status
                SELECT is_suspended, jsonb_build_object(
                    'nickname', nickname,
                    'is_admin', is_admin,
                    'rating_avg', rating_avg,
                    'rating_count', rating_count
                ) INTO v_old_is_suspended, v_user_data
                FROM profiles
                WHERE id = v_user_id;
                
                IF v_user_data IS NULL THEN
                    v_error_message := 'User not found';
                ELSE
                    -- Update user suspension status
                    UPDATE profiles
                    SET is_suspended = p_is_suspended, updated_at = NOW()
                    WHERE id = v_user_id;
                    
                    IF FOUND THEN
                        -- Log the action
                        PERFORM log_moderation_action(
                            CASE WHEN p_is_suspended THEN 'bulk_suspend_users' ELSE 'bulk_unsuspend_users' END,
                            'user',
                            v_user_id::BIGINT,
                            p_reason,
                            jsonb_build_object('is_suspended', v_old_is_suspended),
                            jsonb_build_object('is_suspended', p_is_suspended)
                        );
                        
                        v_success := TRUE;
                    ELSE
                        v_error_message := 'Failed to update user suspension status';
                    END IF;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_message := SQLERRM;
        END;
        
        -- Insert result into temporary table
        INSERT INTO bulk_results (user_id, success, error_message)
        VALUES (v_user_id, v_success, v_error_message);
    END LOOP;
    
    -- Return results
    RETURN QUERY
    SELECT user_id, success, error_message
    FROM bulk_results;
    
    -- Clean up temporary table
    DROP TABLE IF EXISTS bulk_results;
END;
$$;

-- FUNCTION 3: bulk_delete_content
-- Deletes multiple content items at once and logs the action
CREATE OR REPLACE FUNCTION bulk_delete_content(
    p_content_type TEXT,
    p_content_ids BIGINT[],
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    content_id BIGINT,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_content_id BIGINT;
    v_content_data JSONB;
    v_success BOOLEAN;
    v_error_message TEXT;
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
    
    -- Create temporary table for results
    CREATE TEMPORARY TABLE IF NOT EXISTS bulk_results (
        content_id BIGINT,
        success BOOLEAN,
        error_message TEXT
    );
    
    -- Clear temporary table
    TRUNCATE TABLE bulk_results;
    
    -- Process each content item
    FOREACH v_content_id IN ARRAY p_content_ids
    LOOP
        v_success := FALSE;
        v_error_message := NULL;
        
        BEGIN
            -- Get content data for audit
            IF p_content_type = 'listing' THEN
                SELECT jsonb_build_object(
                    'user_id', user_id,
                    'title', title,
                    'description', description,
                    'status', status
                ) INTO v_content_data
                FROM trade_listings
                WHERE id = v_content_id;
                
                -- Log the action before deletion
                PERFORM log_moderation_action(
                    'bulk_delete_listings',
                    'listing',
                    v_content_id,
                    p_reason,
                    v_content_data,
                    NULL
                );
                
                -- Delete the listing
                DELETE FROM trade_listings WHERE id = v_content_id;
                
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
                WHERE id = v_content_id;
                
                -- Log the action before deletion
                PERFORM log_moderation_action(
                    'bulk_delete_templates',
                    'template',
                    v_content_id,
                    p_reason,
                    v_content_data,
                    NULL
                );
                
                -- Delete the template
                DELETE FROM collection_templates WHERE id = v_content_id;
                
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
                WHERE id = v_content_id;
                
                -- Log the action before deletion
                PERFORM log_moderation_action(
                    'bulk_delete_ratings',
                    'rating',
                    v_content_id,
                    p_reason,
                    v_content_data,
                    NULL
                );
                
                -- Delete the rating
                DELETE FROM user_ratings WHERE id = v_content_id;
            END IF;
            
            IF v_content_data IS NULL THEN
                v_error_message := 'Content not found';
            ELSE
                v_success := TRUE;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_message := SQLERRM;
        END;
        
        -- Insert result into temporary table
        INSERT INTO bulk_results (content_id, success, error_message)
        VALUES (v_content_id, v_success, v_error_message);
    END LOOP;
    
    -- Return results
    RETURN QUERY
    SELECT content_id, success, error_message
    FROM bulk_results;
    
    -- Clean up temporary table
    DROP TABLE IF EXISTS bulk_results;
END;
$$;

-- FUNCTION 4: escalate_report
-- Escalates a report to a higher priority and logs the action
CREATE OR REPLACE FUNCTION escalate_report(
    p_report_id BIGINT,
    p_priority_level INTEGER DEFAULT 1, -- 1=high, 2=critical
    p_reason TEXT DEFAULT NULL
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
    
    -- Validate priority level
    IF p_priority_level NOT IN (1, 2) THEN
        RAISE EXCEPTION 'Invalid priority level. Must be 1 (high) or 2 (critical)';
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
        status = 'reviewing',
        admin_notes = COALESCE(p_reason, 'Escalated to priority ' || p_priority_level),
        admin_id = auth.uid(),
        updated_at = NOW()
    WHERE id = p_report_id;
    
    -- Log the action
    PERFORM log_moderation_action(
        'escalate_report',
        'report',
        p_report_id,
        p_reason,
        jsonb_build_object(
            'status', v_old_status,
            'admin_notes', v_old_admin_notes,
            'report_data', v_report_data
        ),
        jsonb_build_object(
            'status', 'reviewing',
            'priority_level', p_priority_level,
            'admin_notes', COALESCE(p_reason, 'Escalated to priority ' || p_priority_level)
        )
    );
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to escalate report';
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION bulk_update_report_status TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_suspend_users TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_content TO authenticated;
GRANT EXECUTE ON FUNCTION escalate_report TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION bulk_update_report_status IS 'Updates multiple reports at once and logs the action';
COMMENT ON FUNCTION bulk_suspend_users IS 'Suspends or unsuspends multiple users at once and logs the action';
COMMENT ON FUNCTION bulk_delete_content IS 'Deletes multiple content items at once and logs the action';
COMMENT ON FUNCTION escalate_report IS 'Escalates a report to a higher priority and logs the action';