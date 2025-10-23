# Sprint 11 Complete - Manual Testing Guide

## 📋 Overview

This guide provides step-by-step manual tests to verify all Sprint 11 admin features (Phase 1 + Phase 2) are working correctly.

**Test Environment:** Local development (`npm run dev`)
**Required:** Admin user account with `is_admin = true` in profiles table

**What's Tested:**
- ✅ Admin Dashboard (Phase 1)
- ✅ Reports Queue (Phase 1)
- ✅ Admin Navigation (Phase 1)
- ✅ User Search (Phase 2)
- ✅ Audit Log Viewer (Phase 2)

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

### 3. Create Test Data

```sql
-- Create test users for search
INSERT INTO profiles (id, email, nickname, is_admin, is_suspended)
VALUES
  (gen_random_uuid(), 'test1@example.com', 'TestUser1', false, false),
  (gen_random_uuid(), 'test2@example.com', 'TestUser2', false, false),
  (gen_random_uuid(), 'suspended@example.com', 'SuspendedUser', false, true);

-- Create a test report
INSERT INTO reports (reporter_id, entity_type, entity_id, reason, description)
VALUES (
  (SELECT id FROM profiles WHERE is_admin = true LIMIT 1),
  'listing',
  '123',
  'spam',
  'This is a test report for manual testing'
);

-- Create test audit log entries (if admin_actions table exists)
-- These will be created automatically when you perform actions

-- Verify data was created
SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5;
SELECT id, nickname, is_admin, is_suspended FROM profiles ORDER BY created_at DESC LIMIT 10;
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

#### Test 1.4: Access to All Admin Pages

1. **Setup:** Logged in as admin
2. **Action:** Try accessing each admin page directly:
   - `/admin/dashboard`
   - `/admin/reports`
   - `/admin/users`
   - `/admin/audit`
3. **Expected Result:**
   - ✅ All pages load successfully
   - ✅ No access denied errors
   - ✅ Correct tab highlighted for each page

---

### Test 2: Admin Link in Navigation

**Objective:** Verify admin link visibility and functionality

#### Test 2.1: Admin Link Visible for Admins

1. **Setup:** Log in as admin user
2. **Action:** Check site header navigation
3. **Expected Result:**
   - ✅ "Admin" link visible in navigation menu
   - ✅ Link appears before "Perfil" link
   - ✅ Link visible in mobile menu

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
   - ✅ Values match reality (verify 1-2 in database if needed)

#### Test 3.4: Suspended Users Alert

1. **Setup:** If no suspended users exist, suspend one:
   ```sql
   UPDATE profiles
   SET is_suspended = true
   WHERE email = 'suspended@example.com';
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

2. **Action:** Click "Users" tab
3. **Expected Result:**
   - ✅ URL changes to `/admin/users`
   - ✅ Users tab highlighted
   - ✅ Users page content loads

3. **Action:** Click "Audit Log" tab
4. **Expected Result:**
   - ✅ URL changes to `/admin/audit`
   - ✅ Audit Log tab highlighted
   - ✅ Audit page content loads

4. **Action:** Click "Dashboard" tab
5. **Expected Result:**
   - ✅ URL changes to `/admin/dashboard`
   - ✅ Dashboard tab highlighted again
   - ✅ Dashboard content loads

#### Test 4.3: Direct URL Access

1. **Action:** Navigate directly to `/admin/reports` in address bar
2. **Expected Result:**
   - ✅ Reports page loads
   - ✅ Reports tab is highlighted
   - ✅ Layout and tabs are visible

2. **Action:** Navigate directly to `/admin/users`
3. **Expected Result:**
   - ✅ Users page loads
   - ✅ Users tab highlighted

#### Test 4.4: Admin Panel Header

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
   - ✅ Subtitle: "All caught up!"
   - ✅ No report cards visible

---

### Test 6: Reports Queue (With Reports)

**Objective:** Verify reports list displays correctly

#### Test 6.1: Reports List Display

1. **Setup:** Create test reports:
   ```sql
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
   - ✅ Chat reports: Green badge (if exists)

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

#### Test 7.3: Modal Content - Entity Details (Various Types)

**For User Report:**
1. **Setup:** Create a user report
2. **Action:** Open report detail modal
3. **Expected Result:**
   - ✅ "Reported Content" section visible
   - ✅ User nickname displayed
   - ✅ User email displayed
   - ✅ User rating displayed with ⭐
   - ✅ "Suspended" badge if user is suspended

**For Listing Report:**
1. **Setup:** Create a listing report
2. **Action:** Open report detail modal
3. **Expected Result:**
   - ✅ Listing title displayed
   - ✅ Listing description displayed (if exists)
   - ✅ Listing status displayed
   - ✅ Listing owner nickname displayed

**For Template Report:**
1. **Setup:** Create a template report
2. **Action:** Open report detail modal
3. **Expected Result:**
   - ✅ Template title displayed
   - ✅ Template author nickname displayed
   - ✅ Template rating displayed with ⭐
   - ✅ Public/Private status displayed

#### Test 7.4: Modal Content - User History

1. **Expected Result:**
   - ✅ "User History" section visible
   - ✅ Grid layout with 4 metrics:
     - ✅ Total Reports Received
     - ✅ Total Listings
     - ✅ Templates Created
     - ✅ Rating Average
   - ✅ All values displayed correctly

#### Test 7.5: Admin Notes Field

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

#### Test 7.6: Action Buttons - Initial State

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

#### Test 7.7: Action Buttons - Confirmation Flow

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

#### Test 7.8: Action Buttons - All Actions

**Test Remove Content:**
1. **Setup:** Open a report, enter admin notes
2. **Action:** Click "Remove Content" twice
3. **Expected Result:**
   - ✅ First click: "Click again to confirm"
   - ✅ Second click: Report resolved
   - ✅ Toast success message
   - ✅ Modal closes

**Test Suspend User:**
1. **Setup:** Open a user report, enter admin notes
2. **Action:** Click "Suspend User" twice
3. **Expected Result:**
   - ✅ First click: "Click again to confirm"
   - ✅ Second click: Report resolved
   - ✅ Toast success message
   - ✅ Modal closes
   - ✅ User is suspended in database

#### Test 7.9: Validation - Empty Admin Notes

1. **Setup:** Open a report, leave admin notes EMPTY
2. **Action:** Try to click any action button
3. **Expected Result:**
   - ✅ Buttons are disabled
   - ✅ Cannot click
   - ✅ No action taken

2. **Action:** Type one character in admin notes, then delete it
3. **Expected Result:**
   - ✅ Buttons remain disabled
   - ✅ Whitespace-only notes not accepted

#### Test 7.10: Modal Closing

1. **Action:** Click outside the modal (on dark overlay)
2. **Expected Result:**
   - ✅ Modal closes
   - ✅ Returns to reports list

2. **Action:** Open modal again, press ESC key
3. **Expected Result:**
   - ✅ Modal closes

#### Test 7.11: Error Handling

1. **Setup:** Disconnect internet or block network request
2. **Action:** Try to resolve a report
3. **Expected Result:**
   - ✅ Toast error message: "Failed to resolve report"
   - ✅ Modal remains open
   - ✅ Can retry

---

### Test 8: User Search Page (Phase 2)

**Objective:** Verify user search functionality

#### Test 8.1: Search Page Display

1. **Action:** Navigate to `/admin/users`
2. **Expected Result:**
   - ✅ "User Management" title
   - ✅ "Search and moderate users" subtitle
   - ✅ Search input with Search icon
   - ✅ Status filter dropdown
   - ✅ Both inputs in a card with dark background

#### Test 8.2: Search Input - Debouncing

1. **Action:** Type "test" quickly in search input
2. **Expected Result:**
   - ✅ Input shows "test" immediately
   - ✅ Search doesn't trigger until you stop typing
   - ✅ After 500ms delay, search executes
   - ✅ Loading spinner appears briefly

#### Test 8.3: Search by Nickname

1. **Setup:** Have users with various nicknames
2. **Action:** Type a nickname in search input
3. **Expected Result:**
   - ✅ After debounce, matching users appear
   - ✅ Non-matching users filtered out
   - ✅ Search is case-insensitive

#### Test 8.4: Search by Email

1. **Action:** Type an email in search input
2. **Expected Result:**
   - ✅ Matching user appears
   - ✅ Email search works

#### Test 8.5: Status Filter

1. **Action:** Select "Active Only" from status dropdown
2. **Expected Result:**
   - ✅ Only non-suspended users shown
   - ✅ Suspended users hidden

2. **Action:** Select "Suspended Only"
3. **Expected Result:**
   - ✅ Only suspended users shown
   - ✅ Active users hidden

3. **Action:** Select "All Users"
4. **Expected Result:**
   - ✅ All users shown regardless of status

#### Test 8.6: User Card Display

1. **Expected Result:** Each user card shows:
   - ✅ Avatar (or fallback yellow circle with User icon)
   - ✅ Nickname (clickable link)
   - ✅ Email address
   - ✅ Admin badge (if admin)
   - ✅ Suspended badge (if suspended)
   - ✅ Rating with ⭐ and count
   - ✅ Active Listings count
   - ✅ Reports Received count
   - ✅ Joined date
   - ✅ "View Profile" button
   - ✅ Suspend/Unsuspend button (if not admin)

#### Test 8.7: User Card - Avatar Display

**With Avatar:**
1. **Setup:** User has avatar_url
2. **Expected Result:**
   - ✅ Image displayed in 64x64 circle
   - ✅ Rounded border with black outline

**Without Avatar:**
1. **Setup:** User has no avatar_url
2. **Expected Result:**
   - ✅ Yellow circle with User icon
   - ✅ Icon is black
   - ✅ Circle has black border

#### Test 8.8: User Card - Badges

1. **Action:** Find an admin user
2. **Expected Result:**
   - ✅ Red "Admin" badge visible
   - ✅ No suspend button for admins

2. **Action:** Find a suspended user
3. **Expected Result:**
   - ✅ Gray "Suspended" badge visible
   - ✅ "Unsuspend" button shown (green)

#### Test 8.9: View Profile Link

1. **Action:** Click on a user's nickname
2. **Expected Result:**
   - ✅ Navigates to `/users/{userId}`
   - ✅ Public profile page opens

2. **Action:** Go back, click "View Profile" button
3. **Expected Result:**
   - ✅ Same navigation to profile page

#### Test 8.10: Suspend User Action

1. **Setup:** Find an active non-admin user
2. **Action:** Click "Suspend" button
3. **Expected Result:**
   - ✅ Browser prompt appears: "Enter reason for suspending [nickname]:"
   - ✅ Prompt has text input

2. **Action:** Enter a reason (e.g., "Test suspension")
3. **Expected Result:**
   - ✅ Toast success: "User suspended successfully"
   - ✅ User list refreshes
   - ✅ User now shows "Suspended" badge
   - ✅ Button changes to "Unsuspend" (green)

#### Test 8.11: Unsuspend User Action

1. **Setup:** Have a suspended user
2. **Action:** Click "Unsuspend" button
3. **Expected Result:**
   - ✅ Browser prompt appears: "Enter reason for unsuspending [nickname]:"

2. **Action:** Enter a reason (e.g., "Test unsuspension")
3. **Expected Result:**
   - ✅ Toast success: "User unsuspended successfully"
   - ✅ User list refreshes
   - ✅ "Suspended" badge removed
   - ✅ Button changes to "Suspend" (red)

#### Test 8.12: Suspend Action - Cancel

1. **Action:** Click "Suspend" button
2. **Action:** Click "Cancel" on the prompt
3. **Expected Result:**
   - ✅ No action taken
   - ✅ User remains active
   - ✅ No toast message

#### Test 8.13: Admin User Protection

1. **Setup:** Find an admin user in search
2. **Expected Result:**
   - ✅ "Admin" badge visible
   - ✅ NO suspend button shown
   - ✅ Only "View Profile" button available

#### Test 8.14: Reports Warning

1. **Setup:** User with reports_received_count > 0
2. **Expected Result:**
   - ✅ Orange warning indicator visible
   - ✅ AlertTriangle icon shown
   - ✅ Text: "This user has received X report(s)"

#### Test 8.15: Empty State

1. **Setup:** Search for non-existent user (e.g., "zzzzzzz")
2. **Expected Result:**
   - ✅ No user cards shown
   - ✅ Large Search icon (gray)
   - ✅ Text: "No users found"

#### Test 8.16: Loading State

1. **Action:** Perform a search with network throttling
2. **Expected Result:**
   - ✅ Loading spinner appears (yellow)
   - ✅ Spinner centered on page
   - ✅ Previous results cleared

#### Test 8.17: Error Handling

1. **Setup:** Block network or simulate RPC error
2. **Action:** Try to search
3. **Expected Result:**
   - ✅ Error message displayed
   - ✅ "Error loading users: [error message]"
   - ✅ No crash

---

### Test 9: Audit Log Viewer (Phase 2)

**Objective:** Verify audit log displays admin actions

#### Test 9.1: Audit Log Page Display

1. **Action:** Navigate to `/admin/audit`
2. **Expected Result:**
   - ✅ "Audit Log" title
   - ✅ "Complete history of admin actions" subtitle
   - ✅ Filter dropdown for action type
   - ✅ Filter card with dark background

#### Test 9.2: Filter Dropdown

1. **Action:** Click on filter dropdown
2. **Expected Result:**
   - ✅ Dropdown opens with options:
     - ✅ All Actions
     - ✅ Suspend User
     - ✅ Unsuspend User
     - ✅ Remove Content
     - ✅ Dismiss Report

#### Test 9.3: Audit Log Entries Display

1. **Setup:** Perform some admin actions (suspend user, resolve report)
2. **Action:** Navigate to `/admin/audit`
3. **Expected Result:**
   - ✅ Timeline of audit entries displayed
   - ✅ Entries sorted by newest first
   - ✅ Each entry shows:
     - ✅ Action icon (color-coded)
     - ✅ Action type badge (color-coded)
     - ✅ Admin who performed action
     - ✅ Timestamp
     - ✅ Target type and ID
     - ✅ Reason (if provided)

#### Test 9.4: Action Icons and Colors

1. **Expected Result:** Icons and badge colors correct:
   - ✅ Suspend User: Red Ban icon, red badge
   - ✅ Unsuspend User: Green CheckCircle icon, green badge
   - ✅ Remove Content: Orange Trash icon, orange badge
   - ✅ Dismiss Report: Gray X icon, gray badge

#### Test 9.5: Audit Entry Details

1. **Action:** Check a suspension entry
2. **Expected Result:**
   - ✅ Badge text: "SUSPEND USER" (uppercase, spaces replace underscores)
   - ✅ "By [admin nickname]" shown
   - ✅ Timestamp formatted as locale string
   - ✅ "Target: user (ID: [user_id])"
   - ✅ Reason in gray box

#### Test 9.6: Metadata Viewer

1. **Setup:** Find entry with metadata
2. **Expected Result:**
   - ✅ "View metadata" link visible
   - ✅ Link is clickable

2. **Action:** Click "View metadata"
3. **Expected Result:**
   - ✅ Details expand
   - ✅ JSON displayed in formatted code block
   - ✅ Dark background
   - ✅ Horizontal scroll if needed

#### Test 9.7: Filter by Action Type

1. **Action:** Select "Suspend User" from filter
2. **Expected Result:**
   - ✅ Only suspension entries shown
   - ✅ Other action types hidden
   - ✅ Page reloads with filtered results

2. **Action:** Select "All Actions"
3. **Expected Result:**
   - ✅ All entries shown again

#### Test 9.8: Pagination - Load More

1. **Setup:** Have more than 20 audit entries
2. **Expected Result:**
   - ✅ First 20 entries shown
   - ✅ "Load More" button visible at bottom

2. **Action:** Click "Load More"
3. **Expected Result:**
   - ✅ Next 20 entries appended to list
   - ✅ Existing entries remain
   - ✅ Loading spinner appears briefly
   - ✅ "Load More" button still visible if more entries exist

#### Test 9.9: Pagination - End of List

1. **Setup:** Load all entries until none remain
2. **Expected Result:**
   - ✅ "Load More" button disappears
   - ✅ All entries displayed
   - ✅ No error or infinite loading

#### Test 9.10: Empty State

1. **Setup:** Clear all audit logs or filter to action with no entries
2. **Expected Result:**
   - ✅ Empty state displayed
   - ✅ Large FileText icon (gray)
   - ✅ Text: "No audit logs found"

#### Test 9.11: Loading State

1. **Action:** Navigate to audit page with network throttling
2. **Expected Result:**
   - ✅ Loading spinner appears (yellow)
   - ✅ Centered on page
   - ✅ No entries shown during loading

#### Test 9.12: Error Handling

1. **Setup:** Block database access or simulate error
2. **Action:** Try to load audit log
3. **Expected Result:**
   - ✅ Error message displayed
   - ✅ "Error loading audit log: [error message]"
   - ✅ No crash

#### Test 9.13: System Actions

1. **Setup:** Entry where admin_id is null
2. **Expected Result:**
   - ✅ "By System" shown instead of admin nickname
   - ✅ Entry displays normally otherwise

---

### Test 10: Integration Tests (Complete Workflow)

**Objective:** Verify end-to-end workflows across all pages

#### Test 10.1: Complete Moderation Workflow

1. **Action:** Start at Dashboard
2. **Expected Result:**
   - ✅ See pending reports count > 0

2. **Action:** Click "Reports" tab
3. **Expected Result:**
   - ✅ See list of pending reports

3. **Action:** Click "Review Report" on first report
4. **Expected Result:**
   - ✅ Modal opens with full context

4. **Action:** Read details, enter admin notes, resolve report
5. **Expected Result:**
   - ✅ Report resolved successfully
   - ✅ Removed from list

5. **Action:** Go to "Audit Log" tab
6. **Expected Result:**
   - ✅ New entry showing the report resolution
   - ✅ Your admin name shown
   - ✅ Reason displayed

6. **Action:** Go back to Dashboard
7. **Expected Result:**
   - ✅ Pending reports count decreased by 1
   - ✅ Admin actions count increased by 1

#### Test 10.2: User Moderation Workflow

1. **Action:** Go to "Users" tab
2. **Action:** Search for a user
3. **Action:** Suspend the user with a reason
4. **Expected Result:**
   - ✅ User suspended successfully
   - ✅ "Suspended" badge appears

4. **Action:** Go to "Audit Log" tab
5. **Expected Result:**
   - ✅ New "Suspend User" entry visible
   - ✅ Shows your admin name
   - ✅ Shows reason you entered

5. **Action:** Go to Dashboard
6. **Expected Result:**
   - ✅ Suspended users count increased
   - ✅ Suspended users alert visible

6. **Action:** Go back to "Users" tab
7. **Action:** Unsuspend the user
8. **Action:** Check Audit Log again
9. **Expected Result:**
   - ✅ New "Unsuspend User" entry visible

#### Test 10.3: Multi-Tab Navigation

1. **Action:** Dashboard → Reports → Users → Audit → Dashboard
2. **Expected Result:**
   - ✅ All transitions smooth
   - ✅ Data persists and refreshes appropriately
   - ✅ No errors in console
   - ✅ Active tab always correct

#### Test 10.4: Refresh Behavior

1. **Action:** On each admin page, refresh (F5)
2. **Expected Result:**
   - ✅ Page loads again correctly
   - ✅ Data refreshes from server
   - ✅ Still on correct tab
   - ✅ No 404 or errors

#### Test 10.5: Browser Back/Forward

1. **Action:** Dashboard → Users → Back button → Forward button
2. **Expected Result:**
   - ✅ Navigation works correctly
   - ✅ Tabs highlight correctly
   - ✅ Content loads properly

#### Test 10.6: Search and Action Workflow

1. **Action:** Search for user with reports
2. **Expected Result:**
   - ✅ Warning indicator shows report count

2. **Action:** Click nickname to view profile
3. **Expected Result:**
   - ✅ Profile page opens

3. **Action:** Go back to admin users
4. **Action:** Suspend the user
5. **Action:** Go to dashboard
6. **Expected Result:**
   - ✅ Stats updated correctly

---

## 🐛 Common Issues to Watch For

### Issue 1: AdminGuard Infinite Loop
- **Symptom:** Page keeps refreshing
- **Check:** Console for errors about `useEffect` dependencies
- **Fix:** Verify admin check logic

### Issue 2: Modal Not Closing
- **Symptom:** Modal stays open after action
- **Check:** Network errors, onResolved callback
- **Fix:** Ensure RPC completes successfully

### Issue 3: Statistics Not Loading
- **Symptom:** Loading spinner forever
- **Check:** RPC `get_admin_stats` exists and has correct permissions
- **Fix:** Verify RPC and RLS policies

### Issue 4: Reports Not Appearing
- **Symptom:** Empty state when reports should exist
- **Check:**
  - RPC `list_pending_reports` exists
  - Reports have `status = 'pending'`
  - RLS policies allow admin access

### Issue 5: User Search Not Working
- **Symptom:** No users found or error
- **Check:**
  - RPC `search_users_admin` exists
  - Database has users
  - Network tab for errors

### Issue 6: Suspend/Unsuspend Fails
- **Symptom:** Toast error, action doesn't work
- **Check:**
  - RPCs `suspend_user_with_reason` and `unsuspend_user` exist
  - Admin has permissions
  - User is not an admin

### Issue 7: Audit Log Empty
- **Symptom:** No logs when actions were performed
- **Check:**
  - `admin_actions` table exists
  - Triggers are creating entries
  - RLS allows admin read access

### Issue 8: Debounce Not Working
- **Symptom:** Search triggers on every keystroke
- **Check:**
  - `useDebounce` hook imported correctly
  - Delay set to 500ms

---

## ✅ Test Completion Checklist

After running all tests, verify:

**Access Control:**
- [ ] Admin access control works correctly
- [ ] Non-admins cannot access admin pages
- [ ] Admin link visible only to admins

**Dashboard:**
- [ ] Dashboard displays all 8 statistics
- [ ] Suspended users alert appears when needed
- [ ] Responsive design works

**Reports:**
- [ ] Reports list displays correctly
- [ ] Empty state shows when no reports
- [ ] Report detail modal opens and displays all info
- [ ] All 3 action types work
- [ ] Confirmation prompts work
- [ ] Admin notes validation works

**Users:**
- [ ] Search input works with debouncing
- [ ] Status filter works
- [ ] User cards display all information
- [ ] Suspend/Unsuspend actions work
- [ ] Admin users protected
- [ ] Reports warning appears

**Audit Log:**
- [ ] Audit entries display in timeline
- [ ] Filter by action type works
- [ ] Color-coded badges and icons correct
- [ ] Metadata expandable
- [ ] Pagination works
- [ ] "Load More" button functions

**Navigation:**
- [ ] Tab navigation works on all pages
- [ ] Direct URL access works
- [ ] Browser back/forward buttons work
- [ ] Page refresh maintains state

**Integration:**
- [ ] Complete workflows function end-to-end
- [ ] Dashboard stats update after actions
- [ ] Audit log records all actions
- [ ] Cross-page navigation smooth

**Technical:**
- [ ] No console errors during normal usage
- [ ] Toast notifications appear correctly
- [ ] Loading states display properly
- [ ] Error states handle gracefully
- [ ] Responsive on mobile/tablet/desktop

---

## 📊 Test Results Template

Copy this template to record your test results:

```
# Sprint 11 Complete Test Results

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** Local / Staging / Production

## Summary
- Total Tests: ~120+
- Tests Passed: X
- Tests Failed: X
- Issues Found: X

## Phase 1 Tests (Dashboard, Reports, Navigation)
- Access Control: PASS / FAIL
- Dashboard: PASS / FAIL
- Reports Queue: PASS / FAIL
- Report Modal: PASS / FAIL
- Navigation: PASS / FAIL

## Phase 2 Tests (Users, Audit)
- User Search: PASS / FAIL
- User Actions: PASS / FAIL
- Audit Log: PASS / FAIL
- Audit Pagination: PASS / FAIL

## Integration Tests
- Complete Workflows: PASS / FAIL
- Cross-page Navigation: PASS / FAIL

## Failed Tests
1. [Test Name] - [Issue Description]
2. ...

## Issues Found
1. **[Issue Title]**
   - Severity: Critical / High / Medium / Low
   - Component: Dashboard / Reports / Users / Audit
   - Description: ...
   - Steps to Reproduce: ...
   - Expected: ...
   - Actual: ...

## Backend Verification
- [ ] get_admin_stats RPC working
- [ ] list_pending_reports RPC working
- [ ] get_report_details_with_context RPC working
- [ ] resolve_report RPC working
- [ ] search_users_admin RPC working
- [ ] suspend_user_with_reason RPC working
- [ ] unsuspend_user RPC working
- [ ] admin_actions table accessible

## Notes
- ...

## Sign-off
All critical functionality tested and working: ✅ / ❌
Ready for production: ✅ / ❌
Sprint 11 complete: ✅ / ❌
```

---

## 🚀 Ready to Test!

Start with Test 1 (Admin Access Control) and work through sequentially. Each test builds on the previous ones.

**Estimated Testing Time:**
- Phase 1 tests: 45-60 minutes
- Phase 2 tests: 30-45 minutes
- Integration tests: 15-20 minutes
- **Total: ~90-120 minutes** for complete suite

Good luck! 🎯
