-- Fix ambiguous column reference in admin_list_users RPC

-- Drop the existing function first to allow return type change
DROP FUNCTION IF EXISTS admin_list_users(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION admin_list_users(
  p_search TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT NULL, -- 'admin', 'suspended', 'active', or NULL for all
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR(255),
  nickname VARCHAR(255),
  is_admin BOOLEAN,
  is_suspended BOOLEAN,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  sticker_count BIGINT,
  trade_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden listar usuarios'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    u.email::VARCHAR(255),
    p.nickname::VARCHAR(255),
    p.is_admin,
    p.is_suspended,
    p.created_at,
    u.last_sign_in_at,
    COALESCE(sc.sticker_count, 0) AS sticker_count,
    0::BIGINT AS trade_count  -- Trade counting disabled until trades table is implemented
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT us.user_id, COUNT(*) AS sticker_count
    FROM user_stickers us
    GROUP BY us.user_id
  ) sc ON sc.user_id = p.id
  WHERE
    (p_search IS NULL OR
     p.nickname ILIKE '%' || p_search || '%' OR
     u.email ILIKE '%' || p_search || '%')
    AND
    (p_filter IS NULL OR
     (p_filter = 'admin' AND p.is_admin = TRUE) OR
     (p_filter = 'suspended' AND p.is_suspended = TRUE) OR
     (p_filter = 'active' AND p.is_suspended = FALSE))
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
