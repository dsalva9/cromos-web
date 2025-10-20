-- =====================================================
-- CLEANUP: Remove Official Collections System
-- =====================================================
-- Reason: Pivot to neutral marketplace with community templates
-- NO users in production, safe DROP
-- =====================================================

-- 1. DROP TABLES (reverse dependency order)
DROP TABLE IF EXISTS page_slots CASCADE;
DROP TABLE IF EXISTS collection_pages CASCADE;
DROP TABLE IF EXISTS user_stickers CASCADE;
DROP TABLE IF EXISTS user_collections CASCADE;
DROP TABLE IF EXISTS stickers CASCADE;
DROP TABLE IF EXISTS collection_teams CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

-- 2. DROP related RPCs
DROP FUNCTION IF EXISTS get_completion_report CASCADE;
DROP FUNCTION IF EXISTS search_stickers CASCADE;
DROP FUNCTION IF EXISTS mark_team_page_complete CASCADE;
DROP FUNCTION IF EXISTS bulk_add_stickers_by_numbers CASCADE;
DROP FUNCTION IF EXISTS find_mutual_traders CASCADE;
DROP FUNCTION IF EXISTS get_mutual_trade_detail CASCADE;
DROP FUNCTION IF EXISTS get_user_collection_stats CASCADE;

-- 3. DROP orphaned indices (if any remain)
-- (CASCADE should have already removed them)

-- 4. VERIFICATION comments
-- Verify nothing remains:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%collection%';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%sticker%';