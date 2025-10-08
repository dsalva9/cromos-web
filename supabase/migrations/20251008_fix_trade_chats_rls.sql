-- Migration: Fix trade_chats RLS policies
-- Description: Ensure users can insert chat messages for trades they participate in
-- Version: v1.4.4 hotfix
-- Date: 2025-10-08

-- Drop existing policies
DROP POLICY IF EXISTS trade_chats_select_policy ON trade_chats;
DROP POLICY IF EXISTS trade_chats_insert_policy ON trade_chats;

-- Policy: Users can read messages from trades they participate in
CREATE POLICY trade_chats_select_policy
  ON trade_chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trade_proposals tp
      WHERE tp.id = trade_chats.trade_id
        AND (tp.from_user = auth.uid() OR tp.to_user = auth.uid())
    )
  );

-- Policy: Users can insert messages into trades they participate in
CREATE POLICY trade_chats_insert_policy
  ON trade_chats
  FOR INSERT
  WITH CHECK (
    -- User must be the sender
    sender_id = auth.uid()
    AND
    -- User must be a participant in the trade
    EXISTS (
      SELECT 1 FROM trade_proposals tp
      WHERE tp.id = trade_chats.trade_id
        AND (tp.from_user = auth.uid() OR tp.to_user = auth.uid())
    )
  );

-- Add comment
COMMENT ON POLICY trade_chats_insert_policy ON trade_chats IS
  'Users can insert chat messages into trades where they are a participant (from_user or to_user)';
