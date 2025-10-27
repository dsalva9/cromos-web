-- =====================================================
-- SOCIAL AND REPUTATION: Create universal reports system
-- =====================================================
-- Purpose: Enable users to report inappropriate content
-- Model: Unified reports table with type discriminator and status
-- =====================================================

-- TABLE: reports
-- Unified table for all report types
CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'template', 'user', 'rating')),
    target_id BIGINT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN (
        'spam', 'inappropriate_content', 'harassment', 'copyright_violation', 
        'misleading_information', 'fake_listing', 'offensive_language', 'other'
    )),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_target_report UNIQUE(reporter_id, target_type, target_id)
);

-- Create indices for performance
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status) WHERE status = 'pending';
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE reports IS 'Unified table for all report types (listings, templates, users, ratings)';
COMMENT ON COLUMN reports.target_type IS 'Type of reported entity: listing, template, user, or rating';
COMMENT ON COLUMN reports.reason IS 'Reason for the report';
COMMENT ON COLUMN reports.status IS 'Current status of the report';
COMMENT ON COLUMN reports.admin_notes IS 'Notes added by administrators during review';

-- Enable RLS (Row Level Security)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Users can insert their own reports
CREATE POLICY "Users can create their own reports" ON reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- 2. Users can read their own reports
CREATE POLICY "Users can read their own reports" ON reports
    FOR SELECT USING (reporter_id = auth.uid());

-- 3. Admins can read all reports
CREATE POLICY "Admins can read all reports" ON reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- 4. Admins can update all reports
CREATE POLICY "Admins can update all reports" ON reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Add admin_id column for tracking which admin handled the report
ALTER TABLE reports 
ADD COLUMN admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add comment for admin_id column
COMMENT ON COLUMN reports.admin_id IS 'ID of the admin who processed the report';

-- Create index for admin_id
CREATE INDEX idx_reports_admin ON reports(admin_id) WHERE admin_id IS NOT NULL;

-- RPCs for reports management

-- FUNCTION 1: create_report
-- Creates a report for an entity
CREATE OR REPLACE FUNCTION create_report(
    p_target_type TEXT,
    p_target_id BIGINT,
    p_reason TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
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
        WHERE id = p_target_id;
    ELSIF p_target_type = 'template' THEN
        SELECT (author_id = auth.uid()) INTO v_is_author
        FROM collection_templates
        WHERE id = p_target_id;
    ELSIF p_target_type = 'user' THEN
        SELECT (id = auth.uid()) INTO v_is_author
        FROM profiles
        WHERE id = p_target_id::UUID;
    ELSIF p_target_type = 'rating' THEN
        SELECT (rater_id = auth.uid() OR rated_id = auth.uid()) INTO v_is_author
        FROM user_ratings
        WHERE id = p_target_id;
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

-- FUNCTION 2: get_reports
-- Gets reports with optional filtering (for admins)
CREATE OR REPLACE FUNCTION get_reports(
    p_status TEXT DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    reporter_id UUID,
    reporter_nickname TEXT,
    target_type TEXT,
    target_id BIGINT,
    reason TEXT,
    description TEXT,
    status TEXT,
    admin_notes TEXT,
    admin_id UUID,
    admin_nickname TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        r.id,
        r.reporter_id,
        rp.nickname AS reporter_nickname,
        r.target_type,
        r.target_id,
        r.reason,
        r.description,
        r.status,
        r.admin_notes,
        r.admin_id,
        ap.nickname AS admin_nickname,
        r.created_at,
        r.updated_at
    FROM reports r
    JOIN profiles rp ON r.reporter_id = rp.id
    LEFT JOIN profiles ap ON r.admin_id = ap.id
    WHERE (p_status IS NULL OR r.status = p_status)
    AND (p_target_type IS NULL OR r.target_type = p_target_type)
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 3: update_report_status
-- Updates the status of a report (for admins)
CREATE OR REPLACE FUNCTION update_report_status(
    p_report_id BIGINT,
    p_status TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- Update the report
    UPDATE reports
    SET 
        status = p_status, 
        admin_notes = p_admin_notes,
        admin_id = auth.uid(),
        updated_at = NOW()
    WHERE id = p_report_id;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;
END;
$$;

-- FUNCTION 4: get_user_reports
-- Gets reports submitted by the current user
CREATE OR REPLACE FUNCTION get_user_reports(
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    target_type TEXT,
    target_id BIGINT,
    reason TEXT,
    description TEXT,
    status TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.target_type,
        r.target_id,
        r.reason,
        r.description,
        r.status,
        r.admin_notes,
        r.created_at,
        r.updated_at
    FROM reports r
    WHERE r.reporter_id = auth.uid()
    AND (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 5: check_entity_reported
-- Checks if the current user has reported an entity
CREATE OR REPLACE FUNCTION check_entity_reported(
    p_target_type TEXT,
    p_target_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_reports TO authenticated;
GRANT EXECUTE ON FUNCTION update_report_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_reports TO authenticated;
GRANT EXECUTE ON FUNCTION check_entity_reported TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_report IS 'Creates a report for an entity';
COMMENT ON FUNCTION get_reports IS 'Gets reports with optional filtering (for admins)';
COMMENT ON FUNCTION update_report_status IS 'Updates the status of a report (for admins)';
COMMENT ON FUNCTION get_user_reports IS 'Gets reports submitted by the current user';
COMMENT ON FUNCTION check_entity_reported IS 'Checks if the current user has reported an entity';
