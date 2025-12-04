-- =====================================================
-- Migration: Add restore_listing and cleanup functions
-- Created: 2025-12-04
-- Description: Adds restore functionality and automatic cleanup for ELIMINADO listings
-- =====================================================

-- 1. Create restore_listing RPC function
CREATE OR REPLACE FUNCTION restore_listing(
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
    RETURN QUERY SELECT false, 'Permission denied: You can only restore your own listings'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if current status is 'ELIMINADO' or 'removed' (only allow restore from these)
  IF v_current_status NOT IN ('ELIMINADO', 'removed') THEN
    RETURN QUERY SELECT false, 'Can only restore listings with ELIMINADO or removed status'::TEXT, v_current_status, NULL::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- 2. RESTORE - Update status to active
  -- =====================================================

  UPDATE trade_listings
  SET status = 'active',
      updated_at = NOW()
  WHERE id = p_listing_id
  AND user_id = v_user_id;

  -- Verify update was successful
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Failed to restore listing'::TEXT, v_current_status, NULL::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- 3. RETURN SUCCESS RESPONSE
  -- =====================================================

  RETURN QUERY SELECT
    true,
    'Listing restored to active status successfully'::TEXT,
    v_current_status,
    'active'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- 2. Create cleanup_old_eliminado_listings function
CREATE OR REPLACE FUNCTION cleanup_old_eliminado_listings()
RETURNS TABLE (
  deleted_count INTEGER,
  deleted_listing_ids BIGINT[]
)
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_cutoff_date TIMESTAMP;
  v_listing_id BIGINT;
  v_deleted_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_count INTEGER := 0;
BEGIN
  -- Calculate cutoff date (30 days ago)
  v_cutoff_date := NOW() - INTERVAL '30 days';

  -- Find and delete all ELIMINADO listings older than 30 days
  FOR v_listing_id IN
    SELECT id
    FROM trade_listings
    WHERE status = 'ELIMINADO'
    AND updated_at < v_cutoff_date
  LOOP
    BEGIN
      -- Delete related data first
      DELETE FROM trade_chats WHERE listing_id = v_listing_id;
      DELETE FROM listing_transactions WHERE listing_id = v_listing_id;
      DELETE FROM favourites WHERE target_type = 'listing' AND target_id = v_listing_id::TEXT;
      DELETE FROM reports WHERE target_type = 'listing' AND target_id = v_listing_id::TEXT;

      -- Delete the listing itself
      DELETE FROM trade_listings WHERE id = v_listing_id;

      -- Add to deleted IDs array
      v_deleted_ids := array_append(v_deleted_ids, v_listing_id);
      v_count := v_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with next listing
        RAISE NOTICE 'Error deleting listing %: %', v_listing_id, SQLERRM;
    END;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT v_count, v_deleted_ids;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant permissions
REVOKE ALL ON FUNCTION restore_listing(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_listing(BIGINT) TO authenticated;

REVOKE ALL ON FUNCTION cleanup_old_eliminado_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_eliminado_listings() TO authenticated;

-- 4. Set up pg_cron job for automatic cleanup
-- Note: This requires pg_cron extension to be enabled
-- Run daily at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-eliminado-listings',
  '0 3 * * *',
  $$SELECT cleanup_old_eliminado_listings()$$
);

-- 5. Add comments for documentation
COMMENT ON FUNCTION restore_listing(BIGINT) IS '
Restore functionality for soft-deleted marketplace listings:
- Changes status from ELIMINADO/removed to active
- Only works on listings with ELIMINADO or removed status
- Users can only restore their own listings
- Listing becomes visible in marketplace again

Parameters:
- p_listing_id: ID of listing to restore

Returns:
- success: Boolean indicating if operation succeeded
- message: Status message
- previous_status: Status before update
- new_status: Status after update

Security:
- Users can only restore their own listings
- Only ELIMINADO/removed listings can be restored
- Uses SECURITY DEFINER for proper permission handling
';

COMMENT ON FUNCTION cleanup_old_eliminado_listings() IS '
Automatic cleanup functionality for old ELIMINADO listings:
- Finds all ELIMINADO listings older than 30 days
- Permanently deletes each listing and all associated data
- Runs daily at 3:00 AM UTC via pg_cron
- Returns count and IDs of deleted listings for monitoring

Returns:
- deleted_count: Number of listings deleted
- deleted_listing_ids: Array of deleted listing IDs

Security:
- Uses SECURITY DEFINER for system-level permissions
- Handles errors gracefully and continues processing
';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
