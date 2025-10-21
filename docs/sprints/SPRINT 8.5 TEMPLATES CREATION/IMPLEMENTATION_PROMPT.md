# Sprint 8.5 Implementation Prompt

## Context

I need to implement Sprint 8.5: Templates Creation UI to complete the templates system. Users need a way to create templates that can then be searched, rated, and copied by other users.

## Current State

- Sprint 8 is complete: templates explorer (/templates), my templates page (/mis-plantillas), and template progress tracking
- Backend RPCs already exist from Sprint 2: create_template, add_template_page, publish_template
- Templates explorer already has a "Create Template" button linking to /templates/create
- The route /templates/create doesn't exist yet

## Task

Implement the complete template creation wizard following the documentation in:

1. `docs/sprints/SPRINT 8.5 TEMPLATES CREATION.md` - Overview and implementation plan
2. `docs/sprints/SPRINT 8.5 TEMPLATES CREATION/Subtask 8.5.1 Create template creation wizard.md` - Detailed code for the wizard

## Implementation Steps

### Step 1: Create the template creation wizard page

- File: `src/app/templates/create/page.tsx`
- Follow the implementation in Subtask 8.5.1
- This includes the main page component with authentication and form submission
- Must integrate with the backend RPCs: create_template, add_template_page, publish_template

### Step 2: Create the wizard container component

- File: `src/components/templates/TemplateCreationWizard.tsx`
- Follow the implementation in Subtask 8.5.1
- Multi-step wizard with progress indicator
- Steps: Basic Info → Pages & Slots → Review & Publish
- Form validation at each step

### Step 3: Create the basic info form component

- File: `src/components/templates/TemplateBasicInfoForm.tsx`
- Follow the implementation in Subtask 8.5.1
- Fields: title, description, image upload, public/private toggle
- Image upload with preview functionality
- All text in Spanish

### Step 4: Create the pages and slots form component

- File: `src/components/templates/TemplatePagesForm.tsx`
- This component is NOT fully documented in Subtask 8.5.1
- You'll need to create this based on the requirements:
  - Allow users to add multiple pages
  - Each page has a title and type ('team' or 'special')
  - Each page has multiple slots with label and is_special flag
  - Dynamic add/remove functionality for pages and slots
  - All text in Spanish

### Step 5: Create the review form component

- File: `src/components/templates/TemplateReviewForm.tsx`
- This component is NOT fully documented in Subtask 8.5.1
- You'll need to create this based on the requirements:
  - Display all template information for review
  - Allow final edits before publishing
  - Show summary of pages and slots
  - All text in Spanish

### Step 6: Create template creation hooks

- File: `src/hooks/templates/useCreateTemplate.ts`
- This is NOT documented in Subtask 8.5.1
- You'll need to create this based on the requirements:
  - Hook to handle template creation
  - Wrap the RPC calls (create_template, add_template_page, publish_template)
  - Handle loading states and errors
  - Return success/error states

## Technical Requirements

1. All text must be in Spanish
2. Follow the existing dark theme with yellow accents (#FFC000)
3. Mobile-responsive design
4. Form validation with user-friendly error messages
5. Integration with existing Supabase RPCs
6. Proper TypeScript typing throughout
7. Follow existing code patterns and component structure

## References

- Existing templates components: `src/components/templates/`
- Existing templates hooks: `src/hooks/templates/`
- Existing UI components: `src/components/ui/`
- Sprint 2 RPC documentation: `docs/sprints/SPRINT 2 Collection Templates/Subtask 2.2 Create template management RPCs.txt`

## Success Criteria

1. Users can create a complete template with pages and slots
2. Created templates appear in the templates explorer
3. Templates can be published and made public
4. All text is in Spanish
5. Mobile-responsive design works correctly
6. Form validation prevents invalid submissions

After implementation, update the TODO list to mark Sprint 8.5 as complete.
