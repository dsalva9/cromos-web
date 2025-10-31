# Marketplace and Admin Dashboard Fixes

**Date**: 2025-10-31
**Status**: Ready for deployment

---

## Issues Fixed

### 1. User's Own Listings Appearing in Marketplace
**Problem**: Users could see their own listings in the marketplace, which is redundant since they have "Mis Anuncios" for managing their own listings.

**Solution**: Updated `list_trade_listings_with_collection_filter` function to exclude listings where `user_id = auth.uid()`.

**Impact**: Users will only see other people's listings in the marketplace.

---

### 2. Admin Dashboard Console Errors
**Problem**: Two admin dashboard pages showing 404 errors for missing RPC functions:
- Admin Marketplace: `admin_list_marketplace_listings` not found
- Admin Templates: `admin_list_templates` not found

**Root Cause**: The admin RPC functions from migration `20251025080436_admin_marketplace_templates.sql` were not present in the database.

**Solution**: Migration includes these functions to ensure they exist:
- `admin_list_marketplace_listings` - List all marketplace listings for admin
- `admin_update_listing_status` - Update listing status (suspend/restore/remove)
- `admin_list_templates` - List all templates for admin
- `admin_update_template_status` - Update template status (suspend/restore/delete)

**Impact**: Admin dashboard marketplace and templates pages will work correctly.

---

### 3. Admin Audit Log Filter Errors
**Problem**: Admin audit log page showing 400 Bad Request errors when filtering by action type.

**Root Cause**:
- Query was using invalid foreign key syntax `profiles!admin_id(nickname)`
- Filter was using wrong column name (`action_type` instead of `moderation_action_type`)
- Column mapping between database and display interface was incorrect

**Solution**: Updated `useAuditLog` hook to:
- Remove invalid foreign key query (admin_nickname already exists in table)
- Filter by `moderation_action_type` column instead of `action_type`
- Properly map database columns to display properties

**Impact**: Admin audit log filtering now works correctly for all action types.

---

## Files Changed

### Migration File

**File**: `supabase/migrations/20251031125558_exclude_own_listings_and_ensure_admin_functions.sql`

### What it does:

1. **Updates marketplace filter function**:
   - Adds condition: `AND (v_viewer_id IS NULL OR tl.user_id != v_viewer_id)`
   - This excludes user's own listings from marketplace view

2. **Ensures admin table columns exist**:
   - `trade_listings`: `suspended_at`, `suspension_reason`
   - `collection_templates`: `status`, `suspended_at`, `suspension_reason`

3. **Creates/updates admin RPC functions**:
   - `admin_list_marketplace_listings(p_status, p_query, p_page, p_page_size)`
   - `admin_update_listing_status(p_listing_id, p_status, p_reason)`
   - `admin_list_templates(p_status, p_query, p_page, p_page_size)`
   - `admin_update_template_status(p_template_id, p_status, p_reason)`

---

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251031125558_exclude_own_listings_and_ensure_admin_functions.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**
7. Verify success (should see "Success. No rows returned")

### Option 2: Supabase CLI

```bash
# From project root
npx supabase db push
```

This will apply all pending migrations including the new one.

---

## Verification Steps

### Test 1: Marketplace excludes own listings

1. Log in as a user who has created marketplace listings
2. Go to `/marketplace`
3. **Expected**: You should NOT see your own listings in the marketplace
4. **Expected**: You CAN see your listings in `/mis-anuncios`

### Test 2: Admin Dashboard - Marketplace

1. Log in as admin user
2. Go to `/admin/dashboard` → Marketplace tab
3. **Expected**: No console errors
4. **Expected**: List of all marketplace listings appears
5. **Expected**: Can filter by status and search

### Test 3: Admin Dashboard - Templates

1. Log in as admin user
2. Go to `/admin/dashboard` → Templates tab
3. **Expected**: No console errors
4. **Expected**: List of all templates appears
5. **Expected**: Can filter by status and search

### Test 4: Admin Audit Log Filters

1. Log in as admin user
2. Go to `/admin/audit`
3. **Expected**: No console errors (no 400 Bad Request)
4. Select different action types from dropdown (suspend_user, unsuspend_user, etc.)
5. **Expected**: Filter works correctly and shows filtered results
6. **Expected**: Admin nickname displays for each action

---

## Database Changes Summary

### Functions Modified
- `list_trade_listings_with_collection_filter` - Added exclusion of user's own listings

### Functions Created/Ensured
- `admin_list_marketplace_listings`
- `admin_update_listing_status`
- `admin_list_templates`
- `admin_update_template_status`

### Columns Ensured (created if not exist)
- `trade_listings.suspended_at`
- `trade_listings.suspension_reason`
- `collection_templates.status`
- `collection_templates.suspended_at`
- `collection_templates.suspension_reason`

---

## Rollback Plan

If issues occur, you can rollback by:

1. Restoring the previous `list_trade_listings_with_collection_filter` function:
   ```sql
   -- Remove the user exclusion line from the WHERE clause
   ```

2. The admin functions are additive only (no breaking changes)

---

## Notes

- **No breaking changes**: Existing functionality remains intact
- **Backwards compatible**: All changes are enhancements
- **Admin permissions**: Admin functions check `require_admin()` for security
- **Performance**: No impact on query performance (uses existing indexes)

---

## Related Files

### Migration
- `supabase/migrations/20251031125558_exclude_own_listings_and_ensure_admin_functions.sql`

### Frontend
- `src/hooks/admin/useAuditLog.ts` - Fixed query syntax and column mapping
- Admin marketplace/template hooks already call correct RPC functions
- Marketplace already uses the updated filter function

### Previous Related Migrations
- `20251031092744_add_collection_filter.sql` - Original collection filter
- `20251031095000_fix_collection_filter.sql` - Table name fixes
- `20251031120000_add_copy_slot_to_create_listing.sql` - Copy/slot tracking
- `20251025080436_admin_marketplace_templates.sql` - Original admin functions (may not have been applied)

---

**Status**: ✅ Ready for deployment
**Testing**: Manual testing required after migration
**Risk Level**: Low (additive changes only)
