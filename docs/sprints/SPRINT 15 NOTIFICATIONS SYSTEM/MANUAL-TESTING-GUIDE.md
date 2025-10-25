# Sprint 15: Manual Testing Guide

**Version**: 1.0
**Date**: October 25, 2025
**Sprint**: Sprint 15 - Notifications System

## Overview

This guide provides comprehensive manual testing procedures for the notifications system implemented in Sprint 15, including listing chats, reservations, completions, user ratings, and template ratings.

---

## Pre-Testing Setup

### Environment Preparation

1. **Apply database migrations:**
   ```bash
   supabase db push
   ```

2. **Clear browser cache and cookies**

3. **Test in multiple browsers:**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (if available)

4. **Test in different viewport sizes:**
   - Mobile (375px width)
   - Tablet (768px width)
   - Desktop (1920px width)

5. **Prepare test accounts:**
   - User A (seller with active listings)
   - User B (buyer account)
   - User C (template author)
   - User D (additional user for rating tests)

### Tools Needed

- Browser DevTools (Network tab, Console)
- Supabase Studio (for database verification)
- Multiple browser tabs (for testing realtime updates)
- Screenshot tool (for documentation)

### Database Verification

Before testing, verify migrations applied successfully:

```sql
-- Check notifications table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Should include: listing_id, template_id, rating_id, actor_id, payload

-- Check notification kinds constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_kind_check';

-- Should include: listing_chat, listing_reserved, listing_completed, user_rated, template_rated

-- Check new RPCs exist
SELECT proname FROM pg_proc WHERE proname IN (
  'mark_notification_read',
  'mark_listing_chat_notifications_read'
);

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notify_chat_message',
  'trigger_notify_user_rating',
  'trigger_notify_template_rating',
  'trigger_notify_listing_status_change'
);
```

---

## Test Suite 1: Notifications Infrastructure

### 1.1 Notification Dropdown in Header

**Test ID:** NT-01
**Priority:** High

**Steps:**
1. Log in as User A
2. Look at the header navigation
3. Locate the bell icon next to the user avatar
4. Click the bell icon

**Expected Results:**
- [ ] Bell icon visible in header (next to avatar dropdown)
- [ ] Bell icon shows badge with unread count (if notifications exist)
- [ ] Clicking bell opens dropdown menu
- [ ] Dropdown shows up to 5 most recent unread notifications
- [ ] Each notification shows: icon, title, body, timestamp
- [ ] "Ver todas las notificaciones" link present
- [ ] Dropdown auto-closes when clicking outside

**Pass/Fail**: ___________

---

### 1.2 Notifications Center Page

**Test ID:** NT-02
**Priority:** High

**Steps:**
1. Log in as User A
2. Navigate to `/profile/notifications`
3. Observe the page layout
4. Click between "Nuevas" and "Historial" tabs

**Expected Results:**
- [ ] Page loads successfully
- [ ] Page requires authentication (redirects to login if not authenticated)
- [ ] Hero section shows "Notificaciones" title
- [ ] "Marcar todas como leídas" button visible (if unread notifications exist)
- [ ] Two tabs present: "Nuevas" and "Historial"
- [ ] "Nuevas" tab shows badge with unread count
- [ ] Notifications grouped by category (Marketplace, Plantillas, Comunidad, Intercambios, Sistema)
- [ ] Each category has a section header
- [ ] Empty state shows when no notifications (bell icon + message)

**Pass/Fail**: ___________

---

## Test Suite 2: Listing Chat Notifications

### 2.1 Receiving Chat Notification

**Test ID:** LCN-01
**Priority:** High

**Prerequisites:**
- User A has an active listing (Listing #1)
- User B is logged in

**Steps:**
1. As User B, navigate to Listing #1
2. Click "Contactar vendedor" or open chat
3. Send a message: "Hola, ¿está disponible?"
4. **In another browser/tab**, log in as User A (listing owner)
5. Check the bell icon in header
6. Click bell icon to open dropdown
7. Navigate to `/profile/notifications`

**Expected Results:**
- [ ] User A's bell icon shows unread count (1)
- [ ] Dropdown shows notification with:
  - Title: "Nuevo mensaje"
  - Body: "{User B} te ha enviado un mensaje sobre '{Listing Title}'"
  - Icon: MessageSquare
  - Relative timestamp (e.g., "hace unos segundos")
- [ ] Notification appears in "Nuevas" tab
- [ ] Notification is in "Marketplace" category
- [ ] Notification has blue dot indicator
- [ ] Notification has blue accent border on left
- [ ] Clicking notification navigates to chat
- [ ] Quick action button says "Ir al chat"

**Pass/Fail**: ___________

---

### 2.2 Multiple Messages - Notification Deduplication

**Test ID:** LCN-02
**Priority:** High

**Prerequisites:**
- Continuing from LCN-01
- User A has NOT opened the chat yet

**Steps:**
1. As User B, send 3 more messages in the same chat
2. As User A, refresh notifications (check bell icon)
3. Navigate to notifications center

**Expected Results:**
- [ ] Bell icon still shows count of 1 (not 4)
- [ ] Only ONE notification for this listing chat
- [ ] Notification timestamp updated to latest message
- [ ] Opening notifications center shows single notification
- [ ] No duplicate notifications created

**Pass/Fail**: ___________

---

### 2.3 Marking Chat Notification as Read

**Test ID:** LCN-03
**Priority:** High

**Prerequisites:**
- Continuing from LCN-02
- User A has unread chat notification

**Steps:**
1. As User A, click the notification or navigate to the chat
2. View the conversation with User B
3. Check the bell icon
4. Navigate to `/profile/notifications`
5. Check "Nuevas" tab
6. Check "Historial" tab

**Expected Results:**
- [ ] After opening chat, notification marked as read
- [ ] Bell icon unread count decreases by 1
- [ ] Notification removed from "Nuevas" tab
- [ ] Notification appears in "Historial" tab
- [ ] Blue dot and accent border removed
- [ ] Notification timestamp shows when it was created

**Pass/Fail**: ___________

---

## Test Suite 3: Listing Reservation Notifications

### 3.1 Buyer Receives Reservation Notification

**Test ID:** LRN-01
**Priority:** High

**Prerequisites:**
- User A (seller) has Listing #2 with status "active"
- User B is logged in

**Steps:**
1. As User A (seller), navigate to Listing #2 detail page
2. In the seller actions, click "Reservar para comprador"
3. Select User B from the buyer dropdown
4. Set reservation until date (7 days from now)
5. Click "Reservar artículo"
6. **In another browser/tab**, log in as User B
7. Check bell icon and notifications

**Expected Results:**
- [ ] User B receives notification immediately
- [ ] Notification title: "Artículo reservado"
- [ ] Notification body: "{User A} ha reservado '{Listing Title}' para ti"
- [ ] Notification icon: ShoppingCart
- [ ] Notification category: Marketplace
- [ ] Notification links to listing detail page
- [ ] Quick action says "Ver detalles"
- [ ] Listing status shows as "reserved" on detail page

**Pass/Fail**: ___________

---

### 3.2 Seller Receives Reservation Confirmation

**Test ID:** LRN-02
**Priority:** Medium

**Prerequisites:**
- Continuing from LRN-01

**Steps:**
1. As User A (seller), check notifications after reservation
2. Look for reservation notification in notifications center

**Expected Results:**
- [ ] User A (seller) also receives notification
- [ ] Notification body includes "Has reservado '{Listing Title}' para {User B}"
- [ ] Notification marked with `is_seller: true` in payload
- [ ] Notification appears in Marketplace category

**Pass/Fail**: ___________

---

## Test Suite 4: Listing Completion Notifications

### 4.1 Transaction Completion Notifications

**Test ID:** LCN-01
**Priority:** High

**Prerequisites:**
- Listing #2 is reserved for User B
- User A is the seller

**Steps:**
1. As User A, navigate to Listing #2
2. Click "Completar transacción"
3. Confirm the action
4. **In another browser/tab**, log in as User B
5. Check notifications

**Expected Results:**
- [ ] User B receives completion notification
- [ ] Notification title: "Transacción completada"
- [ ] Notification body: "Tu compra de '{Listing Title}' se ha completado"
- [ ] User A also receives completion notification
- [ ] User A's notification body: "La transacción de '{Listing Title}' se ha completado"
- [ ] Both notifications link to listing detail page
- [ ] Listing status shows as "completed"

**Pass/Fail**: ___________

---

## Test Suite 5: User Rating Notifications

### 5.1 Receiving User Rating Notification

**Test ID:** URN-01
**Priority:** High

**Prerequisites:**
- User A and User B completed a transaction (Listing #2)
- User B has not rated User A yet

**Steps:**
1. As User B, navigate to Listing #2
2. In the rating section, click "Valorar vendedor"
3. Select 5 stars
4. Add comment: "Excelente vendedor, muy recomendado"
5. Submit rating
6. **In another browser/tab**, log in as User A
7. Check notifications

**Expected Results:**
- [ ] User A receives rating notification immediately
- [ ] Notification title: "Nueva valoración recibida"
- [ ] Notification body: "{User B} te ha valorado con ⭐⭐⭐⭐⭐ (5/5)"
- [ ] Notification icon: Star
- [ ] Notification category: Community
- [ ] Notification links to listing detail page
- [ ] Rating visible on User A's profile

**Pass/Fail**: ___________

---

### 5.2 Different Rating Values

**Test ID:** URN-02
**Priority:** Medium

**Steps:**
1. As User A, rate User B with 3 stars
2. As User B, check notifications

**Expected Results:**
- [ ] User B receives notification
- [ ] Notification shows 3 stars: "⭐⭐⭐ (3/5)"
- [ ] Star count matches rating value

**Pass/Fail**: ___________

---

## Test Suite 6: Template Rating Notifications

### 6.1 Template Author Receives Rating

**Test ID:** TRN-01
**Priority:** High

**Prerequisites:**
- User C created a public template (Template #1)
- User B is logged in

**Steps:**
1. As User B, navigate to `/templates/{Template #1}`
2. In the template detail page, find rating section
3. Click "Valorar plantilla"
4. Select 4 stars
5. Add comment: "Muy útil, gracias"
6. Submit rating
7. **In another browser/tab**, log in as User C
8. Check notifications

**Expected Results:**
- [ ] User C receives template rating notification
- [ ] Notification title: "Valoración de plantilla"
- [ ] Notification body: "{User B} ha valorado tu plantilla '{Template Name}' con ⭐⭐⭐⭐ (4/5)"
- [ ] Notification icon: Star
- [ ] Notification category: Templates
- [ ] Notification links to template detail page
- [ ] Rating visible on template page

**Pass/Fail**: ___________

---

### 6.2 No Self-Rating Notification

**Test ID:** TRN-02
**Priority:** Medium

**Prerequisites:**
- User C is the author of Template #1

**Steps:**
1. As User C, navigate to Template #1
2. Attempt to rate your own template
3. Check notifications

**Expected Results:**
- [ ] System prevents self-rating (UI disabled or error shown)
- [ ] OR if allowed, no notification created for self-rating
- [ ] No notification appears in User C's notifications

**Pass/Fail**: ___________

---

## Test Suite 7: Realtime Updates

### 7.1 Realtime Notification Delivery

**Test ID:** RT-01
**Priority:** High

**Setup:**
1. Open two browser windows side-by-side
2. Window 1: User A logged in at `/profile/notifications`
3. Window 2: User B logged in

**Steps:**
1. In Window 2 (User B), send a chat message to User A's listing
2. **WITHOUT REFRESHING**, observe Window 1 (User A)

**Expected Results:**
- [ ] Notification appears in Window 1 within 2-3 seconds
- [ ] Bell icon count updates automatically
- [ ] "Nuevas" tab count updates
- [ ] Notification appears in the list without manual refresh
- [ ] No error in browser console

**Pass/Fail**: ___________

---

### 7.2 Realtime Read Status Update

**Test ID:** RT-02
**Priority:** Medium

**Setup:**
1. User A has 3 unread notifications
2. Open two browser tabs as User A
3. Tab 1: `/profile/notifications`
4. Tab 2: Home page with bell icon visible

**Steps:**
1. In Tab 1, click "Marcar todas como leídas"
2. Observe Tab 2 bell icon

**Expected Results:**
- [ ] Tab 1 shows all notifications moved to "Historial"
- [ ] Tab 2 bell icon badge updates to 0
- [ ] Both tabs show consistent state
- [ ] Update happens within 2-3 seconds

**Pass/Fail**: ___________

---

## Test Suite 8: Mark as Read Actions

### 8.1 Mark Single Notification as Read

**Test ID:** MAR-01
**Priority:** High

**Prerequisites:**
- User A has 3 unread notifications

**Steps:**
1. As User A, navigate to `/profile/notifications`
2. In "Nuevas" tab, click on the middle notification
3. Click the notification card (if it has a link)
4. Return to notifications page

**Expected Results:**
- [ ] Clicked notification marked as read
- [ ] Blue dot indicator removed
- [ ] Accent border removed
- [ ] Notification removed from "Nuevas"
- [ ] Notification appears in "Historial"
- [ ] Unread count decreases by 1
- [ ] Other notifications remain unread

**Pass/Fail**: ___________

---

### 8.2 Mark All Notifications as Read

**Test ID:** MAR-02
**Priority:** High

**Prerequisites:**
- User A has 5+ unread notifications

**Steps:**
1. As User A, navigate to `/profile/notifications`
2. Note the unread count
3. Click "Marcar todas como leídas" button
4. Observe the UI changes

**Expected Results:**
- [ ] All notifications marked as read instantly
- [ ] "Nuevas" tab shows empty state
- [ ] "Historial" tab shows all previous notifications
- [ ] Bell icon count becomes 0
- [ ] Button disappears or becomes disabled
- [ ] No errors in console

**Pass/Fail**: ___________

---

## Test Suite 9: UI/UX and Accessibility

### 9.1 Empty States

**Test ID:** UX-01
**Priority:** Medium

**Steps:**
1. Create a new test user with no activity
2. Navigate to `/profile/notifications`
3. Check "Nuevas" tab
4. Check "Historial" tab

**Expected Results:**
- [ ] "Nuevas" empty state shows:
  - Bell icon (grayed out)
  - Message: "No hay notificaciones nuevas"
  - Subtext: "Estás al día con todas tus actividades"
- [ ] "Historial" empty state shows:
  - Inbox icon
  - Message: "No hay notificaciones leídas"
  - Subtext explaining historial purpose
- [ ] Both empty states are centered and well-styled

**Pass/Fail**: ___________

---

### 9.2 Notification Categorization

**Test ID:** UX-02
**Priority:** Medium

**Prerequisites:**
- User A has notifications of different types:
  - 1 listing chat
  - 1 listing reserved
  - 1 user rating
  - 1 template rating
  - 1 trade proposal (legacy)

**Steps:**
1. As User A, navigate to `/profile/notifications`
2. Check "Nuevas" tab
3. Observe category sections

**Expected Results:**
- [ ] Notifications grouped into sections:
  - **Marketplace**: listing_chat, listing_reserved, listing_completed
  - **Plantillas**: template_rated
  - **Comunidad**: user_rated
  - **Intercambios**: chat_unread, proposal_accepted, etc.
  - **Sistema**: admin_action
- [ ] Each section has a header with category name
- [ ] Sections only appear if they have notifications
- [ ] Categories appear in consistent order

**Pass/Fail**: ___________

---

### 9.3 Relative Timestamps

**Test ID:** UX-03
**Priority:** Low

**Steps:**
1. Create notifications at different times (manually or via database)
2. Check notifications center
3. Verify timestamp formatting

**Expected Results:**
- [ ] Recent (<1 min): "hace unos segundos"
- [ ] Minutes: "hace 5 minutos"
- [ ] Hours: "hace 2 horas"
- [ ] Days: "hace 3 días"
- [ ] Weeks: "hace 2 semanas"
- [ ] Months: "hace 1 mes"
- [ ] All timestamps in Spanish
- [ ] Singular/plural forms correct

**Pass/Fail**: ___________

---

### 9.4 Keyboard Navigation

**Test ID:** A11Y-01
**Priority:** Medium

**Steps:**
1. Navigate to `/profile/notifications`
2. Use only keyboard (Tab, Enter, Space, Arrow keys)
3. Try to:
   - Switch between tabs
   - Navigate through notifications
   - Click notification links
   - Trigger "Marcar todas como leídas"

**Expected Results:**
- [ ] All interactive elements reachable via Tab
- [ ] Focus indicators visible on all elements
- [ ] Enter/Space activates buttons and links
- [ ] Tab order is logical (top to bottom)
- [ ] No keyboard traps
- [ ] Escape key closes dropdown (if applicable)

**Pass/Fail**: ___________

---

## Test Suite 10: Error Handling

### 10.1 Network Failure Handling

**Test ID:** ERR-01
**Priority:** Medium

**Steps:**
1. Open DevTools Network tab
2. Navigate to `/profile/notifications`
3. Set network to "Offline"
4. Try to refresh notifications
5. Try to mark notification as read
6. Restore network connection

**Expected Results:**
- [ ] Error message displayed when fetch fails
- [ ] Error message is user-friendly (Spanish)
- [ ] UI doesn't crash or show blank screen
- [ ] Loading states resolve appropriately
- [ ] When network restored, data reloads successfully
- [ ] No duplicate notifications after reload

**Pass/Fail**: ___________

---

### 10.2 Permission Errors

**Test ID:** ERR-02
**Priority:** Low

**Steps:**
1. Log in as User A
2. Open browser console
3. Manually try to mark another user's notification as read (via API)

**Expected Results:**
- [ ] RPC call rejected by RLS policy
- [ ] Error message in console (expected)
- [ ] UI doesn't show other users' notifications
- [ ] No security vulnerabilities exposed

**Pass/Fail**: ___________

---

## Test Suite 11: Mobile Responsiveness

### 11.1 Mobile Notifications Center

**Test ID:** MOB-01
**Priority:** High

**Steps:**
1. Open site on mobile device (or use Chrome DevTools device emulation)
2. Set viewport to 375px width
3. Navigate to `/profile/notifications`
4. Interact with tabs and notifications

**Expected Results:**
- [ ] Page layout adapts to mobile width
- [ ] Tabs are full-width and touch-friendly
- [ ] Notification cards stack vertically
- [ ] Text is readable without zooming
- [ ] Buttons are large enough for touch (min 44x44px)
- [ ] No horizontal scrolling required
- [ ] Quick action buttons visible and accessible

**Pass/Fail**: ___________

---

### 11.2 Mobile Dropdown

**Test ID:** MOB-02
**Priority:** Medium

**Steps:**
1. On mobile device/emulator
2. Open hamburger menu
3. Check for notifications access

**Expected Results:**
- [ ] Bell icon visible in mobile menu or header
- [ ] Unread badge shows on mobile
- [ ] Tapping bell navigates to `/profile/notifications`
- [ ] OR dropdown works on mobile (if implemented)

**Pass/Fail**: ___________

---

## Test Suite 12: Edge Cases

### 12.1 Suspended Listing Notification

**Test ID:** EDGE-01
**Priority:** Medium

**Prerequisites:**
- User A has notification for Listing #3
- Admin suspends Listing #3

**Steps:**
1. As admin, suspend Listing #3
2. As User A, view notifications
3. Click notification for suspended listing

**Expected Results:**
- [ ] Notification shows "Suspendido" badge
- [ ] Clicking notification navigates to listing (or shows suspended message)
- [ ] Notification body mentions listing title even if suspended
- [ ] No crash or blank page

**Pass/Fail**: ___________

---

### 12.2 Deleted User Notification

**Test ID:** EDGE-02
**Priority:** Low

**Prerequisites:**
- User A has notification from User B
- User B's account is deleted

**Steps:**
1. Delete User B's account (via Supabase Studio)
2. As User A, view notifications

**Expected Results:**
- [ ] Notification still displays
- [ ] Actor name shows "Usuario desconocido" or similar fallback
- [ ] No avatar or default avatar shown
- [ ] No crash or errors
- [ ] Notification can still be marked as read

**Pass/Fail**: ___________

---

## Test Suite 13: Performance

### 13.1 Large Notification List

**Test ID:** PERF-01
**Priority:** Low

**Prerequisites:**
- User A has 100+ notifications (create via script or manual testing)

**Steps:**
1. As User A, navigate to `/profile/notifications`
2. Check "Historial" tab
3. Scroll through notifications

**Expected Results:**
- [ ] Page loads in <3 seconds
- [ ] Scrolling is smooth (no jank)
- [ ] All notifications render correctly
- [ ] No memory leaks (check DevTools Performance)
- [ ] Database query is efficient (check Supabase logs)

**Pass/Fail**: ___________

---

## Regression Testing

### Legacy Trade Notifications

**Test ID:** REG-01
**Priority:** High

**Steps:**
1. Create a trade proposal (legacy feature)
2. Send chat messages in trade
3. Accept/reject proposal
4. Check notifications

**Expected Results:**
- [ ] Legacy trade notifications still work
- [ ] `chat_unread`, `proposal_accepted`, `proposal_rejected` kinds supported
- [ ] Notifications appear in "Intercambios" category
- [ ] No breaking changes to existing functionality

**Pass/Fail**: ___________

---

## Summary Checklist

After completing all test suites, verify:

- [ ] All database migrations applied successfully
- [ ] All trigger functions working as expected
- [ ] Realtime subscriptions active and performant
- [ ] No console errors or warnings
- [ ] All notification kinds tested
- [ ] Mark as read functionality working
- [ ] UI is responsive and accessible
- [ ] Error handling graceful
- [ ] Performance acceptable
- [ ] No regressions in existing features

---

## Known Issues

Document any known issues discovered during testing:

1. **Issue**: [Description]
   - **Severity**: [Critical/High/Medium/Low]
   - **Steps to Reproduce**: [...]
   - **Expected**: [...]
   - **Actual**: [...]

---

## Test Environment

- **Date Tested**: ___________
- **Tester**: ___________
- **Browser**: ___________
- **OS**: ___________
- **Database Version**: ___________
- **Application Version**: v1.5.0

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Ready for production deployment

**Tester Signature**: ___________________ **Date**: ___________
