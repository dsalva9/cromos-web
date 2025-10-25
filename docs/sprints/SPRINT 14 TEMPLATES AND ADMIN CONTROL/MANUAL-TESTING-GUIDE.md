# Sprint 14: Manual Testing Guide

**Version**: 1.0
**Date**: October 25, 2025
**Sprint**: Sprint 14 - Templates and Admin Control

## Overview

This guide provides comprehensive manual testing procedures for all features implemented in Sprint 14, including template ratings, template editing/deletion, admin marketplace oversight, admin template moderation, and admin account controls.

---

## Pre-Testing Setup

### Environment Preparation
1. Apply database migrations:
   ```bash
   supabase db push
   ```
2. Clear browser cache and cookies
3. Test in multiple browsers:
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (if available)
4. Test in different viewport sizes:
   - Mobile (375px width)
   - Tablet (768px width)
   - Desktop (1920px width)
5. Prepare test accounts:
   - User A (template author with public templates)
   - User B (regular user for rating templates)
   - User C (additional user for rating testing)
   - Admin user account

### Tools Needed
- Browser DevTools (Network tab, Console)
- Supabase Studio (for database verification)
- Screenshot tool (for documentation)

### Database Verification
Before testing, verify migrations applied successfully:
```sql
-- Check template_ratings table exists
SELECT * FROM template_ratings LIMIT 1;

-- Check new RPCs exist
SELECT proname FROM pg_proc WHERE proname IN (
  'create_template_rating',
  'update_template_rating',
  'delete_template_rating',
  'get_template_ratings',
  'get_template_rating_summary',
  'update_template_metadata',
  'delete_template',
  'admin_list_marketplace_listings',
  'admin_list_templates',
  'admin_update_template_status',
  'admin_purge_user'
);

-- Check status columns added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'marketplace_listings' AND column_name = 'status';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'collection_templates' AND column_name = 'status';
```

### Required Environment Variables
Verify `.env.local` contains:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## Test Suite 1: Template Ratings UX (Subtask 14.1)

### 14.1.1 View Rating Summary

**Steps:**
1. Log in as User B
2. Navigate to `/templates`
3. Click on any public template
4. Scroll to "Valoraciones" section
5. Observe the rating summary display

**Expected Results:**
- [ ] Rating summary card displays with overall average (e.g., "4.5")
- [ ] Star icons show visual representation of rating
- [ ] Total count of ratings displayed (e.g., "12 valoraciones")
- [ ] 5-star distribution bars show correctly
- [ ] Each bar shows count and percentage of total
- [ ] "Valorar plantilla" button visible (if not author)
- [ ] Button reads "Actualizar valoración" if user has rated
- [ ] If user is template author, shows message: "No puedes valorar tus propias plantillas"

**Pass/Fail**: ___________

---

### 14.1.2 Create New Rating

**Steps:**
1. As User B (not template author), click "Valorar plantilla" button
2. Rating dialog opens
3. Select 4 stars
4. Enter comment: "Gran plantilla, muy útil para mi colección"
5. Click "Enviar valoración"

**Expected Results:**
- [ ] Dialog opens with title "Valorar plantilla"
- [ ] Template title shown in dialog description
- [ ] 5 clickable stars displayed
- [ ] Stars highlight on hover
- [ ] Selected rating shows label (e.g., "Buena")
- [ ] Textarea allows up to 280 characters
- [ ] Character counter shows "X/280 caracteres"
- [ ] "Enviar valoración" button enabled only when rating selected
- [ ] Success toast: "Valoración creada con éxito"
- [ ] Dialog closes automatically
- [ ] Rating summary updates immediately (no page refresh needed)
- [ ] New review appears in "Comentarios" section

**Pass/Fail**: ___________

---

### 14.1.3 Update Existing Rating

**Steps:**
1. User B returns to same template
2. Click "Actualizar valoración" button
3. Rating dialog shows with existing values
4. Change rating from 4 to 5 stars
5. Update comment: "Perfecto después de usarla más"
6. Click "Actualizar"

**Expected Results:**
- [ ] Dialog title reads "Actualizar valoración"
- [ ] Existing rating (4 stars) pre-selected
- [ ] Existing comment pre-filled in textarea
- [ ] Can change star rating
- [ ] Can edit comment text
- [ ] "Eliminar" button visible (red, with trash icon)
- [ ] "Actualizar" button saves changes
- [ ] Success toast: "Valoración actualizada con éxito"
- [ ] Rating summary reflects new average
- [ ] Updated comment appears in review list

**Pass/Fail**: ___________

---

### 14.1.4 Delete Rating

**Steps:**
1. In rating dialog (as User B with existing rating)
2. Click "Eliminar" button
3. Confirmation prompt appears
4. Click "Eliminar" in confirmation

**Expected Results:**
- [ ] "Confirmar eliminación" screen shown
- [ ] Warning text: "Esta acción no se puede deshacer"
- [ ] "Cancelar" button returns to edit form
- [ ] "Eliminar" button (red) proceeds with deletion
- [ ] Success toast: "Valoración eliminada con éxito"
- [ ] Dialog closes
- [ ] Rating summary updates (count decreases, average recalculates)
- [ ] User's review removed from list
- [ ] Button now reads "Valorar plantilla" (not "Actualizar")

**Pass/Fail**: ___________

---

### 14.1.5 Author Self-Rating Prevention

**Steps:**
1. Log in as User A (template author)
2. Navigate to their own public template
3. Scroll to ratings section

**Expected Results:**
- [ ] "Valorar plantilla" button NOT shown
- [ ] Info message displayed: "No puedes valorar tus propias plantillas"
- [ ] Message styled with gray background and border
- [ ] Attempting to call RPC directly returns error (check console)

**Pass/Fail**: ___________

---

### 14.1.6 Review List Pagination

**Steps:**
1. Navigate to a template with 15+ ratings
2. Scroll to "Comentarios" section
3. Initial 10 reviews load
4. Click "Cargar más valoraciones" button
5. Next batch loads

**Expected Results:**
- [ ] First 10 reviews displayed initially
- [ ] Each review shows: user avatar/icon, nickname, star rating, date, comment
- [ ] Date formatted in Spanish (e.g., "24 de octubre de 2025")
- [ ] "Cargar más valoraciones" button visible if more exist
- [ ] Button hidden if all reviews loaded
- [ ] Loading state shows while fetching
- [ ] No duplicate reviews appear

**Pass/Fail**: ___________

---

### 14.1.7 Unauthenticated User Flow

**Steps:**
1. Log out
2. Navigate to any public template
3. Click "Valorar plantilla" button

**Expected Results:**
- [ ] Redirects to `/login?redirect=/templates/[id]`
- [ ] After login, returns to template page
- [ ] Rating dialog does NOT auto-open (requires second click)

**Pass/Fail**: ___________

---

## Test Suite 2: Template Editing & Deletion (Subtask 14.2)

### 14.2.1 View Template Management Controls

**Steps:**
1. Log in as User A (template author)
2. Navigate to one of your own public templates
3. Observe the action card on the right

**Expected Results:**
- [ ] Action card title: "Gestionar Plantilla"
- [ ] Subtitle: "Esta es tu plantilla. Puedes editarla o eliminarla."
- [ ] "Editar Plantilla" button visible (yellow, with Edit icon)
- [ ] "Eliminar Plantilla" button visible (red outline, with Trash icon)
- [ ] "Copiar Plantilla" button NOT shown (since you're the author)

**Pass/Fail**: ___________

---

### 14.2.2 Delete Template Flow

**Steps:**
1. As template author, click "Eliminar Plantilla" button
2. Delete dialog appears
3. Enter reason: "Ya no es relevante para mis colecciones"
4. Click "Eliminar"

**Expected Results:**
- [ ] Dialog opens with title "Eliminar Plantilla"
- [ ] Warning message explains soft-delete behavior
- [ ] Optional reason textarea provided
- [ ] "Cancelar" and "Eliminar" buttons visible
- [ ] "Eliminar" button is red
- [ ] On submit, shows loading state "Eliminando..."
- [ ] Success toast: "Plantilla eliminada con éxito"
- [ ] Redirects to `/templates` page
- [ ] Template no longer appears in public listing
- [ ] Template title updated in DB with "[ELIMINADA]" prefix
- [ ] Template set to `is_public = FALSE`

**Database Verification**:
```sql
SELECT id, title, is_public FROM collection_templates
WHERE id = [deleted_template_id];
-- Should show title starting with "[ELIMINADA]" and is_public = false
```

**Pass/Fail**: ___________

---

### 14.2.3 Edit Button Link

**Steps:**
1. As template author, click "Editar Plantilla" button
2. Observe navigation

**Expected Results:**
- [ ] Navigates to `/templates/[id]/edit`
- [ ] (Note: Full edit page not implemented yet - placeholder route OK)
- [ ] No console errors

**Pass/Fail**: ___________

---

### 14.2.4 Non-Author View

**Steps:**
1. Log in as User B (not template author)
2. Navigate to User A's template
3. Observe action card

**Expected Results:**
- [ ] Action card title: "¿Quieres esta plantilla?"
- [ ] Shows "Copiar Plantilla" button
- [ ] Does NOT show "Editar" or "Eliminar" buttons
- [ ] Only author has management controls

**Pass/Fail**: ___________

---

## Test Suite 3: Admin Marketplace Oversight (Subtask 14.3)

### 14.3.1 View Marketplace Admin Page

**Steps:**
1. Log in as admin user
2. Navigate to `/admin`
3. Click "Marketplace" tab
4. Observe the listings table

**Expected Results:**
- [ ] Page title: "Gestión de Marketplace"
- [ ] Subtitle: "Supervisa y modera los listados del marketplace"
- [ ] Search bar with placeholder "Buscar listados..."
- [ ] Status filter dropdown with options: Todos, Activo, Reservado, Completado, Suspendido, Eliminado
- [ ] Table shows all listings with: title, collection, status badge, seller, price, views, transactions
- [ ] Each listing has action buttons
- [ ] Status badges colored appropriately (green=active, yellow=suspended, red=removed)

**Pass/Fail**: ___________

---

### 14.3.2 Search Listings

**Steps:**
1. In search bar, type partial listing title (e.g., "Panini")
2. Press Enter or wait for debounce
3. Results filter

**Expected Results:**
- [ ] Only matching listings displayed
- [ ] Search is case-insensitive
- [ ] Partial matches work
- [ ] Empty search shows all listings

**Pass/Fail**: ___________

---

### 14.3.3 Filter by Status

**Steps:**
1. Select "Suspendido" from status filter dropdown
2. Observe results

**Expected Results:**
- [ ] Only suspended listings shown
- [ ] Changing to "Activo" shows only active listings
- [ ] "Todos" shows all statuses

**Pass/Fail**: ___________

---

### 14.3.4 Suspend Listing

**Steps:**
1. Find an active listing
2. Click "Suspender" button
3. Dialog opens
4. Enter reason: "Contenido inapropiado en la descripción"
5. Click "Confirmar"

**Expected Results:**
- [ ] Dialog title: "Suspender Listado"
- [ ] Listing title shown in description
- [ ] Reason textarea marked as "(requerido)"
- [ ] "Confirmar" button disabled until reason entered
- [ ] On submit, shows "Procesando..." loading state
- [ ] Success toast: "Listado suspendido con éxito"
- [ ] Dialog closes
- [ ] Listing status badge changes to "suspended" (yellow)
- [ ] "Suspender" button replaced with "Reactivar" button

**Database Verification**:
```sql
SELECT id, status, suspended_at, suspension_reason
FROM marketplace_listings WHERE id = [listing_id];
-- Should show status = 'suspended', suspended_at timestamp, and reason

SELECT * FROM audit_log
WHERE action_type = 'listing_suspended'
ORDER BY created_at DESC LIMIT 1;
-- Should show audit entry with admin user and reason
```

**Pass/Fail**: ___________

---

### 14.3.5 Reactivate Listing

**Steps:**
1. On a suspended listing, click "Reactivar" button
2. Confirm action (no reason required)

**Expected Results:**
- [ ] Dialog asks for confirmation
- [ ] No reason field shown (restoration doesn't need reason)
- [ ] Success toast: "Listado reactivado con éxito"
- [ ] Status badge changes to "active" (green)
- [ ] "Reactivar" button replaced with "Suspender"
- [ ] `suspended_at` and `suspension_reason` cleared in database

**Pass/Fail**: ___________

---

### 14.3.6 Delete Listing

**Steps:**
1. Click "Eliminar" button on any listing
2. Enter reason: "Violación de términos de servicio"
3. Confirm

**Expected Results:**
- [ ] Dialog title: "Eliminar Listado"
- [ ] Reason field shown (optional)
- [ ] Red "Confirmar" button
- [ ] Success toast: "Listado eliminado con éxito"
- [ ] Status changes to "removed"
- [ ] Audit log entry created

**Pass/Fail**: ___________

---

### 14.3.7 View Listing Externally

**Steps:**
1. Click "Ver listado" button (with external link icon)
2. Opens in new tab

**Expected Results:**
- [ ] Opens `/marketplace/[id]` in new tab
- [ ] Listing displays normally
- [ ] Button uses `target="_blank"`

**Pass/Fail**: ___________

---

## Test Suite 4: Admin Templates Oversight

### 14.4.1 View Templates Admin Page

**Steps:**
1. As admin, navigate to `/admin/templates`
2. Observe the templates table

**Expected Results:**
- [ ] Page title: "Gestión de Plantillas"
- [ ] Subtitle: "Supervisa y modera las plantillas públicas"
- [ ] Search bar for finding templates
- [ ] Status filter: Todos, Activa, Suspendida, Eliminada
- [ ] Table shows: title, status, author, rating, copies count, visibility
- [ ] Private templates show "Privada" badge
- [ ] Action buttons per template

**Pass/Fail**: ___________

---

### 14.4.2 Suspend Template

**Steps:**
1. Find an active template
2. Click "Suspender"
3. Enter reason: "Contenido duplicado de otra plantilla"
4. Confirm

**Expected Results:**
- [ ] Reason required
- [ ] Success toast: "Plantilla suspendida con éxito"
- [ ] Status changes to "suspended"
- [ ] Template set to `is_public = FALSE` in database
- [ ] Audit log entry created with action_type = 'template_suspended'

**Database Verification**:
```sql
SELECT id, status, is_public, suspended_at, suspension_reason
FROM collection_templates WHERE id = [template_id];

SELECT * FROM audit_log
WHERE action_type = 'template_suspended'
ORDER BY created_at DESC LIMIT 1;
```

**Pass/Fail**: ___________

---

### 14.4.3 Reactivate Template

**Steps:**
1. On suspended template, click "Reactivar"
2. Confirm

**Expected Results:**
- [ ] No reason required
- [ ] Status changes to "active"
- [ ] Template remains private (doesn't auto-publish)
- [ ] Suspension data cleared

**Pass/Fail**: ___________

---

### 14.4.4 Delete Template

**Steps:**
1. Click "Eliminar" on template
2. Enter optional reason
3. Confirm

**Expected Results:**
- [ ] Status changes to "deleted"
- [ ] Template marked private
- [ ] No longer visible in public gallery
- [ ] Audit logged

**Pass/Fail**: ___________

---

## Test Suite 5: Admin Account Controls (Subtask 14.4)

### 14.5.1 Force Password Reset

**Steps:**
1. Navigate to `/admin/users`
2. Find a non-admin user
3. Click "Reset Password" button (blue, with Mail icon)
4. Confirm the action

**Expected Results:**
- [ ] Confirmation prompt: "Send password reset email to [nickname]?"
- [ ] On confirm, calls `/api/admin/force-reset`
- [ ] Success toast: "Password reset email sent"
- [ ] (In real environment, user receives reset email)
- [ ] Action logged to `audit_log` with action_type = 'force_password_reset'

**API Verification** (DevTools Network tab):
```
POST /api/admin/force-reset
Request Body: { "userId": "uuid-here" }
Response: { "success": true, "message": "..." }
```

**Pass/Fail**: ___________

---

### 14.5.2 Delete User Account

**Steps:**
1. On same user, click "Delete User" button (red, with Trash icon)
2. First prompt: Enter reason "Test de eliminación de cuenta"
3. Second prompt: Confirm "Are you ABSOLUTELY SURE..."
4. Both confirmed

**Expected Results:**
- [ ] Double confirmation required
- [ ] Reason is mandatory (prompt returns if empty)
- [ ] On confirm, calls `/api/admin/delete-user`
- [ ] Success toast: "Usuario eliminado con éxito"
- [ ] User row disappears from list
- [ ] User removed from auth.users
- [ ] User profile deleted
- [ ] All user data purged (listings, templates, collections, ratings, etc.)
- [ ] Audit log entry with action_type = 'user_delete' and 'user_purge'

**Database Verification**:
```sql
-- User should not exist
SELECT * FROM profiles WHERE id = '[deleted_user_id]';
-- Returns 0 rows

-- User's listings should be gone
SELECT * FROM marketplace_listings WHERE seller_id = '[deleted_user_id]';
-- Returns 0 rows

-- User's templates should be gone
SELECT * FROM collection_templates WHERE author_id = '[deleted_user_id]';
-- Returns 0 rows

-- Audit log should show actions
SELECT * FROM audit_log
WHERE target_id = '[deleted_user_id]'
AND action_type IN ('user_delete', 'user_purge')
ORDER BY created_at DESC;
```

**Pass/Fail**: ___________

---

### 14.5.3 Admin Protection

**Steps:**
1. Try to suspend, force reset, or delete an admin user

**Expected Results:**
- [ ] "Reset Password" and "Delete User" buttons NOT visible for admin users
- [ ] Only "Suspend/Unsuspend" hidden for admins
- [ ] API routes verify admin status and reject self-operations

**Pass/Fail**: ___________

---

## Test Suite 6: Cross-Feature Integration

### 14.6.1 Rating After Template Deletion

**Steps:**
1. User B rates User A's template
2. User A deletes the template
3. Check if rating still exists in database

**Expected Results:**
- [ ] Rating remains in `template_ratings` table (no cascade delete)
- [ ] Template soft-deleted (title prefixed, set private)
- [ ] Rating no longer visible publicly (template not listed)

**Pass/Fail**: ___________

---

### 14.6.2 Admin Template Moderation After User Deletion

**Steps:**
1. Admin deletes User A (who has templates)
2. Check templates table

**Expected Results:**
- [ ] User A's templates deleted via `admin_purge_user`
- [ ] Templates no longer appear in admin templates page
- [ ] No orphaned templates in database

**Database Verification**:
```sql
SELECT * FROM collection_templates WHERE author_id = '[deleted_user_id]';
-- Should return 0 rows
```

**Pass/Fail**: ___________

---

### 14.6.3 Rating Distribution Recalculation

**Steps:**
1. Template has 5 ratings (mix of 1-5 stars)
2. Delete 2 ratings
3. Check rating summary

**Expected Results:**
- [ ] Average recalculates correctly
- [ ] Count decreases by 2
- [ ] Distribution bars update
- [ ] No visual glitches or stale data

**Pass/Fail**: ___________

---

## Test Suite 7: Error Handling & Edge Cases

### 14.7.1 Invalid Rating Submission

**Steps:**
1. Open rating dialog
2. Don't select any stars
3. Try to submit

**Expected Results:**
- [ ] "Enviar valoración" button disabled
- [ ] Clicking disabled button does nothing
- [ ] If forced via console, backend rejects (rating must be 1-5)

**Pass/Fail**: ___________

---

### 14.7.2 Duplicate Rating Prevention

**Steps:**
1. User attempts to create rating via direct RPC call when rating already exists

**Expected Results:**
- [ ] Database constraint prevents duplicate (UNIQUE on user_id + template_id)
- [ ] Error returned to client
- [ ] UI hook handles gracefully (shows update dialog instead)

**Pass/Fail**: ___________

---

### 14.7.3 Comment Character Limit

**Steps:**
1. In rating dialog, paste 300+ character text

**Expected Results:**
- [ ] Textarea accepts only 280 characters
- [ ] Counter shows "280/280"
- [ ] Excess characters trimmed or prevented
- [ ] Backend validates maxLength

**Pass/Fail**: ___________

---

### 14.7.4 Admin Action Without Permission

**Steps:**
1. Log in as regular user (not admin)
2. Navigate to `/admin/marketplace`

**Expected Results:**
- [ ] `AdminGuard` redirects to homepage or shows "No autorizado"
- [ ] API routes return 403 if called directly
- [ ] Backend RPCs check `require_admin()` and reject

**Pass/Fail**: ___________

---

### 14.7.5 Missing Service Role Key

**Steps:**
1. Remove `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
2. Restart dev server
3. Try force password reset

**Expected Results:**
- [ ] API route returns 500 error
- [ ] Console logs: "SUPABASE_SERVICE_ROLE_KEY not configured"
- [ ] Error message: "Configuración del servidor incompleta"
- [ ] No crash or undefined behavior

**Pass/Fail**: ___________

---

## Test Suite 8: Mobile Responsiveness

### 14.8.1 Rating Dialog on Mobile

**Steps:**
1. Open rating dialog on 375px viewport
2. Interact with all elements

**Expected Results:**
- [ ] Dialog fits within screen (no horizontal scroll)
- [ ] Star selector tappable (adequate touch target size)
- [ ] Textarea usable
- [ ] Buttons accessible
- [ ] Character counter visible

**Pass/Fail**: ___________

---

### 14.8.2 Admin Tables on Mobile

**Steps:**
1. View `/admin/marketplace` on mobile
2. Scroll horizontally if needed

**Expected Results:**
- [ ] Tables responsive or scrollable
- [ ] Action buttons accessible
- [ ] No layout breakage
- [ ] Filters usable on small screens

**Pass/Fail**: ___________

---

## Test Suite 9: Performance & Security

### 14.9.1 Rating Load Performance

**Steps:**
1. Navigate to template with 100+ ratings
2. Observe initial page load time

**Expected Results:**
- [ ] Only first 10 ratings load initially (pagination)
- [ ] Page renders in < 2 seconds
- [ ] No blocking queries
- [ ] Smooth scroll performance

**Pass/Fail**: ___________

---

### 14.9.2 SQL Injection Prevention

**Steps:**
1. In search bars, enter: `'; DROP TABLE profiles; --`
2. Submit search

**Expected Results:**
- [ ] Query treats input as literal string
- [ ] No SQL execution
- [ ] No error or database change
- [ ] Parameterized queries used

**Pass/Fail**: ___________

---

### 14.9.3 RLS Policy Verification

**Steps:**
1. As User B, try to call `update_template_metadata` on User A's template

**Expected Results:**
- [ ] RPC checks `author_id = auth.uid()`
- [ ] Returns error: "You do not have permission to edit this template"
- [ ] No update occurs

**Database Test**:
```sql
-- Simulate User B calling RPC for User A's template
SET request.jwt.claims.sub TO 'user-b-uuid';
SELECT update_template_metadata([user-a-template-id], 'Hacked Title');
-- Should raise exception
```

**Pass/Fail**: ___________

---

## Test Suite 10: Localization (Spanish)

### 14.10.1 UI Text Verification

**Steps:**
1. Navigate through all new features
2. Check all buttons, labels, messages

**Expected Results:**
- [ ] All text in Spanish (es-ES)
- [ ] Consistent tone (friendly-professional)
- [ ] No English placeholders
- [ ] Proper Spanish date formatting (e.g., "24 de octubre de 2025")

**Key Phrases to Verify**:
- "Valorar plantilla"
- "Actualizar valoración"
- "No puedes valorar tus propias plantillas"
- "Comentario (opcional)"
- "caracteres"
- "Eliminar Plantilla"
- "Gestionar Plantilla"
- "Suspender" / "Reactivar"
- "Enviar correo de restablecimiento"

**Pass/Fail**: ___________

---

## Regression Testing

### 14.R.1 Existing Template Features

**Steps:**
1. Create new template via wizard
2. Copy template
3. View template detail page (without interacting with ratings)

**Expected Results:**
- [ ] Template creation works as before
- [ ] Template copying unaffected
- [ ] Page layout not broken
- [ ] All existing features functional

**Pass/Fail**: ___________

---

### 14.R.2 Marketplace Features

**Steps:**
1. Create marketplace listing
2. Reserve listing
3. Complete transaction

**Expected Results:**
- [ ] All marketplace flows work normally
- [ ] New status columns don't interfere
- [ ] Admin changes don't break user flows

**Pass/Fail**: ___________

---

## Browser Compatibility Matrix

| Test Suite | Chrome | Firefox | Safari | Edge |
|------------|--------|---------|--------|------|
| 14.1 Ratings | ☐ | ☐ | ☐ | ☐ |
| 14.2 Editing | ☐ | ☐ | ☐ | ☐ |
| 14.3 Admin Marketplace | ☐ | ☐ | ☐ | ☐ |
| 14.4 Admin Templates | ☐ | ☐ | ☐ | ☐ |
| 14.5 Admin Users | ☐ | ☐ | ☐ | ☐ |

---

## Known Issues Log

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 14-001 | Force reset needs email lookup (currently expects email as userId) | Medium | Open |
| 14-002 | Template edit page not fully implemented | Low | Planned |
| | | | |

---

## Sign-Off

**Tester Name**: _________________
**Date**: _________________
**Overall Pass/Fail**: _________________

**Notes**:
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________

**Blockers**:
_________________________________________________________________________
_________________________________________________________________________

**Recommendations**:
_________________________________________________________________________
_________________________________________________________________________
