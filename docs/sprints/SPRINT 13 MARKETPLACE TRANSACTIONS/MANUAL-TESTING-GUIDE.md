# Sprint 13: Manual Testing Guide

**Version**: 1.0
**Date**: October 24, 2025
**Sprint**: Sprint 13 - Marketplace Transactions

## Overview

This guide provides comprehensive manual testing procedures for all features implemented in Sprint 13, including the avatar system, bidirectional marketplace chat, transaction workflow, and mobile camera capture functionality.

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
   - User A (seller with active listings)
   - User B (buyer account)
   - User C (additional buyer for multi-conversation testing)
   - Admin user account

### Tools Needed
- Browser DevTools (Network tab, Console)
- Mobile device or emulator (for camera testing)
- Supabase Studio (for database verification)
- Screenshot tool (for documentation)

### Database Verification
Before testing, verify migrations applied successfully:
```sql
-- Check trade_listings status includes new values
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%trade_listings_status%';

-- Should include: 'active', 'sold', 'removed', 'reserved', 'completed'

-- Check listing_transactions table exists
SELECT * FROM listing_transactions LIMIT 1;

-- Check new RPCs exist
SELECT proname FROM pg_proc WHERE proname IN (
  'send_listing_message',
  'get_listing_chats',
  'get_listing_chat_participants',
  'reserve_listing',
  'complete_listing_transaction',
  'cancel_listing_transaction'
);
```

---

## Test Suite 1: Avatar System (Subtask 13.1)

### 13.1.1 Avatar Preset Selection

**Steps:**
1. Log in as User A
2. Navigate to `/users/[userId]` (your profile)
3. Click "Editar perfil"
4. In the avatar picker, click the "Galería" tab
5. Select each preset avatar one by one
6. Click "Guardar cambios"
7. Verify avatar appears in header

**Expected Results:**
- [ ] Avatar picker modal opens successfully
- [ ] 8 preset avatars display in a grid (4 columns)
- [ ] Selected avatar shows highlighted border (#FFC000)
- [ ] Clicking different presets updates selection
- [ ] Save button becomes enabled when preset selected
- [ ] Avatar saves and appears in profile
- [ ] Avatar appears in header dropdown immediately
- [ ] Avatar appears as circular crop

**Pass/Fail**: ___________

---

### 13.1.2 Custom Avatar Upload

**Steps:**
1. Open profile edit dialog
2. Click "Subir foto" tab in avatar picker
3. Click "Seleccionar imagen"
4. Upload a square image (PNG/JPG, ~1MB)
5. Wait for processing
6. Save profile

**Expected Results:**
- [ ] File input accepts image files only
- [ ] Preview shows after selection
- [ ] Processing indicator appears
- [ ] Image auto-crops to square if needed
- [ ] Image converts to WebP format
- [ ] Image compressed to <3MB
- [ ] Preview shows processed image
- [ ] "Eliminar vista previa" button works
- [ ] Saved avatar appears in profile and header

**Pass/Fail**: ___________

---

### 13.1.3 Avatar Upload Validation

**Steps:**
1. Open avatar picker
2. Try uploading a 5MB image
3. Try uploading a non-image file (.txt)
4. Try uploading various image formats (PNG, JPG, WebP, GIF)

**Expected Results:**
- [ ] Files >3MB show error: "La imagen debe ser menor a 3MB"
- [ ] Non-image files show error: "Por favor selecciona un archivo de imagen"
- [ ] PNG, JPG, WebP accepted and processed
- [ ] GIF accepted (converted to static WebP)
- [ ] Error messages in Spanish
- [ ] File input resets after error

**Pass/Fail**: ___________

---

### 13.1.4 Avatar Removal

**Steps:**
1. Have an avatar set (preset or custom)
2. Open profile edit
3. In avatar picker, click "Eliminar avatar"
4. Save profile
5. Check profile and header

**Expected Results:**
- [ ] "Eliminar avatar" button visible when avatar exists
- [ ] Clicking button clears preview
- [ ] Save updates profile without avatar
- [ ] Fallback gradient with initial letter shows
- [ ] Initial letter matches first character of nickname
- [ ] Gradient color consistent for same initial

**Pass/Fail**: ___________

---

### 13.1.5 Header Avatar Dropdown

**Steps:**
1. Log in as User A (with avatar set)
2. Observe header on desktop
3. Click avatar in header
4. Navigate through menu items
5. Test on mobile (hamburger menu)

**Expected Results:**
- [ ] Avatar appears in top-right header (desktop)
- [ ] Avatar is circular with border
- [ ] Clicking avatar opens dropdown menu
- [ ] Dropdown shows:
  - Current nickname
  - Email address
  - "Mi Perfil" link
  - "Mis Anuncios" link
  - "Favoritos" link
  - "Cerrar sesión" button
- [ ] Each menu item navigates correctly
- [ ] Sign out logs user out successfully
- [ ] Clicking outside closes dropdown
- [ ] Mobile: avatar shown in appropriate location

**Pass/Fail**: ___________

---

### 13.1.6 Admin Panel Link (Conditional)

**Steps:**
1. Log out User A
2. Log in as admin user
3. Click avatar dropdown in header

**Expected Results:**
- [ ] Dropdown includes "Admin Panel" link
- [ ] Link styled distinctly (yellow color)
- [ ] Link navigates to `/admin/dashboard`
- [ ] Non-admin users don't see this link

**Pass/Fail**: ___________

---

### 13.1.7 Avatar Fallbacks

**Steps:**
1. Create/use account with no avatar set
2. Check various pages where avatar should appear
3. Change nickname and verify initial updates

**Expected Results:**
- [ ] Fallback shows gradient background
- [ ] Single initial letter displayed (uppercase)
- [ ] Initial matches first character of nickname
- [ ] Default to "?" if no nickname
- [ ] Gradient color deterministic (same initial = same color)
- [ ] Fallback appears in all avatar locations:
  - Profile page
  - Header dropdown
  - Chat interface (if applicable)
  - Listing cards (for seller)

**Pass/Fail**: ___________

---

## Test Suite 2: Marketplace Chat (Subtask 13.2)

### 13.2.1 First Contact (Buyer to Seller)

**Steps:**
1. Log in as User B (buyer)
2. Navigate to an active listing by User A
3. Click "Contactar Vendedor" button
4. Wait for chat page to load (`/marketplace/[id]/chat`)
5. Type a message: "¿Está disponible este cromo?"
6. Press Enter or click Send button

**Expected Results:**
- [ ] "Contactar Vendedor" button visible for non-owners
- [ ] Chat page loads successfully
- [ ] Chat interface shows empty state initially
- [ ] Message composer is active and ready
- [ ] Character counter shows: "0/500 caracteres"
- [ ] Message sends successfully
- [ ] Message appears in chat as own message (yellow/right side)
- [ ] Timestamp shows below message
- [ ] No errors in console

**Pass/Fail**: ___________

---

### 13.2.2 Seller Receives Message

**Steps:**
1. Without refreshing, log in as User A in another browser/incognito
2. Navigate to same listing
3. Click "Ver Conversaciones"
4. Check for User B in participant list

**Expected Results:**
- [ ] "Ver Conversaciones" button visible for listing owner
- [ ] Chat page shows participant list (left column)
- [ ] User B appears in participant list with:
  - Nickname
  - Last message preview
  - Unread count badge
- [ ] Clicking User B loads conversation
- [ ] User B's message visible in chat
- [ ] Message shows on left side (gray bubble)
- [ ] Sender nickname displayed above message

**Pass/Fail**: ___________

---

### 13.2.3 Seller Replies

**Steps:**
1. As User A (seller), with User B's conversation selected
2. Type reply: "Sí, está disponible. ¿Cuándo puedes recogerlo?"
3. Send message

**Expected Results:**
- [ ] Message composer enabled (User B selected)
- [ ] Message sends successfully
- [ ] Message appears in chat (yellow/right side for seller)
- [ ] Character counter updates as typing
- [ ] Message persists after sending
- [ ] Conversation updates in participant list

**Pass/Fail**: ___________

---

### 13.2.4 Buyer Receives Reply (Realtime)

**Steps:**
1. Switch back to User B's browser
2. Without refreshing, observe chat

**Expected Results:**
- [ ] Seller's reply appears automatically (realtime)
- [ ] No page refresh needed
- [ ] Message displays correctly (left side, gray bubble)
- [ ] Timestamp accurate
- [ ] Auto-scrolls to new message
- [ ] No delay >2 seconds

**Pass/Fail**: ___________

---

### 13.2.5 Multiple Buyer Conversations

**Steps:**
1. Log in as User C (third account)
2. Navigate to same listing
3. Send message: "¿Aceptas intercambios?"
4. Switch to User A (seller)
5. Refresh chat page if needed

**Expected Results:**
- [ ] User C appears as second participant in list
- [ ] Both User B and User C visible
- [ ] Each participant shows independent conversation
- [ ] Selecting User C loads their conversation
- [ ] Selecting User B loads their conversation
- [ ] Messages don't mix between conversations
- [ ] Unread counts independent per participant

**Pass/Fail**: ___________

---

### 13.2.6 Message Character Limit

**Steps:**
1. In any chat conversation
2. Type or paste a message >500 characters
3. Try to send

**Expected Results:**
- [ ] Textarea blocks input at 500 characters
- [ ] Character counter shows: "500/500 caracteres"
- [ ] Counter turns red when at limit
- [ ] Cannot type beyond limit
- [ ] Paste truncated to 500 characters
- [ ] Error shown if trying to bypass limit

**Pass/Fail**: ___________

---

### 13.2.7 Read Receipts

**Steps:**
1. As User B, send message to User A
2. As User A, open chat and view message
3. Check database or UI for read status

**Expected Results:**
- [ ] Messages marked as `is_read: false` initially
- [ ] Opening conversation marks messages as read
- [ ] `mark_listing_messages_read` RPC called
- [ ] Unread count decrements in participant list
- [ ] Read status persists across sessions

**Pass/Fail**: ___________

---

### 13.2.8 Chat UI Responsiveness

**Steps:**
1. Test chat on mobile viewport (375px)
2. Test on tablet (768px)
3. Test on desktop (1920px)

**Expected Results:**
- [ ] Mobile: Single column layout
- [ ] Mobile: Participant list hidden/collapsible
- [ ] Tablet: Two-column layout works
- [ ] Desktop: Two-column layout optimal
- [ ] Message bubbles don't overflow
- [ ] Composer always accessible
- [ ] Send button always visible

**Pass/Fail**: ___________

---

### 13.2.9 Chat Permissions

**Steps:**
1. As User D (unrelated user), try to access chat URL directly
2. Try various permission scenarios

**Expected Results:**
- [ ] Non-participants can't access conversation
- [ ] Seller can view all participants
- [ ] Buyers only see own conversation
- [ ] Anonymous users redirected to login
- [ ] Error messages in Spanish

**Pass/Fail**: ___________

---

## Test Suite 3: Transaction Workflow (Subtask 13.3)

### 13.3.1 Listing Reservation

**Steps:**
1. As User A (seller), open listing with active conversations
2. In listing detail page (not chat), look for reservation option
3. Note: Full UI may not be integrated yet; test via chat page
4. Navigate to chat page
5. Note participants who have messaged

**Expected Results:**
- [ ] Seller can identify interested buyers from chat
- [ ] Database ready for reservation (verify RPC exists)
- [ ] `reserve_listing` RPC functional:
  ```sql
  SELECT reserve_listing(listing_id, buyer_user_id, 'Test reservation');
  ```
- [ ] Transaction created in `listing_transactions` table
- [ ] Listing status updates to 'reserved'

**Pass/Fail**: ___________

---

### 13.3.2 Buyer Reservations Page

**Steps:**
1. Create a test reservation in database (or via RPC)
2. Log in as buyer (User B)
3. Navigate to `/marketplace/reservations`

**Expected Results:**
- [ ] Page loads without errors
- [ ] Reserved listings display with:
  - Transaction status badge ("Reservado")
  - Listing title
  - Seller nickname
  - Reservation date
- [ ] "Chat" button links to conversation
- [ ] "Ver Anuncio" button links to listing
- [ ] Empty state shown if no reservations
- [ ] Empty state has CTA: "Explorar Marketplace"

**Pass/Fail**: ___________

---

### 13.3.3 Transaction Status Badge

**Steps:**
1. Check listing with different statuses:
   - Active
   - Reserved
   - Completed
   - Cancelled
   - Sold
   - Removed

**Expected Results:**
- [ ] Each status has distinct badge color:
  - Active: Green
  - Reserved: Yellow
  - Completed: Blue
  - Cancelled: Gray
  - Sold: Gray
  - Removed: Red
- [ ] Status labels in Spanish
- [ ] Reserved badge shows buyer nickname (if available)
- [ ] Badges display consistently across app

**Pass/Fail**: ___________

---

### 13.3.4 Complete Transaction

**Steps:**
1. Create reserved transaction
2. As seller or buyer, call complete RPC:
   ```sql
   SELECT complete_listing_transaction(transaction_id);
   ```
3. Verify status updates

**Expected Results:**
- [ ] RPC executes successfully
- [ ] Transaction status → 'completed'
- [ ] `completed_at` timestamp set
- [ ] Listing status → 'completed'
- [ ] Both seller and buyer can complete
- [ ] Completion shows in reservations page

**Pass/Fail**: ___________

---

### 13.3.5 Cancel Reservation

**Steps:**
1. Create reserved transaction
2. As seller, call cancel RPC:
   ```sql
   SELECT cancel_listing_transaction(transaction_id, 'Cambio de planes');
   ```
3. Verify reversal

**Expected Results:**
- [ ] RPC executes successfully (seller only)
- [ ] Transaction status → 'cancelled'
- [ ] `cancelled_at` timestamp set
- [ ] `cancellation_reason` stored
- [ ] Listing status reverts to 'active'
- [ ] Buyer receives appropriate status update

**Pass/Fail**: ___________

---

### 13.3.6 Transaction Permissions

**Steps:**
1. Test RPC permissions with different users
2. Verify RLS policies

**Expected Results:**
- [ ] Only seller can reserve listing
- [ ] Only seller can select buyer
- [ ] Seller and buyer can complete transaction
- [ ] Only seller can cancel reservation
- [ ] Participants can view own transaction
- [ ] Non-participants cannot view transaction
- [ ] Admin can view all transactions

**Pass/Fail**: ___________

---

## Test Suite 4: Mobile Camera Capture (Subtask 13.4)

### 13.4.1 Camera Button Visibility

**Steps:**
1. Open marketplace listing creation form
2. Navigate to image upload section
3. Check for camera button

**Expected Results:**
- [ ] Camera button visible on supported devices
- [ ] Button labeled "Cámara" in Spanish
- [ ] Button has camera icon
- [ ] Button hidden on unsupported browsers
- [ ] Button disabled during upload

**Pass/Fail**: ___________

---

### 13.4.2 Camera Permission Request

**Steps:**
1. Click "Cámara" button
2. Observe browser permission prompt
3. Grant camera permission

**Expected Results:**
- [ ] Browser requests camera permission
- [ ] Modal dialog opens
- [ ] Permission prompt is clear
- [ ] Granting permission starts camera
- [ ] Live video preview appears
- [ ] Rear camera selected on mobile (environment mode)

**Pass/Fail**: ___________

---

### 13.4.3 Photo Capture

**Steps:**
1. With camera active, click "Capturar" button
2. Wait for preview
3. Check captured image

**Expected Results:**
- [ ] "Capturar" button visible during live preview
- [ ] Clicking button freezes frame
- [ ] Captured image displays as static preview
- [ ] Image quality acceptable (not blurry)
- [ ] Aspect ratio maintained
- [ ] Preview shows full captured area

**Pass/Fail**: ___________

---

### 13.4.4 Retake Functionality

**Steps:**
1. After capturing photo, click "Repetir"
2. Capture new photo
3. Repeat 2-3 times

**Expected Results:**
- [ ] "Repetir" button visible on captured preview
- [ ] Clicking returns to live camera view
- [ ] Can capture multiple times
- [ ] Previous capture discarded
- [ ] No memory leaks (check DevTools)

**Pass/Fail**: ___________

---

### 13.4.5 Photo Processing and Upload

**Steps:**
1. Capture a photo
2. Click "Usar foto"
3. Wait for processing
4. Wait for upload to complete

**Expected Results:**
- [ ] "Usar foto" button enabled after capture
- [ ] Processing indicator appears
- [ ] Image converts to WebP format
- [ ] Image compressed to <2MB
- [ ] Processing time <3 seconds
- [ ] Upload progress shown
- [ ] Success message: "Imagen subida con éxito"
- [ ] Image appears in preview
- [ ] Can remove and retake if needed

**Pass/Fail**: ___________

---

### 13.4.6 Camera Permission Denied

**Steps:**
1. Deny camera permission in browser
2. Try to open camera again

**Expected Results:**
- [ ] Error message displayed in modal
- [ ] Message: "Permiso de cámara denegado"
- [ ] Instructions to enable in settings
- [ ] "Cerrar" button works
- [ ] User can still use file upload option
- [ ] No app crash or blocking error

**Pass/Fail**: ___________

---

### 13.4.7 Unsupported Browser Fallback

**Steps:**
1. Test in browser without getUserMedia support (if possible)
2. Check camera button visibility

**Expected Results:**
- [ ] Camera button hidden completely
- [ ] File upload option still available
- [ ] No JavaScript errors
- [ ] Graceful degradation
- [ ] User can complete listing creation

**Pass/Fail**: ___________

---

### 13.4.8 Mobile Device Testing

**Steps:**
1. Test on actual mobile device (iOS/Android)
2. Test camera capture workflow end-to-end

**Expected Results:**
- [ ] Camera opens in mobile browser
- [ ] Rear camera selected by default
- [ ] Touch controls responsive
- [ ] Capture button large enough (44x44px min)
- [ ] Preview renders correctly
- [ ] Upload completes on mobile network
- [ ] Image quality acceptable for mobile

**Pass/Fail**: ___________

---

## Test Suite 5: Integration Testing

### 13.5.1 End-to-End Marketplace Flow

**Steps:**
1. User A creates listing with camera photo
2. User B contacts seller via chat
3. User A reserves listing for User B
4. Both complete transaction

**Expected Results:**
- [ ] Photo captures and uploads successfully
- [ ] Listing appears in marketplace
- [ ] Chat conversation starts
- [ ] Messages exchange in realtime
- [ ] Reservation creates transaction
- [ ] Completion updates all statuses
- [ ] All steps complete without errors
- [ ] Data persists correctly in database

**Pass/Fail**: ___________

---

### 13.5.2 Avatar Integration Across App

**Steps:**
1. Set custom avatar for User A
2. Check avatar appearance in:
   - Profile page
   - Header dropdown
   - Listing cards (as seller)
   - Chat interface
   - Reservations page

**Expected Results:**
- [ ] Avatar consistent across all locations
- [ ] Avatar loads quickly (cached)
- [ ] Avatar resolution appropriate for context
- [ ] Fallback works if avatar fails to load

**Pass/Fail**: ___________

---

### 13.5.3 Chat & Transaction Coordination

**Steps:**
1. Start chat between buyer/seller
2. Reserve listing for that buyer
3. Continue chat after reservation
4. Complete transaction
5. Check chat still accessible

**Expected Results:**
- [ ] Chat accessible throughout workflow
- [ ] Transaction status visible in chat context
- [ ] Messages persist after state changes
- [ ] Chat history maintained after completion

**Pass/Fail**: ___________

---

## Test Suite 6: Cross-Browser Testing

### 13.6.1 Chrome/Edge Testing

**Steps:**
1. Test all Sprint 13 features in Chrome/Edge
2. Check camera capture specifically

**Expected Results:**
- [ ] All features work as expected
- [ ] Camera capture works
- [ ] No console errors
- [ ] WebP images supported
- [ ] Realtime chat functions correctly

**Pass/Fail**: ___________

---

### 13.6.2 Firefox Testing

**Steps:**
1. Test all Sprint 13 features in Firefox
2. Check getUserMedia compatibility

**Expected Results:**
- [ ] All features work as expected
- [ ] Camera capture works
- [ ] Avatar upload/display works
- [ ] Chat realtime subscriptions work
- [ ] No Firefox-specific bugs

**Pass/Fail**: ___________

---

### 13.6.3 Safari Testing (if available)

**Steps:**
1. Test all Sprint 13 features in Safari
2. Check WebKit compatibility

**Expected Results:**
- [ ] All features work as expected
- [ ] Camera capture works (iOS Safari)
- [ ] WebP images supported or fallback works
- [ ] Chat functions correctly
- [ ] No Safari-specific bugs

**Pass/Fail**: ___________

---

## Test Suite 7: Performance & Security

### 13.7.1 Image Upload Performance

**Steps:**
1. Upload 5 different images (various sizes)
2. Use camera capture 3 times
3. Monitor network and processing time

**Expected Results:**
- [ ] Average upload time <5 seconds
- [ ] Processing time <3 seconds
- [ ] Images compressed appropriately
- [ ] WebP conversion successful
- [ ] No memory leaks
- [ ] Progress indicators accurate

**Pass/Fail**: ___________

---

### 13.7.2 Chat Performance

**Steps:**
1. Send 50 messages in a conversation
2. Switch between 3 different conversations
3. Monitor load times and responsiveness

**Expected Results:**
- [ ] Messages load quickly
- [ ] Realtime updates <2 seconds
- [ ] Conversation switching smooth
- [ ] No lag with 50+ messages
- [ ] Pagination works (if implemented)
- [ ] Memory usage stable

**Pass/Fail**: ___________

---

### 13.7.3 Avatar Storage Permissions

**Steps:**
1. Upload avatar as regular user
2. Try to access another user's avatar URL
3. Check Supabase storage policies

**Expected Results:**
- [ ] Avatars stored in correct bucket
- [ ] Public read access enabled
- [ ] Write access restricted to owner
- [ ] Direct URL access works (public)
- [ ] Storage path includes user ID

**Pass/Fail**: ___________

---

### 13.7.4 Chat Security

**Steps:**
1. As User A, note chat URL
2. Log out, log in as User C (not participant)
3. Try to access User A's chat URL

**Expected Results:**
- [ ] Non-participants blocked from access
- [ ] Error message displayed
- [ ] No data exposed in network tab
- [ ] RLS policies enforced
- [ ] No SQL injection possible

**Pass/Fail**: ___________

---

### 13.7.5 Transaction Security

**Steps:**
1. As buyer, try to reserve listing (should fail)
2. As unrelated user, try to view transaction
3. Test RLS policies

**Expected Results:**
- [ ] Only seller can create reservation
- [ ] Only participants can view transaction
- [ ] RPC permissions enforced
- [ ] Error messages don't expose sensitive info
- [ ] Admin override works (if admin)

**Pass/Fail**: ___________

---

## Regression Testing

### 13.8.1 Core Features Unaffected

**Steps:**
1. Test existing features:
   - User authentication
   - Listing creation/editing
   - Template system
   - Favorites
   - Search/filters
   - Admin panel

**Expected Results:**
- [ ] All existing features work as before
- [ ] No regressions introduced
- [ ] Data integrity maintained
- [ ] UI/UX consistent

**Pass/Fail**: ___________

---

### 13.8.2 Header Navigation

**Steps:**
1. Test header navigation with and without avatar
2. Test mobile hamburger menu

**Expected Results:**
- [ ] All header links work
- [ ] Avatar dropdown doesn't break menu
- [ ] Mobile menu still functional
- [ ] Sign out still works
- [ ] Admin link appears correctly (if admin)

**Pass/Fail**: ___________

---

## Final Checks

### 13.9.1 Database Migration Verification

**Steps:**
1. Check all new database objects exist
2. Verify RPC function signatures
3. Test RLS policies

**Expected Results:**
- [ ] `listing_transactions` table exists
- [ ] All new RPCs callable
- [ ] Indexes created
- [ ] Constraints enforced
- [ ] RLS policies active
- [ ] No migration errors

**Pass/Fail**: ___________

---

### 13.9.2 Production Build

**Steps:**
1. Run `npm run build`
2. Check build output
3. Test production build locally

**Expected Results:**
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] New routes compiled:
  - `/marketplace/[id]/chat` (184 KB)
  - `/marketplace/reservations` (159 KB)
- [ ] Bundle sizes acceptable
- [ ] Console logs removed in production

**Pass/Fail**: ___________

---

### 13.9.3 Documentation Review

**Steps:**
1. Review CHANGELOG.md
2. Review TODO.md
3. Review Sprint 13 summaries

**Expected Results:**
- [ ] CHANGELOG updated with Sprint 13
- [ ] TODO.md reflects Sprint 13 status
- [ ] Implementation summary complete
- [ ] Manual testing guide complete (this doc)
- [ ] All documentation accurate

**Pass/Fail**: ___________

---

## Test Summary

### Overall Statistics

- **Total Tests**: 75
- **Tests Passed**: _______
- **Tests Failed**: _______
- **Tests Skipped**: _______
- **Pass Rate**: _______%

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Blocker Issues (Must Fix Before Deployment)

- [ ] None found
- [ ] Issues listed below:
  1. _______________________________________________
  2. _______________________________________________

---

## Sign-Off

**Tester Name**: ___________________________
**Date**: ___________________________
**Approved for Deployment**: YES / NO

**Notes**:
_________________________________________________________
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

## Appendix A: Quick Smoke Test Checklist

Use this for rapid verification:

**Avatar System:**
- [ ] Preset avatar selection works
- [ ] Custom avatar upload works
- [ ] Header dropdown shows avatar
- [ ] Fallback displays correctly

**Chat System:**
- [ ] Buyer can send first message
- [ ] Seller sees message and can reply
- [ ] Realtime updates work
- [ ] Multiple conversations work

**Transaction Workflow:**
- [ ] Reservation RPC works
- [ ] Complete RPC works
- [ ] Cancel RPC works
- [ ] Reservations page loads

**Camera Capture:**
- [ ] Camera button appears
- [ ] Camera opens and captures
- [ ] Photo uploads successfully
- [ ] Fallback for unsupported devices

**General:**
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Build successful

**Quick Test Result**: PASS / FAIL

---

## Appendix B: Test Data Scripts

### Create Test Listing
```sql
INSERT INTO trade_listings (user_id, title, description, image_url, status)
VALUES (
  'user-a-uuid',
  'Cromo Messi - Mundial 2022',
  'Cromo en excelente estado',
  'https://example.com/image.jpg',
  'active'
);
```

### Create Test Reservation
```sql
SELECT reserve_listing(
  123, -- listing_id
  'user-b-uuid', -- buyer_id
  'Reserva de prueba'
);
```

### Send Test Chat Message
```sql
SELECT send_listing_message(
  123, -- listing_id
  'seller-uuid', -- receiver_id
  '¿Está disponible?'
);
```

### Check Transaction Status
```sql
SELECT * FROM listing_transactions
WHERE listing_id = 123;
```

---

## Appendix C: Common Issues & Solutions

### Issue: Camera doesn't open
**Solution**: Check browser permissions, try HTTPS, check getUserMedia support

### Issue: Chat messages don't appear in realtime
**Solution**: Check Supabase realtime is enabled, verify channel subscription, check network tab

### Issue: Avatar doesn't update immediately
**Solution**: Check cache, verify storage upload, refresh page

### Issue: Transaction RPC fails
**Solution**: Verify user permissions, check listing status, verify buyer is participant

---

## Appendix D: Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Avatar Upload | ✅ | ✅ | ✅ | ✅ |
| Avatar Presets | ✅ | ✅ | ✅ | ✅ |
| Chat Realtime | ✅ | ✅ | ✅ | ✅ |
| Camera Capture | ✅ | ✅ | ✅* | ✅ |
| WebP Images | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ✅ |

*Safari requires HTTPS for getUserMedia

---

**End of Manual Testing Guide - Sprint 13**
