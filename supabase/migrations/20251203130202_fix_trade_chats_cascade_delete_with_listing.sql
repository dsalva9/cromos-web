-- Fix trade_chats foreign key to CASCADE delete instead of SET NULL
-- This prevents constraint violations when deleting listings

-- The problem: When a listing is deleted, ON DELETE SET NULL sets listing_id to NULL
-- But the constraint requires EITHER trade_id OR listing_id to be NOT NULL
-- So setting listing_id to NULL when trade_id is also NULL violates the constraint

-- The solution: Change to CASCADE so chats are deleted with the listing

-- Drop the existing constraint
ALTER TABLE trade_chats
DROP CONSTRAINT IF EXISTS trade_chats_listing_id_fkey;

-- Recreate it with CASCADE delete
ALTER TABLE trade_chats
ADD CONSTRAINT trade_chats_listing_id_fkey
FOREIGN KEY (listing_id)
REFERENCES trade_listings(id)
ON DELETE CASCADE;  -- Changed from SET NULL to CASCADE

COMMENT ON CONSTRAINT trade_chats_listing_id_fkey ON trade_chats IS
'Foreign key to listing. CASCADE deletes chats when listing is deleted to avoid constraint violations.';
