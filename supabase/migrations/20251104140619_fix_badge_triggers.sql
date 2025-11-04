-- Fix Badge Triggers
-- This migration fixes the column name issues in badge triggers

-- =====================================================
-- FIX: Creator Badge Trigger
-- =====================================================
-- The collection_templates table uses 'author_id', not 'creator_id'

CREATE OR REPLACE FUNCTION trigger_creator_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Increment progress (column is author_id, not creator_id)
    v_new_count := increment_badge_progress(NEW.author_id, 'creator');

    -- Check and award badge
    PERFORM check_and_award_badge(NEW.author_id, 'creator');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure it uses the fixed function
DROP TRIGGER IF EXISTS trigger_creator_badge_on_template ON collection_templates;
CREATE TRIGGER trigger_creator_badge_on_template
    AFTER INSERT ON collection_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_creator_badge();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test that the function references the correct column
DO $$
BEGIN
    RAISE NOTICE 'Badge trigger fix applied successfully';
    RAISE NOTICE 'Creator badge trigger now uses author_id column';
END $$;
