-- ============================================================================
-- Migration: Fix removed listings audit trail
--
-- Fixes three issues:
-- 1. soft_delete_listing() doesn't set deletion_type = 'user'
-- 2. update_listing_status() allows 'removed' without audit trail
-- 3. Backfill retention_schedule for ~437 orphaned removed listings
--    that went through update_listing_status and have no retention entry
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Fix soft_delete_listing to set deletion_type = 'user'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."soft_delete_listing"("p_listing_id" bigint)
RETURNS TABLE("success" boolean, "message" "text", "previous_status" "text", "new_status" "text")
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing_user_id UUID;
  v_current_status TEXT;
BEGIN
  -- =====================================================
  -- 1. VALIDATION
  -- =====================================================
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if listing exists and get current status
  SELECT user_id, status 
  INTO v_listing_user_id, v_current_status
  FROM trade_listings 
  WHERE id = p_listing_id;
  
  IF v_listing_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Listing not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if user owns the listing
  IF v_listing_user_id <> v_user_id THEN
    RETURN QUERY SELECT false, 'Permission denied: You can only delete your own listings'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if current status is 'active' (only allow soft delete from active)
  IF v_current_status <> 'active' THEN
    RETURN QUERY SELECT false, 'Can only soft delete listings with ACTIVE status'::TEXT, v_current_status, NULL::TEXT;
    RETURN;
  END IF;
  
  -- =====================================================
  -- 2. SOFT DELETE - Update status to 'removed'
  -- =====================================================
  
  UPDATE trade_listings 
  SET status = 'removed',
      deleted_at = NOW(),
      deletion_type = 'user',
      updated_at = NOW()
  WHERE id = p_listing_id 
  AND user_id = v_user_id;
  
  -- Verify update was successful
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Failed to update listing status'::TEXT, v_current_status, NULL::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- 3. CREATE RETENTION SCHEDULE ENTRY
  -- =====================================================

  INSERT INTO retention_schedule (
    entity_type, entity_id, action, scheduled_for, reason, initiated_by_type
  ) VALUES (
    'listing',
    p_listing_id::text,
    'delete',
    NOW() + interval '90 days',
    'user_deleted',
    'user'
  )
  ON CONFLICT (entity_type, entity_id, action) DO UPDATE SET
    scheduled_for = NOW() + interval '90 days',
    reason = 'user_deleted',
    initiated_by_type = 'user',
    processed_at = NULL;
  
  -- =====================================================
  -- 4. RETURN SUCCESS RESPONSE
  -- =====================================================
  
  RETURN QUERY SELECT 
    true, 
    'Listing status updated to removed successfully'::TEXT, 
    v_current_status,
    'removed'::TEXT;
    
END;
$$;

COMMENT ON FUNCTION "public"."soft_delete_listing"("p_listing_id" bigint) IS '
Soft delete functionality for marketplace listings:
- Changes status from ACTIVE to removed
- Sets deleted_at timestamp and deletion_type = user
- Creates retention_schedule entry for hard deletion after 90 days
- Only works on listings with ACTIVE status
- Users can only soft delete their own listings
- Listing remains in database but hidden from public view
';

-- ─────────────────────────────────────────────────────────────
-- 2. Remove ''removed'' from update_listing_status allowed values
--    Users must go through soft_delete_listing() or delete_listing()
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."update_listing_status"("p_listing_id" bigint, "p_new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Validate new status (removed is no longer allowed here - use soft_delete_listing or delete_listing)
    IF p_new_status NOT IN ('active', 'sold') THEN
        RAISE EXCEPTION 'Invalid status. Must be one of: active, sold. Use soft_delete_listing() to remove a listing.';
    END IF;
    
    -- Get user info
    SELECT id, is_admin INTO v_user_id, v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update the listing
    UPDATE trade_listings
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_listing_id
    AND (
        -- User can update their own listings
        user_id = v_user_id
        OR
        -- Admins can update any listing
        v_is_admin = TRUE
    );
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found or you do not have permission to update it';
    END IF;
END;
$$;

COMMENT ON FUNCTION "public"."update_listing_status"("p_listing_id" bigint, "p_new_status" "text") IS 
  'Updates listing status to active or sold. To remove a listing use soft_delete_listing() instead.';

-- ─────────────────────────────────────────────────────────────
-- 3. Backfill: Create retention_schedule entries for orphaned
--    removed listings that have no retention entry.
--    These will be archived after 90 days from their deleted_at.
-- ─────────────────────────────────────────────────────────────
INSERT INTO retention_schedule (
    entity_type,
    entity_id,
    action,
    scheduled_for,
    reason,
    initiated_by_type,
    created_at
)
SELECT
    'listing',
    id::text,
    'delete',
    deleted_at + INTERVAL '90 days',
    'user_deleted',
    'user',
    deleted_at
FROM trade_listings
WHERE status = 'removed'
  AND deleted_at IS NOT NULL
  AND deletion_type IS NULL
  AND expiry_scheduled_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM retention_schedule rs
      WHERE rs.entity_type = 'listing'
        AND rs.entity_id = trade_listings.id::text
        AND rs.action = 'delete'
  );

-- Also backfill deletion_type for the orphans
UPDATE trade_listings
SET deletion_type = 'user'
WHERE status = 'removed'
  AND deleted_at IS NOT NULL
  AND deletion_type IS NULL
  AND expiry_scheduled_at IS NULL;

-- Add 'system' to deletion_type check constraint before backfilling
ALTER TABLE public.trade_listings DROP CONSTRAINT IF EXISTS trade_listings_deletion_type_check;
ALTER TABLE public.trade_listings ADD CONSTRAINT trade_listings_deletion_type_check 
  CHECK (deletion_type = ANY (ARRAY['user'::text, 'admin'::text, 'system'::text]));

-- Backfill deletion_type = 'system' for auto-expired listings
UPDATE trade_listings
SET deletion_type = 'system'
WHERE status = 'removed'
  AND deleted_at IS NOT NULL
  AND deletion_type IS NULL
  AND expiry_scheduled_at IS NOT NULL;
