# Two-Stage Deletion System - Testing Guide

**Created**: 2025-12-04
**Status**: ✅ All Critical Issues Fixed

---

## 🔧 Fixes Applied

1. ✅ **Soft Delete Modal**: Simplified to single-step (removed typed confirmation)
2. ✅ **Hard Delete Modal**: Fixed text display issue (white background box)
3. ✅ **Type Casting Error**: Fixed `favourites.target_id` TEXT vs BIGINT mismatch
4. ✅ **Status Check**: Now accepts both 'ELIMINADO' and 'removed' statuses
5. ✅ **Build Verification**: Application compiles successfully

---

## 🧪 Frontend Tests (Manual - Do These First)

### Test 1: Soft Delete Flow ✅

**Prerequisites**: Have at least one active listing

**Steps**:
1. Navigate to `/marketplace/my-listings`
2. Go to "Activos" tab
3. Click "Eliminar" button on any active listing
4. **Verify**: Blue-themed modal appears
5. **Verify**: Modal shows:
   - Title: "¿Eliminar Anuncio?"
   - Explanation about 30-day restoration
   - Warning about automatic deletion after 30 days
   - Two buttons: "Cancelar" and "Mover a Eliminados"
6. Click "Mover a Eliminados"
7. **Verify**: Listing moves to "Eliminados" tab
8. **Verify**: Success toast appears
9. **Verify**: Listing shows in "Eliminados" section

**Expected Result**: ✅ Listing soft-deleted successfully

---

### Test 2: Restore Flow ✅

**Prerequisites**: Have at least one ELIMINADO listing (from Test 1)

**Steps**:
1. Navigate to `/marketplace/my-listings`
2. Go to "Eliminados" tab
3. **Verify**: ELIMINADO listing appears with two buttons:
   - "Restaurar" (green)
   - "Eliminar Definitivamente" (red)
4. Click "Restaurar" button
5. **Verify**: Listing moves back to "Activos" tab
6. **Verify**: Success toast: "¡Anuncio restaurado correctamente! Ahora está activo de nuevo."
7. Check marketplace - listing should be visible again

**Expected Result**: ✅ Listing restored successfully

---

### Test 3: Hard Delete Flow ✅

**Prerequisites**: Have at least one ELIMINADO listing

**Steps**:
1. Navigate to `/marketplace/my-listings`
2. Go to "Eliminados" tab
3. Click "Eliminar Definitivamente" button on ELIMINADO listing
4. **Verify**: Red-themed modal appears with:
   - Title: "¿Eliminar Anuncio Permanentemente?"
   - **White background box** showing 4 items to be deleted (with visible text!)
   - Strong warnings about irreversibility
5. Click "Entiendo, Continuar"
6. **Verify**: Second step shows:
   - Checkbox with text: "Deseo eliminar definitivamente este anuncio..."
   - Last warning alert
7. Check the checkbox
8. **Verify**: "Eliminar Permanentemente" button becomes enabled
9. Click "Eliminar Permanentemente"
10. **Verify**: Loading state shows
11. **Verify**: Success message appears
12. **Verify**: Listing completely disappears from Eliminados tab
13. **Verify**: No errors in browser console

**Expected Result**: ✅ Listing permanently deleted, no type errors

---

### Test 4: Soft Delete from Listing Detail Page ✅

**Prerequisites**: Have at least one active listing

**Steps**:
1. Navigate to any of your active listings: `/marketplace/[id]`
2. **Verify**: Two delete buttons appear (top-right small icon + bottom "Eliminar Anuncio" button)
3. **Verify**: Both buttons are blue-themed (not red)
4. Click either "Eliminar Anuncio" button
5. **Verify**: Same blue modal as Test 1 appears
6. Click "Mover a Eliminados"
7. **Verify**: Redirects to `/marketplace/my-listings` with "Eliminados" tab selected
8. **Verify**: Listing appears in Eliminados section
9. **Verify**: Success toast: "Anuncio movido a Eliminados"

**Expected Result**: ✅ Delete from detail page works, redirects to Eliminados tab

---

### Test 5: UI Integration ✅

**Steps**:
1. Navigate to `/marketplace/my-listings`
2. **Verify**: Four tabs appear (not five):
   - Activos
   - Reservados
   - Completados
   - Eliminados (single tab, not duplicated)
3. **Verify**: Eliminados count includes both 'ELIMINADO' and 'removed' status
4. Test on mobile viewport (< 768px width):
   - **Verify**: Dropdown appears instead of tabs
   - **Verify**: Dropdown shows 4 options
5. Navigate to listing detail page of ELIMINADO listing
6. **Verify**: "Publicar Anuncio" button appears (green)
7. **Verify**: No "Eliminar Anuncio" button appears (only shows for active listings)

**Expected Result**: ✅ UI unified, no duplicate tabs, correct buttons per status

---

## 🗄️ Backend Tests (Via Application)

**Important**: Direct SQL tests fail due to authentication context. Test via the application instead.

### Test 6: Soft Delete Backend ✅

**Steps**:
1. Open browser DevTools → Network tab
2. Perform soft delete (Test 1 steps)
3. Find request to `/rest/v1/rpc/soft_delete_listing`
4. **Verify**: Response status 200
5. **Verify**: Response body:
   ```json
   [
     {
       "success": true,
       "message": "Listing status updated to ELIMINADO successfully",
       "previous_status": "active",
       "new_status": "ELIMINADO"
     }
   ]
   ```

**Alternative Verification** (via Supabase Dashboard):
1. Go to Supabase → Table Editor → trade_listings
2. Find your listing by ID
3. **Verify**: `status` column = 'ELIMINADO'
4. **Verify**: `updated_at` is recent

**Expected Result**: ✅ RPC executes successfully, status updated

---

### Test 7: Hard Delete Backend ✅

**Steps**:
1. Create test listing with chats (use app naturally)
2. Soft delete it
3. Open browser DevTools → Network tab
4. Perform hard delete (Test 3 steps)
5. Find request to `/rest/v1/rpc/hard_delete_listing`
6. **Verify**: Response status 200 (not 404!)
7. **Verify**: Response body:
   ```json
   [
     {
       "success": true,
       "message": "Listing and all associated data deleted permanently",
       "deleted_chat_count": <number>,
       "deleted_transaction_count": <number>,
       "media_files_deleted": <number>
     }
   ]
   ```
8. **Verify**: No error in console about "operator does not exist: text = bigint"

**Alternative Verification** (via Supabase Dashboard):
1. Go to Supabase → Table Editor → trade_listings
2. Search for your listing ID
3. **Verify**: Listing does not exist
4. Check trade_chats table → **Verify**: No chats for that listing_id
5. Check favourites table → **Verify**: No favourites for that listing_id

**Expected Result**: ✅ Complete deletion, no type errors

---

### Test 8: Restore Backend ✅

**Steps**:
1. Open browser DevTools → Network tab
2. Perform restore (Test 2 steps)
3. Find request to `/rest/v1/rpc/restore_listing`
4. **Verify**: Response status 200
5. **Verify**: Response body:
   ```json
   [
     {
       "success": true,
       "message": "Listing restored to active status successfully",
       "previous_status": "ELIMINADO",
       "new_status": "active"
     }
   ]
   ```

**Alternative Verification** (via Supabase Dashboard):
1. Go to Supabase → Table Editor → trade_listings
2. Find your listing by ID
3. **Verify**: `status` column = 'active'

**Expected Result**: ✅ Listing restored to active

---

## 🔍 Database Verification Tests

Use Supabase SQL Editor for these (no auth.uid() required):

### Test 9: Check Functions Exist ✅

```sql
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('soft_delete_listing', 'hard_delete_listing', 'restore_listing')
ORDER BY p.proname;
```

**Expected Result**: 3 functions listed

---

### Test 10: Check pg_cron Job ✅

```sql
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE jobname = 'cleanup-eliminado-listings';
```

**Expected Result**:
- `schedule`: '0 3 * * *'
- `active`: true
- `command`: contains 'cleanup_old_eliminado_listings'

---

### Test 11: Check ELIMINADO Listings ✅

```sql
SELECT
    id,
    title,
    status,
    user_id,
    created_at,
    updated_at,
    EXTRACT(DAY FROM NOW() - updated_at) as days_since_update
FROM trade_listings
WHERE status IN ('ELIMINADO', 'removed')
ORDER BY updated_at DESC
LIMIT 10;
```

**Expected Result**: Your test listings appear with correct status

---

### Test 12: Simulate Auto-Cleanup (Manual) ✅

**Warning**: This will permanently delete old ELIMINADO listings!

```sql
-- Check what would be deleted (safe query)
SELECT
    id,
    title,
    status,
    updated_at,
    NOW() - INTERVAL '30 days' as cutoff_date,
    updated_at < (NOW() - INTERVAL '30 days') as would_be_deleted
FROM trade_listings
WHERE status = 'ELIMINADO'
ORDER BY updated_at;

-- If you want to test cleanup (will actually delete!):
-- SELECT * FROM cleanup_old_eliminado_listings();
```

**Expected Result**: Query shows which listings are > 30 days old

---

## 🎯 Critical Path Testing

Run these tests in order to verify complete flow:

### Full Lifecycle Test ✅

1. **Create** → Create new test listing via `/marketplace/create`
2. **Verify Active** → Check it appears in marketplace and "Activos" tab
3. **View Detail** → Navigate to `/marketplace/[id]` for the listing
4. **Soft Delete from Detail** → Click "Eliminar Anuncio", confirm (Test 4)
5. **Verify Redirect** → Should redirect to "Eliminados" tab automatically
6. **Verify Hidden** → Check listing NOT in marketplace
7. **Verify Accessible** → Check listing in "Eliminados" tab
8. **Restore** → Move back to Activos (Test 2)
9. **Verify Active Again** → Check it appears in marketplace
10. **Soft Delete from My Listings** → Use My Listings page (Test 1)
11. **Hard Delete** → Permanently delete (Test 3)
12. **Verify Gone** → Check listing completely gone from app and database

**Expected Result**: ✅ Complete lifecycle works from both pages, auto-redirects to Eliminados

---

## 📊 Test Results Checklist

Use this to track your testing progress:

- [ ] Test 1: Soft Delete Flow (My Listings) - PASS/FAIL
- [ ] Test 2: Restore Flow - PASS/FAIL
- [ ] Test 3: Hard Delete Flow - PASS/FAIL
- [ ] Test 4: Soft Delete from Detail Page - PASS/FAIL
- [ ] Test 5: UI Integration - PASS/FAIL
- [ ] Test 6: Soft Delete Backend - PASS/FAIL
- [ ] Test 7: Hard Delete Backend - PASS/FAIL
- [ ] Test 8: Restore Backend - PASS/FAIL
- [ ] Test 9: Functions Exist - PASS/FAIL
- [ ] Test 10: pg_cron Job - PASS/FAIL
- [ ] Test 11: ELIMINADO Listings Query - PASS/FAIL
- [ ] Test 12: Auto-Cleanup Simulation - PASS/FAIL
- [ ] Full Lifecycle Test - PASS/FAIL

---

## 🐛 Known Issues & Resolutions

### ✅ FIXED: "User not authenticated" in SQL Editor
**Resolution**: Test via application instead, or create test with explicit user_id

### ✅ FIXED: "operator does not exist: text = bigint"
**Resolution**: Fixed with type casting in `hard_delete_listing` function

### ✅ FIXED: Hard delete modal text not visible
**Resolution**: Added white background box with proper text color

### ✅ FIXED: 404 on hard_delete_listing
**Resolution**: Type casting issue was causing function to fail silently

---

## 📝 Notes

- Auto-cleanup runs at **3:00 AM UTC daily**
- Listings are deleted **30 days** after being marked ELIMINADO
- 'removed' status is treated same as 'ELIMINADO' in UI
- Chat conversations preserved during soft delete
- Chat conversations deleted during hard delete
- All tests should show **no console errors**

---

**Last Updated**: 2025-12-04
**Status**: ✅ All Critical Issues Resolved - Ready for Testing
