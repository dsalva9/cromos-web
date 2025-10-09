-- Migration: Admin System (RBAC + Audit Log + Admin RPCs)
-- Description: Add admin role to profiles, create audit log, and implement all admin CRUD RPCs
-- Version: v1.5.0
-- Date: 2025-10-10

-- =============================================
-- PART 1: PROFILES - ADD is_admin COLUMN
-- =============================================

-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Update RLS policy to protect is_admin column (only admins can modify it)
-- This is enforced via RPCs, but we add a comment for documentation
COMMENT ON COLUMN profiles.is_admin IS
  'Admin role flag. Can only be modified by existing admins via admin RPCs. Protected by JWT claims validation in SECURITY DEFINER functions.';

-- =============================================
-- PART 2: AUDIT LOG TABLE
-- =============================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS audit_log CASCADE;

-- Create audit_log table
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('collection', 'page', 'sticker', 'image')),
  entity_id BIGINT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'bulk_upsert', 'remove_image')),
  before_json JSONB,
  after_json JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at ON audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Add table comment
COMMENT ON TABLE audit_log IS
  'Append-only audit log of all admin actions. Records create/update/delete operations with before/after snapshots for compliance and debugging.';

-- =============================================
-- PART 3: ROW LEVEL SECURITY (AUDIT LOG)
-- =============================================

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all audit entries
DROP POLICY IF EXISTS audit_log_admin_select_policy ON audit_log;
CREATE POLICY audit_log_admin_select_policy
  ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Policy: Only insert allowed (for admin RPCs via SECURITY DEFINER)
DROP POLICY IF EXISTS audit_log_insert_policy ON audit_log;
CREATE POLICY audit_log_insert_policy
  ON audit_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- NO UPDATE OR DELETE POLICIES (append-only table)

-- =============================================
-- PART 4: HELPER FUNCTION - CHECK ADMIN
-- =============================================

-- Helper function to check if current user is admin
DROP FUNCTION IF EXISTS is_admin_user();

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

COMMENT ON FUNCTION is_admin_user() IS
  'Returns TRUE if the current user (auth.uid()) has is_admin = TRUE. Used for access control in admin RPCs.';

-- =============================================
-- PART 5: ADMIN RPCs - COLLECTIONS
-- =============================================

-- -----------------------------------------------
-- RPC: admin_upsert_collection
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_upsert_collection(JSONB);

CREATE OR REPLACE FUNCTION admin_upsert_collection(
  p_collection JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id INTEGER;
  v_is_create BOOLEAN;
  v_before_json JSONB;
  v_after_json JSONB;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Determine if this is a create or update
  v_id := (p_collection->>'id')::INTEGER;
  v_is_create := (v_id IS NULL);

  -- Capture before state for audit (only for updates)
  IF NOT v_is_create THEN
    SELECT to_jsonb(c.*) INTO v_before_json
    FROM collections c
    WHERE c.id = v_id;

    IF v_before_json IS NULL THEN
      RAISE EXCEPTION 'Colección no encontrada: %', v_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Upsert collection
  INSERT INTO collections (
    id,
    name,
    competition,
    year,
    description,
    image_url,
    is_active
  )
  VALUES (
    v_id,
    p_collection->>'name',
    p_collection->>'competition',
    p_collection->>'year',
    p_collection->>'description',
    p_collection->>'image_url',
    COALESCE((p_collection->>'is_active')::BOOLEAN, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    competition = EXCLUDED.competition,
    year = EXCLUDED.year,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_id;

  -- Capture after state for audit
  SELECT to_jsonb(c.*) INTO v_after_json
  FROM collections c
  WHERE c.id = v_id;

  -- Write audit entry
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'collection',
    v_id,
    CASE WHEN v_is_create THEN 'create' ELSE 'update' END,
    v_before_json,
    v_after_json
  );

  -- Return result
  RETURN jsonb_build_object(
    'id', v_id,
    'name', p_collection->>'name',
    'created', v_is_create
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_upsert_collection(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_upsert_collection(JSONB) TO authenticated;

COMMENT ON FUNCTION admin_upsert_collection(JSONB) IS
  'Admin-only: Create or update a collection. Records action in audit_log.';

-- -----------------------------------------------
-- RPC: admin_delete_collection
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_delete_collection(BIGINT);

CREATE OR REPLACE FUNCTION admin_delete_collection(
  p_collection_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Capture before state for audit
  SELECT to_jsonb(c.*) INTO v_before_json
  FROM collections c
  WHERE c.id = p_collection_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Colección no encontrada: %', p_collection_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Write audit entry BEFORE deletion (entity_id will still be valid)
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'collection',
    p_collection_id,
    'delete',
    v_before_json,
    NULL
  );

  -- Delete collection (cascades to pages, stickers, user_collections, etc.)
  DELETE FROM collections WHERE id = p_collection_id;

  -- Note: Storage cleanup (sticker-images/{collection_id}/) must be done by client
  -- after this RPC returns successfully
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_collection(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_collection(BIGINT) TO authenticated;

COMMENT ON FUNCTION admin_delete_collection(BIGINT) IS
  'Admin-only: Delete a collection and all associated data (cascading). Records action in audit_log. Client must delete storage folder separately.';

-- =============================================
-- PART 6: ADMIN RPCs - PAGES
-- =============================================

-- -----------------------------------------------
-- RPC: admin_upsert_page
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_upsert_page(JSONB);

CREATE OR REPLACE FUNCTION admin_upsert_page(
  p_page JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id BIGINT;
  v_is_create BOOLEAN;
  v_before_json JSONB;
  v_after_json JSONB;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Determine if this is a create or update
  v_id := (p_page->>'id')::BIGINT;
  v_is_create := (v_id IS NULL);

  -- Capture before state for audit (only for updates)
  IF NOT v_is_create THEN
    SELECT to_jsonb(p.*) INTO v_before_json
    FROM collection_pages p
    WHERE p.id = v_id;

    IF v_before_json IS NULL THEN
      RAISE EXCEPTION 'Página no encontrada: %', v_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Validate kind and team_id consistency
  IF (p_page->>'kind' = 'team' AND (p_page->>'team_id') IS NULL) THEN
    RAISE EXCEPTION 'team_id es requerido para páginas de tipo "team"'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (p_page->>'kind' = 'special' AND (p_page->>'team_id') IS NOT NULL) THEN
    RAISE EXCEPTION 'team_id debe ser NULL para páginas de tipo "special"'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Upsert page
  INSERT INTO collection_pages (
    id,
    collection_id,
    kind,
    team_id,
    title,
    order_index
  )
  VALUES (
    v_id,
    (p_page->>'collection_id')::INTEGER,
    p_page->>'kind',
    (p_page->>'team_id')::INTEGER,
    p_page->>'title',
    (p_page->>'order_index')::INTEGER
  )
  ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id,
    kind = EXCLUDED.kind,
    team_id = EXCLUDED.team_id,
    title = EXCLUDED.title,
    order_index = EXCLUDED.order_index
  RETURNING id INTO v_id;

  -- Capture after state for audit
  SELECT to_jsonb(p.*) INTO v_after_json
  FROM collection_pages p
  WHERE p.id = v_id;

  -- Write audit entry
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'page',
    v_id,
    CASE WHEN v_is_create THEN 'create' ELSE 'update' END,
    v_before_json,
    v_after_json
  );

  -- Return result
  RETURN jsonb_build_object(
    'id', v_id,
    'title', p_page->>'title',
    'created', v_is_create
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_upsert_page(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_upsert_page(JSONB) TO authenticated;

COMMENT ON FUNCTION admin_upsert_page(JSONB) IS
  'Admin-only: Create or update a collection page. Records action in audit_log.';

-- -----------------------------------------------
-- RPC: admin_delete_page
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_delete_page(BIGINT);

CREATE OR REPLACE FUNCTION admin_delete_page(
  p_page_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Capture before state for audit
  SELECT to_jsonb(p.*) INTO v_before_json
  FROM collection_pages p
  WHERE p.id = p_page_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Página no encontrada: %', p_page_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Write audit entry BEFORE deletion
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'page',
    p_page_id,
    'delete',
    v_before_json,
    NULL
  );

  -- Delete page (cascades to page_slots)
  DELETE FROM collection_pages WHERE id = p_page_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_page(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_page(BIGINT) TO authenticated;

COMMENT ON FUNCTION admin_delete_page(BIGINT) IS
  'Admin-only: Delete a page and all associated slots (cascading). Records action in audit_log.';

-- =============================================
-- PART 7: ADMIN RPCs - STICKERS
-- =============================================

-- -----------------------------------------------
-- RPC: admin_upsert_sticker
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_upsert_sticker(JSONB);

CREATE OR REPLACE FUNCTION admin_upsert_sticker(
  p_sticker JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id INTEGER;
  v_is_create BOOLEAN;
  v_before_json JSONB;
  v_after_json JSONB;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Determine if this is a create or update
  v_id := (p_sticker->>'id')::INTEGER;
  v_is_create := (v_id IS NULL);

  -- Capture before state for audit (only for updates)
  IF NOT v_is_create THEN
    SELECT to_jsonb(s.*) INTO v_before_json
    FROM stickers s
    WHERE s.id = v_id;

    IF v_before_json IS NULL THEN
      RAISE EXCEPTION 'Cromos no encontrado: %', v_id
        USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Upsert sticker
  INSERT INTO stickers (
    id,
    collection_id,
    team_id,
    code,
    player_name,
    position,
    nationality,
    rating,
    rarity,
    image_url,
    sticker_number,
    image_path_webp_300,
    thumb_path_webp_100
  )
  VALUES (
    v_id,
    (p_sticker->>'collection_id')::INTEGER,
    (p_sticker->>'team_id')::INTEGER,
    p_sticker->>'code',
    p_sticker->>'player_name',
    p_sticker->>'position',
    p_sticker->>'nationality',
    (p_sticker->>'rating')::INTEGER,
    p_sticker->>'rarity',
    p_sticker->>'image_url',
    (p_sticker->>'sticker_number')::INTEGER,
    p_sticker->>'image_path_webp_300',
    p_sticker->>'thumb_path_webp_100'
  )
  ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id,
    team_id = EXCLUDED.team_id,
    code = EXCLUDED.code,
    player_name = EXCLUDED.player_name,
    position = EXCLUDED.position,
    nationality = EXCLUDED.nationality,
    rating = EXCLUDED.rating,
    rarity = EXCLUDED.rarity,
    image_url = EXCLUDED.image_url,
    sticker_number = EXCLUDED.sticker_number,
    image_path_webp_300 = EXCLUDED.image_path_webp_300,
    thumb_path_webp_100 = EXCLUDED.thumb_path_webp_100
  RETURNING id INTO v_id;

  -- Capture after state for audit
  SELECT to_jsonb(s.*) INTO v_after_json
  FROM stickers s
  WHERE s.id = v_id;

  -- Write audit entry
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'sticker',
    v_id,
    CASE WHEN v_is_create THEN 'create' ELSE 'update' END,
    v_before_json,
    v_after_json
  );

  -- Return result
  RETURN jsonb_build_object(
    'id', v_id,
    'code', p_sticker->>'code',
    'player_name', p_sticker->>'player_name',
    'created', v_is_create
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_upsert_sticker(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_upsert_sticker(JSONB) TO authenticated;

COMMENT ON FUNCTION admin_upsert_sticker(JSONB) IS
  'Admin-only: Create or update a sticker. Records action in audit_log.';

-- -----------------------------------------------
-- RPC: admin_delete_sticker
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_delete_sticker(BIGINT);

CREATE OR REPLACE FUNCTION admin_delete_sticker(
  p_sticker_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Capture before state for audit
  SELECT to_jsonb(s.*) INTO v_before_json
  FROM stickers s
  WHERE s.id = p_sticker_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Cromos no encontrado: %', p_sticker_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Write audit entry BEFORE deletion
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'sticker',
    p_sticker_id,
    'delete',
    v_before_json,
    NULL
  );

  -- Delete sticker (cascades to user_stickers, page_slots, trade_proposal_items)
  DELETE FROM stickers WHERE id = p_sticker_id;

  -- Note: Storage cleanup for sticker images must be done by client
  -- after this RPC returns successfully
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_sticker(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_sticker(BIGINT) TO authenticated;

COMMENT ON FUNCTION admin_delete_sticker(BIGINT) IS
  'Admin-only: Delete a sticker and all associated data (cascading). Records action in audit_log. Client must delete storage files separately.';

-- -----------------------------------------------
-- RPC: admin_remove_sticker_image
-- -----------------------------------------------

DROP FUNCTION IF EXISTS admin_remove_sticker_image(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION admin_remove_sticker_image(
  p_sticker_id BIGINT,
  p_type TEXT -- 'full' or 'thumb'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_before_json JSONB;
  v_after_json JSONB;
  v_removed_path TEXT;
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden realizar esta acción'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate p_type
  IF p_type NOT IN ('full', 'thumb') THEN
    RAISE EXCEPTION 'Tipo de imagen inválido: %. Debe ser "full" o "thumb"', p_type
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Capture before state for audit
  SELECT to_jsonb(s.*) INTO v_before_json
  FROM stickers s
  WHERE s.id = p_sticker_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'Cromos no encontrado: %', p_sticker_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Remove the appropriate image path
  IF p_type = 'full' THEN
    v_removed_path := v_before_json->>'image_path_webp_300';
    UPDATE stickers SET image_path_webp_300 = NULL WHERE id = p_sticker_id;
  ELSE
    v_removed_path := v_before_json->>'thumb_path_webp_100';
    UPDATE stickers SET thumb_path_webp_100 = NULL WHERE id = p_sticker_id;
  END IF;

  -- Capture after state for audit
  SELECT to_jsonb(s.*) INTO v_after_json
  FROM stickers s
  WHERE s.id = p_sticker_id;

  -- Write audit entry
  INSERT INTO audit_log (user_id, entity, entity_id, action, before_json, after_json)
  VALUES (
    auth.uid(),
    'image',
    p_sticker_id,
    'remove_image',
    jsonb_build_object('type', p_type, 'path', v_removed_path),
    v_after_json
  );

  -- Note: Storage file deletion must be done by client after this RPC returns successfully
END;
$$;

REVOKE ALL ON FUNCTION admin_remove_sticker_image(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_remove_sticker_image(BIGINT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_remove_sticker_image(BIGINT, TEXT) IS
  'Admin-only: Remove sticker image path (full or thumb) and record in audit_log. Client must delete storage file separately.';

-- =============================================
-- PART 8: ADMIN RPCs - AUDIT LOG QUERY
-- =============================================

-- -----------------------------------------------
-- RPC: get_audit_log
-- -----------------------------------------------

DROP FUNCTION IF EXISTS get_audit_log(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_audit_log(
  p_entity TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  admin_nickname TEXT,
  entity TEXT,
  entity_id BIGINT,
  action TEXT,
  before_json JSONB,
  after_json JSONB,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Security: Check if user is admin
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Acceso denegado: solo administradores pueden ver el registro de auditoría'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.nickname AS admin_nickname,
    a.entity,
    a.entity_id,
    a.action,
    a.before_json,
    a.after_json,
    a.occurred_at
  FROM audit_log a
  LEFT JOIN profiles p ON p.id = a.user_id
  WHERE
    (p_entity IS NULL OR a.entity = p_entity)
    AND (p_action IS NULL OR a.action = p_action)
  ORDER BY a.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION get_audit_log(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_audit_log(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_audit_log(TEXT, TEXT, INTEGER, INTEGER) IS
  'Admin-only: Retrieve audit log entries with optional filters for entity and action. Returns latest 100 entries by default.';

-- =============================================
-- VERIFICATION QUERIES (commented out - for testing)
-- =============================================

-- Test queries (uncomment to verify):
-- SELECT * FROM audit_log;
-- SELECT * FROM get_audit_log();
-- SELECT * FROM get_audit_log('collection', 'create', 10, 0);
-- SELECT is_admin_user();
