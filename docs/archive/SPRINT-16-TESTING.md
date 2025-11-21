# Sprint 16: Manual Testing Guide - Chat & Rating Fixes

**Version**: 1.0
**Date**: October 30, 2025
**Sprint**: Sprint 16 - Marketplace Fixes & Enhancements

## Overview

This guide provides testing procedures for critical fixes implemented in Sprint 16:
1. **Chat access for first-time buyers**
2. **Listing visibility for chat participants**
3. **Rating notification system fixes**
4. **Multi-conversation system message separation**

---

## Pre-Testing Setup

### Required Test Accounts
- **User A (Seller)**: Has active listings
- **User B (Buyer #1)**: Will be reserved buyer
- **User C (Buyer #2)**: Will be non-reserved buyer who also chats

### Database State
Apply migrations in order:
1. `20251030140000_fix_listing_visibility_for_chat_participants.sql`
2. `20251030145000_fix_get_listing_chats_rls.sql`
3. `20251030150000_drop_immediate_rating_notification.sql`

Verify:
```sql
-- Check trigger removed
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'user_ratings'::regclass
AND tgname = 'trigger_notify_user_rating';
-- Should return no rows

-- Check only mutual rating trigger exists
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'user_ratings'::regclass
AND tgname LIKE '%mutual%';
-- Should return: trigger_check_mutual_ratings

-- Check visible_to_user_id column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'trade_chats'
AND column_name = 'visible_to_user_id';
-- Should return: visible_to_user_id
```

---

## Test Suite 1: First-Time Chat Access

### Test 16.1.1: Buyer Opens Chat Before Sending Message

**Purpose**: Verify buyers can access listing chat even with no prior messages

**Steps:**
1. Log in as User B
2. Navigate to marketplace
3. Find an **active listing** by User A
4. Click "Contactar vendedor" button
5. Observe chat interface loads

**Expected Results:**
- ✅ Chat page loads successfully (no "You do not have access to this chat" error)
- ✅ Empty message area displayed
- ✅ Chat composer enabled
- ✅ Listing info card visible at top
- ✅ No error toasts appear
- ✅ Console shows no RLS errors

**Pass/Fail**: ___________

---

### Test 16.1.2: Multiple Buyers Open Fresh Chats

**Purpose**: Ensure multiple buyers can independently start conversations

**Steps:**
1. As User B, open chat with listing (from Test 16.1.1)
2. **Do NOT send any message yet**
3. Log out
4. Log in as User C
5. Navigate to same listing
6. Click "Contactar vendedor"

**Expected Results:**
- ✅ User C's chat loads successfully
- ✅ No interference between User B and User C sessions
- ✅ Each user sees empty chat state
- ✅ Both can type and send messages independently

**Pass/Fail**: ___________

---

## Test Suite 2: Chat Participant Listing Access

### Test 16.2.1: Reserved Listing Access for Chat Participants

**Purpose**: Verify chat participants retain access after listing is reserved

**Setup:**
1. User B sends message: "Hola, ¿está disponible?"
2. User C sends message: "Me interesa este cromo"
3. User A reserves listing for User B

**Steps:**
1. Log in as User C
2. Navigate to marketplace
3. Try to view the reserved listing
4. Try to access chat with User A

**Expected Results:**
- ✅ User C can still VIEW the listing detail page (not blocked by RLS)
- ✅ User C can ACCESS the chat conversation
- ✅ User C sees system message: "This listing has been reserved for another user"
- ✅ User C's composer shows: "Este anuncio está reservado para otro usuario"
- ✅ User C cannot send new messages

**Pass/Fail**: ___________

---

### Test 16.2.2: Completed Listing Access for Chat Participants

**Purpose**: Verify participants can view completed listing and chat history

**Setup:**
1. User A marks transaction as completed
2. User B confirms completion
3. Both users rate each other

**Steps:**
1. Log in as User C
2. Try to view the completed listing
3. Access chat with User A about this listing

**Expected Results:**
- ✅ User C can VIEW the completed listing (RLS grants access)
- ✅ User C can ACCESS the chat conversation
- ✅ User C sees system message: "This listing is no longer available"
- ✅ User C's composer shows: "Este anuncio ya no está disponible"
- ✅ User C can scroll and read chat history
- ✅ User C does NOT see rating-related system messages (those are targeted to User A & B)

**Pass/Fail**: ___________

---

## Test Suite 3: Rating Notifications

### Test 16.3.1: No Premature Notifications

**Purpose**: Verify no notifications sent when only one person rates

**Steps:**
1. Complete transaction between User A and User B (from Test 16.2.2 setup)
2. Log in as User B
3. Submit rating for User A (5 stars, "Excelente vendedor")
4. Check User A's notifications immediately
5. Check User B's notifications

**Expected Results:**
- ✅ User A receives NO `user_rated` notification yet
- ✅ User B receives NO confirmation notification
- ✅ No system message appears in chat yet
- ✅ Database has 1 rating row in `user_ratings`
- ✅ Profiles table NOT updated yet (rating_count still 0 for both)

**Pass/Fail**: ___________

---

### Test 16.3.2: Mutual Rating Triggers Notifications

**Purpose**: Verify notifications ONLY appear after both users rate

**Steps:**
1. Continuing from Test 16.3.1
2. Log in as User A
3. Submit rating for User B (4 stars, "Buen comprador")
4. Check both users' notifications
5. Check chat for system messages
6. Check profiles table

**Expected Results:**
- ✅ User A receives exactly 1 `user_rated` notification showing User B rated them with 4 stars
- ✅ User B receives exactly 1 `user_rated` notification showing User A rated them with 5 stars
- ✅ NO duplicate notifications (total: 2 notifications, not 4)
- ✅ User A sees system message in chat: "Ambos habéis valorado. [User B] te ha valorado con 4 estrellas - 'Buen comprador'"
- ✅ User B sees system message in chat: "Ambos habéis valorado. [User A] te ha valorado con 5 estrellas - 'Excelente vendedor'"
- ✅ Each user sees ONLY their own system message (not the other's)
- ✅ Profiles updated: User A rating_count=1, rating_avg=4.00
- ✅ Profiles updated: User B rating_count=1, rating_avg=5.00

**Pass/Fail**: ___________

---

### Test 16.3.3: Multiple Conversations Don't Interfere

**Purpose**: Ensure rating notifications isolated per transaction

**Setup:**
1. User A has listing #2
2. User D completes transaction for listing #2
3. User A and User D rate each other

**Steps:**
1. Check User A's notifications
2. Check User B's, User C's, and User D's notifications
3. Check both chat conversations

**Expected Results:**
- ✅ User A gets 2 separate `user_rated` notifications (one from User B, one from User D)
- ✅ User B ONLY sees notification about listing #1
- ✅ User D ONLY sees notification about listing #2
- ✅ User C gets NO rating notifications (was not reserved buyer)
- ✅ Chat #1 (User A ↔ User B) shows rating system message about their transaction
- ✅ Chat #2 (User A ↔ User D) shows rating system message about their transaction
- ✅ No cross-contamination between conversations

**Pass/Fail**: ___________

---

## Test Suite 4: System Message Visibility

### Test 16.4.1: Reserved Buyer vs Non-Reserved Buyer Messages

**Purpose**: Verify targeted system messages show correctly per user

**Setup:**
1. Listing with User A (seller), User B (reserved), User C (other buyer)
2. User A reserves listing for User B

**Steps:**
1. Log in as User B
2. Check chat messages
3. Log in as User C
4. Check chat messages
5. Log in as User A
6. Check chat messages

**Expected Results:**

**User B (reserved buyer) sees:**
- ✅ System message: "[Seller name] ha reservado este anuncio para ti"
- ✅ Chat composer enabled

**User C (non-reserved buyer) sees:**
- ✅ System message: "Este anuncio ha sido reservado para otro usuario"
- ✅ Chat composer disabled with message

**User A (seller) sees:**
- ✅ System message: "Has reservado este anuncio para [User B nickname]"
- ✅ Chat composer enabled
- ✅ "Reservado" badge next to User B in participants list

**Pass/Fail**: ___________

---

### Test 16.4.2: Completion Messages Separation

**Purpose**: Verify participants vs non-participants see different completion messages

**Setup:**
1. Complete transaction between User A and User B
2. User C is still in conversations but not the buyer

**Steps:**
1. Log in as User B (transaction participant)
2. Check chat
3. Log in as User C (non-participant)
4. Check chat

**Expected Results:**

**User B sees:**
- ✅ System message: "¡Transacción completada! Valora a [User A]"
- ✅ Composer shows: "Chat cerrado - La transacción ha sido completada"

**User C sees:**
- ✅ System message: "Este anuncio ya no está disponible"
- ✅ Composer shows: "Este anuncio ya no está disponible"
- ✅ NO rating prompt (User C wasn't the buyer)

**Pass/Fail**: ___________

---

## Regression Testing

### Regression 16.R.1: Basic Chat Still Works

**Steps:**
1. User B sends message to User A about active listing
2. User A replies
3. Verify realtime updates

**Expected Results:**
- ✅ Messages send and appear immediately
- ✅ Realtime subscription works
- ✅ Unread counts update
- ✅ No errors in console

**Pass/Fail**: ___________

---

### Regression 16.R.2: Reserve/Unreserve Flow

**Steps:**
1. User A reserves listing for User B
2. User A unreserves listing
3. Verify all users notified correctly

**Expected Results:**
- ✅ Reservation system messages sent
- ✅ Unreservation system messages sent
- ✅ Composer states update correctly
- ✅ User C can message again after unreserve

**Pass/Fail**: ___________

---

## Database Verification Queries

Run these after tests to verify data integrity:

```sql
-- 1. Check no orphaned notifications
SELECT COUNT(*) FROM notifications
WHERE kind = 'user_rated'
AND created_at > NOW() - INTERVAL '1 hour';
-- Should match: 2 per completed mutual rating

-- 2. Verify rating counts
SELECT p.nickname, p.rating_count, p.rating_avg
FROM profiles p
WHERE p.id IN (
  SELECT DISTINCT rater_id FROM user_ratings
  UNION
  SELECT DISTINCT rated_id FROM user_ratings
);

-- 3. Check system message targeting
SELECT
  id,
  listing_id,
  is_system,
  visible_to_user_id,
  LEFT(message, 50) as message_preview
FROM trade_chats
WHERE is_system = TRUE
AND listing_id = [TEST_LISTING_ID]
ORDER BY created_at DESC;

-- 4. Verify listing RLS policy allows chat participants
SELECT EXISTS (
  SELECT 1 FROM trade_listings tl
  WHERE tl.id = [TEST_LISTING_ID]
  AND tl.status != 'active'
  AND EXISTS (
    SELECT 1 FROM trade_chats tc
    WHERE tc.listing_id = tl.id
    AND tc.sender_id = auth.uid()
  )
) AS chat_participant_has_access;
```

---

## Summary Checklist

**Chat Access:**
- [ ] Test 16.1.1: First-time buyer access
- [ ] Test 16.1.2: Multiple buyers access
- [ ] Test 16.2.1: Reserved listing access
- [ ] Test 16.2.2: Completed listing access

**Rating Notifications:**
- [ ] Test 16.3.1: No premature notifications
- [ ] Test 16.3.2: Mutual rating triggers
- [ ] Test 16.3.3: Multiple conversations isolated

**System Messages:**
- [ ] Test 16.4.1: Reserved vs non-reserved
- [ ] Test 16.4.2: Completion message separation

**Regressions:**
- [ ] Regression 16.R.1: Basic chat works
- [ ] Regression 16.R.2: Reserve/unreserve flow

---

**Tester Name:** ___________
**Date Tested:** ___________
**Overall Result:** PASS / FAIL
**Notes:** ___________
