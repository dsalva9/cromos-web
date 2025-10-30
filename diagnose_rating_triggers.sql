-- Diagnostic: Check for duplicate triggers or functions
-- Run this in Supabase SQL Editor

-- 1. Check how many check_mutual_ratings_and_notify functions exist
SELECT
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'check_mutual_ratings_and_notify';

-- 2. Check how many triggers exist on user_ratings table
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgtype,
    tgenabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'user_ratings'::regclass
AND tgname LIKE '%mutual%';

-- 3. Check user_ratings for the specific listing to see if there are duplicate entries
SELECT
    id,
    rater_id,
    rated_id,
    rating,
    context_type,
    context_id,
    created_at
FROM user_ratings
WHERE context_type = 'listing'
AND context_id = YOUR_LISTING_ID_HERE  -- Replace with actual listing ID
ORDER BY created_at DESC;

-- 4. Check notifications for duplicate rating notifications
SELECT
    id,
    user_id,
    kind,
    listing_id,
    actor_id,
    payload,
    created_at,
    read_at
FROM notifications
WHERE kind = 'user_rated'
AND listing_id = YOUR_LISTING_ID_HERE  -- Replace with actual listing ID
ORDER BY created_at DESC;
