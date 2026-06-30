-- Migration: fix_hard_delete_removed_status
-- Update hard_delete_listing function to support both ELIMINADO and removed status,
-- and fix admin deletion permission (allow deleting listing where owner is not admin).

CREATE OR REPLACE FUNCTION "public"."hard_delete_listing"("p_listing_id" bigint) RETURNS TABLE("success" boolean, "message" "text", "deleted_chat_count" integer, "deleted_transaction_count" integer, "media_files_deleted" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  
  -- Check if listing status is 'ELIMINADO' or 'removed'
  IF v_listing_status::TEXT NOT IN ('ELIMINADO', 'removed') THEN
    RETURN QUERY SELECT false, 'Can only hard delete listings with ELIMINADO or removed status'::TEXT, 0, 0, 0;
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
  
  -- Delete any favourites for this listing - CAST BIGINT TO TEXT
  DELETE FROM favourites 
  WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
  
  -- Delete any reports for this listing - CAST BIGINT TO TEXT
  DELETE FROM reports 
  WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
  
  -- =====================================================
  -- 4. HANDLE MEDIA CLEANUP
  -- =====================================================
  
  -- Check if listing has an image and try to delete it
  IF v_image_url IS NOT NULL AND v_image_url <> '' THEN
    BEGIN
      -- Extract file path from URL for storage deletion
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
  WHERE id = p_listing_id;
  
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
$$;
