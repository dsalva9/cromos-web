-- Migration: Add ignored users functionality (Simple Version)
-- Description: Add table to track ignored users and related RPC functions

-- Create ignored_users table
CREATE TABLE IF NOT EXISTS ignored_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ignored_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ignored_user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ignored_users_user_id ON ignored_users(user_id);
CREATE INDEX IF NOT EXISTS idx_ignored_users_ignored_user_id ON ignored_users(ignored_user_id);

-- RLS Policies
ALTER TABLE ignored_users ENABLE ROW LEVEL SECURITY;

-- Users can manage their own ignored users
DO $$
BEGIN
  -- Drop policy if it exists
  DROP POLICY IF EXISTS "Users can view their own ignored users" ON ignored_users;
  DROP POLICY IF EXISTS "Users can insert their own ignored users" ON ignored_users;
  DROP POLICY IF EXISTS "Users can delete their own ignored users" ON ignored_users;
  
  -- Create policies
  CREATE POLICY "Users can view their own ignored users" ON ignored_users
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own ignored users" ON ignored_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own ignored users" ON ignored_users
    FOR DELETE USING (auth.uid() = user_id);
END $$;

-- RPC Functions

-- Function to ignore a user
CREATE OR REPLACE FUNCTION ignore_user(p_ignored_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  IF p_ignored_user_id IS NULL THEN
    RAISE EXCEPTION 'ID de usuario a ignorar es requerido';
  END IF;
  
  -- Cannot ignore yourself
  IF v_current_user_id = p_ignored_user_id THEN
    RAISE EXCEPTION 'No puedes ignorarte a ti mismo';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_ignored_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  -- Insert ignore relationship (ignore if already exists)
  INSERT INTO ignored_users (user_id, ignored_user_id)
  VALUES (v_current_user_id, p_ignored_user_id)
  ON CONFLICT (user_id, ignored_user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Function to unignore a user
CREATE OR REPLACE FUNCTION unignore_user(p_ignored_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  IF p_ignored_user_id IS NULL THEN
    RAISE EXCEPTION 'ID de usuario a dejar de ignorar es requerido';
  END IF;
  
  -- Delete ignore relationship
  DELETE FROM ignored_users
  WHERE user_id = v_current_user_id AND ignored_user_id = p_ignored_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to check if user is ignored
CREATE OR REPLACE FUNCTION is_user_ignored(p_user_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ignored_users
    WHERE user_id = p_user_id AND ignored_user_id = p_target_user_id
  );
END;
$$;

-- Function to get ignored users list
CREATE OR REPLACE FUNCTION get_ignored_users(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  ignored_user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    p.id as ignored_user_id,
    p.nickname,
    p.avatar_url,
    iu.created_at
  FROM ignored_users iu
  JOIN profiles p ON iu.ignored_user_id = p.id
  WHERE iu.user_id = v_current_user_id
  ORDER BY iu.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get ignored users count
CREATE OR REPLACE FUNCTION get_ignored_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ignored_users
  WHERE user_id = v_current_user_id;
  
  RETURN v_count;
END;
$$;

-- Add function to filter listings (excluding ignored users)
CREATE OR REPLACE FUNCTION list_trade_listings_filtered(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  title TEXT,
  description TEXT,
  sticker_number TEXT,
  collection_name TEXT,
  image_url TEXT,
  status TEXT,
  views_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  copy_id BIGINT,
  slot_id BIGINT,
  author_nickname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.user_id,
    tl.title,
    tl.description,
    tl.sticker_number,
    tl.collection_name,
    tl.image_url,
    tl.status,
    tl.views_count,
    tl.created_at,
    tl.updated_at,
    tl.copy_id,
    tl.slot_id,
    p.nickname as author_nickname
  FROM trade_listings tl
  JOIN profiles p ON tl.user_id = p.id
  WHERE tl.status = 'active'
    -- Filter out ignored users
    AND NOT EXISTS (
      SELECT 1 FROM ignored_users iu
      WHERE iu.user_id = v_current_user_id
      AND iu.ignored_user_id = tl.user_id
    )
    AND (v_current_user_id IS NULL OR tl.user_id != v_current_user_id OR v_current_user_id IS NULL)
    AND (p_search IS NULL OR
         to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.collection_name, '')) @@ plainto_tsquery('spanish', p_search))
  ORDER BY tl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION ignore_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unignore_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_ignored(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ignored_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ignored_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION list_trade_listings_filtered(INTEGER, INTEGER, TEXT) TO authenticated;