-- =====================================================
-- ADMIN DASHBOARD DETAIL FUNCTIONS
-- =====================================================
-- Purpose: Provide detailed lists of suspended users and items pending deletion
--          for the admin dashboard with permanent delete capabilities
-- =====================================================

-- =====================================================
-- FUNCTION: admin_get_suspended_users
-- =====================================================
-- Returns detailed list of all suspended users
CREATE OR REPLACE FUNCTION admin_get_suspended_users()
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID,
    suspended_by_nickname TEXT,
    suspension_reason TEXT,
    is_pending_deletion BOOLEAN,
    scheduled_deletion_date TIMESTAMPTZ,
    days_until_deletion INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view suspended users';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS user_id,
        p.nickname,
        u.email,
        p.avatar_url,
        p.suspended_at,
        p.suspended_by,
        admin_p.nickname AS suspended_by_nickname,
        p.suspension_reason,
        (rs.id IS NOT NULL) AS is_pending_deletion,
        rs.scheduled_for AS scheduled_deletion_date,
        CASE
            WHEN rs.scheduled_for IS NOT NULL THEN
                GREATEST(0, EXTRACT(DAY FROM rs.scheduled_for - NOW())::INTEGER)
            ELSE NULL
        END AS days_until_deletion
    FROM profiles p
    JOIN auth.users u ON p.id = u.id
    LEFT JOIN profiles admin_p ON p.suspended_by = admin_p.id
    LEFT JOIN retention_schedule rs ON rs.entity_id = p.id::TEXT
        AND rs.entity_type = 'user'
        AND rs.processed_at IS NULL
    WHERE p.suspended_at IS NOT NULL
    ORDER BY p.suspended_at DESC;
END;
$$;

COMMENT ON FUNCTION admin_get_suspended_users IS
    'Returns detailed list of all suspended users with suspension info and deletion status';

-- =====================================================
-- FUNCTION: admin_get_pending_deletion_users
-- =====================================================
-- Returns detailed list of users scheduled for deletion
CREATE OR REPLACE FUNCTION admin_get_pending_deletion_users()
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    deleted_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    days_remaining INTEGER,
    deletion_reason TEXT,
    initiated_by_type TEXT,
    legal_hold_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view pending deletion users';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS user_id,
        p.nickname,
        u.email,
        p.avatar_url,
        p.deleted_at,
        rs.scheduled_for,
        GREATEST(0, EXTRACT(DAY FROM rs.scheduled_for - NOW())::INTEGER) AS days_remaining,
        rs.reason AS deletion_reason,
        rs.initiated_by_type,
        rs.legal_hold_until
    FROM retention_schedule rs
    JOIN profiles p ON p.id = rs.entity_id::UUID
    JOIN auth.users u ON p.id = u.id
    WHERE rs.entity_type = 'user'
        AND rs.processed_at IS NULL
    ORDER BY rs.scheduled_for ASC;
END;
$$;

COMMENT ON FUNCTION admin_get_pending_deletion_users IS
    'Returns detailed list of users scheduled for permanent deletion';

-- =====================================================
-- FUNCTION: admin_get_pending_deletion_listings
-- =====================================================
-- Returns detailed list of listings scheduled for deletion
CREATE OR REPLACE FUNCTION admin_get_pending_deletion_listings()
RETURNS TABLE (
    listing_id BIGINT,
    title TEXT,
    collection_name TEXT,
    seller_id UUID,
    seller_nickname TEXT,
    deleted_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    days_remaining INTEGER,
    deletion_type TEXT,
    deletion_reason TEXT,
    legal_hold_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view pending deletion listings';
    END IF;

    RETURN QUERY
    SELECT
        tl.id AS listing_id,
        tl.title,
        c.name AS collection_name,
        tl.user_id AS seller_id,
        p.nickname AS seller_nickname,
        tl.deleted_at,
        rs.scheduled_for,
        GREATEST(0, EXTRACT(DAY FROM rs.scheduled_for - NOW())::INTEGER) AS days_remaining,
        tl.deletion_type,
        rs.reason AS deletion_reason,
        rs.legal_hold_until
    FROM retention_schedule rs
    JOIN trade_listings tl ON tl.id = rs.entity_id::BIGINT
    LEFT JOIN collections c ON tl.collection_id = c.id
    LEFT JOIN profiles p ON tl.user_id = p.id
    WHERE rs.entity_type = 'listing'
        AND rs.processed_at IS NULL
    ORDER BY rs.scheduled_for ASC;
END;
$$;

COMMENT ON FUNCTION admin_get_pending_deletion_listings IS
    'Returns detailed list of listings scheduled for permanent deletion';

-- =====================================================
-- FUNCTION: admin_get_pending_deletion_templates
-- =====================================================
-- Returns detailed list of templates scheduled for deletion
CREATE OR REPLACE FUNCTION admin_get_pending_deletion_templates()
RETURNS TABLE (
    template_id BIGINT,
    title TEXT,
    author_id UUID,
    author_nickname TEXT,
    deleted_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    days_remaining INTEGER,
    deletion_type TEXT,
    deletion_reason TEXT,
    rating_avg NUMERIC,
    rating_count BIGINT,
    legal_hold_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view pending deletion templates';
    END IF;

    RETURN QUERY
    SELECT
        ct.id AS template_id,
        ct.title,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.deleted_at,
        rs.scheduled_for,
        GREATEST(0, EXTRACT(DAY FROM rs.scheduled_for - NOW())::INTEGER) AS days_remaining,
        ct.deletion_type,
        rs.reason AS deletion_reason,
        AVG(tr.rating)::NUMERIC AS rating_avg,
        COUNT(tr.id) AS rating_count,
        rs.legal_hold_until
    FROM retention_schedule rs
    JOIN collection_templates ct ON ct.id = rs.entity_id::BIGINT
    LEFT JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN template_ratings tr ON tr.template_id = ct.id
    WHERE rs.entity_type = 'template'
        AND rs.processed_at IS NULL
    GROUP BY ct.id, ct.title, ct.author_id, p.nickname, ct.deleted_at,
             rs.scheduled_for, ct.deletion_type, rs.reason, rs.legal_hold_until
    ORDER BY rs.scheduled_for ASC;
END;
$$;

COMMENT ON FUNCTION admin_get_pending_deletion_templates IS
    'Returns detailed list of templates scheduled for permanent deletion';

-- =====================================================
-- FUNCTION: admin_permanently_delete_user
-- =====================================================
-- Immediately and permanently deletes a user and all related data
CREATE OR REPLACE FUNCTION admin_permanently_delete_user(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_admin_id UUID;
    v_user_nickname TEXT;
    v_user_email TEXT;
    v_is_on_legal_hold BOOLEAN;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can permanently delete users';
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get user info for logging
    SELECT nickname INTO v_user_nickname
    FROM profiles
    WHERE id = p_user_id;

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- Check for legal hold
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_id = p_user_id::TEXT
            AND entity_type = 'user'
            AND legal_hold_until IS NOT NULL
            AND legal_hold_until > NOW()
    ) INTO v_is_on_legal_hold;

    IF v_is_on_legal_hold THEN
        RAISE EXCEPTION 'Cannot delete user % - currently on legal hold', v_user_nickname;
    END IF;

    -- Log action BEFORE deletion
    INSERT INTO audit_log (
        entity,
        entity_id,
        action,
        admin_id,
        user_id,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        after_json,
        created_at
    ) VALUES (
        'moderation',
        p_user_id::BIGINT,
        'permanent_delete',
        v_admin_id,
        p_user_id,
        'permanent_delete_user',
        'user',
        p_user_id::BIGINT,
        'Admin initiated permanent deletion',
        jsonb_build_object(
            'user_id', p_user_id,
            'nickname', v_user_nickname,
            'email', v_user_email,
            'deleted_by_admin', v_admin_id,
            'deleted_at', NOW()
        ),
        NOW()
    );

    -- Delete from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_id = p_user_id::TEXT
        AND entity_type = 'user';

    -- Cascade delete user data (in order)
    -- XP and badges
    DELETE FROM xp_history WHERE user_id = p_user_id;
    DELETE FROM user_badge_progress WHERE user_id = p_user_id;
    DELETE FROM user_badges WHERE user_id = p_user_id;

    -- Notifications
    DELETE FROM notifications WHERE user_id = p_user_id;

    -- Trades (chats, proposals, listings)
    DELETE FROM trade_reads WHERE user_id = p_user_id;
    DELETE FROM trade_finalizations WHERE user_id = p_user_id;

    -- Delete trade chats where user is involved
    DELETE FROM trade_chats WHERE listing_id IN (
        SELECT id FROM trade_listings WHERE user_id = p_user_id
    );
    DELETE FROM trade_chats WHERE interested_user_id = p_user_id;

    -- Delete trade proposals
    DELETE FROM trade_proposal_items WHERE proposal_id IN (
        SELECT id FROM trade_proposals WHERE user_id = p_user_id OR target_user_id = p_user_id
    );
    DELETE FROM trade_proposals WHERE user_id = p_user_id OR target_user_id = p_user_id;

    -- Delete listings
    DELETE FROM listing_transactions WHERE listing_id IN (
        SELECT id FROM trade_listings WHERE user_id = p_user_id
    );
    DELETE FROM trade_listings WHERE user_id = p_user_id;

    -- Templates and progress
    DELETE FROM user_template_progress WHERE user_id = p_user_id;
    DELETE FROM user_template_copies WHERE user_id = p_user_id;

    -- Delete owned templates (slots, pages, ratings cascade via FK)
    DELETE FROM template_slots WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );
    DELETE FROM template_pages WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );
    DELETE FROM template_ratings WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );
    DELETE FROM collection_templates WHERE author_id = p_user_id;

    -- User interactions
    DELETE FROM user_ratings WHERE user_id = p_user_id OR rated_user_id = p_user_id;
    DELETE FROM favourites WHERE user_id = p_user_id;
    DELETE FROM reports WHERE reporter_id = p_user_id;
    DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;

    -- Finally delete profile (audit_log.user_id will be SET NULL via FK)
    DELETE FROM profiles WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User permanently deleted',
        'user_id', p_user_id,
        'nickname', v_user_nickname,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );
END;
$$;

COMMENT ON FUNCTION admin_permanently_delete_user IS
    'Immediately and permanently deletes a user and all related data. Checks for legal hold. Logs action before deletion.';

-- =====================================================
-- FUNCTION: admin_permanently_delete_listing
-- =====================================================
-- Immediately and permanently deletes a listing
CREATE OR REPLACE FUNCTION admin_permanently_delete_listing(
    p_listing_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_listing_title TEXT;
    v_is_on_legal_hold BOOLEAN;
    v_deleted_chat_count INTEGER;
    v_deleted_transaction_count INTEGER;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can permanently delete listings';
    END IF;

    -- Check if listing exists
    IF NOT EXISTS (SELECT 1 FROM trade_listings WHERE id = p_listing_id) THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Get listing info for logging
    SELECT title INTO v_listing_title
    FROM trade_listings
    WHERE id = p_listing_id;

    -- Check for legal hold
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_id = p_listing_id::TEXT
            AND entity_type = 'listing'
            AND legal_hold_until IS NOT NULL
            AND legal_hold_until > NOW()
    ) INTO v_is_on_legal_hold;

    IF v_is_on_legal_hold THEN
        RAISE EXCEPTION 'Cannot delete listing % - currently on legal hold', v_listing_title;
    END IF;

    -- Count related data for response
    SELECT COUNT(*) INTO v_deleted_chat_count
    FROM trade_chats WHERE listing_id = p_listing_id;

    SELECT COUNT(*) INTO v_deleted_transaction_count
    FROM listing_transactions WHERE listing_id = p_listing_id;

    -- Log action BEFORE deletion
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
        'moderation',
        p_listing_id,
        'permanent_delete',
        v_admin_id,
        'permanent_delete_listing',
        'listing',
        p_listing_id,
        'Admin initiated permanent deletion',
        jsonb_build_object(
            'listing_id', p_listing_id,
            'title', v_listing_title,
            'deleted_by_admin', v_admin_id,
            'deleted_at', NOW()
        ),
        NOW()
    );

    -- Delete from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_id = p_listing_id::TEXT
        AND entity_type = 'listing';

    -- Delete related data (cascade)
    DELETE FROM trade_chats WHERE listing_id = p_listing_id;
    DELETE FROM listing_transactions WHERE listing_id = p_listing_id;
    DELETE FROM favourites WHERE listing_id = p_listing_id;
    DELETE FROM reports WHERE entity_type = 'listing' AND entity_id = p_listing_id;

    -- Delete the listing
    DELETE FROM trade_listings WHERE id = p_listing_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing permanently deleted',
        'listing_id', p_listing_id,
        'title', v_listing_title,
        'deleted_chat_count', v_deleted_chat_count,
        'deleted_transaction_count', v_deleted_transaction_count,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );
END;
$$;

COMMENT ON FUNCTION admin_permanently_delete_listing IS
    'Immediately and permanently deletes a listing and all related data. Checks for legal hold.';

-- =====================================================
-- FUNCTION: admin_permanently_delete_template
-- =====================================================
-- Immediately and permanently deletes a template
CREATE OR REPLACE FUNCTION admin_permanently_delete_template(
    p_template_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_template_title TEXT;
    v_is_on_legal_hold BOOLEAN;
    v_deleted_slot_count INTEGER;
    v_deleted_page_count INTEGER;
    v_deleted_rating_count INTEGER;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can permanently delete templates';
    END IF;

    -- Check if template exists
    IF NOT EXISTS (SELECT 1 FROM collection_templates WHERE id = p_template_id) THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Get template info for logging
    SELECT title INTO v_template_title
    FROM collection_templates
    WHERE id = p_template_id;

    -- Check for legal hold
    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_id = p_template_id::TEXT
            AND entity_type = 'template'
            AND legal_hold_until IS NOT NULL
            AND legal_hold_until > NOW()
    ) INTO v_is_on_legal_hold;

    IF v_is_on_legal_hold THEN
        RAISE EXCEPTION 'Cannot delete template % - currently on legal hold', v_template_title;
    END IF;

    -- Count related data for response
    SELECT COUNT(*) INTO v_deleted_slot_count
    FROM template_slots WHERE template_id = p_template_id;

    SELECT COUNT(*) INTO v_deleted_page_count
    FROM template_pages WHERE template_id = p_template_id;

    SELECT COUNT(*) INTO v_deleted_rating_count
    FROM template_ratings WHERE template_id = p_template_id;

    -- Log action BEFORE deletion
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
        'moderation',
        p_template_id,
        'permanent_delete',
        v_admin_id,
        'permanent_delete_template',
        'template',
        p_template_id,
        'Admin initiated permanent deletion',
        jsonb_build_object(
            'template_id', p_template_id,
            'title', v_template_title,
            'deleted_by_admin', v_admin_id,
            'deleted_at', NOW()
        ),
        NOW()
    );

    -- Delete from retention schedule
    DELETE FROM retention_schedule
    WHERE entity_id = p_template_id::TEXT
        AND entity_type = 'template';

    -- Delete related data (user copies preserved via ON DELETE SET NULL)
    DELETE FROM template_slots WHERE template_id = p_template_id;
    DELETE FROM template_pages WHERE template_id = p_template_id;
    DELETE FROM template_ratings WHERE template_id = p_template_id;
    DELETE FROM reports WHERE entity_type = 'template' AND entity_id = p_template_id;

    -- Delete the template (user_template_copies.template_id will be SET NULL)
    DELETE FROM collection_templates WHERE id = p_template_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Template permanently deleted',
        'template_id', p_template_id,
        'title', v_template_title,
        'deleted_slot_count', v_deleted_slot_count,
        'deleted_page_count', v_deleted_page_count,
        'deleted_rating_count', v_deleted_rating_count,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );
END;
$$;

COMMENT ON FUNCTION admin_permanently_delete_template IS
    'Immediately and permanently deletes a template and all related data. User copies preserved. Checks for legal hold.';

-- Grant execute permissions to authenticated users (RPC will check admin status)
GRANT EXECUTE ON FUNCTION admin_get_suspended_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_pending_deletion_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_pending_deletion_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_pending_deletion_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_permanently_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_permanently_delete_listing(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_permanently_delete_template(BIGINT) TO authenticated;
