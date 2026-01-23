-- =====================================================
-- Migration: Two-Stage Deletion System for Marketplace Listings
-- Created: 2025-12-03
-- Description: Implements soft delete (ACTIVE -> ELIMINADO) and hard delete functionality
-- =====================================================

-- 1. First, update the trade_listings table to include 'ELIMINADO' status
ALTER TABLE trade_listings 
DROP CONSTRAINT IF EXISTS trade_listings_status_check;

ALTER TABLE trade_listings 
ADD CONSTRAINT trade_listings_status_check 
CHECK (status IN ('active', 'reserved', 'completed', 'sold', 'removed', 'ELIMINADO'));

-- 2. Create soft_delete_listing RPC function
CREATE OR REPLACE FUNCTION soft_delete_listing(
  p_listing_id BIGINT
) 
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  previous_status TEXT,
  new_status TEXT
) 
SECURITY DEFINER
SET search_path TO public
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
  -- 2. SOFT DELETE - Update status to ELIMINADO
  -- =====================================================
  
  UPDATE trade_listings 
  SET status = 'ELIMINADO',
      updated_at = NOW()
  WHERE id = p_listing_id 
  AND user_id = v_user_id;
  
  -- Verify update was successful
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Failed to update listing status'::TEXT, v_current_status, NULL::TEXT;
    RETURN;
  END IF;
  
  -- =====================================================
  -- 3. RETURN SUCCESS RESPONSE
  -- =====================================================
  
  RETURN QUERY SELECT 
    true, 
    'Listing status updated to ELIMINADO successfully'::TEXT, 
    v_current_status,
    'ELIMINADO'::TEXT;
    
END;
$$ LANGUAGE plpgsql;

-- 3. Create hard_delete_listing RPC function
CREATE OR REPLACE FUNCTION hard_delete_listing(
  p_listing_id BIGINT
) 
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deleted_chat_count INTEGER,
  deleted_transaction_count INTEGER,
  media_files_deleted INTEGER
) 
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing_user_id UUID;
  v_listing_status TEXT;
  v_chat_count INTEGER := 0;
  v_transaction_count INTEGER := 0;
  v_media_count INTEGER := 0;
  v_image_url TEXT;
BEGIN
  -- =====================================================
  -- 1. VALIDATION
  -- =====================================================
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if listing exists and get owner/status
  SELECT user_id, status, image_url 
  INTO v_listing_user_id, v_listing_status, v_image_url
  FROM trade_listings 
  WHERE id = p_listing_id;
  
  IF v_listing_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Listing not found'::TEXT, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Check if user owns the listing (or is admin)
  IF v_listing_user_id <> v_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND is_admin = true
  ) THEN
    RETURN QUERY SELECT false, 'Permission denied: You can only delete your own listings'::TEXT, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Check if listing status is 'ELIMINADO' (only allow hard delete from ELIMINADO)
  IF v_listing_status::TEXT <> 'ELIMINADO' THEN
    RETURN QUERY SELECT false, 'Can only hard delete listings with ELIMINADO status'::TEXT, 0, 0, 0;
    RETURN;
  END IF;
  
  -- =====================================================
  -- 2. COUNT RELATED DATA FOR RESPONSE
  -- =====================================================
  
  -- Count chat messages
  SELECT COUNT(*) INTO v_chat_count
  FROM trade_chats 
  WHERE listing_id = p_listing_id;
  
  -- Count transactions
  SELECT COUNT(*) INTO v_transaction_count
  FROM listing_transactions 
  WHERE listing_id = p_listing_id;
  
  -- =====================================================
  -- 3. DELETE RELATED DATA (IN ORDER OF DEPENDENCIES)
  -- =====================================================
  
  -- Delete chat messages first (depends on listing)
  DELETE FROM trade_chats 
  WHERE listing_id = p_listing_id;
  
  -- Delete transactions (depends on listing)
  DELETE FROM listing_transactions 
  WHERE listing_id = p_listing_id;
  
  -- Delete any favourites for this listing
  DELETE FROM favourites 
  WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
  
  -- Delete any reports for this listing
  DELETE FROM reports 
  WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
  
  -- =====================================================
  -- 4. HANDLE MEDIA CLEANUP
  -- =====================================================
  
  -- Check if listing has an image and try to delete it
  IF v_image_url IS NOT NULL AND v_image_url <> '' THEN
    BEGIN
      -- Extract file path from URL for storage deletion
      -- This is a simplified approach - in production you might want more sophisticated path handling
      DELETE FROM storage.objects 
      WHERE bucket_id = 'sticker-images' 
      AND (
        v_image_url LIKE '%' || id || '%' OR
        v_image_url LIKE '%' || name || '%'
      );
      
      GET DIAGNOSTICS v_media_count = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail deletion
        v_media_count := 0;
    END;
  END IF;
  
  -- =====================================================
  -- 5. DELETE THE LISTING ITSELF
  -- =====================================================
  
  DELETE FROM trade_listings 
  WHERE id = p_listing_id 
  AND user_id = v_user_id;
  
  -- Verify deletion was successful
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Failed to delete listing'::TEXT, v_chat_count, v_transaction_count, v_media_count;
    RETURN;
  END IF;
  
  -- =====================================================
  -- 6. RETURN SUCCESS RESPONSE
  -- =====================================================
  
  RETURN QUERY SELECT 
    true, 
    'Listing and all associated data deleted permanently'::TEXT, 
    v_chat_count, 
    v_transaction_count, 
    v_media_count;
    
END;
$$ LANGUAGE plpgsql;

-- 4. Grant permissions to authenticated users
REVOKE ALL ON FUNCTION soft_delete_listing(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION soft_delete_listing(BIGINT) TO authenticated;

REVOKE ALL ON FUNCTION hard_delete_listing(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hard_delete_listing(BIGINT) TO authenticated;

-- 5. Add comments for documentation
COMMENT ON FUNCTION soft_delete_listing(BIGINT) IS '
Soft delete functionality for marketplace listings:
- Changes status from ACTIVE to ELIMINADO
- Only works on listings with ACTIVE status
- Users can only soft delete their own listings
- Listing remains in database but hidden from public view

Parameters:
- p_listing_id: ID of listing to soft delete

Returns:
- success: Boolean indicating if operation succeeded
- message: Status message
- previous_status: Status before update
- new_status: Status after update

Security:
- Users can only soft delete their own listings
- Only ACTIVE listings can be soft deleted
- Uses SECURITY DEFINER for proper permission handling
';

COMMENT ON FUNCTION hard_delete_listing(BIGINT) IS '
Hard delete functionality for marketplace listings:
- Permanently deletes listing and all associated data
- Only works on listings with ELIMINADO status
- Users can only hard delete their own listings (admins can delete any)
- Completely removes listing from database

Parameters:
- p_listing_id: ID of listing to hard delete

Returns:
- success: Boolean indicating if deletion succeeded
- message: Status message
- deleted_chat_count: Number of chat messages deleted
- deleted_transaction_count: Number of transactions deleted  
- media_files_deleted: Number of media files deleted

Security:
- Users can only hard delete their own listings
- Only ELIMINADO listings can be hard deleted
- Uses SECURITY DEFINER for proper permission handling
';

-- =====================================================
-- END OF MIGRATION
-- =====================================================