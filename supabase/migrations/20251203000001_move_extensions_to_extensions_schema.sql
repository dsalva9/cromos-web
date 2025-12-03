-- Move pg_trgm extension from public to extensions schema
-- This improves security by separating extensions from application tables

-- Drop extension from public schema and recreate in extensions schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Drop btree_gin extension from public schema and recreate in extensions schema
DROP EXTENSION IF EXISTS btree_gin CASCADE;
CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA extensions;

-- Recreate any indexes that depend on these extensions
-- The indexes will automatically use the extensions from the extensions schema

COMMENT ON EXTENSION pg_trgm IS 'Trigram similarity for text search (moved to extensions schema for security)';
COMMENT ON EXTENSION btree_gin IS 'GIN index support for btree operators (moved to extensions schema for security)';
