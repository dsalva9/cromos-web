# Sprint 11 Phase 1 - Manual Testing Guide

## 📋 Overview

This guide provides step-by-step manual tests to verify all Phase 1 admin features are working correctly.

**Test Environment:** Local development (`npm run dev`)
**Required:** Admin user account with `is_admin = true` in profiles table

---

## 🔧 Pre-Test Setup

### 1. Verify Admin User Exists

```sql
-- Run in Supabase SQL Editor
SELECT id, email, nickname, is_admin, is_suspended
FROM profiles
WHERE is_admin = true;
```

**Expected:** At least one user with `is_admin = true`

### 2. If No Admin Exists, Create One

```sql
-- Replace with your actual user ID
UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@example.com';
```

### 3. Create Test Data (Optional)

```sql
-- Create a test report
INSERT INTO reports (reporter_id, entity_type, entity_id, reason, description)
VALUES (
  'your-user-id',  -- Replace with actual user ID
  'listing',
  '123',
  'spam',
  'This is a test report for manual testing'
);

-- Verify report was created
SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5;
```

---

## 🧪 Test Suite

### Test 1: Admin Access Control

**Objective:** Verify AdminGuard protects admin routes

#### Test 1.1: Access as Non-Admin

1. **Setup:** Log in with a non-admin user
2. **Action:** Navigate to `/admin/dashboard`
3. **Expected Result:**
   - ✅ See "Access Denied" page
   - ✅ Red warning icon displayed
   - ✅ Message: "Admin access required"
   - ✅ "Volver al Inicio" button visible
4. **Action:** Click "Volver al Inicio"
5. **Expected Result:**
   - ✅ Redirected to homepage

#### Test 1.2: Access Without Login

1. **Setup:** Log out (or use incognito window)
2. **Action:** Navigate to `/admin/dashboard`
3. **Expected Result:**
   - ✅ Redirected to `/login`
   - ✅ Toast message: "You must be logged in"

#### Test 1.3: Access as Admin

1. **Setup:** Log in with admin user
2. **Action:** Navigate to `/admin/dashboard`
3. **Expected Result:**
   - ✅ Dashboard loads successfully
   - ✅ Statistics cards visible
   - ✅ No access denied message

---

### Test 2: Admin Link in Navigation

**Objective:** Verify admin link visibility and functionality

#### Test 2.1: Admin Link Visible for Admins

1. **Setup:** Log in as admin user
2. **Action:** Check site header navigation
3. **Expected Result:**
   - ✅ "Admin" link visible in navigation menu
   - ✅ Link appears before "Perfil" link
   - ✅ Link not visible in mobile menu when collapsed

4. **Action:** Click "Admin" link
5. **Expected Result:**
   - ✅ Redirected to `/admin/dashboard`

#### Test 2.2: Admin Link Hidden for Non-Admins

1. **Setup:** Log in as non-admin user
2. **Action:** Check site header navigation
3. **Expected Result:**
   - ✅ "Admin" link NOT visible
   - ✅ Only regular navigation links shown

#### Test 2.3: Admin Link Hidden When Logged Out

1. **Setup:** Log out
2. **Action:** Check site header navigation
3. **Expected Result:**
   - ✅ "Admin" link NOT visible
   - ✅ Only public links shown

---

### Test 3: Admin Dashboard

**Objective:** Verify dashboard displays correct statistics

#### Test 3.1: Dashboard Loading State

1. **Setup:** Log in as admin
2. **Action:** Navigate to `/admin/dashboard`
3. **Expected Result:**
   - ✅ Loading spinner appears briefly
   - ✅ Spinner is yellow (#FFC000)
   - ✅ Spinner disappears when data loads

#### Test 3.2: Statistics Cards Display

1. **Action:** Wait for dashboard to load
2. **Expected Result:** 8 statistics cards visible:
   - ✅ **Total Users** (Users icon, yellow)
   - ✅ **Active Users (30d)** (TrendingUp icon, green)
   - ✅ **Pending Reports** (AlertTriangle icon, red if > 0, gray if 0)
   - ✅ **Active Listings** (Package icon, blue)
   - ✅ **Public Templates** (FileText icon, purple)
   - ✅ **Completed Trades (30d)** (CheckCircle icon, green)
   - ✅ **Admin Actions (30d)** (AlertTriangle icon, orange)
   - ✅ **Suspended Users** (visible in main grid)

#### Test 3.3: Statistics Values

1. **Action:** Check each card shows a number
2. **Expected Result:**
   - ✅ All cards display numeric values (not "undefined" or "null")
   - ✅ Numbers are formatted correctly (no decimals)

#### Test 3.4: Suspended Users Alert

1. **Setup:** If no suspended users exist, suspend one:
   ```sql
   UPDATE profiles
   SET is_suspended = true
   WHERE id = 'some-user-id';
   ```

2. **Action:** Refresh dashboard
3. **Expected Result:**
   - ✅ Red alert banner appears at bottom
   - ✅ Shows count: "X suspended user(s)"
   - ✅ Message: "Review suspended accounts in the Users tab"
   - ✅ Red border and background
   - ✅ AlertTriangle icon in red

4. **Setup:** Unsuspend all users:
   ```sql
   UPDATE profiles SET is_suspended = false;
   ```

5. **Action:** Refresh dashboard
6. **Expected Result:**
   - ✅ Alert banner NOT visible

#### Test 3.5: Error Handling

1. **Setup:** Simulate RPC error (disconnect internet or use DevTools to block network)
2. **Action:** Refresh dashboard
3. **Expected Result:**
   - ✅ Error message displayed
   - ✅ "Failed to load dashboard" text
   - ✅ Error details shown

#### Test 3.6: Responsive Design

1. **Action:** Resize browser window to mobile size (< 768px)
2. **Expected Result:**
   - ✅ Cards stack in single column
   - ✅ All content readable
   - ✅ No horizontal scroll

2. **Action:** Resize to tablet size (768px - 1024px)
3. **Expected Result:**
   - ✅ Cards in 2-column grid
   - ✅ Layout looks good

3. **Action:** Resize to desktop size (> 1024px)
4. **Expected Result:**
   - ✅ Top row: 4 cards
   - ✅ Bottom row: 3 cards
   - ✅ Professional spacing

---

### Test 4: Admin Navigation Layout

**Objective:** Verify tab navigation works correctly

#### Test 4.1: Tab Navigation Display

1. **Setup:** Navigate to `/admin/dashboard`
2. **Expected Result:**
   - ✅ 4 tabs visible: Dashboard, Reports, Users, Audit Log
   - ✅ Each tab has an icon
   - ✅ Dashboard tab is highlighted (yellow background)
   - ✅ Other tabs are gray

#### Test 4.2: Tab Switching

1. **Action:** Click "Reports" tab
2. **Expected Result:**
   - ✅ URL changes to `/admin/reports`
   - ✅ Reports tab now highlighted
   - ✅ Dashboard tab no longer highlighted
   - ✅ Reports page content loads

2. **Action:** Click "Dashboard" tab
3. **Expected Result:**
   - ✅ URL changes to `/admin/dashboard`
   - ✅ Dashboard tab highlighted again
   - ✅ Dashboard content loads

#### Test 4.3: Direct URL Access

1. **Action:** Navigate directly to `/admin/reports` in address bar
2. **Expected Result:**
   - ✅ Reports page loads
   - ✅ Reports tab is highlighted
   - ✅ Layout and tabs are visible

#### Test 4.4: Placeholder Pages

1. **Action:** Click "Users" tab
2. **Expected Result:**
   - ✅ URL changes to `/admin/users`
   - ✅ Users tab highlighted
   - ✅ Placeholder or 404 page (Phase 2 not implemented yet)

2. **Action:** Click "Audit Log" tab
3. **Expected Result:**
   - ✅ URL changes to `/admin/audit`
   - ✅ Audit Log tab highlighted
   - ✅ Placeholder or 404 page (Phase 2 not implemented yet)

#### Test 4.5: Admin Panel Header

1. **Action:** Check header on any admin page
2. **Expected Result:**
   - ✅ "Admin Panel" title in white
   - ✅ Subtitle: "Platform management and moderation"
   - ✅ Dark background (#111827)
   - ✅ Black border at bottom

---

### Test 5: Reports Queue (Empty State)

**Objective:** Verify empty state when no reports exist

#### Test 5.1: No Reports Available

1. **Setup:** Ensure no pending reports:
   ```sql
   UPDATE reports SET status = 'resolved' WHERE status = 'pending';
   ```

2. **Action:** Navigate to `/admin/reports`
3. **Expected Result:**
   - ✅ Empty state displayed
   - ✅ Gray AlertTriangle icon (large)
   - ✅ Message: "No pending reports"
   - ✅ Subtitle: "All caught up!" (without emoji if not wanted)
   - ✅ No report cards visible

---

### Test 6: Reports Queue (With Reports)

**Objective:** Verify reports list displays correctly

#### Test 6.1: Reports List Display

1. **Setup:** Create test reports:
   ```sql
   -- Insert test reports of different types
   INSERT INTO reports (reporter_id, entity_type, entity_id, reason, description) VALUES
   ((SELECT id FROM profiles LIMIT 1), 'user', '123', 'spam', 'Spamming the marketplace'),
   ((SELECT id FROM profiles LIMIT 1), 'listing', '456', 'inappropriate', 'Inappropriate listing'),
   ((SELECT id FROM profiles LIMIT 1), 'template', '789', 'scam', NULL);
   ```

2. **Action:** Navigate to `/admin/reports`
3. **Expected Result:**
   - ✅ List of report cards displayed
   - ✅ Reports sorted by newest first
   - ✅ Each card shows:
     - ✅ AlertTriangle icon (red)
     - ✅ Entity type badge (color-coded)
     - ✅ Reason badge
     - ✅ Reporter nickname
     - ✅ Timestamp
     - ✅ Description (if provided)
     - ✅ Entity ID
     - ✅ "Review Report" button (yellow)

#### Test 6.2: Entity Type Badge Colors

1. **Action:** Check badge colors for different entity types
2. **Expected Result:**
   - ✅ User reports: Red badge
   - ✅ Listing reports: Blue badge
   - ✅ Template reports: Purple badge
   - ✅ Chat reports: Green badge

#### Test 6.3: Report Card Interaction

1. **Action:** Hover over "Review Report" button
2. **Expected Result:**
   - ✅ Button changes to lighter yellow (#FFD700)
   - ✅ Cursor changes to pointer

---

### Test 7: Report Detail Modal

**Objective:** Verify report detail modal displays and functions correctly

#### Test 7.1: Modal Opening

1. **Setup:** Have at least one pending report
2. **Action:** Click "Review Report" on any report card
3. **Expected Result:**
   - ✅ Modal opens with dark overlay
   - ✅ Modal has dark background (#1F2937)
   - ✅ Black border around modal
   - ✅ "Report Details" title with AlertTriangle icon
   - ✅ Scrollbar if content is long

#### Test 7.2: Modal Content - Report Info

1. **Expected Result:**
   - ✅ Entity type badge displayed
   - ✅ Reason badge displayed
   - ✅ "Reported by [nickname] on [date]" text
   - ✅ Description shown (if exists)
   - ✅ Description in gray box with dark background

#### Test 7.3: Modal Content - Entity Details (User Report)

1. **Setup:** Create a user report
2. **Action:** Open report detail modal
3. **Expected Result:**
   - ✅ "Reported Content" section visible
   - ✅ User nickname displayed
   - ✅ User email displayed
   - ✅ User rating displayed with ⭐
   - ✅ "Suspended" badge if user is suspended

#### Test 7.4: Modal Content - Entity Details (Listing Report)

1. **Setup:** Create a listing report
2. **Action:** Open report detail modal
3. **Expected Result:**
   - ✅ Listing title displayed
   - ✅ Listing description displayed (if exists)
   - ✅ Listing status displayed
   - ✅ Listing owner nickname displayed

#### Test 7.5: Modal Content - Entity Details (Template Report)

1. **Setup:** Create a template report
2. **Action:** Open report detail modal
3. **Expected Result:**
   - ✅ Template title displayed
   - ✅ Template author nickname displayed
   - ✅ Template rating displayed with ⭐
   - ✅ Public/Private status displayed

#### Test 7.6: Modal Content - User History

1. **Expected Result:**
   - ✅ "User History" section visible
   - ✅ Grid layout with 4 metrics:
     - ✅ Total Reports Received
     - ✅ Total Listings
     - ✅ Templates Created
     - ✅ Rating Average
   - ✅ All values displayed correctly

#### Test 7.7: Admin Notes Field

1. **Action:** Check admin notes textarea
2. **Expected Result:**
   - ✅ Textarea visible with label "Admin Notes (Required)"
   - ✅ Placeholder text: "Explain your decision..."
   - ✅ Dark background (#374151)
   - ✅ White text
   - ✅ 3 rows tall

2. **Action:** Type some text in admin notes
3. **Expected Result:**
   - ✅ Text appears as you type
   - ✅ Textarea expands if needed
   - ✅ Text is readable (white on dark)

#### Test 7.8: Action Buttons - Initial State

1. **Expected Result:**
   - ✅ 3 action buttons visible:
     - ✅ "Dismiss Report" (outline style)
     - ✅ "Remove Content" (orange)
     - ✅ "Suspend User" (red)
   - ✅ All buttons have icons
   - ✅ All buttons are DISABLED (gray/inactive)

2. **Action:** Enter text in admin notes
3. **Expected Result:**
   - ✅ All buttons become ENABLED

#### Test 7.9: Action Buttons - Confirmation Flow

1. **Setup:** Enter text in admin notes
2. **Action:** Click "Dismiss Report" once
3. **Expected Result:**
   - ✅ Button text changes to "Click again to confirm"
   - ✅ Button still enabled
   - ✅ No action taken yet

2. **Action:** Click "Dismiss Report" again
3. **Expected Result:**
   - ✅ Toast message: "Report resolved successfully"
   - ✅ Modal closes
   - ✅ Reports list refreshes
   - ✅ Report removed from list

#### Test 7.10: Action Buttons - Remove Content

1. **Setup:** Open a report, enter admin notes
2. **Action:** Click "Remove Content" twice
3. **Expected Result:**
   - ✅ First click: "Click again to confirm"
   - ✅ Second click: Report resolved
   - ✅ Toast success message
   - ✅ Modal closes

#### Test 7.11: Action Buttons - Suspend User

1. **Setup:** Open a user report, enter admin notes
2. **Action:** Click "Suspend User" twice
3. **Expected Result:**
   - ✅ First click: "Click again to confirm"
   - ✅ Second click: Report resolved
   - ✅ Toast success message
   - ✅ Modal closes
   - ✅ User is suspended in database

#### Test 7.12: Validation - Empty Admin Notes

1. **Setup:** Open a report, leave admin notes EMPTY
2. **Action:** Click any action button
3. **Expected Result:**
   - ✅ Buttons are disabled
   - ✅ Cannot click
   - ✅ No action taken

2. **Action:** Type one character in admin notes, then delete it
3. **Expected Result:**
   - ✅ Buttons remain disabled
   - ✅ Whitespace-only notes not accepted

#### Test 7.13: Modal Closing

1. **Action:** Click outside the modal (on dark overlay)
2. **Expected Result:**
   - ✅ Modal closes
   - ✅ Returns to reports list

2. **Action:** Open modal again, press ESC key
3. **Expected Result:**
   - ✅ Modal closes

#### Test 7.14: Loading State

1. **Setup:** Open modal, enter admin notes
2. **Action:** Throttle network in DevTools, click action button twice
3. **Expected Result:**
   - ✅ Buttons become disabled during processing
   - ✅ Loading state visible (if implemented)
   - ✅ Cannot click buttons multiple times

#### Test 7.15: Error Handling

1. **Setup:** Disconnect internet or block network request
2. **Action:** Try to resolve a report
3. **Expected Result:**
   - ✅ Toast error message: "Failed to resolve report"
   - ✅ Modal remains open
   - ✅ Can retry

---

### Test 8: Integration Tests

**Objective:** Verify end-to-end workflows

#### Test 8.1: Complete Moderation Workflow

1. **Action:** Log in as admin → Navigate to dashboard
2. **Expected Result:**
   - ✅ See pending reports count > 0

2. **Action:** Click "Reports" tab
3. **Expected Result:**
   - ✅ See list of pending reports

3. **Action:** Click "Review Report" on first report
4. **Expected Result:**
   - ✅ Modal opens with full context

4. **Action:** Read report details, enter admin notes, resolve report
5. **Expected Result:**
   - ✅ Report resolved successfully
   - ✅ Removed from list

5. **Action:** Go back to Dashboard
6. **Expected Result:**
   - ✅ Pending reports count decreased by 1
   - ✅ Admin actions count increased by 1

#### Test 8.2: Multi-Tab Navigation

1. **Action:** Dashboard → Reports → Dashboard → Reports
2. **Expected Result:**
   - ✅ All transitions smooth
   - ✅ Data persists
   - ✅ No errors in console
   - ✅ Active tab always correct

#### Test 8.3: Refresh Behavior

1. **Action:** On dashboard, refresh page (F5)
2. **Expected Result:**
   - ✅ Dashboard loads again
   - ✅ Data refreshes from server
   - ✅ Still on dashboard tab

2. **Action:** On reports page, refresh page
3. **Expected Result:**
   - ✅ Reports list loads again
   - ✅ Still on reports tab

#### Test 8.4: Browser Back/Forward

1. **Action:** Dashboard → Reports → Browser Back button
2. **Expected Result:**
   - ✅ Returns to dashboard
   - ✅ Dashboard tab highlighted

2. **Action:** Browser Forward button
3. **Expected Result:**
   - ✅ Returns to reports
   - ✅ Reports tab highlighted

---

## 🐛 Common Issues to Watch For

### Issue 1: AdminGuard Infinite Loop
- **Symptom:** Page keeps refreshing
- **Check:** Console for errors about `useEffect` dependencies

### Issue 2: Modal Not Closing
- **Symptom:** Modal stays open after action
- **Check:** Network errors, onResolved callback

### Issue 3: Statistics Not Loading
- **Symptom:** Loading spinner forever
- **Check:** RPC `get_admin_stats` exists and has correct permissions

### Issue 4: Reports Not Appearing
- **Symptom:** Empty state when reports should exist
- **Check:**
  - RPC `list_pending_reports` exists
  - Reports have `status = 'pending'`
  - RLS policies allow admin access

### Issue 5: Action Buttons Not Working
- **Symptom:** Clicking resolve does nothing
- **Check:**
  - Admin notes entered
  - RPC `resolve_report` exists
  - Network tab for errors

---

## ✅ Test Completion Checklist

After running all tests, verify:

- [ ] Admin access control works correctly
- [ ] Non-admins cannot access admin pages
- [ ] Admin link visible only to admins
- [ ] Dashboard displays all 8 statistics
- [ ] Suspended users alert appears when needed
- [ ] Tab navigation works on all pages
- [ ] Reports list displays correctly
- [ ] Empty state shows when no reports
- [ ] Report detail modal opens and displays all info
- [ ] All 3 action types work (dismiss, remove, suspend)
- [ ] Confirmation prompts work
- [ ] Admin notes validation works
- [ ] Modal closes properly
- [ ] Toast notifications appear
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] No console errors during normal usage
- [ ] Browser back/forward buttons work
- [ ] Page refresh maintains state

---

## 📊 Test Results Template

Copy this template to record your test results:

```
# Sprint 11 Phase 1 Test Results

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** Local / Staging / Production

## Summary
- Tests Run: X
- Tests Passed: X
- Tests Failed: X
- Issues Found: X

## Failed Tests
1. [Test Name] - [Issue Description]
2. ...

## Issues Found
1. **[Issue Title]**
   - Severity: Critical / High / Medium / Low
   - Description: ...
   - Steps to Reproduce: ...
   - Expected: ...
   - Actual: ...

## Notes
- ...

## Sign-off
All critical functionality tested and working: ✅ / ❌
Ready for Phase 2: ✅ / ❌
```

---

## 🚀 Ready to Test!

Start with Test 1 (Admin Access Control) and work through sequentially. Each test builds on the previous ones.

**Estimated Testing Time:** 45-60 minutes for complete suite

Good luck! 🎯
