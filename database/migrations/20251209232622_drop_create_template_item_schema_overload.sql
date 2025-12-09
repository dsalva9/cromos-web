-- =====================================================
-- TEMPLATES: Drop create_template function overload with p_item_schema
-- =====================================================
-- Purpose: Remove duplicate function signature that causes PostgREST ambiguity
-- The 5-parameter version with p_item_schema was never fully implemented
-- (no item_schema column in collection_templates table)
-- =====================================================

-- Drop the 5-parameter overload
DROP FUNCTION IF EXISTS create_template(
    p_title TEXT,
    p_description TEXT,
    p_image_url TEXT,
    p_is_public BOOLEAN,
    p_item_schema JSONB
);

-- Keep only the 4-parameter version (already exists from migration 20251020050000)
-- No need to recreate it, just ensure it exists
COMMENT ON FUNCTION create_template(TEXT, TEXT, TEXT, BOOLEAN) IS 'Creates a new collection template (4-parameter version)';
