-- =====================================================
-- Fix trade_listings UPDATE policy
-- =====================================================
-- Purpose: Add WITH CHECK clause to allow status updates
-- Issue: Users cannot update their listings to 'sold' or other statuses
-- =====================================================

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own listings" ON trade_listings;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Users can update their own listings" ON trade_listings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update their own listings" ON trade_listings IS
'Allows users to update their own listings, including status changes';
