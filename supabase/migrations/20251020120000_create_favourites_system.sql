-- =====================================================
-- SOCIAL AND REPUTATION: Create favourites system
-- =====================================================
-- Purpose: Enable users to favourite listings, templates, and users
-- Model: Unified favourites table with type discriminator
-- =====================================================

-- TABLE: favourites
-- Unified table for all favourite types
CREATE TABLE favourites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'template', 'user')),
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_target UNIQUE(user_id, target_type, target_id)
);

-- Create indices for performance
CREATE INDEX idx_favourites_user ON favourites(user_id);
CREATE INDEX idx_favourites_target ON favourites(target_type, target_id);
CREATE INDEX idx_favourites_listing ON favourites(target_type, target_id) WHERE target_type = 'listing';
CREATE INDEX idx_favourites_template ON favourites(target_type, target_id) WHERE target_type = 'template';
CREATE INDEX idx_favourites_user_target ON favourites(target_type, target_id) WHERE target_type = 'user';

-- Add comments for documentation
COMMENT ON TABLE favourites IS 'Unified table for all favourite types (listings, templates, users)';
COMMENT ON COLUMN favourites.target_type IS 'Type of favourited entity: listing, template, or user';
COMMENT ON COLUMN favourites.target_id IS 'ID of the favourited entity';

-- Enable RLS (Row Level Security)
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Users can read their own favourites
CREATE POLICY "Users can read their own favourites" ON favourites
    FOR SELECT USING (user_id = auth.uid());

-- 2. Users can insert their own favourites
CREATE POLICY "Users can create their own favourites" ON favourites
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Users can delete their own favourites
CREATE POLICY "Users can delete their own favourites" ON favourites
    FOR DELETE USING (user_id = auth.uid());

-- 4. Public read for listing and template favourites (for counts)
CREATE POLICY "Public read access for listing and template favourites" ON favourites
    FOR SELECT USING (target_type IN ('listing', 'template'));

-- RPCs for favourites management

-- FUNCTION 1: toggle_favourite
-- Toggles a favourite (adds if not exists, removes if exists)
CREATE OR REPLACE FUNCTION toggle_favourite(
    p_target_type TEXT,
    p_target_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_favourited BOOLEAN := FALSE;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate target_type
    IF p_target_type NOT IN ('listing', 'template', 'user') THEN
        RAISE EXCEPTION 'Invalid target_type. Must be one of: listing, template, user';
    END IF;
    
    -- Check if favourite exists
    IF EXISTS (
        SELECT 1 FROM favourites 
        WHERE user_id = auth.uid() 
        AND target_type = p_target_type 
        AND target_id = p_target_id
    ) THEN
        -- Remove favourite
        DELETE FROM favourites 
        WHERE user_id = auth.uid() 
        AND target_type = p_target_type 
        AND target_id = p_target_id;
        
        v_is_favourited := FALSE;
    ELSE
        -- Add favourite
        INSERT INTO favourites (user_id, target_type, target_id)
        VALUES (auth.uid(), p_target_type, p_target_id);
        
        v_is_favourited := TRUE;
    END IF;
    
    RETURN v_is_favourited;
END;
$$;

-- FUNCTION 2: is_favourited
-- Checks if a target is favourited by the current user
CREATE OR REPLACE FUNCTION is_favourited(
    p_target_type TEXT,
    p_target_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_favourited BOOLEAN := FALSE;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Validate target_type
    IF p_target_type NOT IN ('listing', 'template', 'user') THEN
        RETURN FALSE;
    END IF;
    
    -- Check if favourite exists
    SELECT EXISTS (
        SELECT 1 FROM favourites 
        WHERE user_id = auth.uid() 
        AND target_type = p_target_type 
        AND target_id = p_target_id
    ) INTO v_is_favourited;
    
    RETURN v_is_favourited;
END;
$$;

-- FUNCTION 3: get_favourite_count
-- Gets the count of favourites for a target
CREATE OR REPLACE FUNCTION get_favourite_count(
    p_target_type TEXT,
    p_target_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count BIGINT;
BEGIN
    -- Validate target_type
    IF p_target_type NOT IN ('listing', 'template', 'user') THEN
        RETURN 0;
    END IF;
    
    -- Count favourites
    SELECT COUNT(*) INTO v_count
    FROM favourites 
    WHERE target_type = p_target_type 
    AND target_id = p_target_id;
    
    RETURN v_count;
END;
$$;

-- FUNCTION 4: get_user_favourites
-- Gets all favourites for the current user with optional filtering
CREATE OR REPLACE FUNCTION get_user_favourites(
    p_target_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    target_type TEXT,
    target_id BIGINT,
    created_at TIMESTAMPTZ,
    -- Additional fields based on target_type
    listing_title TEXT,
    listing_image_url TEXT,
    template_title TEXT,
    template_image_url TEXT,
    user_nickname TEXT,
    user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.target_type,
        f.target_id,
        f.created_at,
        -- Listing specific fields
        CASE 
            WHEN f.target_type = 'listing' THEN tl.title
            ELSE NULL
        END AS listing_title,
        CASE 
            WHEN f.target_type = 'listing' THEN tl.image_url
            ELSE NULL
        END AS listing_image_url,
        -- Template specific fields
        CASE 
            WHEN f.target_type = 'template' THEN ct.title
            ELSE NULL
        END AS template_title,
        CASE 
            WHEN f.target_type = 'template' THEN ct.image_url
            ELSE NULL
        END AS template_image_url,
        -- User specific fields
        CASE 
            WHEN f.target_type = 'user' THEN p.nickname
            ELSE NULL
        END AS user_nickname,
        CASE 
            WHEN f.target_type = 'user' THEN p.avatar_url
            ELSE NULL
        END AS user_avatar_url
    FROM favourites f
    LEFT JOIN trade_listings tl ON f.target_type = 'listing' AND f.target_id = tl.id
    LEFT JOIN collection_templates ct ON f.target_type = 'template' AND f.target_id = ct.id
    LEFT JOIN profiles p ON f.target_type = 'user' AND f.target_id = p.id
    WHERE f.user_id = auth.uid()
    AND (p_target_type IS NULL OR f.target_type = p_target_type)
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION toggle_favourite TO authenticated;
GRANT EXECUTE ON FUNCTION is_favourited TO authenticated;
GRANT EXECUTE ON FUNCTION get_favourite_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_favourites TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION toggle_favourite IS 'Toggles a favourite (adds if not exists, removes if exists)';
COMMENT ON FUNCTION is_favourited IS 'Checks if a target is favourited by the current user';
COMMENT ON FUNCTION get_favourite_count IS 'Gets the count of favourites for a target';
COMMENT ON FUNCTION get_user_favourites IS 'Gets all favourites for the current user with optional filtering';