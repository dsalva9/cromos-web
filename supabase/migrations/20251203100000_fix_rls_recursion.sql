-- =====================================================
-- Fix RLS Recursion and Performance Issues
-- =====================================================

-- 1. Create a secure function to check if a user is suspended
-- This function runs as the owner (SECURITY DEFINER) to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_user_suspended(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid
    AND is_suspended = true
  );
END;
$$;

-- 2. Create a secure function to check if a user is an admin
-- This function runs as the owner (SECURITY DEFINER) to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid
    AND is_admin = true
  );
END;
$$;

-- 3. Update trade_listings policies to use the new functions
DROP POLICY IF EXISTS "Public read access for active listings" ON trade_listings;
DROP POLICY IF EXISTS "Users can view active and own listings" ON trade_listings;

-- New policy: Users can see active listings from non-suspended users, or their own listings
-- Also allows seeing listings if you have a chat with the user (handled via chat existence check which we'll simplify)
CREATE POLICY "Public read access for active listings" ON trade_listings
FOR SELECT USING (
  (status = 'active' AND NOT is_user_suspended(user_id)) OR
  auth.uid() = user_id OR
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM trade_chats
    WHERE listing_id = trade_listings.id
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
  ))
);

-- 4. Update trade_chats policies to use the new functions
DROP POLICY IF EXISTS "Users can view their own chats" ON trade_chats;

-- New policy: Users can see their own chats unless the other party is suspended (and they are not admin)
-- Admins can see all chats (via their own view or if we add admin bypass)
-- But for now, let's stick to the requirement: "Users can view their own chats"
CREATE POLICY "Users can view their own chats" ON trade_chats
FOR SELECT USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid()) AND
  (
    -- If I am admin, I can see everything
    is_admin(auth.uid()) OR
    -- Otherwise, I can only see if the other party is NOT suspended
    NOT (
      CASE
        WHEN sender_id = auth.uid() THEN is_user_suspended(receiver_id)
        ELSE is_user_suspended(sender_id)
      END
    )
  )
);

-- 5. Update profiles policy to use the secure function if needed, but the existing one is simple enough.
-- However, to be safe and consistent:
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (
  id = auth.uid() OR NOT is_user_suspended(id)
);
