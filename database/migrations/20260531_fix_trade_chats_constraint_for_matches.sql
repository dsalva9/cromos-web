-- Fix: trade_chats CHECK constraint blocks match messages
--
-- The existing constraint `trade_chats_either_trade_or_listing` requires
-- exactly one of trade_id or listing_id to be set. Match conversations
-- use match_conversation_id instead, so messages sent via
-- send_match_message() fail with a constraint violation because both
-- trade_id and listing_id are NULL.
--
-- This migration replaces the XOR constraint with a three-way exclusive
-- check: exactly one of trade_id, listing_id, or match_conversation_id
-- must be set.

-- Drop the old two-way constraint
ALTER TABLE public.trade_chats
  DROP CONSTRAINT IF EXISTS trade_chats_either_trade_or_listing;

-- Add the new three-way exclusive constraint
ALTER TABLE public.trade_chats
  ADD CONSTRAINT trade_chats_exactly_one_context CHECK (
    (
      (trade_id IS NOT NULL)::int +
      (listing_id IS NOT NULL)::int +
      (match_conversation_id IS NOT NULL)::int
    ) = 1
  );
