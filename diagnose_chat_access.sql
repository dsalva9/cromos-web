-- Diagnostic query to understand chat access issue
-- Run this in Supabase SQL Editor while logged in as the buyer

-- 1. Check current user
SELECT auth.uid() as current_user_id;

-- 2. Check if listing exists and its status (run with SECURITY DEFINER privileges)
SELECT id, title, status, user_id as owner_id
FROM trade_listings
WHERE id = YOUR_LISTING_ID_HERE;  -- Replace with actual listing ID

-- 3. Check if user has any chat participation
SELECT COUNT(*) as message_count
FROM trade_chats
WHERE listing_id = YOUR_LISTING_ID_HERE
AND (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 4. Test the RLS policy directly
SELECT
    CASE
        WHEN status = 'active' THEN 'Policy: active listing'
        WHEN auth.uid() = user_id THEN 'Policy: owner'
        WHEN EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = trade_listings.id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
        ) THEN 'Policy: chat participant'
        ELSE 'Policy: DENIED'
    END as access_reason,
    id, title, status, user_id as owner_id
FROM trade_listings
WHERE id = YOUR_LISTING_ID_HERE;
