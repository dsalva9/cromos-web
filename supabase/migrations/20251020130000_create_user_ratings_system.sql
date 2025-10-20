-- =====================================================
-- SOCIAL AND REPUTATION: Create user ratings system
-- =====================================================
-- Purpose: Enable users to rate other users after transactions
-- Model: Ratings linked to completed trades or listings
-- =====================================================

-- TABLE: user_ratings
-- Ratings given by users to other users
CREATE TABLE user_ratings (
    id BIGSERIAL PRIMARY KEY,
    rater_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rated_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    context_type TEXT NOT NULL CHECK (context_type IN ('trade', 'listing')),
    context_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_rating UNIQUE(rater_id, rated_id, context_type, context_id)
);

-- Create indices for performance
CREATE INDEX idx_user_ratings_rater ON user_ratings(rater_id);
CREATE INDEX idx_user_ratings_rated ON user_ratings(rated_id);
CREATE INDEX idx_user_ratings_context ON user_ratings(context_type, context_id);
CREATE INDEX idx_user_ratings_created ON user_ratings(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE user_ratings IS 'Ratings given by users to other users after transactions';
COMMENT ON COLUMN user_ratings.context_type IS 'Type of context: trade or listing';
COMMENT ON COLUMN user_ratings.context_id IS 'ID of the context entity';

-- Enable RLS (Row Level Security)
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Public read access (ratings are public)
CREATE POLICY "Public read access for user ratings" ON user_ratings
    FOR SELECT USING (TRUE);

-- 2. Users can insert their own ratings
CREATE POLICY "Users can create their own ratings" ON user_ratings
    FOR INSERT WITH CHECK (rater_id = auth.uid());

-- 3. Users can update their own ratings
CREATE POLICY "Users can update their own ratings" ON user_ratings
    FOR UPDATE USING (rater_id = auth.uid());

-- 4. Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON user_ratings
    FOR DELETE USING (rater_id = auth.uid());

-- Add columns to profiles table for rating aggregation
ALTER TABLE profiles 
ADD COLUMN rating_avg DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN rating_count INTEGER DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN profiles.rating_avg IS 'Average rating (1-5) calculated from all user ratings';
COMMENT ON COLUMN profiles.rating_count IS 'Total number of ratings received';

-- Create indices for new columns
CREATE INDEX idx_profiles_rating_avg ON profiles(rating_avg DESC) WHERE rating_count > 0;
CREATE INDEX idx_profiles_rating_count ON profiles(rating_count DESC);

-- RPCs for user ratings management

-- FUNCTION 1: create_user_rating
-- Creates a rating for a user and updates their aggregate rating
CREATE OR REPLACE FUNCTION create_user_rating(
    p_rated_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL,
    p_context_type TEXT DEFAULT NULL,
    p_context_id BIGINT DEFAULT NULL
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
    
    -- Validate context_type
    IF p_context_type NOT IN ('trade', 'listing') THEN
        RAISE EXCEPTION 'Invalid context_type. Must be one of: trade, listing';
    END IF;
    
    -- Validate context_id is provided if context_type is provided
    IF p_context_type IS NOT NULL AND p_context_id IS NULL THEN
        RAISE EXCEPTION 'context_id must be provided when context_type is specified';
    END IF;
    
    -- Validate user is not rating themselves
    IF p_rated_id = auth.uid() THEN
        RAISE EXCEPTION 'Users cannot rate themselves';
    END IF;
    
    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating, v_old_count
    FROM profiles
    WHERE id = p_rated_id;
    
    -- Create the rating
    INSERT INTO user_ratings (
        rater_id,
        rated_id,
        rating,
        comment,
        context_type,
        context_id
    ) VALUES (
        auth.uid(),
        p_rated_id,
        p_rating,
        p_comment,
        p_context_type,
        p_context_id
    ) RETURNING id INTO v_rating_id;
    
    -- Update aggregate rating
    UPDATE profiles
    SET 
        rating_avg = (COALESCE(v_old_rating * v_old_count, 0) + p_rating) / (v_old_count + 1),
        rating_count = v_old_count + 1
    WHERE id = p_rated_id;
    
    RETURN v_rating_id;
END;
$$;

-- FUNCTION 2: update_user_rating
-- Updates an existing rating and updates the user's aggregate rating
CREATE OR REPLACE FUNCTION update_user_rating(
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
    v_rated_id UUID;
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
    SELECT rating, rated_id INTO v_old_rating_value, v_rated_id
    FROM user_ratings
    WHERE id = p_rating_id AND rater_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rating not found or you do not have permission to update it';
    END IF;
    
    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating_avg, v_old_rating_count
    FROM profiles
    WHERE id = v_rated_id;
    
    -- Update the rating
    UPDATE user_ratings
    SET rating = p_rating, comment = p_comment
    WHERE id = p_rating_id AND rater_id = auth.uid();
    
    -- Update aggregate rating
    UPDATE profiles
    SET rating_avg = (v_old_rating_avg * v_old_rating_count - v_old_rating_value + p_rating) / v_old_rating_count
    WHERE id = v_rated_id;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update rating';
    END IF;
END;
$$;

-- FUNCTION 3: delete_user_rating
-- Deletes a rating and updates the user's aggregate rating
CREATE OR REPLACE FUNCTION delete_user_rating(
    p_rating_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rating_value INTEGER;
    v_rated_id UUID;
    v_old_rating_avg DECIMAL;
    v_old_rating_count INTEGER;
    v_new_count INTEGER;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get rating details
    SELECT rating, rated_id INTO v_rating_value, v_rated_id
    FROM user_ratings
    WHERE id = p_rating_id AND rater_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rating not found or you do not have permission to delete it';
    END IF;
    
    -- Get current aggregate rating
    SELECT rating_avg, rating_count INTO v_old_rating_avg, v_old_rating_count
    FROM profiles
    WHERE id = v_rated_id;
    
    -- Delete the rating
    DELETE FROM user_ratings
    WHERE id = p_rating_id AND rater_id = auth.uid();
    
    -- Update aggregate rating
    v_new_count := v_old_rating_count - 1;
    
    IF v_new_count = 0 THEN
        -- No more ratings, reset to default
        UPDATE profiles
        SET rating_avg = 0.0, rating_count = 0
        WHERE id = v_rated_id;
    ELSE
        UPDATE profiles
        SET rating_avg = (v_old_rating_avg * v_old_rating_count - v_rating_value) / v_new_count,
            rating_count = v_new_count
        WHERE id = v_rated_id;
    END IF;
    
    -- Check if any row was updated
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update profile';
    END IF;
END;
$$;

-- FUNCTION 4: get_user_ratings
-- Gets ratings for a user with pagination
CREATE OR REPLACE FUNCTION get_user_ratings(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    rater_id UUID,
    rater_nickname TEXT,
    rater_avatar_url TEXT,
    rating INTEGER,
    comment TEXT,
    context_type TEXT,
    context_id BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.id,
        ur.rater_id,
        p.nickname AS rater_nickname,
        p.avatar_url AS rater_avatar_url,
        ur.rating,
        ur.comment,
        ur.context_type,
        ur.context_id,
        ur.created_at
    FROM user_ratings ur
    JOIN profiles p ON ur.rater_id = p.id
    WHERE ur.rated_id = p_user_id
    ORDER BY ur.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 5: get_user_rating_summary
-- Gets rating summary for a user
CREATE OR REPLACE FUNCTION get_user_rating_summary(
    p_user_id UUID
)
RETURNS TABLE (
    rating_avg DECIMAL,
    rating_count BIGINT,
    rating_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.rating_avg,
        p.rating_count::BIGINT,
        (
            SELECT jsonb_build_object(
                '5_star', COUNT(*) FILTER (WHERE rating = 5),
                '4_star', COUNT(*) FILTER (WHERE rating = 4),
                '3_star', COUNT(*) FILTER (WHERE rating = 3),
                '2_star', COUNT(*) FILTER (WHERE rating = 2),
                '1_star', COUNT(*) FILTER (WHERE rating = 1)
            )
            FROM user_ratings
            WHERE rated_id = p_user_id
        ) AS rating_distribution
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_rating TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_rating TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_rating TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ratings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_rating_summary TO anon, authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_user_rating IS 'Creates a rating for a user and updates their aggregate rating';
COMMENT ON FUNCTION update_user_rating IS 'Updates an existing rating and updates the user''s aggregate rating';
COMMENT ON FUNCTION delete_user_rating IS 'Deletes a rating and updates the user''s aggregate rating';
COMMENT ON FUNCTION get_user_ratings IS 'Gets ratings for a user with pagination';
COMMENT ON FUNCTION get_user_rating_summary IS 'Gets rating summary for a user';