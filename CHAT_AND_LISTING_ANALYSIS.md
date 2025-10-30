MARKETPLACE CHAT AND LISTING WORKFLOW - COMPLETE ANALYSIS
===========================================================

KEY DATABASE TABLES
===================

1. trade_listings
   - id, user_id (seller), title, description
   - sticker_number, collection_name, image_url
   - status: 'active' | 'reserved' | 'completed' | 'sold' | 'removed'
   - views_count, created_at, updated_at

2. trade_chats (for both proposals and listings)
   - id, listing_id (nullable), trade_id (nullable)
   - sender_id, receiver_id (both nullable for system messages)
   - message, is_read, is_system, created_at

3. listing_transactions
   - id, listing_id, seller_id, buyer_id
   - status: 'reserved' | 'completed' | 'cancelled'
   - reserved_at, completed_at, cancelled_at
   - Unique constraint: one active per listing

4. user_ratings
   - id, rater_id, rated_id, rating (1-5), comment
   - context_type ('trade' or 'listing'), context_id
   - Unique: (rater_id, rated_id, context_type, context_id)

5. profiles
   - rating_avg (DECIMAL), rating_count (INTEGER)

COMPLETE WORKFLOW PHASES
========================

PHASE 1: LISTING INQUIRY (Status: active)
- Buyer sends first message to seller
- Multiple conversations possible per listing
- No transaction created yet

PHASE 2: RESERVATION (Status: active -> reserved)
- Seller calls: reserve_listing(listing_id, buyer_id)
- Creates: listing_transaction with status='reserved'
- System message: "Seller marked as reserved"
- Only seller can cancel

PHASE 3: COMPLETION (Status: reserved -> completed)
- Seller calls: complete_listing_transaction(transaction_id)
  - System message: "Waiting for buyer confirmation"
- Buyer calls: complete_listing_transaction(transaction_id)
  - Same effect (idempotent)
  - System message: "Transaction complete, rate each other"
  - Chat becomes read-only

PHASE 4: MUTUAL RATING (Status: completed)
- Buyer rates seller OR seller rates buyer
- RPC: create_user_rating(rated_id, rating, comment, 'listing', listing_id)
- When BOTH have rated: trigger fires
  - Sends notifications to both users
  - Adds system message with both ratings
  - Profiles updated with new aggregates

CORE RPC FUNCTIONS
==================

1. reserve_listing(listing_id, buyer_id)
   - Caller: seller only
   - Action: creates transaction, updates listing status
   - Returns: transaction_id

2. complete_listing_transaction(transaction_id)
   - Caller: seller or buyer
   - Action: idempotent, updates status to completed
   - Returns: boolean

3. cancel_listing_transaction(transaction_id, reason)
   - Caller: seller only
   - Requires: status='reserved'
   - Action: reverts listing to 'active'
   - Returns: boolean

4. send_listing_message(listing_id, receiver_id, message)
   - Buyer: sends to seller (listing owner)
   - Seller: replies to previous senders only
   - Validates: message length <= 500
   - Returns: message_id

5. get_listing_chats(listing_id, participant_id?)
   - Seller: see all OR filter by participant
   - Buyer: see only own conversation
   - Returns: messages with is_system flag

6. get_listing_chat_participants(listing_id)
   - Caller: seller only
   - Returns: buyer list with last message, unread count

7. create_user_rating(rated_id, rating, comment, context_type, context_id)
   - Updates: profile aggregates
   - Triggers: mutual rating check
   - Returns: rating_id

ACCESS CONTROL
==============

Listing visibility:
- Public: active listings only
- Owner: all own listings
- Admins: everything

Chat access (RPC-level):
- Seller: all conversations or filtered
- Buyer: only own with seller

Message visibility:
- Regular: sender/receiver only
- System: both parties

FRONTEND HOOKS & COMPONENTS
===========================

Hooks:
- useListingChat(listingId, participantId?, enableRealtime?)
- useListingWorkflow(listingId)

Components:
- UserRatingDialog (star selector, comment, submit)
- ReserveListingDialog (participant picker)

Pages:
- /marketplace/[id] (listing detail)
- /marketplace/[id]/chat (chat interface)
- /marketplace/my-listings (user's listings)

SYSTEM MESSAGES
===============

Types:
1. "Seller marked as reserved"
2. "Seller marked complete, waiting for buyer"
3. "Buyer confirmed transaction"
4. "Both rated: User1: X stars, User2: Y stars"

All have: is_system=TRUE, sender_id=NULL, receiver_id=NULL

NOTIFICATION TRIGGERS
====================

1. notify_listing_status_change() - fires on UPDATE
   - 'listing_reserved' when status='reserved'
   - 'listing_completed' when status='completed'

2. check_mutual_ratings_and_notify() - fires on INSERT
   - 'user_rated' when both users rated each other
   - Sends to both users with rating payload

KEY FILES
=========

Migrations:
- 20251020010000 - Create trade_listings
- 20251020030000 - Extend trade_chats for listings
- 20251020130000 - Create user ratings
- 20251024020000 - Listing chat conversations
- 20251024030000 - Listing transaction workflow
- 20251027140436 - Add system messages
- 20251027140554 - Update get_listing_chats for system messages
- 20251028202552 - Add mutual rating notification

Frontend:
- src/hooks/marketplace/useListingChat.ts
- src/hooks/marketplace/useListingWorkflow.ts
- src/app/marketplace/[id]/chat/page.tsx
- src/components/marketplace/UserRatingDialog.tsx
- src/lib/supabase/listings/chat.ts
- src/lib/supabase/listings/transactions.ts

DATA CONSISTENCY RULES
======================

- Only one active transaction per listing (UNIQUE constraint)
- One rating per user pair per transaction (UNIQUE constraint)
- Cascade deletes: listing -> transactions -> chats -> ratings
- Idempotent: complete_listing_transaction safe to call twice

SELLER VIEW (Chat Page)
=======================

- Left sidebar: participant list with unread counts
- Main area: chat messages
- Top: listing header with status badge
- Buttons based on status:
  - 'active' + selected participant: "Mark Reserved"
  - 'reserved': "Mark Complete"
  - Can always "Cancel" if reserved

BUYER VIEW (Chat Page)
======================

- Single conversation with seller
- Chat messages
- ToS checkbox for first message only
- Buttons based on status:
  - 'active': Send message button
  - 'reserved': "Confirm Receipt" button
  - 'completed': Rating UI (if haven't rated)
- Chat read-only after completed

RATING FLOW
===========

1. Transaction marked 'completed'
2. Both parties see rating UI: "Click to rate [user]"
3. First rater clicks -> UserRatingDialog opens
4. Selects stars (1-5) + optional comment (280 chars max)
5. Submits -> create_user_rating() RPC
6. If counterparty hasn't rated yet: show "You rated X stars"
7. When second rating arrives: trigger fires
   - Both notified of other's rating
   - System message shows both ratings
   - Chat now shows both ratings permanently

KNOWN LIMITATIONS
=================

1. No reservation timeout
2. No auto-cancellation
3. Cannot edit rating after both rated
4. Uses window.location.reload() for updates
5. No dispute resolution
6. No user blocking
7. Chat persists after completion (read-only)
