-- Migration: 20251205143407_fix_template_copy_independence.sql
-- Phase 1A: Fix Album Independence

-- =====================================================
-- FIX: Make user albums independent snapshots
-- =====================================================
-- When a user copies a template, they get a snapshot.
-- Later changes to the template don't affect the album.
-- If template is deleted, album becomes "orphaned" but remains functional.
-- =====================================================

-- 1. Change FK constraint to prevent cascading from template changes
ALTER TABLE user_template_copies
DROP CONSTRAINT IF EXISTS user_template_copies_template_id_fkey;

ALTER TABLE user_template_copies
ADD CONSTRAINT user_template_copies_template_id_fkey
FOREIGN KEY (template_id)
REFERENCES collection_templates(id)
ON DELETE SET NULL      -- Album survives template deletion (becomes orphaned)
ON UPDATE NO ACTION;    -- Album doesn't sync with template ID changes

-- 2. Allow template_id to be nullable (for orphaned albums)
ALTER TABLE user_template_copies
ALTER COLUMN template_id DROP NOT NULL;

-- 3. Add column to track if album is orphaned
ALTER TABLE user_template_copies
ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN GENERATED ALWAYS AS (template_id IS NULL) STORED;

-- 4. Add comments explaining independence
COMMENT ON COLUMN user_template_copies.template_id IS
    'Reference to original template. NULL if template was deleted (orphaned album). Albums are independent snapshots - template updates do NOT affect albums.';

COMMENT ON COLUMN user_template_copies.is_orphaned IS
    'Computed column: true if original template was deleted. Orphaned albums remain fully functional.';

-- 5. Add index for orphaned albums
CREATE INDEX IF NOT EXISTS idx_user_template_copies_orphaned
ON user_template_copies(user_id)
WHERE template_id IS NULL;

-- 6. Ensure user_template_progress also independent
-- Check if FK exists on user_template_progress that might cascade
ALTER TABLE user_template_progress
DROP CONSTRAINT IF EXISTS user_template_progress_copy_id_fkey;

ALTER TABLE user_template_progress
ADD CONSTRAINT user_template_progress_copy_id_fkey
FOREIGN KEY (copy_id)
REFERENCES user_template_copies(id)
ON DELETE CASCADE      -- Progress is deleted when album is deleted (correct)
ON UPDATE NO ACTION;   -- Progress doesn't sync with copy ID changes
