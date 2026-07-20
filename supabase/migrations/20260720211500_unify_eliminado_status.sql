-- ============================================================================
-- Migration: Unify ELIMINADO status into 'removed'
-- 
-- Both soft-delete statuses ('ELIMINADO' from user action, 'removed' from 
-- auto-expiry cron) are unified under 'removed'. The difference is tracked
-- via the `reason` field in retention_schedule:
--   - 'expired'      → after 90 days → status becomes 'archived'
--   - 'user_deleted'  → after 90 days → hard delete from DB
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- 1A. Update soft_delete_listing() RPC
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
- Sets deleted_at timestamp
- Creates retention_schedule entry for hard deletion after 90 days
- Only works on listings with ACTIVE status
- Users can only soft delete their own listings
- Listing remains in database but hidden from public view

Parameters:
  p_listing_id: The ID of the listing to soft delete
';


-- ─────────────────────────────────────────────────────────────
-- 1B. Update process_retention_schedule() function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_retention_schedule()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_item RECORD;
    v_delete_count INTEGER;
BEGIN
    FOR v_item IN
        SELECT *
        FROM retention_schedule
        WHERE processed_at IS NULL
        AND scheduled_for <= NOW()
        AND (legal_hold_until IS NULL OR legal_hold_until < NOW())
        ORDER BY scheduled_for ASC
    LOOP
        CASE v_item.entity_type
            WHEN 'listing' THEN
                IF v_item.reason = 'user_deleted' THEN
                    -- User-deleted listings: hard delete after 90 days
                    DELETE FROM trade_listings
                    WHERE id = v_item.entity_id::BIGINT
                    AND deleted_at IS NOT NULL;

                    GET DIAGNOSTICS v_delete_count = ROW_COUNT;
                ELSIF v_item.reason = 'expired' THEN
                    -- Auto-expired listings: archive after 90 days
                    UPDATE trade_listings SET
                        status = 'archived',
                        archived_at = NOW(),
                        deleted_at = NULL,
                        updated_at = NOW()
                    WHERE id = v_item.entity_id::BIGINT;

                    v_delete_count := 1;
                ELSE
                    -- Fallback: archive for any other reason
                    UPDATE trade_listings SET
                        status = 'archived',
                        archived_at = NOW(),
                        deleted_at = NULL,
                        updated_at = NOW()
                    WHERE id = v_item.entity_id::BIGINT;

                    v_delete_count := 1;
                END IF;

            WHEN 'template' THEN
                DELETE FROM collection_templates
                WHERE id = v_item.entity_id::BIGINT
                AND deleted_at IS NOT NULL;

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            WHEN 'user' THEN
                DELETE FROM profiles
                WHERE id = v_item.entity_id::UUID
                AND deleted_at IS NOT NULL;

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            ELSE
                v_delete_count := 0;
        END CASE;

        UPDATE retention_schedule
        SET processed_at = NOW()
        WHERE id = v_item.id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'processed_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION public.process_retention_schedule() IS
  'Processes all pending retention schedules. User-deleted listings are hard deleted. Expired listings are archived with archived_at set.';


-- ─────────────────────────────────────────────────────────────
-- 1C. Migrate existing ELIMINADO listings to 'removed' status
-- ─────────────────────────────────────────────────────────────
UPDATE trade_listings 
SET status = 'removed',
    deleted_at = COALESCE(deleted_at, updated_at)
WHERE status = 'ELIMINADO';


-- ─────────────────────────────────────────────────────────────
-- 1D. Update check constraint to remove 'ELIMINADO'
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.trade_listings DROP CONSTRAINT IF EXISTS trade_listings_status_check;
ALTER TABLE public.trade_listings ADD CONSTRAINT trade_listings_status_check 
    CHECK (status = ANY (ARRAY['active'::text, 'reserved'::text, 'completed'::text, 'sold'::text, 'removed'::text, 'archived'::text]));


-- ─────────────────────────────────────────────────────────────
-- 1E. Create retention_schedule entries for orphaned removed listings
-- ─────────────────────────────────────────────────────────────
INSERT INTO retention_schedule (entity_type, entity_id, action, scheduled_for, reason, initiated_by_type)
SELECT 'listing', id::text, 'delete', 
       COALESCE(deleted_at, updated_at) + interval '90 days',
       'user_deleted', 'user'
FROM trade_listings 
WHERE status = 'removed' 
  AND NOT EXISTS (
    SELECT 1 FROM retention_schedule rs 
    WHERE rs.entity_type = 'listing' AND rs.entity_id = trade_listings.id::text
  )
ON CONFLICT (entity_type, entity_id, action) DO NOTHING;
