# Manual Testing Guide: Ignore Functionality

## Overview

This guide provides step-by-step instructions to test the new ignore functionality that allows users to block other users from seeing their marketplace listings, prevent chat messages, and manage ignored users.

## Prerequisites

1. Database migration must be applied: Run the SQL in `supabase/migrations/20251030_add_ignored_users.sql` in Supabase dashboard SQL editor
2. Application must be built and deployed locally
3. You need at least 2 test user accounts to test the ignore functionality

## Test Scenarios

### 1. Database Migration Testing

**Steps:**

1. Go to Supabase dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/20251030_add_ignored_users.sql`
3. Execute the SQL script
4. Verify the following tables were created:
   - `ignored_users` table with proper columns and indexes
   - RPC functions: `ignore_user`, `unignore_user`, `is_user_ignored`, `get_ignored_users`, `get_ignored_users_count`
5. Check that RLS policies were created correctly

**Expected Results:**

- All SQL executes without errors
- Tables and functions are created successfully
- RLS policies are in place

### 2. Ignore Button on User Profile

**Steps:**

1. Log in as User A
2. Navigate to User B's profile page (`/users/[userId]`)
3. Verify you see an "Ignorar" button next to Favorite and Report buttons
4. Click the "Ignorar" button
5. Verify the button changes to "Dejar de ignorar"
6. Refresh the page and verify the button state persists

**Expected Results:**

- Ignore button is visible for other users (not your own profile)
- Button text changes correctly after ignoring
- State persists after page refresh
- Success toast message appears: "Usuario ignorado correctamente"

### 3. Unignore Functionality

**Steps:**

1. From the previous test, with User A having ignored User B
2. Click the "Dejar de ignorar" button
3. Verify the button changes back to "Ignorar"
4. Refresh the page and verify the state persists

**Expected Results:**

- Button text changes correctly after unignoring
- State persists after page refresh
- Success toast message appears: "Usuario dejado de ignorar correctamente"

### 4. Ignored Users Management Page

**Steps:**

1. Log in as User A
2. Navigate to `/profile/ignored` or click "Usuarios Ignorados" from profile page
3. Verify you can see User B in the ignored list
4. Click "Quitar de ignorados" button for User B
5. Verify User B is removed from the list
6. Verify success toast appears
7. Navigate back to User B's profile and verify the ignore button shows "Ignorar" again

**Expected Results:**

- Ignored users page displays correctly
- Shows user avatar, nickname, and when they were ignored
- "Quitar de ignorados" functionality works
- User is removed from list after unignoring
- Empty state shows when no users are ignored

### 5. Marketplace Filtering

**Steps:**

1. User A ignores User B
2. User B creates a new marketplace listing
3. User A navigates to the main marketplace page
4. Verify User B's listing does NOT appear in the listings
5. Log out and verify the listing appears (to confirm it exists)
6. Log back in as User A and verify it's still filtered out

**Expected Results:**

- Ignored users' listings are completely filtered out from marketplace
- Filtering works consistently across page refreshes
- Non-logged-in users can see all listings (only logged-in users get filtering)

### 6. Chat Blocking

**Steps:**

1. User A ignores User B
2. User B creates a marketplace listing
3. User B tries to send a message to User A through the listing chat
4. Verify User B gets an error message when trying to send
5. User A navigates to the same listing chat
6. Verify User A cannot see any messages from User B
7. User A unignores User B
8. Verify chat functionality returns to normal

**Expected Results:**

- Ignored users cannot send messages to users who ignored them
- Error message appears when trying to message: "No puedes enviar mensajes a este usuario"
- Chat history remains clean of ignored user messages
- Functionality restores after unignoring

### 7. Bidirectional Blocking

**Steps:**

1. User A ignores User B
2. User B ignores User A
3. Both users try to send messages to each other
4. Verify neither can send messages to the other

**Expected Results:**

- Blocking works bidirectionally when both users ignore each other
- Neither user can initiate contact with the other

### 8. Edge Cases

**Steps:**

1. Try to ignore yourself (should not be possible)
2. Ignore a user, then have that user get deleted/suspended
3. Try to ignore a non-existent user
4. Ignore and unignore the same user rapidly

**Expected Results:**

- Cannot ignore yourself (button doesn't appear on own profile)
- System handles deleted/suspended users gracefully
- Appropriate error messages for invalid operations
- No duplicate entries in ignored_users table

## Performance Testing

1. Test with large numbers of ignored users (50+)
2. Verify marketplace loading times are not significantly impacted
3. Check that ignored users page loads quickly

## Accessibility Testing

1. Test ignore functionality with keyboard navigation
2. Verify screen reader compatibility
3. Check color contrast on ignore buttons
4. Test with mobile responsive design

## Cross-Browser Testing

Test the functionality in:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Success Criteria

- All ignore/unignore operations work correctly
- Marketplace filtering is effective
- Chat blocking works as expected
- UI updates are immediate and persistent
- Error handling is appropriate
- Performance is acceptable
- Accessibility standards are met

## Troubleshooting

If tests fail:

1. Check browser console for JavaScript errors
2. Verify database migration was applied correctly
3. Check Supabase RLS policies
4. Verify network requests in browser dev tools
5. Check Supabase logs for any RPC function errors

## Notes for Developers

- The ignore functionality is implemented at the database level for consistency
- Marketplace filtering happens in the `list_trade_listings` RPC function
- Chat blocking is enforced by triggers and RLS policies
- All UI state is optimistic with server synchronization
- Spanish translations are implemented throughout
