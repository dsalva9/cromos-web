-- Check ALL triggers on user_ratings table
SELECT
    t.tgname as trigger_name,
    t.tgtype,
    t.tgenabled,
    pg_get_triggerdef(t.oid) as trigger_definition,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'user_ratings'::regclass
AND NOT t.tgisinternal  -- Exclude internal triggers
ORDER BY t.tgname;
