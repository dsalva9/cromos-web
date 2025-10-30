-- =====================================================
-- Fix listing visibility for chat participants
-- =====================================================
-- Purpose: Allow users who have opened a chat about a listing
-- to continue viewing that listing even after it's reserved/completed
-- =====================================================

-- Drop and recreate SELECT policy to include chat participants
DROP POLICY IF EXISTS "Public read access for active listings" ON trade_listings;

CREATE POLICY "Public read access for active listings" ON trade_listings
    FOR SELECT USING (
        -- Public can view active listings
        status = 'active'
        -- OR user is the listing owner
        OR auth.uid() = user_id
        -- OR user has participated in chat about this listing
        OR (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM trade_chats
                WHERE trade_chats.listing_id = trade_listings.id
                AND (
                    trade_chats.sender_id = auth.uid()
                    OR trade_chats.receiver_id = auth.uid()
                )
            )
        )
    );

COMMENT ON POLICY "Public read access for active listings" ON trade_listings IS
'Allows public to view active listings, users to view their own listings, and chat participants to view listings they have inquired about';

-- Force refresh of RLS policies by terminating active connections
-- This ensures the new policy takes effect immediately
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
AND pid <> pg_backend_pid()
AND usename = current_user;
