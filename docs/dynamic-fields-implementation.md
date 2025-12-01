# Dynamic Cromo Fields - Implementation Summary

## Overview
Complete refactoring of the template system to support user-defined fields for cromos, simplifying marketplace listings, and adding group/pack listings.

**Status**: ✅ **COMPLETE** (as of 2025-12-01)

---

## ✅ Backend & Database

### Database Migrations
1. **`collection_templates`** - Added `item_schema JSONB DEFAULT '[]'::jsonb`
2. **`template_slots`** - Added `data JSONB DEFAULT '{}'::jsonb`
3. **`user_template_progress`** - Added `data JSONB DEFAULT '{}'::jsonb`
4. **`trade_listings`** - Added:
   - `is_group BOOLEAN DEFAULT false`
   - `group_count INTEGER DEFAULT 1`

### Updated RPCs
1. **`create_template`** - Accepts `p_item_schema JSONB DEFAULT '[]'::jsonb`
2. **`create_trade_listing`** - Accepts `p_is_group` and `p_group_count`
3. **`add_template_page_v2`** - Handles `data JSONB` in slots
4. **`get_template_progress`** - Returns `data JSONB` field for each slot
5. **`get_template_details`** - Returns `item_schema` and slot `data`
6. **`list_trade_listings_filtered_with_distance`** - Search prioritizes title > description > collection

---

## ✅ TypeScript Types

Created and updated types in `src/types/v1.6.0.ts`:
- `ItemFieldDefinition` interface with `name`, `type`, `label`, `required`
- `Template` interface includes `item_schema?: ItemFieldDefinition[]`
- `Listing` interface includes `is_group?` and `group_count?`
- `SlotProgress` interface includes `data?: Record<string, string | number | boolean>`
- Updated `CreateTemplateForm` and `CreateListingForm` interfaces

---

## ✅ Frontend Components

### Template Creation

#### ItemSchemaBuilder (`src/components/templates/ItemSchemaBuilder.tsx`)
- Add/remove custom fields
- Configure field type (text, number, checkbox)
- Set required/optional
- **Drag-and-drop reordering** via HTML5 Drag & Drop API

#### DynamicFieldsEditor (`src/components/templates/DynamicFieldsEditor.tsx`)
- Renders form inputs based on item schema
- Responsive layout (140px for numbers, flex-1 with min 200px for text)
- Type-safe value handling
- No section header for cleaner UI

#### TemplateCreationWizard (`src/components/templates/TemplateCreationWizard.tsx`)
- 4-step wizard: Basic Info → Item Schema → Pages & Cromos → Review
- **Validation for required dynamic fields** - ensures all required fields filled before enabling "Siguiente"
- Auto-navigation between steps

#### TemplatePagesForm (`src/components/templates/TemplatePagesForm.tsx`)
- Accepts `itemSchema` prop
- Renders dynamic fields for each slot via `DynamicFieldsEditor`
- Stores values in `slot.data` object
- Removed all old rigid fields (label, slot_number, is_special, global_number, slot_variant)

### Marketplace Listing

#### SimplifiedListingForm (`src/components/marketplace/SimplifiedListingForm.tsx`)
- Simplified to: Title, Collection, Description, Images (mandatory)
- Toggle for "Cromo Individual" vs "Pack de Cromos"
- **Collection field** with template selector modal (fetches user's templates)
- Removed rigid fields (sticker_number, collection_name now optional free text)
- `disablePackOption` prop to hide pack toggle on single spare publish
- Terms of use acceptance required

#### Listing Validation (`src/lib/validations/marketplace.schemas.ts`)
- Image now **mandatory** (`z.string().min(1, 'La imagen es obligatoria')`)
- Collection name optional

### Album Integration

#### Single Spare Publishing (`src/app/mis-plantillas/[copyId]/publicar/[slotId]/page.tsx`)
- **Auto-fills title**: `{Album Name} - {First Custom Field Value}`
- **Auto-fills description**: Spare count + all custom fields formatted as `{Label}: {Value}`
- Fetches `item_schema` from template and slot `data` from progress
- **Pack option disabled** via `disablePackOption={true}`

#### Bulk Listing (`src/app/mis-plantillas/[copyId]/page.tsx` via `PublishSparesBulkModal`)
- "Publicar Repes" button
- Modal confirms bulk listing
- Generates pack description from all spare slots' data
- Calls `create_trade_listing` with `is_group=true`

#### Template Stats (`src/components/templates/TemplateSummaryHeader.tsx`)
- **Fixed REPES count** to show total spare cromos (sum of `count - 1` for all duplicate slots)
- Example: slot 212 count=2 + slot 213 count=4 = 4 total REPES (not 2)
- TENGO counts all owned slots (status='owned' OR status='duplicate')

### Marketplace Display

#### Listing Badges (`src/components/marketplace/ListingCard.tsx`, `src/components/integration/MyListingCard.tsx`)
- Replaced "Activo" badge with:
  - **"Pack de cromos"** when `is_group === true`
  - **"Cromo"** when `is_group === false`

#### Search Priority
- **Title** matches ranked first
- **Description** matches ranked second
- **Collection** matches ranked third
- Implemented in `list_trade_listings_filtered_with_distance` RPC

---

## 🎯 Key Features Delivered

1. ✅ **User-defined fields** - Complete flexibility for album structures
2. ✅ **Drag-and-drop field ordering** - Intuitive schema builder
3. ✅ **Simplified marketplace** - Focus on description, not rigid metadata
4. ✅ **Pack listings** - Bulk publish spares in one listing
5. ✅ **Smart auto-fill** - Title and description from album + custom fields
6. ✅ **Mandatory images** - All listings require photos
7. ✅ **Collection selector** - Quick-fill from user's templates
8. ✅ **Accurate stats** - REPES shows total spare count
9. ✅ **Better search** - Prioritizes title, then description, then collection
10. ✅ **Validation** - Required dynamic fields enforced in wizard

---

## 📝 Migration Notes

### Backwards Compatibility
- Old rigid fields (`label`, `slot_number`, `is_special`, `slot_variant`, `global_number`) still exist in database
- New templates use only `item_schema` and `data` fields
- Existing templates without `item_schema` continue to work

### Database Schema
- `item_schema` stored as JSONB array in `collection_templates`
- `data` stored as JSONB object in `template_slots` and `user_template_progress`
- GIN indexes on `data` columns for efficient queries

---

## 🧪 Testing Checklist

- [x] Create template with custom fields
- [x] Edit template with custom fields
- [x] Copy template as album
- [x] Fill in slot progress with custom fields
- [x] Publish single spare (auto-filled title/description)
- [x] Publish bulk spares (pack listing)
- [x] Search marketplace (title/description/collection priority)
- [x] View listing badges ("Pack de cromos" vs "Cromo")
- [x] Stats show correct REPES count
- [x] Collection selector modal works
- [x] Image validation enforced
- [x] Required dynamic fields validated in wizard

---

## 📚 Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) - High-level changes summary
- [database-schema.md](database-schema.md) - Full database structure
- [api-endpoints.md](api-endpoints.md) - RPC function reference
- [components-guide.md](components-guide.md) - Component architecture

---

**Last Updated**: 2025-12-01
**Implementation Status**: COMPLETE ✅
