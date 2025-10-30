-- =====================================================
-- Drop immediate rating notification trigger
-- =====================================================
-- Purpose: Remove the old trigger that creates notifications
--          immediately when someone rates. We only want notifications
--          after BOTH users have rated (mutual rating complete).
-- =====================================================

-- Drop the trigger that fires immediately on any rating
DROP TRIGGER IF EXISTS trigger_notify_user_rating ON user_ratings;

-- Drop the function as well (no longer needed)
DROP FUNCTION IF EXISTS notify_user_rating() CASCADE;

COMMENT ON TRIGGER trigger_check_mutual_ratings ON user_ratings IS
    'Only trigger for user ratings - fires after mutual rating is complete';
