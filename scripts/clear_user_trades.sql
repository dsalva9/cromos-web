-- =====================================================================
-- Clear all trade proposals and chats for a specific user
-- =====================================================================
-- Usage: Replace 'YOUR_USER_EMAIL_HERE' with the actual user email
-- This will DELETE all proposals where the user is sender or receiver
-- and all associated chat messages will be CASCADE deleted automatically
-- =====================================================================

-- STEP 1: Get the user ID by email
SELECT 
  id,
  email,
  raw_user_meta_data->>'nickname' as nickname
FROM auth.users
WHERE email = 'YOUR_USER_EMAIL_HERE';

-- Copy the user ID from above, then use it in the DELETE statements below

-- =====================================================================
-- STEP 2: Preview what will be deleted (SAFE - just SELECT)
-- =====================================================================

-- Preview proposals where user is sender
SELECT 
  id,
  from_user,
  to_user,
  status,
  created_at,
  'Sender' as role
FROM trade_proposals
WHERE from_user = 'PASTE_USER_ID_HERE';

-- Preview proposals where user is receiver
SELECT 
  id,
  from_user,
  to_user,
  status,
  created_at,
  'Receiver' as role
FROM trade_proposals
WHERE to_user = 'PASTE_USER_ID_HERE';

-- Preview all proposals (both directions)
SELECT 
  COUNT(*) as total_proposals,
  COUNT(CASE WHEN from_user = 'PASTE_USER_ID_HERE' THEN 1 END) as sent_proposals,
  COUNT(CASE WHEN to_user = 'PASTE_USER_ID_HERE' THEN 1 END) as received_proposals
FROM trade_proposals
WHERE from_user = 'PASTE_USER_ID_HERE' 
   OR to_user = 'PASTE_USER_ID_HERE';

-- Preview chat messages that will be deleted (via CASCADE)
SELECT 
  COUNT(*) as total_messages
FROM trade_chats
WHERE trade_id IN (
  SELECT id 
  FROM trade_proposals 
  WHERE from_user = 'PASTE_USER_ID_HERE' 
     OR to_user = 'PASTE_USER_ID_HERE'
);

-- =====================================================================
-- STEP 3: DELETE all proposals and chats (DESTRUCTIVE!)
-- =====================================================================
-- WARNING: This will permanently delete all proposals and chats
-- The CASCADE will automatically delete:
--   - trade_proposal_items
--   - trade_chats
--   - trade_reads
--   - trades_history
-- =====================================================================

-- Delete all proposals where user is involved (sender OR receiver)
DELETE FROM trade_proposals
WHERE from_user = 'PASTE_USER_ID_HERE' 
   OR to_user = 'PASTE_USER_ID_HERE';

-- Verify deletion
SELECT COUNT(*) as remaining_proposals
FROM trade_proposals
WHERE from_user = 'PASTE_USER_ID_HERE' 
   OR to_user = 'PASTE_USER_ID_HERE';
-- Should return 0

-- =====================================================================
-- ALTERNATIVE: Delete specific proposals by status
-- =====================================================================

-- Delete only PENDING proposals
DELETE FROM trade_proposals
WHERE (from_user = 'PASTE_USER_ID_HERE' OR to_user = 'PASTE_USER_ID_HERE')
  AND status = 'pending';

-- Delete only REJECTED/CANCELLED proposals
DELETE FROM trade_proposals
WHERE (from_user = 'PASTE_USER_ID_HERE' OR to_user = 'PASTE_USER_ID_HERE')
  AND status IN ('rejected', 'cancelled');

-- Keep ACCEPTED proposals, delete everything else
DELETE FROM trade_proposals
WHERE (from_user = 'PASTE_USER_ID_HERE' OR to_user = 'PASTE_USER_ID_HERE')
  AND status != 'accepted';

-- =====================================================================
-- STEP 4: Clean up orphaned trade_reads (optional)
-- =====================================================================
-- These should be auto-deleted via CASCADE, but just in case:

DELETE FROM trade_reads
WHERE user_id = 'PASTE_USER_ID_HERE';

-- =====================================================================
-- Complete cleanup verification
-- =====================================================================

SELECT 
  'trade_proposals' as table_name,
  COUNT(*) as remaining_rows
FROM trade_proposals
WHERE from_user = 'PASTE_USER_ID_HERE' 
   OR to_user = 'PASTE_USER_ID_HERE'
UNION ALL
SELECT 
  'trade_chats' as table_name,
  COUNT(*) as remaining_rows
FROM trade_chats tc
JOIN trade_proposals tp ON tp.id = tc.trade_id
WHERE tp.from_user = 'PASTE_USER_ID_HERE' 
   OR tp.to_user = 'PASTE_USER_ID_HERE'
UNION ALL
SELECT 
  'trade_reads' as table_name,
  COUNT(*) as remaining_rows
FROM trade_reads
WHERE user_id = 'PASTE_USER_ID_HERE';

-- All should return 0 after deletion

