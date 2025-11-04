-- Badges System Implementation (FIXED)
-- This migration creates the complete badges system including:
-- 1. badge_definitions table
-- 2. user_badge_progress table
-- 3. Creates or updates user_badges table
-- 4. RPC functions for badge management
-- 5. Triggers for automatic badge awarding
-- 6. Notification integration

-- =====================================================
-- 1. BADGE DEFINITIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS badge_definitions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('collector', 'creator', 'reviewer', 'completionist', 'trader', 'top_rated')),
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'special')),
    display_name_es TEXT NOT NULL,
    description_es TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON badge_definitions(category);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_sort_order ON badge_definitions(sort_order);

-- =====================================================
-- 2. USER BADGE PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_badge_progress (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_category TEXT NOT NULL CHECK (badge_category IN ('collector', 'creator', 'reviewer', 'completionist', 'trader', 'top_rated')),
    current_count INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, badge_category)
);

-- Index for efficient progress queries
CREATE INDEX IF NOT EXISTS idx_user_badge_progress_user_id ON user_badge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_progress_category ON user_badge_progress(badge_category);

-- =====================================================
-- 3. USER BADGES TABLE
-- =====================================================

-- Create user_badges table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id TEXT REFERENCES badge_definitions(id),
    progress_snapshot INTEGER,
    earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- If table exists but columns are missing, add them
DO $$
BEGIN
    -- Add badge_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_badges' AND column_name = 'badge_id'
    ) THEN
        ALTER TABLE user_badges ADD COLUMN badge_id TEXT REFERENCES badge_definitions(id);
    END IF;

    -- Add progress_snapshot if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_badges' AND column_name = 'progress_snapshot'
    ) THEN
        ALTER TABLE user_badges ADD COLUMN progress_snapshot INTEGER;
    END IF;

    -- Add earned_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_badges' AND column_name = 'earned_at'
    ) THEN
        ALTER TABLE user_badges ADD COLUMN earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Index for efficient badge queries
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id_earned_at ON user_badges(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- =====================================================
-- 4. RPC FUNCTIONS
-- =====================================================

-- Function: increment_badge_progress
-- Atomically increment a user's progress for a badge category
CREATE OR REPLACE FUNCTION increment_badge_progress(
    p_user_id UUID,
    p_category TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Insert or update progress
    INSERT INTO user_badge_progress (user_id, badge_category, current_count, updated_at)
    VALUES (p_user_id, p_category, 1, NOW())
    ON CONFLICT (user_id, badge_category)
    DO UPDATE SET
        current_count = user_badge_progress.current_count + 1,
        updated_at = NOW()
    RETURNING current_count INTO v_new_count;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: check_and_award_badge
-- Check if user qualifies for badge and award it
CREATE OR REPLACE FUNCTION check_and_award_badge(
    p_user_id UUID,
    p_category TEXT
) RETURNS TABLE(badge_awarded BOOLEAN, badge_id TEXT, badge_name TEXT) AS $$
DECLARE
    v_current_count INTEGER;
    v_badge RECORD;
    v_already_earned BOOLEAN;
BEGIN
    -- Get current progress
    SELECT current_count INTO v_current_count
    FROM user_badge_progress
    WHERE user_id = p_user_id AND badge_category = p_category;

    -- If no progress found, nothing to award
    IF v_current_count IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Find the highest tier badge this user qualifies for but hasn't earned yet
    FOR v_badge IN
        SELECT bd.id, bd.display_name_es, bd.threshold, bd.tier
        FROM badge_definitions bd
        WHERE bd.category = p_category
            AND bd.threshold <= v_current_count
        ORDER BY bd.threshold DESC
        LIMIT 1
    LOOP
        -- Check if already earned (use table alias to avoid ambiguity)
        SELECT EXISTS(
            SELECT 1 FROM user_badges ub
            WHERE ub.user_id = p_user_id AND ub.badge_id = v_badge.id
        ) INTO v_already_earned;

        -- Award badge if not already earned
        IF NOT v_already_earned THEN
            INSERT INTO user_badges (user_id, badge_id, progress_snapshot, earned_at)
            VALUES (p_user_id, v_badge.id, v_current_count, NOW());

            RETURN QUERY SELECT TRUE, v_badge.id, v_badge.display_name_es;
            RETURN;
        END IF;
    END LOOP;

    -- No new badge to award
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_user_badges_with_details
-- Fetch all badges for a user with full metadata
CREATE OR REPLACE FUNCTION get_user_badges_with_details(p_user_id UUID)
RETURNS TABLE(
    badge_id TEXT,
    category TEXT,
    tier TEXT,
    display_name_es TEXT,
    description_es TEXT,
    icon_name TEXT,
    threshold INTEGER,
    earned_at TIMESTAMPTZ,
    progress_snapshot INTEGER,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bd.id,
        bd.category,
        bd.tier,
        bd.display_name_es,
        bd.description_es,
        bd.icon_name,
        bd.threshold,
        ub.earned_at,
        ub.progress_snapshot,
        bd.sort_order
    FROM user_badges ub
    JOIN badge_definitions bd ON ub.badge_id = bd.id
    WHERE ub.user_id = p_user_id
    ORDER BY ub.earned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_badge_progress
-- Get progress towards all badges for a user
CREATE OR REPLACE FUNCTION get_badge_progress(p_user_id UUID)
RETURNS TABLE(
    badge_id TEXT,
    category TEXT,
    tier TEXT,
    display_name_es TEXT,
    description_es TEXT,
    icon_name TEXT,
    threshold INTEGER,
    current_progress INTEGER,
    is_earned BOOLEAN,
    earned_at TIMESTAMPTZ,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bd.id,
        bd.category,
        bd.tier,
        bd.display_name_es,
        bd.description_es,
        bd.icon_name,
        bd.threshold,
        COALESCE(ubp.current_count, 0) as current_progress,
        ub.user_id IS NOT NULL as is_earned,
        ub.earned_at,
        bd.sort_order
    FROM badge_definitions bd
    LEFT JOIN user_badge_progress ubp ON
        ubp.user_id = p_user_id AND
        ubp.badge_category = bd.category
    LEFT JOIN user_badges ub ON
        ub.user_id = p_user_id AND
        ub.badge_id = bd.id
    ORDER BY bd.sort_order, bd.threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS FOR AUTOMATIC BADGE AWARDING
-- =====================================================

-- 5.1 Collector Badge Trigger (user_template_copies)
CREATE OR REPLACE FUNCTION trigger_collector_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Increment progress
    v_new_count := increment_badge_progress(NEW.user_id, 'collector');

    -- Check and award badge
    PERFORM check_and_award_badge(NEW.user_id, 'collector');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collector_badge_on_copy ON user_template_copies;
CREATE TRIGGER trigger_collector_badge_on_copy
    AFTER INSERT ON user_template_copies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_collector_badge();

-- 5.2 Creator Badge Trigger (collection_templates)
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

DROP TRIGGER IF EXISTS trigger_creator_badge_on_template ON collection_templates;
CREATE TRIGGER trigger_creator_badge_on_template
    AFTER INSERT ON collection_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_creator_badge();

-- 5.3 Reviewer Badge Trigger (template_ratings)
CREATE OR REPLACE FUNCTION trigger_reviewer_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Increment progress
    v_new_count := increment_badge_progress(NEW.user_id, 'reviewer');

    -- Check and award badge
    PERFORM check_and_award_badge(NEW.user_id, 'reviewer');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reviewer_badge_on_rating ON template_ratings;
CREATE TRIGGER trigger_reviewer_badge_on_rating
    AFTER INSERT ON template_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_reviewer_badge();

-- 5.4 Completionist Badge Trigger (user_template_progress)
-- This trigger fires when a slot is updated and checks if collection is now 100% complete
CREATE OR REPLACE FUNCTION trigger_completionist_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_new_count INTEGER;
    v_total_slots INTEGER;
    v_completed_slots INTEGER;
    v_was_complete BOOLEAN := FALSE;
    v_is_complete BOOLEAN := FALSE;
BEGIN
    -- Only process if status changed from 'missing' to 'owned' or 'duplicate'
    IF (OLD.status = 'missing' OR OLD.status IS NULL) AND
       (NEW.status = 'owned' OR NEW.status = 'duplicate') THEN

        -- Check if collection was complete before this update
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status != 'missing') as completed
        INTO v_total_slots, v_completed_slots
        FROM user_template_progress
        WHERE user_id = NEW.user_id
          AND copy_id = NEW.copy_id;

        -- Check if collection is now 100% complete
        -- All slots must be owned or duplicate (none missing)
        v_is_complete := (v_completed_slots = v_total_slots);

        -- If collection just became complete, award badge
        IF v_is_complete THEN
            -- Increment progress
            v_new_count := increment_badge_progress(NEW.user_id, 'completionist');

            -- Check and award badge
            PERFORM check_and_award_badge(NEW.user_id, 'completionist');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_completionist_badge_on_complete ON user_template_progress;
CREATE TRIGGER trigger_completionist_badge_on_complete
    AFTER INSERT OR UPDATE ON user_template_progress
    FOR EACH ROW
    EXECUTE FUNCTION trigger_completionist_badge();

-- 5.5 Trader Badge Trigger (trade_listings)
-- Increment when a trade is completed (status = 'sold')
CREATE OR REPLACE FUNCTION trigger_trader_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Only process when status changes to 'sold'
    IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
        -- Increment progress for the seller
        v_new_count := increment_badge_progress(NEW.user_id, 'trader');

        -- Check and award badge
        PERFORM check_and_award_badge(NEW.user_id, 'trader');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trader_badge_on_sale ON trade_listings;
CREATE TRIGGER trigger_trader_badge_on_sale
    AFTER UPDATE ON trade_listings
    FOR EACH ROW
    WHEN (NEW.status = 'sold')
    EXECUTE FUNCTION trigger_trader_badge();

-- 5.6 Top Rated Badge Trigger (user_ratings)
-- This is more complex - requires 5+ completed trades AND 4.5+ rating
CREATE OR REPLACE FUNCTION trigger_top_rated_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating NUMERIC;
    v_rating_count INTEGER;
    v_completed_trades INTEGER;
BEGIN
    -- Check if this user qualifies for Top Rated
    -- Must have: 5+ completed trades AND 4.5+ average rating

    -- Get completed trades count
    SELECT COUNT(*) INTO v_completed_trades
    FROM trade_listings
    WHERE user_id = NEW.rated_user_id AND status = 'sold';

    -- Get average rating and count
    SELECT AVG(rating), COUNT(*) INTO v_avg_rating, v_rating_count
    FROM user_ratings
    WHERE rated_user_id = NEW.rated_user_id;

    -- Check if qualifies
    IF v_completed_trades >= 5 AND v_avg_rating >= 4.5 AND v_rating_count >= 5 THEN
        -- Set progress to 1 (this is a special badge with threshold 1)
        INSERT INTO user_badge_progress (user_id, badge_category, current_count, updated_at)
        VALUES (NEW.rated_user_id, 'top_rated', 1, NOW())
        ON CONFLICT (user_id, badge_category)
        DO UPDATE SET
            current_count = 1,
            updated_at = NOW();

        -- Award badge if not already earned
        PERFORM check_and_award_badge(NEW.rated_user_id, 'top_rated');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_top_rated_badge_on_rating ON user_ratings;
CREATE TRIGGER trigger_top_rated_badge_on_rating
    AFTER INSERT OR UPDATE ON user_ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_top_rated_badge();

-- =====================================================
-- 6. NOTIFICATION INTEGRATION
-- =====================================================

-- Trigger to create notification when badge is earned
CREATE OR REPLACE FUNCTION trigger_notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
    v_badge_name TEXT;
    v_badge_id TEXT;
    v_user_id UUID;
    v_earned_at TIMESTAMPTZ;
BEGIN
    -- Store NEW values in local variables to avoid ambiguity
    v_badge_id := NEW.badge_id;
    v_user_id := NEW.user_id;
    v_earned_at := NEW.earned_at;

    -- Get badge display name
    SELECT display_name_es INTO v_badge_name
    FROM badge_definitions
    WHERE id = v_badge_id;

    -- Create notification matching actual schema
    -- The notifications table uses: user_id, kind, trade_id, listing_id, template_id, rating_id, actor_id, payload
    -- We'll store badge info in payload since there's no badge_id column
    INSERT INTO notifications (
        user_id,
        kind,
        actor_id,
        payload,
        created_at
    ) VALUES (
        v_user_id,
        'badge_earned',
        NULL,  -- No actor for badge notifications (system-generated)
        jsonb_build_object(
            'badge_id', v_badge_id,
            'badge_name', v_badge_name,
            'earned_at', v_earned_at
        ),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON user_badges;
CREATE TRIGGER trigger_notify_badge_earned
    AFTER INSERT ON user_badges
    FOR EACH ROW
    WHEN (NEW.badge_id IS NOT NULL)
    EXECUTE FUNCTION trigger_notify_badge_earned();

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badge_progress ENABLE ROW LEVEL SECURITY;

-- Badge definitions are public (read-only)
DROP POLICY IF EXISTS "Badge definitions are publicly readable" ON badge_definitions;
CREATE POLICY "Badge definitions are publicly readable"
    ON badge_definitions
    FOR SELECT
    USING (true);

-- User badge progress: users can read their own progress
DROP POLICY IF EXISTS "Users can view their own badge progress" ON user_badge_progress;
CREATE POLICY "Users can view their own badge progress"
    ON user_badge_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Enable RLS on user_badges if not already enabled
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- User badges: badges are publicly readable (for profile display)
DROP POLICY IF EXISTS "User badges are publicly readable" ON user_badges;
CREATE POLICY "User badges are publicly readable"
    ON user_badges
    FOR SELECT
    USING (true);

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION increment_badge_progress TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_badge TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_badges_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_badge_progress TO authenticated;

-- Grant execute to anon for read-only functions (for public profile viewing)
GRANT EXECUTE ON FUNCTION get_user_badges_with_details TO anon;
GRANT EXECUTE ON FUNCTION get_badge_progress TO anon;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment to track migration
COMMENT ON TABLE badge_definitions IS 'Stores all available badge definitions with metadata';
COMMENT ON TABLE user_badge_progress IS 'Tracks user progress towards earning badges';
COMMENT ON TABLE user_badges IS 'Records earned badges with timestamps and progress snapshots';
COMMENT ON COLUMN user_badges.badge_id IS 'Reference to badge definition';
COMMENT ON COLUMN user_badges.progress_snapshot IS 'Count at time of earning badge';
