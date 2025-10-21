-- =====================================================
-- FIX: Correct ILIKE usage in list_trade_listings function
-- =====================================================
-- Issue: ILIKE was being called as a function instead of used as an operator
-- Fix: Change ILIKE(column, pattern) to column ILIKE pattern
-- =====================================================

-- Drop the existing function first due to return type change
DROP FUNCTION IF EXISTS list_trade_listings(integer, integer, text);

-- FUNCTION: list_trade_listings (FIXED)
-- Lists active marketplace listings with pagination and search
CREATE FUNCTION list_trade_listings(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    author_nickname TEXT,
    author_avatar_url TEXT,
    title TEXT,
    description TEXT,
    sticker_number TEXT,
    collection_name TEXT,
    image_url TEXT,
    status TEXT,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    copy_id BIGINT,
    slot_id BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tl.id,
        tl.user_id,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar_url,
        tl.title,
        tl.description,
        tl.sticker_number,
        tl.collection_name,
        tl.image_url,
        tl.status,
        tl.views_count,
        tl.created_at,
        tl.copy_id,
        tl.slot_id
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE tl.status = 'active'
    AND (
        p_search IS NULL
        OR
        (
            tl.title ILIKE '%' || p_search || '%' OR
            COALESCE(tl.collection_name, '') ILIKE '%' || p_search || '%'
        )
    )
    ORDER BY tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_trade_listings TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION list_trade_listings IS 'Lists active marketplace listings with pagination and search (FIXED: Corrected ILIKE usage)';