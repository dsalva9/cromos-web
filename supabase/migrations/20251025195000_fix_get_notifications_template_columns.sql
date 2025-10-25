-- =====================================================
-- Fix get_notifications RPC - Template Column Names
-- =====================================================
-- Purpose: Fix column references for collection_templates
--          (title instead of name, no status column)
-- Date: 2025-10-25
-- =====================================================

-- Drop and recreate the get_notifications function with correct column names
DROP FUNCTION IF EXISTS get_notifications();

CREATE OR REPLACE FUNCTION get_notifications()
RETURNS TABLE (
    id BIGINT,
    kind TEXT,
    trade_id BIGINT,
    listing_id BIGINT,
    template_id BIGINT,
    rating_id BIGINT,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    payload JSONB,
    -- Actor information (who triggered the notification)
    actor_id UUID,
    actor_nickname TEXT,
    actor_avatar_url TEXT,
    -- Legacy trade proposal data (for backwards compatibility)
    proposal_from_user UUID,
    proposal_to_user UUID,
    proposal_status TEXT,
    from_user_nickname TEXT,
    to_user_nickname TEXT,
    -- Listing data
    listing_title TEXT,
    listing_status TEXT,
    -- Template data
    template_name TEXT,
    template_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.kind,
        n.trade_id,
        n.listing_id,
        n.template_id,
        n.rating_id,
        n.created_at,
        n.read_at,
        n.payload,
        -- Actor information
        n.actor_id,
        p_actor.nickname AS actor_nickname,
        p_actor.avatar_url AS actor_avatar_url,
        -- Legacy trade data
        tp.from_user AS proposal_from_user,
        tp.to_user AS proposal_to_user,
        tp.status AS proposal_status,
        p_from.nickname AS from_user_nickname,
        p_to.nickname AS to_user_nickname,
        -- Listing data
        tl.title AS listing_title,
        tl.status AS listing_status,
        -- Template data
        ct.title AS template_name,
        NULL::TEXT AS template_status
    FROM notifications n
    -- Join actor profile
    LEFT JOIN profiles p_actor ON p_actor.id = n.actor_id
    -- Join trade proposal data (legacy)
    LEFT JOIN trade_proposals tp ON tp.id = n.trade_id
    LEFT JOIN profiles p_from ON p_from.id = tp.from_user
    LEFT JOIN profiles p_to ON p_to.id = tp.to_user
    -- Join listing data
    LEFT JOIN trade_listings tl ON tl.id = n.listing_id
    -- Join template data
    LEFT JOIN collection_templates ct ON ct.id = n.template_id
    WHERE n.user_id = auth.uid()
    ORDER BY
        CASE WHEN n.read_at IS NULL THEN 0 ELSE 1 END, -- Unread first
        n.created_at DESC; -- Newest first
END;
$$;

REVOKE ALL ON FUNCTION get_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_notifications() TO authenticated;

COMMENT ON FUNCTION get_notifications() IS
    'Returns enriched notifications for the current user with actor, listing, template, and trade details. Fixed to use ct.title instead of ct.name.';
