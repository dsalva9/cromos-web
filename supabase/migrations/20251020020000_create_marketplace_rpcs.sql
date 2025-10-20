-- =====================================================
-- MARKETPLACE MVP: Create basic Marketplace RPCs
-- =====================================================
-- Purpose: Core functions for marketplace operations
-- Functions: create, list, get by user, update status
-- =====================================================

-- FUNCTION 1: create_trade_listing
-- Creates a new marketplace listing
CREATE OR REPLACE FUNCTION create_trade_listing(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_sticker_number TEXT DEFAULT NULL,
    p_collection_name TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id BIGINT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a listing';
    END IF;
    
    -- Validate title is not empty
    IF TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title cannot be empty';
    END IF;
    
    -- Insert the listing
    INSERT INTO trade_listings (
        user_id,
        title,
        description,
        sticker_number,
        collection_name,
        image_url,
        status
    ) VALUES (
        auth.uid(),
        p_title,
        p_description,
        p_sticker_number,
        p_collection_name,
        p_image_url,
        'active'
    ) RETURNING id INTO v_listing_id;
    
    RETURN v_listing_id;
END;
$$;

-- FUNCTION 2: list_trade_listings
-- Lists active marketplace listings with pagination and search
CREATE OR REPLACE FUNCTION list_trade_listings(
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
    created_at TIMESTAMPTZ
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
        tl.created_at
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE tl.status = 'active'
    AND (
        p_search IS NULL 
        OR 
        (
            ILIKE(tl.title, '%' || p_search || '%') OR
            ILIKE(COALESCE(tl.collection_name, ''), '%' || p_search || '%')
        )
    )
    ORDER BY tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 3: get_user_listings
-- Gets listings for a specific user (all statuses)
CREATE OR REPLACE FUNCTION get_user_listings(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
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
    created_at TIMESTAMPTZ
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
        tl.created_at
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE tl.user_id = p_user_id
    ORDER BY tl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 4: update_listing_status
-- Updates the status of a listing (active, sold, removed)
CREATE OR REPLACE FUNCTION update_listing_status(
    p_listing_id BIGINT,
    p_new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Validate new status
    IF p_new_status NOT IN ('active', 'sold', 'removed') THEN
        RAISE EXCEPTION 'Invalid status. Must be one of: active, sold, removed';
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_trade_listing TO authenticated;
GRANT EXECUTE ON FUNCTION list_trade_listings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_listings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_listing_status TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_trade_listing IS 'Creates a new marketplace listing';
COMMENT ON FUNCTION list_trade_listings IS 'Lists active marketplace listings with pagination and search';
COMMENT ON FUNCTION get_user_listings IS 'Gets all listings for a specific user';
COMMENT ON FUNCTION update_listing_status IS 'Updates the status of a listing';