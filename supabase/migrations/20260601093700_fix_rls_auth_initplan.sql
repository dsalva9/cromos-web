-- Fix RLS auth_rls_initplan: wrap bare auth.uid() in (SELECT auth.uid())
-- This changes Postgres query planner behavior from per-row to per-query evaluation.
-- Semantically identical — same value, just evaluated once instead of N times.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- broadcast_log
ALTER POLICY "Admins can insert broadcast_log" ON public.broadcast_log
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Admins can read broadcast_log" ON public.broadcast_log
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- collection_templates
ALTER POLICY "Admins can view all templates including deleted" ON public.collection_templates
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Authors can view own templates" ON public.collection_templates
  USING (author_id = (SELECT auth.uid()));

-- feature_flags
ALTER POLICY "Admins can manage flags" ON public.feature_flags
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- listing_pack_items
ALTER POLICY "listing_pack_items_delete" ON public.listing_pack_items
  USING (EXISTS ( SELECT 1 FROM trade_listings tl WHERE tl.id = listing_pack_items.listing_id AND tl.user_id = (SELECT auth.uid())));

ALTER POLICY "listing_pack_items_insert" ON public.listing_pack_items
  WITH CHECK (EXISTS ( SELECT 1 FROM trade_listings tl WHERE tl.id = listing_pack_items.listing_id AND tl.user_id = (SELECT auth.uid())));

-- match_conversations
ALTER POLICY "Users can insert conversations they're part of" ON public.match_conversations
  WITH CHECK ((SELECT auth.uid()) = user_a_id OR (SELECT auth.uid()) = user_b_id);

ALTER POLICY "Users can update their own conversations" ON public.match_conversations
  USING ((SELECT auth.uid()) = user_a_id OR (SELECT auth.uid()) = user_b_id);

ALTER POLICY "Users can view their own conversations" ON public.match_conversations
  USING ((SELECT auth.uid()) = user_a_id OR (SELECT auth.uid()) = user_b_id);

-- pending_emails
ALTER POLICY "Admins can view pending emails" ON public.pending_emails
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- trade_chats
ALTER POLICY "Admins can view all chats including deleted users" ON public.trade_chats
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Users can view chats with active participants" ON public.trade_chats
  USING (((sender_id = (SELECT auth.uid())) OR (receiver_id = (SELECT auth.uid()))) AND check_user_visibility(sender_id) AND check_user_visibility(receiver_id));

ALTER POLICY "Users can view their own chats" ON public.trade_chats
  USING (((sender_id = (SELECT auth.uid())) OR (receiver_id = (SELECT auth.uid()))) AND (is_admin((SELECT auth.uid())) OR (NOT
CASE
    WHEN (sender_id = (SELECT auth.uid())) THEN is_user_suspended(receiver_id)
    ELSE is_user_suspended(sender_id)
END)));

-- trade_confirmations
ALTER POLICY "Confirmers can update pending trade confirmations" ON public.trade_confirmations
  USING ((SELECT auth.uid()) = confirmer_id AND status = 'pending')
  WITH CHECK ((SELECT auth.uid()) = confirmer_id AND status = ANY (ARRAY['confirmed', 'expired']));

ALTER POLICY "Users can request trade confirmations" ON public.trade_confirmations
  WITH CHECK ((SELECT auth.uid()) = requester_id);

ALTER POLICY "Users can view their own trade confirmations" ON public.trade_confirmations
  USING ((SELECT auth.uid()) = requester_id OR (SELECT auth.uid()) = confirmer_id);

-- trade_listings
ALTER POLICY "Admins can view all listings including deleted" ON public.trade_listings
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Buyers can view reserved listings" ON public.trade_listings
  USING (status = ANY (ARRAY['reserved', 'completed']) AND EXISTS ( SELECT 1 FROM listing_transactions lt WHERE lt.listing_id = trade_listings.id AND lt.buyer_id = (SELECT auth.uid()) AND lt.status = ANY (ARRAY['reserved', 'pending_completion', 'completed'])));

ALTER POLICY "Users can view own listings" ON public.trade_listings
  USING (user_id = (SELECT auth.uid()));

-- retention_schedule
ALTER POLICY "Admins can update retention schedules" ON public.retention_schedule
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Admins can view all retention schedules" ON public.retention_schedule
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Users can view own entity retention schedules" ON public.retention_schedule
  USING (
    (entity_type = 'listing' AND entity_id IN (SELECT id::text FROM trade_listings WHERE user_id = (SELECT auth.uid())))
    OR (entity_type = 'template' AND entity_id IN (SELECT id::text FROM collection_templates WHERE author_id = (SELECT auth.uid())))
    OR (entity_type = 'account' AND entity_id = ((SELECT auth.uid()))::text)
  );

-- template_ratings
ALTER POLICY "Admins can view all template ratings" ON public.template_ratings
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- user_feature_overrides
ALTER POLICY "Admins can manage overrides" ON public.user_feature_overrides
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

ALTER POLICY "Users can read own overrides" ON public.user_feature_overrides
  USING ((SELECT auth.uid()) = user_id);

-- user_ratings
ALTER POLICY "Admins can view all ratings" ON public.user_ratings
  USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));
