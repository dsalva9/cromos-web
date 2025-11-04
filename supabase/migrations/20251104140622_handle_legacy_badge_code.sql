-- Handle Legacy badge_code Column
-- This migration handles the existing badge_code column in user_badges table

-- =====================================================
-- OPTION 1: Make badge_code nullable (safest approach)
-- =====================================================

-- Check if badge_code column exists and make it nullable
DO $$
BEGIN
    -- Check if badge_code column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_badges' AND column_name = 'badge_code'
    ) THEN
        -- Make badge_code nullable since we're using badge_id instead
        ALTER TABLE user_badges ALTER COLUMN badge_code DROP NOT NULL;

        RAISE NOTICE 'badge_code column set to nullable';
    ELSE
        RAISE NOTICE 'badge_code column does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- OPTION 2: Populate badge_code from badge_id
-- =====================================================

-- If we want to keep badge_code populated, we can sync it from badge_id
-- This assumes badge_code should match badge_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_badges' AND column_name = 'badge_code'
    ) THEN
        -- Update existing rows to have badge_code = badge_id
        UPDATE user_badges
        SET badge_code = badge_id
        WHERE badge_code IS NULL AND badge_id IS NOT NULL;

        RAISE NOTICE 'Synchronized badge_code with badge_id for existing rows';
    END IF;
END $$;

-- =====================================================
-- OPTION 3: Create trigger to auto-populate badge_code
-- =====================================================

-- Create a trigger to automatically populate badge_code from badge_id on insert
CREATE OR REPLACE FUNCTION sync_badge_code()
RETURNS TRIGGER AS $$
BEGIN
    -- If badge_code is null but badge_id is set, copy badge_id to badge_code
    IF NEW.badge_code IS NULL AND NEW.badge_id IS NOT NULL THEN
        NEW.badge_code := NEW.badge_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_badge_code ON user_badges;
CREATE TRIGGER trigger_sync_badge_code
    BEFORE INSERT OR UPDATE ON user_badges
    FOR EACH ROW
    EXECUTE FUNCTION sync_badge_code();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Legacy badge_code handling applied successfully';
    RAISE NOTICE '1. badge_code is now nullable';
    RAISE NOTICE '2. Existing rows synchronized';
    RAISE NOTICE '3. Trigger created to auto-populate badge_code from badge_id';
END $$;
