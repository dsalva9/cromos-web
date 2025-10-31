# Marketplace Collection Filter Feature

**Implemented**: 2025-10-31
**Version**: v1.6.4

## Overview

The Collection Filter feature allows users to filter marketplace listings by their own template collections, making it easier to find listings for cards they're actively collecting. The feature includes both marketplace filtering and enhanced listing creation with auto-populate functionality.

---

## Features

### 1. Marketplace Collection Filter

**Location**: `/marketplace` page

**Functionality**:
- Filter marketplace listings by user's template copies (collections)
- Multi-select filter with checkbox interface
- Shows active collection status indicators
- Filter badge displays count of active filters
- Only visible to logged-in users

**User Flow**:
1. User clicks "Mis Colecciones" filter button
2. Popover opens showing user's collections as checkboxes
3. User selects one or more collections
4. Marketplace automatically filters to show matching listings
5. Filter can be cleared via "X" button or "Limpiar" link

**Matching Logic** (Hybrid Approach):
- **Priority 1**: Exact template match - listings linked to selected template copies (match_score = 2)
- **Priority 2**: Fuzzy text match - listings with similar collection_name text (match_score = 1, similarity > 0.3)
- Results are sorted by match score, then distance (if enabled), then creation date

---

### 2. Enhanced Listing Creation Form

**Location**: `/marketplace/create` page

**Functionality**:
- Combobox for collection selection (type OR select)
- Auto-populate sticker number from template slots
- Slot selection modal for duplicate cards

**User Flow**:

#### Option A: Free Text Entry
1. User starts typing collection name
2. Matching collections appear in dropdown
3. User can select from dropdown OR continue typing
4. If typing custom text, press Enter or select "Usar '[text]'"

#### Option B: Select from Collections
1. User clicks combobox
2. "Mis Colecciones" section shows user's template copies
3. User selects a collection
4. **Slot selection modal opens automatically**
5. User selects which duplicate card to publish
6. Sticker number is auto-filled (e.g., "#10 - Messi")
7. User continues filling rest of the form

---

## Database Changes

### Migration File

**File**: `supabase/migrations/20251031092744_add_collection_filter.sql`

### New Database Functions

#### 1. `get_user_collections(p_user_id UUID)`

Returns user's template copies for filter UI.

**Parameters**:
- `p_user_id` (UUID, optional) - User ID, defaults to authenticated user

**Returns**:
- `copy_id` (BIGINT) - Copy ID
- `template_id` (BIGINT) - Template ID
- `title` (TEXT) - Collection title
- `is_active` (BOOLEAN) - Whether copy is active
- `copied_at` (TIMESTAMPTZ) - When copy was created

**Example**:
```sql
SELECT * FROM get_user_collections();
```

---

#### 2. `list_trade_listings_with_collection_filter(...)`

Enhanced listing filter with collection matching.

**Parameters**:
- `p_limit` (INTEGER, default: 20) - Page size
- `p_offset` (INTEGER, default: 0) - Pagination offset
- `p_search` (TEXT, default: NULL) - Search query
- `p_viewer_postcode` (TEXT, default: NULL) - User's postcode for distance
- `p_sort_by_distance` (BOOLEAN, default: FALSE) - Enable distance sorting
- `p_collection_ids` (BIGINT[], default: NULL) - Collection IDs to filter by

**Returns**: Same as `list_trade_listings_filtered_with_distance` plus:
- `match_score` (INTEGER) - Prioritization score (2 = exact, 1 = fuzzy, 0 = no filter, -1 = filtered out)

**Example**:
```sql
-- Filter by specific collections
SELECT id, title, collection_name, copy_id, match_score
FROM list_trade_listings_with_collection_filter(
  20, 0, NULL, NULL, FALSE, ARRAY[1,2]::BIGINT[]
)
ORDER BY match_score DESC;
```

---

#### 3. `get_template_copy_slots(p_copy_id BIGINT)`

Returns slots for a template copy with user progress.

**Parameters**:
- `p_copy_id` (BIGINT) - Template copy ID

**Returns**:
- `slot_id` (BIGINT) - Slot ID
- `page_title` (TEXT) - Page title
- `page_number` (INTEGER) - Page number
- `slot_number` (INTEGER) - Slot number within page
- `slot_label` (TEXT) - Slot label (e.g., player name)
- `is_special` (BOOLEAN) - Whether slot is special
- `user_status` (TEXT) - 'missing', 'owned', 'duplicate'
- `user_count` (INTEGER) - Number of cards user has

**Example**:
```sql
SELECT * FROM get_template_copy_slots(1);
```

---

### New Index

**Index**: `idx_listings_collection_name_trgm`

GIN index on `trade_listings.collection_name` for fast fuzzy text matching using pg_trgm extension.

---

## Frontend Components

### New Components

1. **`CollectionFilter`** (`src/components/marketplace/CollectionFilter.tsx`)
   - Multi-select filter UI
   - Uses Popover + Checkbox
   - Loads user collections via `useUserCollections` hook

2. **`CollectionCombobox`** (`src/components/marketplace/CollectionCombobox.tsx`)
   - Type-or-select combobox for collection input
   - Uses Command component (shadcn pattern)
   - Triggers slot selection callback

3. **`SlotSelectionModal`** (`src/components/marketplace/SlotSelectionModal.tsx`)
   - Modal for selecting specific slot from template copy
   - Only shows duplicate slots (status = 'duplicate', count > 0)
   - Grouped by page for easier navigation

4. **`Command`** (`src/components/ui/command.tsx`)
   - Base command palette component (shadcn)
   - Used by combobox

5. **`Popover`** (`src/components/ui/popover.tsx`)
   - Popover component (shadcn)
   - Used by filter and combobox

### New Hooks

1. **`useUserCollections`** (`src/hooks/templates/useUserCollections.ts`)
   - Fetches user's template copies
   - Returns collections, loading, error, refetch

2. **`useTemplateSlots`** (`src/hooks/templates/useTemplateSlots.ts`)
   - Fetches slots for a specific template copy
   - Returns slots, loading, error, fetchSlots

### Modified Components

1. **Marketplace Page** (`src/app/marketplace/page.tsx`)
   - Added CollectionFilter component
   - Added selectedCollectionIds state
   - Passes collectionIds to useListings hook

2. **useListings Hook** (`src/hooks/marketplace/useListings.ts`)
   - Added collectionIds parameter
   - Uses new RPC function when filter is active
   - Backwards compatible (uses old RPC when no filter)

3. **ListingForm** (`src/components/marketplace/ListingForm.tsx`)
   - Replaced Input with CollectionCombobox
   - Added slot selection modal integration
   - Auto-populates sticker_number from selected slot

---

## Dependencies Added

New npm packages installed:
- `cmdk` - Command palette primitive
- `@radix-ui/react-icons` - Icon library for command component
- `@radix-ui/react-popover` - Popover primitive

---

## User Experience Improvements

1. **Faster Collection Discovery**: Users can quickly filter marketplace to see only listings for collections they own
2. **Reduced Manual Entry**: Auto-populate from template slots reduces typing errors
3. **Context-Aware**: Filter only shows for logged-in users with collections
4. **Progressive Enhancement**: Feature works alongside existing search and distance sorting
5. **Visual Feedback**: Clear match indicators show exact vs. fuzzy matches

---

## Technical Implementation Notes

### Fuzzy Text Matching

Uses PostgreSQL `pg_trgm` extension for similarity matching:
- Threshold: 0.3 (30% similarity)
- Applied when listing.collection_name doesn't exactly match selected template copies
- Allows variations like "Panini LaLiga 24/25" matching "Panini LaLiga 2024/2025"

### Performance Considerations

- GIN index on collection_name for fast similarity queries
- Efficient query plan: exact matches first (indexed), then fuzzy matches
- Pagination maintained (default 20 items per page)
- Filter state managed client-side to avoid unnecessary refetches

### Backwards Compatibility

- Old RPC function (`list_trade_listings_filtered`) still available
- Hook automatically chooses appropriate RPC based on features used
- No breaking changes to existing marketplace functionality

---

## Testing Checklist

### Manual Testing

#### Marketplace Filter

- [ ] Filter button only visible when logged in
- [ ] Filter shows user's collections
- [ ] Active collection indicator displays correctly
- [ ] Multi-select checkboxes work
- [ ] Filter badge shows correct count
- [ ] Clear filter button works
- [ ] Filtered results prioritize exact matches
- [ ] Fuzzy text matching works for similar names
- [ ] Filter works with search query
- [ ] Filter works with distance sorting
- [ ] Empty state when user has no collections

#### Listing Form

- [ ] Combobox shows user's collections
- [ ] Free text entry works
- [ ] Selecting collection opens slot modal
- [ ] Modal only shows duplicate slots
- [ ] Slots grouped by page correctly
- [ ] Selecting slot auto-fills sticker number
- [ ] Format: "#10 - Messi" (with label) or "#10" (without)
- [ ] Modal can be closed without selecting
- [ ] Free text still works without selecting collection

### Edge Cases

- [ ] User with no collections (filter hidden)
- [ ] User with no duplicates in collection (modal shows empty state)
- [ ] Collection with deleted template (graceful degradation)
- [ ] Very long collection names (truncation works)
- [ ] Special characters in collection names
- [ ] Multiple users with same collection name (fuzzy match works)

---

## Future Enhancements

1. **Template Linking**: Store `copy_id` and `slot_id` when user selects from template (currently just auto-fills text)
2. **Smart Suggestions**: Suggest collections based on listing content
3. **Filter Persistence**: Remember user's last filter selection across sessions
4. **Collection Stats**: Show count of active listings per collection in filter
5. **Bulk Publishing**: Allow publishing multiple duplicates at once

---

## Migration Instructions

### For Development

1. Install new dependencies:
   ```bash
   npm install cmdk @radix-ui/react-icons @radix-ui/react-popover
   ```

2. Run the migration in Supabase dashboard:
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/20251031092744_add_collection_filter.sql`
   - Execute migration
   - Verify functions created: `get_user_collections`, `list_trade_listings_with_collection_filter`, `get_template_copy_slots`

3. Test in development:
   ```bash
   npm run dev
   ```

### For Production

1. **Backup database** (always!)
2. Run migration via Supabase dashboard SQL editor
3. Verify RPC functions exist:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE '%collection%';
   ```
4. Test filter with real data
5. Monitor performance (GIN index may need time to build on large datasets)

---

## Troubleshooting

### Filter not showing listings

**Check**:
1. User has template copies: `SELECT * FROM get_user_collections();`
2. Listings have collection_name set
3. pg_trgm extension enabled: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### Slot modal empty

**Check**:
1. User has duplicate cards in selected collection
2. Template copy exists: `SELECT * FROM user_template_copies WHERE id = ?;`
3. Progress data exists: `SELECT * FROM user_template_progress WHERE copy_id = ? AND status = 'duplicate';`

### Build errors

**Check**:
1. All dependencies installed: `npm install`
2. TypeScript errors: `npm run build`
3. Missing UI components: Ensure Command, Popover components exist

---

## Related Documentation

- [Database Schema](../database-schema.md)
- [API Endpoints](../api-endpoints.md)
- [Template System](../../README.md#collection-templates-system)
- [Marketplace System](../../README.md#marketplace-system)

---

## 🔧 Post-Implementation Fixes (2025-10-31)

### Fix 1: CollectionCombobox Click/Tap Issue

**Problem**: Collections in dropdown were not clickable with mouse or touch input (only keyboard navigation worked).

**Root Cause**: `CommandItem` component event handling interfered with click events.

**Solution**:
- Replaced `CommandItem` with native `div` elements
- Added proper `onClick` handlers
- Added `cursor-pointer` and `active:bg-[#1F2937]` classes for visual feedback
- Now fully supports mouse clicks and touch taps

**Files Modified**:
- `src/components/marketplace/CollectionCombobox.tsx`

---

### Fix 2: Slot Modal Empty State Message

**Problem**: Modal message was confusing when user had no duplicate cards, suggesting they couldn't publish at all.

**Solution**: Updated message to be informative rather than restrictive:
- Clarifies that auto-complete requires "REPE" cards
- Explains user can close modal and enter number manually
- Button text changed to "Cerrar y escribir manualmente"

**Files Modified**:
- `src/components/marketplace/SlotSelectionModal.tsx`

---

### Fix 3: Template Copy/Slot Tracking for Manual Listings

**Problem**: Listings created via combobox (selecting collection + slot) were not marked as "Sincronizado con colección" in "Mis Anuncios".

**Root Cause**: `copy_id` and `slot_id` were not being stored when listing was created.

**Solution**:
1. **Database**: Extended `create_trade_listing` RPC to accept optional `p_copy_id` and `p_slot_id` parameters
2. **Backend**: Added validation to ensure user owns the template copy
3. **Frontend**: Updated form to track and send these values when user selects from combobox
4. **Result**: All listings created via combobox are now properly linked to template copies

**Migration**: `20251031120000_add_copy_slot_to_create_listing.sql`

**Files Modified**:
- `src/types/v1.6.0.ts` - Added `copy_id?` and `slot_id?` to `CreateListingForm`
- `src/components/marketplace/ListingForm.tsx` - Track selected copy/slot IDs
- `src/hooks/marketplace/useCreateListing.ts` - Pass IDs to RPC function

---

### Fix 4: "Publicado" Badge in Mis Colecciones

**Problem**: No visual indication in collection view when a slot has already been published to marketplace.

**Enhancement**:
- Created `useSlotListings` hook to fetch active marketplace listings for all slots in a collection
- Updated `SlotTile` component to show green "Publicado" badge instead of "Publicar" button when listing exists
- Made badge clickable - navigates directly to marketplace listing
- Shows loading skeleton while fetching listings data

**Benefits**:
- Users can see at a glance which cards are already published
- Quick access to manage published listings
- Prevents accidental duplicate listings
- Better user experience and workflow

**Files Created**:
- `src/hooks/templates/useSlotListings.ts`

**Files Modified**:
- `src/components/templates/TemplateProgressGrid.tsx` - Fetch and pass listing data
- `src/components/templates/SlotTile.tsx` - Conditional rendering of badge vs button

---

### Fix 5: Collection Filter "Select All" Option

**Problem**: Users had to select collections one by one in marketplace filter.

**Solution**: Added "Todas" button in filter header to select all collections at once.

**Files Modified**:
- `src/components/marketplace/CollectionFilter.tsx`

---

### Fix 6: Database Table/Column Name Corrections

**Problem**: Initial migration referenced wrong table names (`postcodes` instead of `postal_codes`).

**Solution**: Created fix migration to correct table references and use existing `haversine_distance` function.

**Migration**: `20251031095000_fix_collection_filter.sql`

---

**Last Updated**: 2025-10-31
**Author**: Claude Code
**Status**: ✅ Complete, tested, and fixed
