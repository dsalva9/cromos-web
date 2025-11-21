# RPC Migration Guide: v1.5.0 → v1.6.0

**Date**: 2025-01-20
**Status**: Reference guide for frontend migration

---

## Overview

This guide maps deprecated v1.5.0 RPCs to their v1.6.0 equivalents. The v1.6.0 pivot moved from a traditional sticker collection system to a marketplace + community template system.

---

## ⚠️ Breaking Changes

### Removed Systems
- **Collections System** (deprecated) → Use **Templates System** (v1.6.0)
- **Stickers Management** (deprecated) → Use **Marketplace Listings** (v1.6.0)
- **Team Pages** (deprecated) → Use **Template Pages** (v1.6.0)

---

## RPC Migration Map

### 1. Collection Statistics

#### ❌ `get_user_collection_stats` (REMOVED)
**Status**: Deprecated in v1.6.0
**Last seen in**: v1.5.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('get_user_collection_stats', {
  p_user_id: userId,
  p_collection_id: collectionId
});

// NEW (v1.6.0) - Use template progress instead
const { data } = await supabase.rpc('get_my_template_copies');
// OR for specific copy:
const { data } = await supabase.rpc('get_template_progress', {
  p_copy_id: copyId
});
```

**Returns**:
- **Old**: `{ total_stickers, owned_stickers, completion_percentage, duplicates, missing }`
- **New**: `{ copy_id, template_id, title, total_slots, owned_slots, completion_percentage }`

**Frontend files affected**:
- `src/hooks/album/useAlbumPages.ts:175`
- `src/components/ProfilePage.tsx:163`
- `src/lib/collectionStats.ts:12`
- `src/types/index.ts:184`

---

#### ❌ `get_completion_report` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('get_completion_report', {
  p_user_id: userId,
  p_collection_id: collectionId
});

// NEW (v1.6.0) - Use template progress with page breakdown
const { data } = await supabase.rpc('get_template_progress', {
  p_copy_id: copyId
});
```

**Returns**:
- **Old**: `{ collection_id, pages: [{ page_id, title, kind, missing: [], repes: [] }] }`
- **New**: `{ page_number, page_title, total_slots, owned_slots, missing_slots, duplicate_slots }`

---

### 2. Sticker Management

#### ❌ `bulk_add_stickers_by_numbers` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('bulk_add_stickers_by_numbers', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_numbers: [1, 5, 12]
});

// NEW (v1.6.0) - Update template progress for each slot
for (const slotId of slotIds) {
  await supabase.rpc('update_template_progress', {
    p_copy_id: copyId,
    p_slot_id: slotId,
    p_status: 'owned',
    p_count: 1
  });
}

// OR use global number lookup (Panini-style)
const { data: slot } = await supabase.rpc('get_slot_by_global_number', {
  p_template_id: templateId,
  p_global_number: 123
});
if (slot) {
  await supabase.rpc('update_template_progress', {
    p_copy_id: copyId,
    p_slot_id: slot.id,
    p_status: 'owned',
    p_count: 1
  });
}
```

---

#### ❌ `search_stickers` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('search_stickers', {
  p_collection_id: collectionId,
  p_query: 'Messi',
  p_filters: { owned: true }
});

// NEW (v1.6.0) - Search marketplace listings
const { data } = await supabase.rpc('list_trade_listings_filtered', {
  p_limit: 20,
  p_offset: 0,
  p_search: 'Messi',
  p_collection_filter: 'LaLiga EA Sports 2024'
});

// OR search template slots
const { data } = await supabase.rpc('get_template_copy_slots', {
  p_copy_id: copyId
});
// Then filter in frontend: slots.filter(s => s.label?.includes('Messi'))
```

---

#### ❌ `mark_team_page_complete` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('mark_team_page_complete', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_page_id: pageId
});

// NEW (v1.6.0) - Bulk update all slots on a page
// 1. Get all slots for the page
const { data: slots } = await supabase
  .from('template_slots')
  .select('id')
  .eq('page_id', pageId);

// 2. Update each slot to 'owned'
for (const slot of slots) {
  await supabase.rpc('update_template_progress', {
    p_copy_id: copyId,
    p_slot_id: slot.id,
    p_status: 'owned',
    p_count: 1
  });
}
```

**Frontend files affected**:
- `src/hooks/album/useAlbumPages.ts:767`

---

### 3. Trading - Discovery

#### ⚠️ `find_mutual_traders` (SIGNATURE CHANGED)
**Status**: **Still exists** but signature changed

**Migration**:
```typescript
// OLD (v1.5.0) - Missing location parameters
const { data } = await supabase.rpc('find_mutual_traders', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_rarity: null,
  p_team: null,
  p_query: null,
  p_min_overlap: 1,
  p_limit: 20,
  p_offset: 0
});

// NEW (v1.6.0) - Added location-based parameters
const { data } = await supabase.rpc('find_mutual_traders', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_rarity: null,
  p_team: null,
  p_query: null,
  p_min_overlap: 1,
  p_lat: userLat,              // NEW - user latitude
  p_lon: userLon,              // NEW - user longitude
  p_radius_km: 50,             // NEW - search radius
  p_sort: 'distance',          // NEW - sort option
  p_limit: 20,
  p_offset: 0
});
```

**Frontend files affected**:
- `src/hooks/trades/useFindTraders.ts:60`

**Action Required**: ⚠️ Update to include location parameters

---

#### ❌ `get_mutual_trade_detail` (REMOVED in v1.4.3)
**Status**: Deprecated in v1.4.3, removed in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('get_mutual_trade_detail', {
  p_user_id: userId,
  p_other_user_id: otherUserId,
  p_collection_id: collectionId
});

// NEW (v1.6.0) - Navigate directly to trade composer
// No RPC needed - data prepared in frontend before navigating
router.push(`/trades/compose?to=${otherUserId}&collection=${collectionId}`);
```

**Frontend files affected**:
- `src/hooks/trades/useMatchDetail.ts:45`

**Note**: Detail page was removed in v1.4.3 (see line 311 of api-endpoints.md)

---

### 4. Admin Functions (Collections/Stickers)

#### ❌ `admin_upsert_collection` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
const { data } = await supabase.rpc('admin_upsert_collection', {
  p_collection: { name: 'LaLiga 2024', ... }
});

// NEW (v1.6.0) - Use template system
const { data } = await supabase.rpc('create_template', {
  p_title: 'LaLiga 2024',
  p_description: '...',
  p_image_url: '...',
  p_is_public: true
});
```

---

#### ❌ `admin_delete_collection` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
await supabase.rpc('admin_delete_collection', {
  p_collection_id: collectionId
});

// NEW (v1.6.0) - Use template deletion
await supabase.rpc('admin_delete_content_v2', {
  p_content_type: 'template',
  p_content_id: templateId,
  p_reason: 'Admin deletion'
});
```

---

#### ❌ `admin_upsert_page` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
await supabase.rpc('admin_upsert_page', {
  p_page: { collection_id, title, ... }
});

// NEW (v1.6.0) - Use template pages
await supabase.rpc('add_template_page_v2', {
  p_template_id: templateId,
  p_page_number: 1,
  p_title: 'FC Barcelona',
  p_type: 'team',
  p_slots_count: 20
});
```

---

#### ❌ `admin_upsert_sticker` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
await supabase.rpc('admin_upsert_sticker', {
  p_sticker: { page_id, number, name, ... }
});

// NEW (v1.6.0) - Use template slots
await supabase.rpc('update_template_slot', {
  p_slot_id: slotId,
  p_label: 'Lionel Messi',
  p_is_special: false,
  p_slot_variant: null,
  p_global_number: 10
});
```

---

#### ❌ `admin_delete_page`, `admin_delete_sticker` (REMOVED)
**Status**: Deprecated in v1.6.0

**Migration**:
```typescript
// OLD (v1.5.0) - DO NOT USE
await supabase.rpc('admin_delete_page', { p_page_id: pageId });
await supabase.rpc('admin_delete_sticker', { p_sticker_id: stickerId });

// NEW (v1.6.0) - Use template deletion RPCs
await supabase.rpc('delete_template_page', {
  p_page_id: pageId
});

await supabase.rpc('delete_template_slot', {
  p_slot_id: slotId
});
```

---

## New v1.6.0 Systems

### Marketplace Listings

**Core RPCs**:
- `create_trade_listing` - Create marketplace listing
- `list_trade_listings_filtered` - Search listings with filters
- `list_trade_listings_filtered_with_distance` - Distance-based search
- `update_listing_status` - Update listing status
- `reserve_listing` - Reserve for buyer
- `complete_listing_transaction` - Mark transaction complete
- `cancel_listing_transaction` - Cancel reservation

### Templates & Progress

**Core RPCs**:
- `create_template` - Create new template
- `copy_template` - Copy template to user's collection
- `get_my_template_copies` - Get user's template copies
- `get_template_progress` - Get completion progress
- `update_template_progress` - Update slot status
- `publish_duplicate_to_marketplace` - List duplicate from template
- `mark_listing_sold_and_decrement` - Sell and update progress

### Badges

**Core RPCs**:
- `get_user_badges_with_details` - Get earned badges
- `get_badge_progress` - Get progress toward badges

### User Blocking

**Core RPCs**:
- `ignore_user` - Block a user
- `unignore_user` - Unblock a user
- `is_user_ignored` - Check if blocked
- `get_ignored_users` - List blocked users

---

## Migration Checklist

### Phase 1: Audit (✅ Complete)
- [x] Identify all deprecated RPC calls
- [x] Document current usage locations
- [x] Create migration map

### Phase 2: Update Type Definitions
- [ ] Remove deprecated RPC types from `src/types/index.ts`
- [ ] Add new v1.6.0 RPC types
- [ ] Update Database type exports

### Phase 3: Update Hook Implementations
- [ ] `useAlbumPages.ts` - Replace `get_user_collection_stats` and `mark_team_page_complete`
- [ ] `useFindTraders.ts` - Add location parameters
- [ ] `useMatchDetail.ts` - Remove `get_mutual_trade_detail` call
- [ ] `ProfilePage.tsx` - Replace collection stats with template progress

### Phase 4: Update Components
- [ ] CollectionsTab.tsx - Migrate to templates
- [ ] PagesTab.tsx - Migrate to template pages
- [ ] StickersTab.tsx - Migrate to template slots
- [ ] BulkUploadTab.tsx - Update or remove (if collections-specific)

### Phase 5: Testing
- [ ] Test template progress displays correctly
- [ ] Test marketplace listings work
- [ ] Test badge system functions
- [ ] Test user blocking works
- [ ] Regression test trading system

---

## Frontend Files Requiring Updates

### High Priority (Broken Functionality)
1. **src/hooks/album/useAlbumPages.ts** ⚠️
   - Line 175: `get_user_collection_stats` - Replace with `get_template_progress`
   - Line 767: `mark_team_page_complete` - Replace with bulk slot updates

2. **src/hooks/trades/useFindTraders.ts** ⚠️
   - Line 60: `find_mutual_traders` - Add location parameters

3. **src/hooks/trades/useMatchDetail.ts** ⚠️
   - Line 45: `get_mutual_trade_detail` - Remove, navigate directly

4. **src/components/ProfilePage.tsx** ⚠️
   - Line 163: `get_user_collection_stats` - Replace with template progress

### Medium Priority (Type Definitions)
5. **src/types/index.ts**
   - Line 184: Remove `get_user_collection_stats` type
   - Add new v1.6.0 RPC types

6. **src/lib/collectionStats.ts**
   - Line 12: Update type reference

### Low Priority (Admin Components - May be legacy)
7. **src/components/admin/CollectionsTab.tsx**
8. **src/components/admin/PagesTab.tsx**
9. **src/components/admin/StickersTab.tsx**
10. **src/components/admin/BulkUploadTab.tsx**

---

## Example Migration: useAlbumPages.ts

**Before (v1.5.0)**:
```typescript
// Line 175
const { data: stats } = await supabase.rpc('get_user_collection_stats', {
  p_user_id: userId,
  p_collection_id: collectionId
});

// Line 767
const { data } = await supabase.rpc('mark_team_page_complete', {
  p_user_id: userId,
  p_collection_id: collectionId,
  p_page_id: pageId
});
```

**After (v1.6.0)**:
```typescript
// Replace line 175
const { data: copies } = await supabase.rpc('get_my_template_copies');
const copy = copies.find(c => c.template_id === templateId);
// Access: copy.completion_percentage, copy.owned_slots, etc.

// Replace line 767
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

---

## Support

**Questions?** See:
- `docs/api-endpoints.md` - Complete v1.6.0 RPC documentation
- `docs/database-schema.md` - Database schema reference
- `docs/VALIDATION_REPORT.md` - Detailed migration context

**Need help?** Check the `#frontend-migration` channel (if applicable)

---

**Status**: Ready for frontend team review
**Priority**: High - Deprecated RPCs will be removed in future release
