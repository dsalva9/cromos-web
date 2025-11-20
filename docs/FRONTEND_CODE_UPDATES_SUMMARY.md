# Frontend Code Updates Summary - Step 3 Complete

**Date**: 2025-01-20
**Phase**: Frontend code comments updated for v1.6.0 migration
**Status**: ✅ COMPLETE

---

## Overview

Updated frontend code comments to reference new v1.6.0 RPC names and mark deprecated v1.5.0 RPCs. This prepares the codebase for full migration to the v1.6.0 database schema.

---

## Files Modified

### 1. ✅ `src/hooks/album/useAlbumPages.ts` (2 locations)

#### Location 1: Line 174-179
**RPC**: `get_user_collection_stats`
**Status**: ⚠️ DEPRECATED v1.5.0

**Changes**:
```typescript
// Added comprehensive TODO comment explaining:
// - RPC was removed in v1.6.0
// - Migration path: Use get_my_template_copies() or get_template_progress()
// - Reference to migration guide
// - Inline warning marker: // ⚠️ DEPRECATED v1.5.0
```

#### Location 2: Line 769-775
**RPC**: `mark_team_page_complete`
**Status**: ⚠️ DEPRECATED v1.5.0

**Changes**:
```typescript
// Added TODO comment explaining:
// - RPC was removed in v1.6.0
// - Migration path: Bulk update template slots to status='owned', count=1
// - Reference to migration guide
// - Inline warning marker
```

---

### 2. ✅ `src/hooks/trades/useFindTraders.ts` (Line 58-65)

**RPC**: `find_mutual_traders`
**Status**: ⚠️ SIGNATURE CHANGED in v1.6.0 (RPC still exists)

**Changes**:
```typescript
// Added TODO comment explaining:
// - RPC still exists but signature changed
// - Missing parameters: p_lat, p_lon, p_radius_km, p_sort
// - New location-based matching capabilities
// - Reference to migration guide
// - Inline warning marker: // ⚠️ SIGNATURE CHANGED in v1.6.0
```

**Action Required**: Add location parameters to enable distance-based trader matching

---

### 3. ✅ `src/hooks/trades/useMatchDetail.ts` (Line 43-54)

**RPC**: `get_mutual_trade_detail`
**Status**: ⚠️ DEPRECATED v1.4.3, REMOVED v1.6.0

**Changes**:
```typescript
// Added TODO comment explaining:
// - RPC was removed in v1.4.3 (detail page removed)
// - Migration path: Remove hook entirely, navigate directly to trade composer
// - Reference to api-endpoints.md line 311 for historical context
// - Reference to migration guide
// - Inline warning marker
```

**Action Required**: Remove this hook and update routing logic

---

### 4. ✅ `src/components/ProfilePage.tsx` (Line 161-171)

**RPC**: `get_user_collection_stats`
**Status**: ⚠️ DEPRECATED v1.5.0

**Changes**:
```typescript
// Added TODO comment explaining:
// - RPC was removed in v1.6.0
// - Migration path: Use get_my_template_copies() or get_template_progress()
// - Reference to migration guide
// - Inline warning marker
```

---

### 5. ✅ `src/types/index.ts` (Line 184-187)

**Type**: `get_user_collection_stats` function type
**Status**: ⚠️ DEPRECATED v1.5.0

**Changes**:
```typescript
// Added TODO comment explaining:
// - Type should be removed in v1.6.0
// - Migration path: Replace with get_my_template_copies or get_template_progress types
// - Reference to migration guide
// - Inline warning marker
```

**Action Required**: Remove type definition after hooks are migrated

---

### 6. ✅ `src/lib/collectionStats.ts` (Header comment)

**File**: Entire utility file for collection statistics
**Status**: ⚠️ DEPRECATED v1.5.0

**Changes**:
```typescript
// Added file-level TODO comment explaining:
// - Entire file should be deprecated
// - Collections system removed in v1.6.0 (pivot to templates)
// - Migration path: Create new templateStats.ts using template RPCs
// - Reference to migration guide
// - Marked type definition as deprecated
```

**Action Required**: Create new `templateStats.ts` utility and migrate callers

---

## Migration Guide Created

### ✅ `docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md`

**Comprehensive 400+ line migration guide** covering:

#### Sections:
1. **Overview** - Breaking changes and removed systems
2. **RPC Migration Map** - 14 deprecated RPCs with before/after code examples
3. **New v1.6.0 Systems** - Marketplace, templates, badges, user blocking
4. **Migration Checklist** - 5-phase implementation plan
5. **Frontend Files Requiring Updates** - Prioritized list with line numbers
6. **Example Migrations** - Real code examples for each deprecated RPC
7. **Support** - References to other documentation

#### Coverage:
- ✅ Collection Statistics RPCs (2 deprecated)
- ✅ Sticker Management RPCs (3 deprecated)
- ✅ Trading Discovery RPCs (1 signature changed, 1 removed)
- ✅ Admin Functions RPCs (6+ deprecated)
- ✅ New v1.6.0 Systems (marketplace, templates, badges, blocking)

---

## Summary of Deprecated RPCs Found

### ❌ Removed in v1.6.0
1. `get_user_collection_stats` - Found in 4 files
2. `get_completion_report` - Not found in frontend
3. `bulk_add_stickers_by_numbers` - Not found in frontend
4. `search_stickers` - Not found in frontend
5. `mark_team_page_complete` - Found in 1 file
6. `get_mutual_trade_detail` - Found in 1 file (already deprecated in v1.4.3)
7. `admin_upsert_collection` - Not found in frontend
8. `admin_delete_collection` - Not found in frontend
9. `admin_upsert_page` - Not found in frontend
10. `admin_delete_page` - Not found in frontend
11. `admin_upsert_sticker` - Not found in frontend
12. `admin_delete_sticker` - Not found in frontend

### ⚠️ Signature Changed in v1.6.0
1. `find_mutual_traders` - Found in 1 file (needs location parameters)

---

## Files Requiring Migration (Priority Order)

### High Priority (Broken Functionality)
1. ⚠️ **src/hooks/album/useAlbumPages.ts**
   - 2 deprecated RPCs
   - Core collection functionality
   - **Estimated effort**: 4-6 hours

2. ⚠️ **src/hooks/trades/useFindTraders.ts**
   - 1 signature change
   - Missing location parameters
   - **Estimated effort**: 2-3 hours

3. ⚠️ **src/hooks/trades/useMatchDetail.ts**
   - 1 deprecated RPC
   - Should be removed entirely
   - **Estimated effort**: 1-2 hours

4. ⚠️ **src/components/ProfilePage.tsx**
   - 1 deprecated RPC
   - User profile display
   - **Estimated effort**: 2-3 hours

### Medium Priority (Type Cleanup)
5. **src/types/index.ts**
   - Remove deprecated types
   - **Estimated effort**: 30 minutes

6. **src/lib/collectionStats.ts**
   - Create replacement templateStats.ts
   - **Estimated effort**: 2-3 hours

### Low Priority (Admin - May be legacy)
7. Admin components in `src/components/admin/`
   - CollectionsTab.tsx
   - PagesTab.tsx
   - StickersTab.tsx
   - BulkUploadTab.tsx
   - **Status**: May need removal if collections-specific

---

## Next Steps for Frontend Team

### Phase 1: Immediate (This Week)
- [x] ✅ Add TODO comments to all deprecated RPC calls
- [x] ✅ Create migration guide
- [ ] Review migration guide with team
- [ ] Prioritize which features to migrate first

### Phase 2: Core Functionality (Week 1-2)
- [ ] Migrate `useAlbumPages.ts` to use template system
- [ ] Update `useFindTraders.ts` to include location parameters
- [ ] Remove `useMatchDetail.ts` and update routing
- [ ] Migrate `ProfilePage.tsx` to use template progress

### Phase 3: Type Cleanup (Week 2)
- [ ] Remove deprecated types from `types/index.ts`
- [ ] Create new `templateStats.ts` utility
- [ ] Update all imports

### Phase 4: Testing (Week 3)
- [ ] Test template progress displays
- [ ] Test marketplace functionality
- [ ] Test location-based trader matching
- [ ] Regression test existing features

### Phase 5: Cleanup (Week 3-4)
- [ ] Remove deprecated utility files
- [ ] Remove deprecated admin components (if confirmed legacy)
- [ ] Remove TODO comments
- [ ] Update documentation

---

## Estimated Total Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1 (TODO comments) | ✅ COMPLETE | High |
| Phase 2 (Core migration) | 10-15 hours | High |
| Phase 3 (Type cleanup) | 3-4 hours | Medium |
| Phase 4 (Testing) | 8-12 hours | High |
| Phase 5 (Cleanup) | 2-4 hours | Low |
| **TOTAL** | **23-35 hours** | - |

**Recommended Timeline**: 3-4 weeks with 1 developer

---

## Code Examples

### Example 1: Migrating get_user_collection_stats

**Before (v1.5.0)**:
```typescript
const { data: stats } = await supabase.rpc('get_user_collection_stats', {
  p_user_id: userId,
  p_collection_id: collectionId
});
// stats: { total_stickers, owned_stickers, completion_percentage, duplicates, missing }
```

**After (v1.6.0)**:
```typescript
const { data: copies } = await supabase.rpc('get_my_template_copies');
const copy = copies.find(c => c.template_id === templateId);
// copy: { total_slots, owned_slots, completion_percentage, ... }
```

### Example 2: Migrating mark_team_page_complete

**Before (v1.5.0)**:
```typescript
await supabase.rpc('mark_team_page_complete', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_page_id: pageId
});
```

**After (v1.6.0)**:
```typescript
// 1. Get all slots for page
const { data: slots } = await supabase
  .from('template_slots')
  .select('id')
  .eq('page_id', pageId);

// 2. Bulk update
for (const slot of slots) {
  await supabase.rpc('update_template_progress', {
    p_copy_id: copyId,
    p_slot_id: slot.id,
    p_status: 'owned',
    p_count: 1
  });
}
```

### Example 3: Adding Location to find_mutual_traders

**Before (v1.5.0)**:
```typescript
await supabase.rpc('find_mutual_traders', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_limit: 20,
  p_offset: 0
});
```

**After (v1.6.0)**:
```typescript
await supabase.rpc('find_mutual_traders', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_lat: userLatitude,         // NEW
  p_lon: userLongitude,        // NEW
  p_radius_km: 50,             // NEW
  p_sort: 'distance',          // NEW
  p_limit: 20,
  p_offset: 0
});
```

---

## Documentation References

- **Migration Guide**: `docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md`
- **API Endpoints**: `docs/api-endpoints.md` (v1.6.0)
- **Database Schema**: `docs/database-schema.md` (v1.6.0-alpha)
- **Validation Report**: `docs/VALIDATION_REPORT.md`

---

## Status

**Step 3 (Update Frontend Code Comments)**: ✅ COMPLETE

### What Was Done:
- ✅ Found all deprecated v1.5.0 RPC calls in frontend (7 instances across 6 files)
- ✅ Added comprehensive TODO comments with migration guidance
- ✅ Created 400+ line migration guide
- ✅ Marked all deprecated calls with inline warnings
- ✅ Provided code examples for each migration
- ✅ Created prioritized implementation checklist

### What's Next:
- Frontend team reviews migration guide
- Begin Phase 2: Core functionality migration
- Estimated 3-4 weeks for complete migration

---

**Last Updated**: 2025-01-20
**Contributors**: Claude Code (documentation), Frontend Team (pending migration)
