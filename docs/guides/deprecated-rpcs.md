# Deprecated RPC Migration Guide

Reference guide for migrating from deprecated v1.5.0 RPCs to v1.6.0 equivalents.

---

## Summary

Based on analysis from `FRONTEND_CODE_UPDATES_SUMMARY.md`:
- **12 RPCs removed** in v1.6.0 (collections system pivot)
- **1 RPC signature changed** (location parameters added)
- **7 instances found** in frontend code requiring updates
- **Complete migration guide**: `/docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md`

---

## Files Requiring Updates

### High Priority (Broken Functionality)

**1. `src/hooks/album/useAlbumPages.ts`** (2 deprecated RPCs)
- `get_user_collection_stats` → Use `get_my_template_copies()`
- `mark_team_page_complete` → Bulk update template slots
- **Effort**: 4-6 hours

**2. `src/hooks/trades/useFindTraders.ts`** (1 signature change)
- `find_mutual_traders` → Add location parameters (p_lat, p_lon, p_radius_km, p_sort)
- **Effort**: 2-3 hours

**3. `src/hooks/trades/useMatchDetail.ts`** (1 removed)
- `get_mutual_trade_detail` → Remove hook entirely
- **Effort**: 1-2 hours

**4. `src/components/ProfilePage.tsx`** (1 deprecated)
- `get_user_collection_stats` → Use template progress RPCs
- **Effort**: 2-3 hours

### Medium Priority (Type Cleanup)

**5. `src/types/index.ts`** (1 deprecated type)
- Remove deprecated type definitions
- **Effort**: 30 minutes

**6. `src/lib/collectionStats.ts`** (entire file deprecated)
- Create replacement `templateStats.ts`
- **Effort**: 2-3 hours

---

## Migration Examples

### Example 1: get_user_collection_stats

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

### Example 2: find_mutual_traders (Signature Change)

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

## Removed RPCs (v1.6.0)

1. `get_user_collection_stats` - Collections pivot
2. `get_completion_report` - Replaced by template progress
3. `bulk_add_stickers_by_numbers` - Collections system removed
4. `search_stickers` - Replaced by template search
5. `mark_team_page_complete` - Use template progress updates
6. `get_mutual_trade_detail` - Removed in v1.4.3
7. `admin_upsert_collection` - Admin collections removed
8. `admin_delete_collection` - Admin collections removed
9. `admin_upsert_page` - Admin collections removed
10. `admin_delete_page` - Admin collections removed
11. `admin_upsert_sticker` - Admin collections removed
12. `admin_delete_sticker` - Admin collections removed

---

## Next Steps

1. Review complete guide: `/docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md`
2. Prioritize high-priority files first
3. Test thoroughly after migration
4. Remove deprecated types after code updates

---

**Total Estimated Effort**: 12-18 hours  
**Status**: Documented, migration pending  
**Last Updated**: 2025-11-20
