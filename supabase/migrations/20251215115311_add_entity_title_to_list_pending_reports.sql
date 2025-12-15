-- =====================================================
-- Add entity title to list_pending_reports
-- =====================================================
-- Issue: Reports table doesn't show the title of reported content
-- Fix: Add entity_title field that fetches title based on entity type
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_pending_reports(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(
    report_id bigint,
    reporter_nickname text,
    entity_type text,
    entity_id text,
    entity_title text,
    reason text,
    description text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_user_is_admin BOOLEAN;
BEGIN
    SELECT profiles.is_admin INTO v_user_is_admin
    FROM profiles
    WHERE profiles.id = auth.uid();

    IF NOT v_user_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    RETURN QUERY
    SELECT
        r.id AS report_id,
        p.nickname AS reporter_nickname,
        r.target_type AS entity_type,
        r.target_id AS entity_id,
        -- Get title based on entity type
        CASE
            WHEN r.target_type = 'listing' THEN (
                SELECT tl.title FROM trade_listings tl WHERE tl.id = r.target_id::bigint
            )
            WHEN r.target_type = 'template' THEN (
                SELECT ct.title FROM collection_templates ct WHERE ct.id = r.target_id::bigint
            )
            WHEN r.target_type = 'user' THEN (
                SELECT prof.nickname FROM profiles prof WHERE prof.id = r.target_id::uuid
            )
            ELSE 'Unknown'
        END AS entity_title,
        r.reason,
        r.description,
        r.created_at
    FROM reports r
    JOIN profiles p ON r.reporter_id = p.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;
