-- =====================================================
-- SOCIAL AND REPUTATION: Create template ratings system
-- =====================================================
-- Purpose: Enable users to rate templates
-- Model: Ratings linked to templates with aggregation
-- =====================================================

-- TABLE: template_ratings
-- Ratings given by users to templates
CREATE TABLE template_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    template_id BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_template_rating UNIQUE(user_id, template_id)
);

-- Create indices for performance
CREATE INDEX idx_template_ratings_user ON template_ratings(user_id);
CREATE INDEX idx_template_ratings_template ON template_ratings(template_id);
CREATE INDEX idx_template_ratings_created ON template_ratings(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE template_ratings IS 'Ratings given by users to templates';
COMMENT ON COLUMN template_ratings.rating IS 'Rating from 1 to 5';
COMMENT ON COLUMN template_ratings.comment IS 'Optional comment for the rating';

-- Enable RLS (Row Level Security)
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Public read access (ratings are public)
CREATE POLICY "Public read access for template ratings" ON template_ratings
    FOR SELECT USING (TRUE);

-- 2. Users can insert their own ratings
CREATE POLICY "Users can create their own template ratings" ON template_ratings
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Users can update their own ratings
CREATE POLICY "Users can update their own template ratings" ON template_ratings
    FOR UPDATE USING (user_id = auth.uid());

-- 4. Users can delete their own ratings
CREATE POLICY "Users can delete their own template ratings" ON template_ratings
    FOR DELETE USING (user_id = auth.uid());

-- RPCs for template ratings management

-- FUNCTION 1: create_template_rating
-- Creates a rating for a template and updates its aggregate rating
CREATE OR REPLACE FUNCTION create_template_rating(
    p_template_id BIGINT,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rating_id BIGINT;
    v_old_rating INTEGER;
    v_old_count INTEGER;
    v_is_author BOOLEAN;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate rating range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    
    -- Check if user is the template author
    SELECT (author_id = auth.uid()) INTO v_is_author
    FROM collection_templates
    WHERE id = p_template_id;
    
    IF v_is_author THEN
        RAISE EXCEPTION 'Users cannot rate their own templates';
    END IF;
    
    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating, v_old_count
    FROM collection_templates
    WHERE id = p_template_id;
    
    -- Create the rating
    INSERT INTO template_ratings (
        user_id,
        template_id,
        rating,
        comment
    ) VALUES (
        auth.uid(),
        p_template_id,
        p_rating,
        p_comment
    ) RETURNING id INTO v_rating_id;
    
    -- Update aggregate rating
    UPDATE collection_templates
    SET 
        rating_avg = (COALESCE(v_old_rating * v_old_count, 0) + p_rating) / (v_old_count + 1),
        rating_count = v_old_count + 1
    WHERE id = p_template_id;
    
    RETURN v_rating_id;
END;
$$;

-- FUNCTION 2: update_template_rating
-- Updates an existing rating and updates the template's aggregate rating
CREATE OR REPLACE FUNCTION update_template_rating(
    p_rating_id BIGINT,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_rating_value INTEGER;
    v_template_id BIGINT;
    v_old_rating_avg DECIMAL;
    v_old_rating_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Validate rating range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    
    -- Get old rating details
    SELECT rating, template_id INTO v_old_rating_value, v_template_id
    FROM template_ratings
    WHERE id = p_rating_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rating not found or you do not have permission to update it';
    END IF;
    
    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating_avg, v_old_rating_count
    FROM collection_templates
    WHERE id = v_template_id;
    
    -- Update the rating
    UPDATE template_ratings
    SET rating = p_rating, comment = p_comment
    WHERE id = p_rating_id AND user_id = auth.uid();
    
    -- Update aggregate rating
    UPDATE collection_templates
    SET rating_avg = (v_old_rating_avg * v_old_rating_count - v_old_rating_value + p_rating) / v_old_rating_count
    WHERE id = v_template_id;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update rating';
    END IF;
END;
$$;

-- FUNCTION 3: delete_template_rating
-- Deletes a rating and updates the template's aggregate rating
CREATE OR REPLACE FUNCTION delete_template_rating(
    p_rating_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rating_value INTEGER;
    v_template_id BIGINT;
    v_old_rating_avg DECIMAL;
    v_old_rating_count INTEGER;
    v_new_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get rating details
    SELECT rating, template_id INTO v_rating_value, v_template_id
    FROM template_ratings
    WHERE id = p_rating_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rating not found or you do not have permission to delete it';
    END IF;
    
    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating_avg, v_old_rating_count
    FROM collection_templates
    WHERE id = v_template_id;
    
    -- Delete the rating
    DELETE FROM template_ratings
    WHERE id = p_rating_id AND user_id = auth.uid();
    
    -- Update aggregate rating
    v_new_count := v_old_rating_count - 1;
    
    IF v_new_count = 0 THEN
        -- No more ratings, reset to default
        UPDATE collection_templates
        SET rating_avg = 0.0, rating_count = 0
        WHERE id = v_template_id;
    ELSE
        UPDATE collection_templates
        SET rating_avg = (v_old_rating_avg * v_old_rating_count - v_rating_value) / v_new_count,
            rating_count = v_new_count
        WHERE id = v_template_id;
    END IF;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update template';
    END IF;
END;
$$;

-- FUNCTION 4: get_template_ratings
-- Gets ratings for a template with pagination
CREATE OR REPLACE FUNCTION get_template_ratings(
    p_template_id BIGINT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    user_nickname TEXT,
    user_avatar_url TEXT,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.user_id,
        p.nickname AS user_nickname,
        p.avatar_url AS user_avatar_url,
        tr.rating,
        tr.comment,
        tr.created_at
    FROM template_ratings tr
    JOIN profiles p ON tr.user_id = p.id
    WHERE tr.template_id = p_template_id
    ORDER BY tr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 5: get_template_rating_summary
-- Gets rating summary for a template with user's rating if available
CREATE OR REPLACE FUNCTION get_template_rating_summary(
    p_template_id BIGINT DEFAULT NULL  -- Default to null to allow checking multiple templates
)
RETURNS TABLE (
    template_id BIGINT,
    rating_avg DECIMAL,
    rating_count BIGINT,
    rating_distribution JSONB,
    user_rating INTEGER,
    user_favourited BOOLEAN,
    favourite_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id AS template_id,
        ct.rating_avg,
        ct.rating_count::BIGINT,
        (
            SELECT jsonb_build_object(
                '5_star', COUNT(*) FILTER (WHERE rating = 5),
                '4_star', COUNT(*) FILTER (WHERE rating = 4),
                '3_star', COUNT(*) FILTER (WHERE rating = 3),
                '2_star', COUNT(*) FILTER (WHERE rating = 2),
                '1_star', COUNT(*) FILTER (WHERE rating = 1)
            )
            FROM template_ratings
            WHERE template_id = ct.id
        ) AS rating_distribution,
        (
            SELECT rating FROM template_ratings
            WHERE template_id = ct.id AND user_id = auth.uid()
        ) AS user_rating,
        (
            SELECT EXISTS (
                SELECT 1 FROM favourites
                WHERE user_id = auth.uid() 
                AND target_type = 'template' 
                AND target_id = ct.id
            )
        ) AS user_favourited,
        (
            SELECT COUNT(*) FROM favourites
            WHERE target_type = 'template' 
            AND target_id = ct.id
        ) AS favourite_count
    FROM collection_templates ct
    WHERE (p_template_id IS NULL OR ct.id = p_template_id)
      AND ct.is_public = TRUE
    ORDER BY ct.copies_count DESC, ct.rating_count DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_template_rating TO authenticated;
GRANT EXECUTE ON FUNCTION update_template_rating TO authenticated;
GRANT EXECUTE ON FUNCTION delete_template_rating TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_ratings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_template_rating_summary TO anon, authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_template_rating IS 'Creates a rating for a template and updates its aggregate rating';
COMMENT ON FUNCTION update_template_rating IS 'Updates an existing rating and updates the template''s aggregate rating';
COMMENT ON FUNCTION delete_template_rating IS 'Deletes a rating and updates the template''s aggregate rating';
COMMENT ON FUNCTION get_template_ratings IS 'Gets ratings for a template with pagination';
COMMENT ON FUNCTION get_template_rating_summary IS 'Gets rating summary for a template with user''s rating if available';