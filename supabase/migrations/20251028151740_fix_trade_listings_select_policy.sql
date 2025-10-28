-- =====================================================
-- Fix trade_listings SELECT policy
-- =====================================================
-- Purpose: Allow users to view their own listings regardless of status
-- Issue: The SELECT policy only allowed viewing active listings,
--        preventing owners from updating their listings to other statuses
-- =====================================================

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Public read access for active listings" ON trade_listings;

CREATE POLICY "Public read access for active listings" ON trade_listings
    FOR SELECT USING (
        status = 'active' OR auth.uid() = user_id
    );

COMMENT ON POLICY "Public read access for active listings" ON trade_listings IS
'Allows public to view active listings, and users to view their own listings regardless of status';
