-- ============================================================
-- Analytics Schema Foundations
-- Phase 1: Activity tracking columns + triggers
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add last_activity_at to profiles
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Backfill from best available data across all activity tables
UPDATE public.profiles p
SET last_activity_at = GREATEST(
  p.updated_at,
  p.created_at,
  (SELECT MAX(tc.created_at) FROM public.trade_chats tc
   WHERE tc.sender_id = p.id AND tc.is_system = false),
  (SELECT MAX(tl.created_at) FROM public.trade_listings tl
   WHERE tl.user_id = p.id),
  (SELECT MAX(mc.created_at) FROM public.match_conversations mc
   WHERE mc.user_a_id = p.id OR mc.user_b_id = p.id),
  (SELECT MAX(tconf.created_at) FROM public.trade_confirmations tconf
   WHERE tconf.requester_id = p.id OR tconf.confirmer_id = p.id)
)
WHERE p.last_activity_at IS NULL;

-- Default for new users
ALTER TABLE public.profiles
  ALTER COLUMN last_activity_at SET DEFAULT now();

-- Index for MAU/WAU/DAU queries (index-only scan)
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_at
  ON public.profiles (last_activity_at)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger function to update last_activity_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_user_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'trade_chats' THEN
      -- Skip system messages
      IF NEW.is_system THEN RETURN NEW; END IF;
      v_user_id := NEW.sender_id;

    WHEN 'trade_listings' THEN
      -- Only on INSERT or meaningful UPDATE (not system archiving)
      v_user_id := NEW.user_id;

    WHEN 'match_conversations' THEN
      -- Both participants are active
      UPDATE public.profiles
      SET last_activity_at = NOW()
      WHERE id IN (NEW.user_a_id, NEW.user_b_id)
        AND deleted_at IS NULL;
      RETURN NEW;

    WHEN 'trade_confirmations' THEN
      v_user_id := NEW.requester_id;

    ELSE
      RETURN NEW;
  END CASE;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET last_activity_at = NOW()
    WHERE id = v_user_id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_user_last_activity() IS
  'Updates profiles.last_activity_at on any meaningful user action. Fired by triggers on trade_chats, trade_listings, match_conversations, trade_confirmations.';

-- ─────────────────────────────────────────────────────────────
-- 3. Attach triggers
-- ─────────────────────────────────────────────────────────────

-- trade_chats: message sent
DROP TRIGGER IF EXISTS trg_activity_trade_chats ON public.trade_chats;
CREATE TRIGGER trg_activity_trade_chats
  AFTER INSERT ON public.trade_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_activity();

-- trade_listings: listing created or updated by owner
DROP TRIGGER IF EXISTS trg_activity_trade_listings ON public.trade_listings;
CREATE TRIGGER trg_activity_trade_listings
  AFTER INSERT ON public.trade_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_activity();

-- match_conversations: match created
DROP TRIGGER IF EXISTS trg_activity_match_conversations ON public.match_conversations;
CREATE TRIGGER trg_activity_match_conversations
  AFTER INSERT ON public.match_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_activity();

-- trade_confirmations: exchange requested
DROP TRIGGER IF EXISTS trg_activity_trade_confirmations ON public.trade_confirmations;
CREATE TRIGGER trg_activity_trade_confirmations
  AFTER INSERT ON public.trade_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_last_activity();

-- ─────────────────────────────────────────────────────────────
-- 4. Add lifecycle tracking columns to trade_listings
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.trade_listings
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivation_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.trade_listings.archived_at IS 'When this listing was moved to archived status (auto-expiry). NULL if never archived.';
COMMENT ON COLUMN public.trade_listings.reactivated_at IS 'When the listing was last reactivated by its owner.';
COMMENT ON COLUMN public.trade_listings.reactivation_count IS 'How many times this listing has been reactivated after archiving/expiry.';

-- Backfill archived_at for already-archived listings
-- Use updated_at as best available proxy since we didn't track this before
UPDATE public.trade_listings
SET archived_at = updated_at
WHERE status = 'archived'
  AND archived_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. Update reactivate_listing RPC to track reactivation
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reactivate_listing(
  p_listing_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only the listing owner can reactivate
  IF NOT EXISTS (
    SELECT 1 FROM trade_listings
    WHERE id = p_listing_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to reactivate this listing';
  END IF;

  UPDATE trade_listings
  SET
    status = 'active',
    last_owner_interaction_at = now(),
    expiry_warning_sent_at = NULL,
    expiry_scheduled_at = NULL,
    reactivated_at = now(),
    reactivation_count = reactivation_count + 1,
    archived_at = NULL,
    updated_at = now()
  WHERE id = p_listing_id
    AND user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.reactivate_listing(bigint) IS
  'Reactivates a listing that was marked for expiration or archived. Clears expiry warning and resets the 30-day inactivity window. Tracks reactivation count and timestamp.';

GRANT ALL ON FUNCTION public.reactivate_listing(bigint) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. Update process_retention_schedule to set archived_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_retention_schedule()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_item RECORD;
    v_delete_count INTEGER;
BEGIN
    FOR v_item IN
        SELECT *
        FROM retention_schedule
        WHERE processed_at IS NULL
        AND scheduled_for <= NOW()
        AND (legal_hold_until IS NULL OR legal_hold_until < NOW())
        ORDER BY scheduled_for ASC
    LOOP
        CASE v_item.entity_type
            WHEN 'listing' THEN
                -- Archive if expired due to inactivity, otherwise hard delete
                IF v_item.reason = 'expired' THEN
                    UPDATE trade_listings SET
                        status = 'archived',
                        archived_at = NOW(),  -- Track when archived
                        deleted_at = NULL,
                        updated_at = NOW()
                    WHERE id = v_item.entity_id::BIGINT;

                    v_delete_count := 1;
                ELSE
                    DELETE FROM trade_listings
                    WHERE id = v_item.entity_id::BIGINT
                    AND deleted_at IS NOT NULL;

                    GET DIAGNOSTICS v_delete_count = ROW_COUNT;
                END IF;

            WHEN 'template' THEN
                DELETE FROM collection_templates
                WHERE id = v_item.entity_id::BIGINT
                AND deleted_at IS NOT NULL;

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            WHEN 'user' THEN
                DELETE FROM profiles
                WHERE id = v_item.entity_id::UUID
                AND deleted_at IS NOT NULL;

                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            ELSE
                v_delete_count := 0;
        END CASE;

        UPDATE retention_schedule
        SET processed_at = NOW()
        WHERE id = v_item.id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'processed_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION public.process_retention_schedule() IS
  'Processes all pending retention schedules that are ready. Sets archived_at when archiving expired listings.';
