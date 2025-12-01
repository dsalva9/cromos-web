# Dynamic Cromo Fields - Implementation Progress

## Overview
Refactoring the template system to support user-defined fields for cromos, simplifying marketplace listings, and adding group/pack listings.

## ✅ Completed (Backend & Database)

### Database Migrations
1. **`collection_templates`** - Added `item_schema JSONB DEFAULT '[]'::jsonb`
2. **`template_slots`** - Added `data JSONB DEFAULT '{}'::jsonb`
3. **`trade_listings`** - Added:
   - `is_group BOOLEAN DEFAULT false`
   - `group_count INTEGER DEFAULT 1`

### Updated RPCs
1. **`create_template`** - Now accepts `p_item_schema JSONB DEFAULT '[]'::jsonb`
2. **`create_trade_listing`** - Now accepts `p_is_group` and `p_group_count`
3. **`add_template_page_v2`** - Updated to handle `data JSONB` in slots
4. **`get_template_progress`** - Now returns `data JSONB` field

### TypeScript Types
1. Created `ItemFieldDefinition` interface in `src/types/v1.6.0.ts`
2. Updated `Template` interface to include `item_schema?: ItemFieldDefinition[]`
3. Updated `Listing` interface to include `is_group?` and `group_count?`
4. Updated `SlotProgress` interface to include `data?: Record<string, any>`
5. Updated `CreateTemplateForm` and `CreateListingForm` interfaces

## ✅ Completed (Frontend - Template Creation)

### Components Created
1. **`ItemSchemaBuilder.tsx`** - New component for defining custom cromo fields
   - Add/remove fields
   - Configure field type (text, number, checkbox, select)
   - Set required/optional
   - Drag-and-drop ordering (UI ready, logic pending)

### Components Updated
1. **`TemplateCreationWizard.tsx`** - Added new step "Información de Cromo"
   - Updated wizard to have 4 steps instead of 3
   - Added Item Schema step between Basic Info and Pages
   - Updated navigation logic
   - Fixed validation for new step

## 🔄 In Progress

### Template Pages Form
**File**: `src/components/templates/TemplatePagesForm.tsx`
**Status**: Needs update to accept and use `itemSchema` prop
**Tasks**:
- [ ] Add `itemSchema?: ItemFieldDefinition[]` to `TemplatePagesFormProps`
- [ ] When adding/editing slots, render dynamic form fields based on `itemSchema`
- [ ] Store field values in `slot.data` object
- [ ] Update slot editing UI to show custom fields instead of/in addition to legacy fields

### Marketplace Listing Creation
**File**: `src/app/marketplace/create/page.tsx` (or similar)
**Status**: Not started
**Tasks**:
- [ ] Simplify form to only: Title, Description, Images (mandatory)
- [ ] Add toggle for "Individual" vs "Pack de Cromos"
- [ ] Remove rigid fields (sticker_number, collection_name, etc.)
- [ ] Auto-populate description from slot data when creating from album

### Album View - Bulk Listing
**File**: `src/app/mis-plantillas/[copyId]/page.tsx` (or similar)
**Status**: Not started
**Tasks**:
- [ ] Add "Publicar Repes" button
- [ ] Create modal to confirm bulk listing
- [ ] Generate description from all spare slots' data
- [ ] Call `create_trade_listing` with `is_group=true` and aggregated description

### useCreateTemplate Hook
**File**: `src/hooks/templates/useCreateTemplate.ts`
**Status**: Needs verification
**Tasks**:
- [ ] Verify it passes `item_schema` to `create_template` RPC
- [ ] Verify it passes `data` field when creating slots via `add_template_page_v2`

## 📋 Remaining Work

### High Priority
1. Fix `TemplatePagesForm` to accept `itemSchema` prop (BLOCKING)
2. Update slot editing to use dynamic fields
3. Simplify marketplace listing creation
4. Add mandatory images validation to listing creation

### Medium Priority
5. Implement "Publicar Repes" bulk listing feature
6. Update listing detail view to show simplified info
7. Test end-to-end flow: Create template → Copy as album → List spare

### Low Priority
8. Migration strategy for existing templates (if needed)
9. Update documentation
10. Add validation for item_schema (max fields, field name uniqueness, etc.)

## Notes

### User Feedback Incorporated
- ✅ Data migration not needed (app not live yet)
- ✅ No price field in listings (trading platform)
- ✅ Search will use full-text on title first, then description
- ✅ Single listing from album should also auto-populate description from cromo fields

### Technical Decisions
- Item schema is optional (can proceed without defining fields)
- Legacy fields (label, slot_variant, global_number) remain in database for backwards compatibility
- Dynamic fields stored in JSONB `data` column for flexibility
- Group listings use same table as individual listings with `is_group` flag

## Next Steps
1. Update `TemplatePagesFormProps` to include `itemSchema`
2. Modify slot editing UI to render dynamic fields
3. Test template creation with custom fields
4. Move to marketplace simplification
