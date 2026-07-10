-- Migration: Archive Inactive Listings
-- Adds 'archived' status to listings check constraint, restricts select RLS policies,
-- filters archived listings from get_user_conversations, blocks access in get_listing_chats,
-- and updates process_retention_schedule to perform archiving instead of hard-deleting
-- for system-expired listings. Finally, backfills the 600+ pending inactive listings.

-- =========================================================================
-- 1. Update check constraint to allow 'archived' status
-- =========================================================================
ALTER TABLE public.trade_listings 
    DROP CONSTRAINT IF EXISTS trade_listings_status_check;

ALTER TABLE public.trade_listings
    ADD CONSTRAINT trade_listings_status_check 
    CHECK (status = ANY (ARRAY['active'::text, 'reserved'::text, 'completed'::text, 'sold'::text, 'removed'::text, 'ELIMINADO'::text, 'archived'::text]));

COMMENT ON COLUMN public.trade_listings.status IS 'Listing status: active, reserved, completed, sold, removed, ELIMINADO, archived';

-- =========================================================================
-- 2. Restrict Owner RLS Policy to exclude archived listings
-- =========================================================================
DROP POLICY IF EXISTS "Users can view own listings" ON public.trade_listings;
CREATE POLICY "Users can view own listings" ON public.trade_listings
    FOR SELECT USING (user_id = auth.uid() AND status != 'archived');

-- =========================================================================
-- 3. Update get_user_conversations to filter out archived listings
-- =========================================================================
DROP FUNCTION IF EXISTS public.get_user_conversations();

CREATE OR REPLACE FUNCTION public.get_user_conversations() 
RETURNS TABLE(
    listing_id bigint, 
    listing_title text, 
    listing_image_url text, 
    listing_status text, 
    counterparty_id uuid, 
    counterparty_nickname text, 
    counterparty_avatar_url text, 
    last_message text, 
    last_message_at timestamp with time zone, 
    unread_count bigint, 
    is_seller boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  WITH user_chats AS (
    SELECT DISTINCT
      tc.listing_id,
      CASE
        WHEN tl.user_id = auth.uid() THEN tc.sender_id
        ELSE tl.user_id
      END AS counterparty_id,
      tl.user_id = auth.uid() AS is_seller
    FROM trade_chats tc
    JOIN trade_listings tl ON tc.listing_id = tl.id
    WHERE tc.listing_id IS NOT NULL
    AND (
      tc.sender_id = auth.uid()
      OR tc.receiver_id = auth.uid()
      OR tl.user_id = auth.uid()
    )
  ),
  last_messages AS (
    SELECT
      uc.listing_id,
      uc.counterparty_id,
      tc.message AS last_message,
      tc.created_at AS last_message_at,
      ROW_NUMBER() OVER (
        PARTITION BY uc.listing_id, uc.counterparty_id
        ORDER BY tc.created_at DESC
      ) AS rn
    FROM user_chats uc
    JOIN trade_chats tc ON tc.listing_id = uc.listing_id
    WHERE tc.is_system = FALSE
    AND (
      (uc.is_seller = TRUE AND tc.sender_id = uc.counterparty_id)
      OR (uc.is_seller = FALSE AND tc.receiver_id = auth.uid())
      OR (uc.is_seller = FALSE AND tc.sender_id = auth.uid())
      OR (uc.is_seller = TRUE AND tc.receiver_id = auth.uid())
    )
  ),
  unread_counts AS (
    SELECT
      uc.listing_id,
      uc.counterparty_id,
      COUNT(*) AS unread_count
    FROM user_chats uc
    JOIN trade_chats tc ON tc.listing_id = uc.listing_id
    WHERE tc.is_read = FALSE
    AND tc.receiver_id = auth.uid()
    AND (
      (uc.is_seller = TRUE AND tc.sender_id = uc.counterparty_id)
      OR (uc.is_seller = FALSE AND tc.sender_id = uc.counterparty_id)
    )
    GROUP BY uc.listing_id, uc.counterparty_id
  )
  SELECT
    uc.listing_id,
    tl.title AS listing_title,
    tl.image_url AS listing_image_url,
    tl.status AS listing_status,
    uc.counterparty_id,
    p.nickname AS counterparty_nickname,
    p.avatar_url AS counterparty_avatar_url,
    COALESCE(lm.last_message, '') AS last_message,
    lm.last_message_at,
    COALESCE(uc_count.unread_count, 0) AS unread_count,
    uc.is_seller
  FROM user_chats uc
  JOIN trade_listings tl ON tl.id = uc.listing_id
  JOIN profiles p ON p.id = uc.counterparty_id
  LEFT JOIN last_messages lm ON lm.listing_id = uc.listing_id
    AND lm.counterparty_id = uc.counterparty_id
    AND lm.rn = 1
  LEFT JOIN unread_counts uc_count ON uc_count.listing_id = uc.listing_id
    AND uc_count.counterparty_id = uc.counterparty_id
  WHERE uc.counterparty_id != auth.uid()
    AND p.is_suspended = false
    AND tl.status != 'archived' -- HIDE archived listings from Inbox
  ORDER BY COALESCE(lm.last_message_at, tl.created_at) DESC;
END;
$$;

-- =========================================================================
-- 4. Update get_listing_chats to block access for archived listings
-- =========================================================================
DROP FUNCTION IF EXISTS public.get_listing_chats(bigint, uuid);

CREATE OR REPLACE FUNCTION public.get_listing_chats(
    p_listing_id bigint, 
    p_participant_id uuid DEFAULT NULL::uuid
) 
RETURNS TABLE(
    id bigint, 
    sender_id uuid, 
    receiver_id uuid, 
    sender_nickname text, 
    message text, 
    is_read boolean, 
    is_system boolean, 
    created_at timestamp with time zone
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_listing_owner_id UUID;
    v_listing_status TEXT;
    v_has_chat_access BOOLEAN;
    v_reservation_buyer_id UUID;
    v_reservation_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner and status
    SELECT user_id, status INTO v_listing_owner_id, v_listing_status
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    -- Block access if listing is archived (unless admin)
    IF v_listing_status = 'archived' AND NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied: this listing and its chats have been archived';
    END IF;

    -- If listing doesn't exist, check if user has chat history
    IF v_listing_owner_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
        ) INTO v_has_chat_access;

        IF NOT v_has_chat_access THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        v_listing_owner_id := (
            SELECT DISTINCT
                CASE
                    WHEN trade_chats.sender_id = auth.uid() THEN trade_chats.receiver_id
                    ELSE trade_chats.sender_id
                END
            FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
            LIMIT 1
        );
    END IF;

    SELECT buyer_id, status INTO v_reservation_buyer_id, v_reservation_status
    FROM listing_transactions lt
    WHERE lt.listing_id = p_listing_id
    AND lt.status IN ('reserved', 'pending_completion', 'completed');

    -- Check if caller has access to read the chat messages
    IF auth.uid() != v_listing_owner_id 
       AND auth.uid() != COALESCE(p_participant_id, auth.uid()) 
       AND auth.uid() != v_reservation_buyer_id
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) 
    THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        tc.id,
        tc.sender_id,
        tc.receiver_id,
        p.nickname AS sender_nickname,
        tc.message,
        tc.is_read,
        tc.is_system,
        tc.created_at
    FROM trade_chats tc
    JOIN profiles p ON p.id = tc.sender_id
    WHERE tc.listing_id = p_listing_id
      AND (
          -- Owner sees all chats
          auth.uid() = v_listing_owner_id
          -- Buyer sees their own conversation
          OR tc.sender_id = auth.uid()
          OR tc.receiver_id = auth.uid()
          -- Admins see everything
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
      )
      AND (
          p_participant_id IS NULL
          OR tc.sender_id = p_participant_id
          OR tc.receiver_id = p_participant_id
      )
    ORDER BY tc.created_at ASC;
END;
$$;

-- =========================================================================
-- 5. Update process_retention_schedule to support archiving of system-expired listings
-- =========================================================================
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

-- =========================================================================
-- 6. One-time migration to immediately archive the 600+ listings pending hard delete
-- =========================================================================
DO $$
DECLARE
    v_archived_count INTEGER := 0;
BEGIN
    UPDATE public.trade_listings SET
        status = 'archived',
        deleted_at = NULL,
        updated_at = NOW()
    WHERE id IN (
        SELECT entity_id::BIGINT 
        FROM public.retention_schedule 
        WHERE entity_type = 'listing' 
        AND reason = 'expired'
        AND processed_at IS NULL
    );

    UPDATE public.retention_schedule SET
        processed_at = NOW()
    WHERE entity_type = 'listing'
    AND reason = 'expired'
    AND processed_at IS NULL;

    RAISE NOTICE 'Archived listings migration complete';
END $$;
