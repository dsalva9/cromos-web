# Sprint 8.5: Templates Creation UI

## Overview

This sprint implements the template creation wizard to complete the templates system. Users need a way to create templates that can then be searched, rated, and copied by other users.

## Context

- Backend RPCs already exist: `create_template`, `add_template_page`, `publish_template`
- Sprint 8 implemented templates explorer and progress tracking
- Templates explorer already has "Create Template" button linking to `/templates/create`
- Template creation was marked as "moved to future" in Sprint 8 documentation

## Implementation Plan

### Subtask 8.5.1: Create template creation wizard page

**File:** `src/app/templates/create/page.tsx`

**Features:**

- Multi-step wizard with progress indicator
- Step 1: Basic template info (title, description, image)
- Step 2: Add pages with slots
- Step 3: Review and publish
- Spanish text throughout
- Form validation at each step
- Save draft functionality (optional)

**Components needed:**

- `TemplateCreationWizard` - Main wizard container
- `TemplateBasicInfoForm` - Step 1 form
- `TemplatePagesForm` - Step 2 form with dynamic page/slot management
- `TemplateReviewForm` - Step 3 review before publishing
- `PageEditor` - Component to add/edit pages and slots
- `SlotEditor` - Component to add/edit slots within a page

### Subtask 8.5.2: Create page and slot editor components

**Files:**

- `src/components/templates/PageEditor.tsx`
- `src/components/templates/SlotEditor.tsx`

**PageEditor Features:**

- List of template pages
- Add new page button
- Edit existing page
- Delete page (with confirmation)
- Reorder pages

**SlotEditor Features:**

- List of slots for a page
- Add new slot form
- Edit existing slot
- Delete slot
- Reorder slots
- Toggle special slot status

### Subtask 8.5.3: Create template creation hooks

**File:** `src/hooks/templates/useCreateTemplate.ts`

**Features:**

- `createTemplate` - Create new template
- `addTemplatePage` - Add page to template
- `updateTemplatePage` - Update existing page
- `deleteTemplatePage` - Delete page
- `addTemplateSlot` - Add slot to page
- `updateTemplateSlot` - Update existing slot
- `deleteTemplateSlot` - Delete slot
- `publishTemplate` - Publish template

### Subtask 8.5.4: Update navigation and routing

**Changes:**

- Ensure `/templates/create` route works properly
- Add breadcrumb navigation
- Update site header if needed

### Subtask 8.5.5: Update documentation

**Files to update:**

- `docs/current-features.md` - Mark template creation as complete
- `docs/components-guide.md` - Add template creation components
- `CHANGELOG.md` - Add Sprint 8.5 implementation
- `TODO.md` - Mark template creation as complete

## Technical Details

### Template Structure

Based on Sprint 2 documentation:

- Templates have pages
- Pages have slots
- Pages can be 'team' or 'special' type
- Slots have label and is_special flag

### RPC Integration

The following RPCs from Sprint 2 will be used:

1. `create_template(title, description, image_url, is_public)` → Returns template_id
2. `add_template_page(template_id, title, type, slots)` → Returns page_id
3. `publish_template(template_id, is_public)` → Returns void

### UI/UX Considerations

- Mobile-responsive design
- Clear progress indication
- Helpful tooltips and guidance
- Error handling with user-friendly messages
- Smooth transitions between steps

## Success Criteria

1. Users can create a complete template with pages and slots
2. Created templates appear in the templates explorer
3. Templates can be published and made public
4. All text is in Spanish
5. Mobile-responsive design works correctly
6. Form validation prevents invalid submissions

## Dependencies

- Sprint 2 backend RPCs (already implemented)
- Sprint 8 templates UI (already implemented)
- Existing UI components (buttons, forms, etc.)
