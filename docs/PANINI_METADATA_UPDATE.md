# Panini Metadata Fields Update

**Version**: v1.6.0
**Date**: 2025-11-01
**Status**: ✅ Implemented

---

## Overview

Marketplace listings and templates now support Panini-style album metadata, allowing for rich sticker classification with page numbers, variants, and global checklist numbers.

---

## Database Changes

### `trade_listings` Table - New Columns

```sql
ALTER TABLE trade_listings
ADD COLUMN page_number INTEGER,           -- Page number within album (e.g., 12)
ADD COLUMN page_title TEXT,                -- Page title (e.g., "Delanteros")
ADD COLUMN slot_variant TEXT,              -- Variant identifier (A, B, C)
ADD COLUMN global_number INTEGER;          -- Global checklist number (e.g., 1-773)
```

**Constraints:**
- `slot_variant` must be a single uppercase letter if provided (enforced via CHECK constraint)
- All fields are nullable for backward compatibility
- Index created on `global_number` for efficient searches

---

## Updated RPCs

### `create_trade_listing` ✅ UPDATED

Now accepts Panini metadata fields.

**Function Signature:**

```sql
create_trade_listing(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_sticker_number TEXT DEFAULT NULL,
  p_collection_name TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_copy_id BIGINT DEFAULT NULL,
  p_slot_id BIGINT DEFAULT NULL,
  p_page_number INTEGER DEFAULT NULL,      -- NEW
  p_page_title TEXT DEFAULT NULL,          -- NEW
  p_slot_variant TEXT DEFAULT NULL,        -- NEW
  p_global_number INTEGER DEFAULT NULL     -- NEW
) RETURNS BIGINT
```

**Usage Example:**

```typescript
const { createListing } = useCreateListing();

const listingId = await createListing({
  title: 'Messi Inter Miami',
  description: 'Nuevo, sin uso',
  sticker_number: '5',
  collection_name: 'Mundial Qatar 2022',
  image_url: 'https://...',
  // Panini metadata
  page_number: 12,
  page_title: 'Argentina - Delanteros',
  slot_variant: 'A',
  global_number: 147,
});
```

---

### `publish_duplicate_to_marketplace` ✅ UPDATED

Automatically populates Panini metadata from template slots when publishing duplicates.

**Behavior:**
- Queries `template_slots` and `template_pages` for metadata
- Auto-populates: `page_number`, `page_title`, `slot_variant`, `global_number`
- Combines `slot_number` + `slot_variant` into `sticker_number` (e.g., "5A")

**Internal Query:**

```sql
SELECT
  tp.page_number,           -- Auto-populated
  tp.title,                 -- Auto-populated as page_title
  ts.slot_number,           -- Combined with variant for sticker_number
  ts.slot_variant,          -- Auto-populated
  ts.global_number          -- Auto-populated
FROM template_slots ts
JOIN template_pages tp ON ts.page_id = tp.id
WHERE ts.id = p_slot_id AND tp.template_id = v_template_id
```

---

## UI Changes

### Marketplace Listing Detail Page

**File:** `src/app/marketplace/[id]/page.tsx:209-251`

Displays a "Detalles del Cromo" card when Panini metadata is present:

**Display Format:**
- **Página:** 12 - Delanteros
- **Número en página:** #5A
- **Número de checklist:** #147

The card only appears if at least one Panini field has a value.

---

### Template Slot Tiles (mis-plantillas)

**File:** `src/components/templates/SlotTile.tsx:160-171`

Shows number and checklist info below the slot label:

**Display Examples:**
- `#5A | Checklist #147`
- `#12 | Checklist #233`
- `#7` (no variant or global number)

---

## Type Updates

### `Listing` Interface

**File:** `src/types/v1.6.0.ts:33-37`

```typescript
export interface Listing {
  // ... existing fields

  // Panini metadata
  page_number?: number | null;
  page_title?: string | null;
  slot_variant?: string | null;
  global_number?: number | null;
}
```

### `CreateListingForm` Interface

**File:** `src/types/v1.6.0.ts:121-125`

Already had Panini fields defined - now fully functional.

---

## Migration Files

1. **`20251101200320_add_panini_fields_to_trade_listings.sql`**
   - Adds 4 new columns to `trade_listings`
   - Creates index on `global_number`
   - Adds CHECK constraint for `slot_variant` format

2. **`20251101200321_update_create_trade_listing_with_panini_fields.sql`**
   - Updates `create_trade_listing` RPC to accept new parameters
   - Maintains backward compatibility

3. **`20251101200322_update_publish_duplicate_with_panini_fields.sql`**
   - Updates `publish_duplicate_to_marketplace` RPC
   - Auto-populates Panini fields from template metadata
   - Combines slot_number + slot_variant for sticker_number

---

## Affected Files

### Backend
- `supabase/migrations/20251101200320_add_panini_fields_to_trade_listings.sql`
- `supabase/migrations/20251101200321_update_create_trade_listing_with_panini_fields.sql`
- `supabase/migrations/20251101200322_update_publish_duplicate_with_panini_fields.sql`

### Types
- `src/types/v1.6.0.ts`

### Hooks
- `src/hooks/marketplace/useListing.ts`
- `src/hooks/marketplace/useCreateListing.ts`

### Components
- `src/app/marketplace/[id]/page.tsx`
- `src/components/templates/SlotTile.tsx`

### Forms
- `src/components/marketplace/ListingForm.tsx` (already had fields in form)
- `src/app/mis-plantillas/[copyId]/publicar/[slotId]/page.tsx` (already passing fields)

---

## Testing

### Manual Testing Required

1. **Create listing from template (publish duplicate):**
   - Go to mis-plantillas
   - Select a template with Panini metadata
   - Publish a duplicate
   - Verify metadata card appears on listing detail page

2. **Create manual listing:**
   - Go to marketplace/create
   - Fill in Panini fields manually
   - Verify they save and display correctly

3. **View existing listings:**
   - Check that listings without Panini data don't show empty card
   - Check that listings with partial data only show populated fields

4. **Template slot display:**
   - View mis-plantillas slot tiles
   - Verify number, variant, and checklist display correctly

---

## Notes for mi-colección

The legacy album system (`mi-colección`) uses the old `stickers` and `collection_pages` tables, which don't have Panini metadata fields. This feature only applies to:
- Template-based collections (`mis-plantillas`)
- Marketplace listings

---

## Backward Compatibility

✅ All Panini fields are nullable
✅ Existing listings display without issues
✅ RPC functions maintain backward compatibility with default NULL values
✅ UI components conditionally render based on field presence

---

**Last Updated:** 2025-11-01
