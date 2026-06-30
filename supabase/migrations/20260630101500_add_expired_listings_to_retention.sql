-- Migration: Add expired listings to retention schedule and create admin functions
-- Target: Queue expired listings for permanent deletion after 90 days
-- Target: Exclude expired listings from standard pending deletion list and add a dedicated function for them

-- 1. Redefine admin_get_pending_deletion_listings to exclude 'expired' reason
CREATE OR REPLACE FUNCTION "public"."admin_get_pending_deletion_listings"() RETURNS TABLE("listing_id" bigint, "title" "text", "collection_name" "text", "seller_id" "uuid", "seller_nickname" "text", "deleted_at" timestamp with time zone, "scheduled_for" timestamp with time zone, "days_remaining" integer, "deletion_type" "text", "deletion_reason" "text", "legal_hold_until" timestamp with time zone, "retention_schedule_id" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view pending deletion listings';
    END IF;

    RETURN QUERY
    SELECT
        tl.id AS listing_id,
        tl.title,
        tl.collection_name,
        tl.user_id AS seller_id,
        p.nickname AS seller_nickname,
        tl.deleted_at,
        rs.scheduled_for,
        GREATEST(0, EXTRACT(DAY FROM rs.scheduled_for - NOW())::INTEGER) AS days_remaining,
        tl.deletion_type,
        rs.reason AS deletion_reason,
        rs.legal_hold_until,
        rs.id AS retention_schedule_id
    FROM retention_schedule rs
    JOIN trade_listings tl ON tl.id = rs.entity_id::BIGINT
    LEFT JOIN profiles p ON tl.user_id = p.id
    WHERE rs.entity_type = 'listing'
        AND rs.processed_at IS NULL
        AND (rs.reason IS NULL OR rs.reason != 'expired')
    ORDER BY rs.scheduled_for ASC;
END;
$$;

-- 2. Create admin_get_pending_deletion_expired_listings for expired listings
CREATE OR REPLACE FUNCTION "public"."admin_get_pending_deletion_expired_listings"() RETURNS TABLE("listing_id" bigint, "title" "text", "collection_name" "text", "seller_id" "uuid", "seller_nickname" "text", "deleted_at" timestamp with time zone, "scheduled_for" timestamp with time zone, "days_remaining" integer, "deletion_type" "text", "deletion_reason" "text", "legal_hold_until" timestamp with time zone, "retention_schedule_id" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Verify caller is admin
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can view pending deletion listings';
    END IF;

    RETURN QUERY
    SELECT
        tl.id AS listing_id,
        tl.title,
        tl.collection_name,
        tl.user_id AS seller_id,
        p.nickname AS seller_nickname,
        tl.deleted_at,
        rs.scheduled_for,
        GREATEST(0, EXTRACT(DAY FROM rs.scheduled_for - NOW())::INTEGER) AS days_remaining,
        tl.deletion_type,
        rs.reason AS deletion_reason,
        rs.legal_hold_until,
        rs.id AS retention_schedule_id
    FROM retention_schedule rs
    JOIN trade_listings tl ON tl.id = rs.entity_id::BIGINT
    LEFT JOIN profiles p ON tl.user_id = p.id
    WHERE rs.entity_type = 'listing'
        AND rs.processed_at IS NULL
        AND rs.reason = 'expired'
    ORDER BY rs.scheduled_for ASC;
END;
$$;

ALTER FUNCTION "public"."admin_get_pending_deletion_expired_listings"() OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."admin_get_pending_deletion_expired_listings"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_pending_deletion_expired_listings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_pending_deletion_expired_listings"() TO "service_role";

-- 3. Backfill existing expired listings into retention_schedule
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
    'expired',
    'system',
    deleted_at
FROM trade_listings
WHERE deleted_at IS NOT NULL
  AND status = 'removed'
  AND expiry_scheduled_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM retention_schedule
      WHERE entity_type = 'listing'
        AND entity_id = trade_listings.id::text
        AND action = 'delete'
  );
