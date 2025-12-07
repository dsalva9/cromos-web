-- =====================================================
-- PHASE 6: RLS POLICY UPDATES FOR DELETED USERS
-- =====================================================
-- Hide deleted/suspended users and their content from non-admins
-- Admins can see everything with deletion indicators
-- =====================================================

-- =====================================================
-- FUNCTION: check_user_visibility
-- =====================================================
-- Determines if a user should be visible to current viewer
-- Returns TRUE if user is visible (active or viewer is admin)
-- Returns FALSE if user is deleted/suspended and viewer is not admin
CREATE OR REPLACE FUNCTION check_user_visibility(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_is_deleted BOOLEAN;
    v_is_suspended BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if target user is deleted or suspended
    SELECT
        deleted_at IS NOT NULL,
        suspended_at IS NOT NULL
    INTO v_is_deleted, v_is_suspended
    FROM profiles
    WHERE id = p_user_id;

    -- If user not found, not visible
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If user is active (not deleted and not suspended), always visible
    IF NOT v_is_deleted AND NOT v_is_suspended THEN
        RETURN TRUE;
    END IF;

    -- If user is deleted or suspended, only visible to admins
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

COMMENT ON FUNCTION check_user_visibility IS
    'Returns TRUE if user should be visible to current viewer. Deleted/suspended users only visible to admins.';

GRANT EXECUTE ON FUNCTION check_user_visibility TO authenticated, anon;

-- =====================================================
-- UPDATE RLS POLICIES: PROFILES
-- =====================================================
-- Hide deleted/suspended users from non-admins

-- Drop existing public view policy
DROP POLICY IF EXISTS "Public can view active users only" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- New policy: Only show active users to public
CREATE POLICY "Public can view active users only" ON profiles
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND suspended_at IS NULL
    );

-- Keep existing admin policy (or create if doesn't exist)
DROP POLICY IF EXISTS "Admins can view all users including deleted" ON profiles;

CREATE POLICY "Admins can view all users including deleted" ON profiles
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Users can always view their own profile (even if deleted/suspended)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- =====================================================
-- UPDATE RLS POLICIES: TRADE_LISTINGS
-- =====================================================
-- Hide listings from deleted/suspended users

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access for active listings" ON trade_listings;
DROP POLICY IF EXISTS "Users can view own listings" ON trade_listings;
DROP POLICY IF EXISTS "Admins can view all listings including deleted" ON trade_listings;

-- Public can only see active listings from active users
CREATE POLICY "Public can view active listings from active users" ON trade_listings
    FOR SELECT
    USING (
        status = 'active'
        AND deleted_at IS NULL
        AND check_user_visibility(user_id)  -- Hide if owner is deleted/suspended
    );

-- Users can view their own listings (even deleted)
CREATE POLICY "Users can view own listings" ON trade_listings
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Admins can view all listings
CREATE POLICY "Admins can view all listings including deleted" ON trade_listings
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- =====================================================
-- UPDATE RLS POLICIES: COLLECTION_TEMPLATES
-- =====================================================
-- Hide templates from deleted/suspended users

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active public templates" ON collection_templates;
DROP POLICY IF EXISTS "Public can view public templates" ON collection_templates;
DROP POLICY IF EXISTS "Authors can view own templates" ON collection_templates;
DROP POLICY IF EXISTS "Admins can view all templates including deleted" ON collection_templates;

-- Public can only see active public templates from active users
CREATE POLICY "Public can view active public templates from active users" ON collection_templates
    FOR SELECT
    USING (
        is_public = TRUE
        AND deleted_at IS NULL
        AND check_user_visibility(author_id)  -- Hide if author is deleted/suspended
    );

-- Authors can view their own templates (even deleted)
CREATE POLICY "Authors can view own templates" ON collection_templates
    FOR SELECT
    USING (
        author_id = auth.uid()
    );

-- Admins can view all templates
CREATE POLICY "Admins can view all templates including deleted" ON collection_templates
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- =====================================================
-- UPDATE RLS POLICIES: TRADE_CHATS
-- =====================================================
-- Hide chats involving deleted/suspended users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their active chats" ON trade_chats;
DROP POLICY IF EXISTS "Users can view their chats" ON trade_chats;
DROP POLICY IF EXISTS "Admins can view all chats including deleted users" ON trade_chats;

-- Users can only see chats where both participants are active
CREATE POLICY "Users can view chats with active participants" ON trade_chats
    FOR SELECT
    USING (
        (sender_id = auth.uid() OR receiver_id = auth.uid())
        AND check_user_visibility(sender_id)
        AND check_user_visibility(receiver_id)
    );

-- Admins can view all chats
CREATE POLICY "Admins can view all chats including deleted users" ON trade_chats
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- =====================================================
-- UPDATE RLS POLICIES: USER_RATINGS
-- =====================================================
-- Hide ratings involving deleted/suspended users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view ratings for active users" ON user_ratings;
DROP POLICY IF EXISTS "Public can view ratings" ON user_ratings;

-- Public can only see ratings between active users
CREATE POLICY "Public can view ratings between active users" ON user_ratings
    FOR SELECT
    USING (
        check_user_visibility(rater_id)
        AND check_user_visibility(rated_id)
    );

-- Admins can view all ratings
DROP POLICY IF EXISTS "Admins can view all ratings" ON user_ratings;

CREATE POLICY "Admins can view all ratings" ON user_ratings
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- =====================================================
-- UPDATE RLS POLICIES: TEMPLATE_RATINGS
-- =====================================================
-- Hide ratings from deleted/suspended users

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view template ratings from active users" ON template_ratings;
DROP POLICY IF EXISTS "Anyone can view template ratings" ON template_ratings;

-- Public can only see ratings from active users
CREATE POLICY "Public can view ratings from active users" ON template_ratings
    FOR SELECT
    USING (
        check_user_visibility(user_id)
    );

-- Admins can view all template ratings
DROP POLICY IF EXISTS "Admins can view all template ratings" ON template_ratings;

CREATE POLICY "Admins can view all template ratings" ON template_ratings
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- =====================================================
-- MIGRATION COMPLETE - PHASE 6
-- =====================================================
-- All RLS policies updated to hide deleted/suspended users
-- Admins can see everything
-- Normal users see only active content from active users
-- Users can always see their own content
-- =====================================================
