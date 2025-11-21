# Supabase Verification Queries for Marketplace

Run these queries in the Supabase SQL editor to verify that the marketplace backend is properly deployed.

## 1. Check if the trade_listings table exists

```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'trade_listings';
```

## 2. Check if the RPC functions exist

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'list_trade_listings',
  'create_trade_listing',
  'get_user_listings',
  'update_listing_status'
);
```

## 3. Verify the trade_listings table structure

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trade_listings'
ORDER BY ordinal_position;
```

## 4. Test the list_trade_listings RPC function directly

```sql
SELECT * FROM list_trade_listings(
  p_limit => 5,
  p_offset => 0,
  p_search => NULL
);
```

## 5. Check RLS policies on trade_listings table

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'trade_listings';
```

## 6. Verify the user can access the RPC function

```sql
SELECT has_function_privilege(
  current_user,
  'list_trade_listing
```
