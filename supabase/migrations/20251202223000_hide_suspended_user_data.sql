-- =====================================================
-- HIDE SUSPENDED USER DATA
-- =====================================================
-- Purpose: Hide marketplace listings and prevent interactions with suspended users
-- =====================================================

-- 1. Update RLS policy for trade_listings to exclude suspended users' listings
DROP POLICY IF EXISTS "Users can view active and own listings" ON trade_listings;

CREATE POLICY "Users can view active and own listings"
ON trade_listings
FOR SELECT
TO authenticated
USING (
  -- User can see their own listings regardless of status
  user_id = auth.uid()
  OR (
    -- Or can see listings that are:
    -- 1. Not removed
    status != 'removed'
    -- 2. From users who are not suspended
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = trade_listings.user_id
      AND profiles.is_suspended = true
    )
  )
);

-- 2. Prevent viewing profiles of suspended users (except admins and self)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  id = auth.uid()
  -- Admins can see all profiles
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
  -- Other users can only see non-suspended profiles
  OR is_suspended = false
);

-- 3. Prevent chat messages with suspended users
DROP POLICY IF EXISTS "Users can view their own chats" ON trade_chats;

CREATE POLICY "Users can view their own chats"
ON trade_chats
FOR SELECT
TO authenticated
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND (
    -- Allow if user is viewing their own messages
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
  )
  AND (
    -- Block if either party is suspended (unless viewing own profile as admin)
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id = trade_chats.sender_id OR profiles.id = trade_chats.receiver_id)
      AND profiles.is_suspended = true
      AND profiles.id != auth.uid() -- Allow suspended users to see their own chats
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true -- Admins can see all chats
    )
  )
);

-- 4. Prevent creating new chats with suspended users
DROP POLICY IF EXISTS "Users can create chats" ON trade_chats;

CREATE POLICY "Users can create chats"
ON trade_chats
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the sender
  sender_id = auth.uid()
  AND (
    -- Neither sender nor receiver can be suspended
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id IN (sender_id, receiver_id)
      AND profiles.is_suspended = true
    )
  )
);

-- 5. Prevent reservations on suspended user listings
DROP POLICY IF EXISTS "Users can create listing transactions" ON listing_transactions;

CREATE POLICY "Users can create listing transactions"
ON listing_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the buyer
  buyer_id = auth.uid()
  AND (
    -- Seller cannot be suspended
    NOT EXISTS (
      SELECT 1 FROM profiles p
      JOIN trade_listings tl ON tl.user_id = p.id
      WHERE tl.id = listing_id
      AND p.is_suspended = true
    )
  )
);

COMMENT ON POLICY "Users can view active and own listings" ON trade_listings IS
'Users can see their own listings and active listings from non-suspended users';

COMMENT ON POLICY "Public profiles are viewable by everyone" ON profiles IS
'Users can see their own profile, admins see all, others see only non-suspended profiles';

COMMENT ON POLICY "Users can view their own chats" ON trade_chats IS
'Users can view chats except with suspended users (unless admin or viewing own)';

COMMENT ON POLICY "Users can create chats" ON trade_chats IS
'Prevents creating new chats with suspended users';

COMMENT ON POLICY "Users can create listing transactions" ON listing_transactions IS
'Prevents reserving listings from suspended users';
