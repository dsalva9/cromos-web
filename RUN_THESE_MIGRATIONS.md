# 🚨 IMPORTANT: Run These Migrations

**Date**: 2025-10-31
**Status**: REQUIRED - App will not work correctly without these

---

## Why You Need to Run These

You're experiencing these issues because the migrations haven't been applied to your database:
1. ❌ Seeing your own listings in marketplace
2. ❌ Admin dashboard showing 404 errors
3. ❌ Missing `require_admin()` function

---

## How to Apply ALL Migrations

### Option 1: Supabase CLI (Easiest - Do This!)

```bash
# From your project root directory
npx supabase db push
```

This will apply ALL pending migrations automatically, including:
- ✅ Collection filter with own listings exclusion
- ✅ Admin RPC functions (marketplace, templates)
- ✅ require_admin() helper function

### Option 2: Supabase Dashboard (Manual)

If Option 1 doesn't work, run these migrations manually in order:

1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in this order:

#### Migration 1: Exclude Own Listings + Admin Functions
**File**: `supabase/migrations/20251031125558_exclude_own_listings_and_ensure_admin_functions.sql`

Copy and paste the entire file contents into SQL Editor and click **Run**.

#### Migration 2: Add require_admin() Function
**File**: `supabase/migrations/20251031130847_add_require_admin_helper.sql`

Copy and paste the entire file contents into SQL Editor and click **Run**.

---

## Verification After Running Migrations

Run these queries in Supabase SQL Editor to verify:

### 1. Check require_admin() exists
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'require_admin';
```
**Expected**: Should return 1 row

### 2. Check admin functions exist
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'admin_list_marketplace_listings',
  'admin_list_templates',
  'list_trade_listings_with_collection_filter'
);
```
**Expected**: Should return 3 rows

### 3. Test own listings exclusion
Log in as a user with marketplace listings, then run:
```sql
SELECT id, title, user_id
FROM list_trade_listings_with_collection_filter(20, 0, NULL, NULL, FALSE, NULL)
WHERE user_id = auth.uid();
```
**Expected**: Should return 0 rows (your own listings are excluded)

---

## What Each Migration Does

### Migration 1: `20251031125558_exclude_own_listings_and_ensure_admin_functions.sql`
- ✅ Excludes user's own listings from marketplace
- ✅ Creates admin_list_marketplace_listings function
- ✅ Creates admin_list_templates function
- ✅ Creates admin_update_listing_status function
- ✅ Creates admin_update_template_status function
- ✅ Adds necessary table columns for admin functions

### Migration 2: `20251031130847_add_require_admin_helper.sql`
- ✅ Creates require_admin() helper function
- ✅ Fixes "function require_admin() does not exist" error

---

## After Running Migrations - Test These

### Test 1: Marketplace (Own Listings)
1. Go to `/marketplace`
2. ✅ You should NOT see your own listings
3. Go to `/mis-anuncios`
4. ✅ Your listings ARE there

### Test 2: Admin Dashboard - Marketplace
1. Go to `/admin/dashboard` → Marketplace
2. ✅ No console errors
3. ✅ Listings appear

### Test 3: Admin Dashboard - Templates
1. Go to `/admin/dashboard` → Templates
2. ✅ No console errors
3. ✅ Templates appear

### Test 4: Admin Audit Log
1. Go to `/admin/audit`
2. ✅ No console errors
3. ✅ Can filter by action type
4. ✅ "Resolve Report" appears in filter dropdown

---

## Troubleshooting

### Error: "npx: command not found"
You need to install Node.js and npm first.

### Error: "supabase: command not found"
Run: `npm install -g supabase`

### Error: "Database connection refused"
Make sure you're logged in to Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Still seeing own listings after migration?
Clear your browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R).

### Admin functions still 404?
1. Verify migrations ran successfully in Supabase dashboard
2. Check the "Migrations" tab to see if they're marked as applied
3. If not, run them manually using Option 2

---

## Need Help?

If migrations fail, check:
1. Supabase dashboard → Database → Migrations tab
2. Look for error messages
3. Share the error message for troubleshooting

---

**IMPORTANT**: You MUST run these migrations for the app to work correctly!
