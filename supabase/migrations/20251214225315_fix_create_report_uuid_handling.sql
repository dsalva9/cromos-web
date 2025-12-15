-- =====================================================
-- Fix create_report to handle UUID target_ids for users
-- =====================================================
-- Issue: create_report function accepts BIGINT for target_id
-- but user IDs are UUIDs, causing "cannot cast type bigint to uuid" error
-- Solution: Change target_id column to TEXT to handle both BIGINT and UUID values
-- =====================================================

-- Step 1: Alter the reports table to change target_id from BIGINT to TEXT
ALTER TABLE reports ALTER COLUMN target_id TYPE TEXT USING target_id::TEXT;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS create_report(TEXT, BIGINT, TEXT, TEXT);

-- Step 3: Recreate with TEXT parameter for target_id
CREATE OR REPLACE FUNCTION create_report(
    p_target_type TEXT,
    p_target_id TEXT,
    p_reason TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report_id BIGINT;
    v_is_author BOOLEAN;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate target_type
    IF p_target_type NOT IN ('listing', 'template', 'user', 'rating') THEN
        RAISE EXCEPTION 'Invalid target_type. Must be one of: listing, template, user, rating';
    END IF;

    -- Validate reason
    IF p_reason NOT IN (
        'spam', 'inappropriate_content', 'harassment', 'copyright_violation',
        'misleading_information', 'fake_listing', 'offensive_language', 'other'
    ) THEN
        RAISE EXCEPTION 'Invalid reason. Must be one of: spam, inappropriate_content, harassment, copyright_violation, misleading_information, fake_listing, offensive_language, other';
    END IF;

    -- Check if user is reporting their own content (allowed for self-reporting)
    IF p_target_type = 'listing' THEN
        SELECT (user_id = auth.uid()) INTO v_is_author
        FROM trade_listings
        WHERE id = p_target_id::BIGINT;
    ELSIF p_target_type = 'template' THEN
        SELECT (author_id = auth.uid()) INTO v_is_author
        FROM collection_templates
        WHERE id = p_target_id::BIGINT;
    ELSIF p_target_type = 'user' THEN
        SELECT (id = auth.uid()) INTO v_is_author
        FROM profiles
        WHERE id = p_target_id::UUID;
    ELSIF p_target_type = 'rating' THEN
        SELECT (rater_id = auth.uid() OR rated_id = auth.uid()) INTO v_is_author
        FROM user_ratings
        WHERE id = p_target_id::BIGINT;
    END IF;

    -- Create the report
    INSERT INTO reports (
        reporter_id,
        target_type,
        target_id,
        reason,
        description
    ) VALUES (
        auth.uid(),
        p_target_type,
        p_target_id,
        p_reason,
        p_description
    ) RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;
$$;

-- Step 4: Drop and recreate check_entity_reported with TEXT parameter
DROP FUNCTION IF EXISTS check_entity_reported(TEXT, BIGINT);

CREATE OR REPLACE FUNCTION check_entity_reported(
    p_target_type TEXT,
    p_target_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_reported BOOLEAN := FALSE;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if report exists
    SELECT EXISTS (
        SELECT 1 FROM reports
        WHERE reporter_id = auth.uid()
        AND target_type = p_target_type
        AND target_id = p_target_id
    ) INTO v_is_reported;

    RETURN v_is_reported;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_report TO authenticated;
GRANT EXECUTE ON FUNCTION check_entity_reported TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_report IS 'Creates a report for an entity (handles both BIGINT and UUID target IDs)';
COMMENT ON FUNCTION check_entity_reported IS 'Checks if the current user has reported an entity (handles both BIGINT and UUID target IDs)';
COMMENT ON COLUMN reports.target_id IS 'ID of the reported entity (stored as TEXT to handle both BIGINT and UUID types)';
