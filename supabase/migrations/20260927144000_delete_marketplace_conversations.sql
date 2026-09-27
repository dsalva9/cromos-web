-- Migration: Allow Deleting Marketplace Conversations
-- Mirrors the match chat hide & delete capability for marketplace chats:
-- 1. Creates deleted_marketplace_conversations table to track per-user deletion timestamps
-- 2. delete_marketplace_conversation() RPC
-- 3. Updates get_user_conversations() to exclude conversations where all messages are <= deleted_at
-- 4. Updates get_listing_chats() to filter out messages created <= deleted_at for the current user
-- 5. Updates get_listing_chat_participants() to respect seller deletion timestamp
-- 6. Updates send_listing_message() to auto-unhide hidden conversations on new message

-- =========================================================================
-- 1. Table: deleted_marketplace_conversations
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.deleted_marketplace_conversations (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id bigint NOT NULL REFERENCES public.trade_listings(id) ON DELETE CASCADE,
    counterparty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deleted_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, listing_id, counterparty_id)
);

CREATE INDEX IF NOT EXISTS idx_del_mp_conv_user ON public.deleted_marketplace_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_del_mp_conv_lookup ON public.deleted_marketplace_conversations (user_id, listing_id, counterparty_id);

ALTER TABLE public.deleted_marketplace_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deleted_marketplace_conversations' AND policyname = 'Users can view own deleted marketplace conversations'
  ) THEN
    CREATE POLICY "Users can view own deleted marketplace conversations"
      ON public.deleted_marketplace_conversations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deleted_marketplace_conversations' AND policyname = 'Users can insert own deleted marketplace conversations'
  ) THEN
    CREATE POLICY "Users can insert own deleted marketplace conversations"
      ON public.deleted_marketplace_conversations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deleted_marketplace_conversations' AND policyname = 'Users can update own deleted marketplace conversations'
  ) THEN
    CREATE POLICY "Users can update own deleted marketplace conversations"
      ON public.deleted_marketplace_conversations FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deleted_marketplace_conversations' AND policyname = 'Users can delete own deleted marketplace conversations'
  ) THEN
    CREATE POLICY "Users can delete own deleted marketplace conversations"
      ON public.deleted_marketplace_conversations FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT ALL ON TABLE public.deleted_marketplace_conversations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.deleted_marketplace_conversations_id_seq TO authenticated;

-- =========================================================================
-- 2. RPC: delete_marketplace_conversation
-- =========================================================================
CREATE OR REPLACE FUNCTION public.delete_marketplace_conversation(
    p_listing_id bigint,
    p_counterparty_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_me uuid := auth.uid();
BEGIN
    IF v_me IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify user is part of this listing or chat
    IF NOT EXISTS (
        SELECT 1 FROM trade_chats
        WHERE listing_id = p_listing_id
          AND (
            (sender_id = v_me AND receiver_id = p_counterparty_id)
            OR (sender_id = p_counterparty_id AND receiver_id = v_me)
          )
    ) AND NOT EXISTS (
        SELECT 1 FROM trade_listings
        WHERE id = p_listing_id AND user_id = v_me
    ) THEN
        RAISE EXCEPTION 'Conversation not found or access denied';
    END IF;

    -- Record deletion timestamp
    INSERT INTO public.deleted_marketplace_conversations (user_id, listing_id, counterparty_id, deleted_at)
    VALUES (v_me, p_listing_id, p_counterparty_id, now())
    ON CONFLICT (user_id, listing_id, counterparty_id)
    DO UPDATE SET deleted_at = now();

    -- Remove from hidden_conversations if it was hidden
    DELETE FROM public.hidden_conversations
    WHERE user_id = v_me
      AND listing_id = p_listing_id
      AND counterparty_id = p_counterparty_id;

    -- Clean up related notifications for this user
    DELETE FROM public.notifications
    WHERE user_id = v_me
      AND type IN ('listing_chat_message', 'new_message')
      AND (
          data->>'listing_id' = p_listing_id::text
          OR data->>'sender_id' = p_counterparty_id::text
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_marketplace_conversation(bigint, uuid) TO authenticated;

-- =========================================================================
-- 3. Update get_user_conversations()
-- =========================================================================
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
    is_seller boolean,
    counterparty_is_deleted boolean,
    listing_is_unavailable boolean,
    counterparty_is_pro boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  WITH
  user_listing_ids AS (
    SELECT DISTINCT tc.listing_id AS lid
    FROM trade_chats tc
    WHERE tc.listing_id IS NOT NULL
      AND (tc.sender_id = v_user_id OR tc.receiver_id = v_user_id)
  ),
  owned_listing_ids AS (
    SELECT tl.id AS lid
    FROM trade_listings tl
    WHERE tl.user_id = v_user_id
      AND EXISTS (
        SELECT 1 FROM trade_chats tc2
        WHERE tc2.listing_id = tl.id AND tc2.listing_id IS NOT NULL
      )
  ),
  all_listing_ids AS (
    SELECT lid FROM user_listing_ids
    UNION
    SELECT lid FROM owned_listing_ids
  ),
  user_chats AS (
    SELECT DISTINCT
      ali.lid AS listing_id,
      CASE
        WHEN tl.user_id = v_user_id THEN tc.sender_id
        WHEN tc.sender_id = v_user_id THEN tc.receiver_id
        ELSE COALESCE(tl.user_id, tc.sender_id)
      END AS counterparty_id,
      COALESCE(tl.user_id = v_user_id, false) AS is_seller
    FROM all_listing_ids ali
    JOIN trade_chats tc ON tc.listing_id = ali.lid
    LEFT JOIN trade_listings tl ON tl.id = ali.lid
    WHERE tc.sender_id = v_user_id
       OR tc.receiver_id = v_user_id
       OR tl.user_id = v_user_id
  ),
  valid_user_chats AS (
    SELECT uc.*, dmc.deleted_at
    FROM user_chats uc
    LEFT JOIN deleted_marketplace_conversations dmc
      ON dmc.user_id = v_user_id
     AND dmc.listing_id = uc.listing_id
     AND dmc.counterparty_id = uc.counterparty_id
    WHERE uc.counterparty_id IS NOT NULL
      AND uc.counterparty_id != v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM hidden_conversations hc
        WHERE hc.user_id = v_user_id
          AND hc.listing_id = uc.listing_id
          AND hc.counterparty_id = uc.counterparty_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM ignored_listings il
        WHERE il.user_id = v_user_id
          AND il.listing_id = uc.listing_id
      )
  ),
  last_messages AS (
    SELECT DISTINCT ON (vuc.listing_id, vuc.counterparty_id)
      vuc.listing_id,
      vuc.counterparty_id,
      tc.message AS last_message,
      tc.created_at AS last_message_at
    FROM valid_user_chats vuc
    JOIN trade_chats tc ON tc.listing_id = vuc.listing_id
    WHERE tc.is_system = FALSE
      AND (vuc.deleted_at IS NULL OR tc.created_at > vuc.deleted_at)
      AND (
        (tc.sender_id = v_user_id AND tc.receiver_id = vuc.counterparty_id)
        OR (tc.sender_id = vuc.counterparty_id AND tc.receiver_id = v_user_id)
      )
    ORDER BY vuc.listing_id, vuc.counterparty_id, tc.created_at DESC
  ),
  unread_counts AS (
    SELECT
      vuc.listing_id,
      vuc.counterparty_id,
      COUNT(*) AS unread_count
    FROM valid_user_chats vuc
    JOIN trade_chats tc ON tc.listing_id = vuc.listing_id
    WHERE tc.is_read = FALSE
      AND tc.receiver_id = v_user_id
      AND tc.sender_id = vuc.counterparty_id
      AND (vuc.deleted_at IS NULL OR tc.created_at > vuc.deleted_at)
    GROUP BY vuc.listing_id, vuc.counterparty_id
  )
  SELECT
    vuc.listing_id,
    COALESCE(tl.title, 'Anuncio') AS listing_title,
    tl.image_url AS listing_image_url,
    COALESCE(tl.status, 'archived') AS listing_status,
    vuc.counterparty_id,
    COALESCE(p.nickname, 'Usuario eliminado') AS counterparty_nickname,
    p.avatar_url AS counterparty_avatar_url,
    COALESCE(lm.last_message, '') AS last_message,
    lm.last_message_at,
    COALESCE(uc_count.unread_count, 0)::bigint AS unread_count,
    vuc.is_seller,
    (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.is_suspended = true) AS counterparty_is_deleted,
    (tl.id IS NULL OR tl.status IN ('archived', 'removed')) AS listing_is_unavailable,
    COALESCE(p.is_pro, false) AS counterparty_is_pro
  FROM valid_user_chats vuc
  LEFT JOIN trade_listings tl ON tl.id = vuc.listing_id
  LEFT JOIN profiles p ON p.id = vuc.counterparty_id
  LEFT JOIN last_messages lm ON lm.listing_id = vuc.listing_id
    AND lm.counterparty_id = vuc.counterparty_id
  LEFT JOIN unread_counts uc_count ON uc_count.listing_id = vuc.listing_id
    AND uc_count.counterparty_id = vuc.counterparty_id
  WHERE (vuc.deleted_at IS NULL OR (lm.last_message_at IS NOT NULL AND lm.last_message_at > vuc.deleted_at))
  ORDER BY
    (CASE WHEN COALESCE(p.is_pro, false) AND COALESCE(uc_count.unread_count, 0) > 0 THEN 0 ELSE 1 END),
    COALESCE(lm.last_message_at, tl.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated;

-- =========================================================================
-- 4. Update get_listing_chats()
-- =========================================================================
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
    created_at timestamp with time zone,
    image_url text,
    thumbnail_url text
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
    v_me UUID := auth.uid();
BEGIN
    IF v_me IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner and status
    SELECT user_id, status INTO v_listing_owner_id, v_listing_status
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    -- If listing doesn't exist, check if user has chat history
    IF v_listing_owner_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = v_me OR trade_chats.receiver_id = v_me)
        ) INTO v_has_chat_access;

        IF NOT v_has_chat_access THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        v_listing_owner_id := (
            SELECT DISTINCT
                CASE
                    WHEN trade_chats.sender_id = v_me THEN trade_chats.receiver_id
                    ELSE trade_chats.sender_id
                END
            FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = v_me OR trade_chats.receiver_id = v_me)
            LIMIT 1
        );
    END IF;

    SELECT buyer_id, status INTO v_reservation_buyer_id, v_reservation_status
    FROM listing_transactions lt
    WHERE lt.listing_id = p_listing_id
    AND lt.status IN ('reserved', 'pending_completion', 'completed')
    ORDER BY lt.created_at DESC
    LIMIT 1;

    -- Check if caller has access to read the chat messages
    IF v_me != v_listing_owner_id 
       AND v_me != COALESCE(p_participant_id, v_me) 
       AND v_me != v_reservation_buyer_id
       AND NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = v_me AND pr.is_admin = TRUE) 
    THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        tc.id,
        tc.sender_id,
        tc.receiver_id,
        COALESCE(p.nickname, 'Usuario eliminado')::text AS sender_nickname,
        tc.message,
        tc.is_read,
        tc.is_system,
        tc.created_at,
        tc.image_url,
        tc.thumbnail_url
    FROM trade_chats tc
    LEFT JOIN profiles p ON p.id = tc.sender_id
    WHERE tc.listing_id = p_listing_id
      AND (
          -- Owner sees all chats or filtered by selected participant
          (v_me = v_listing_owner_id AND (
              p_participant_id IS NULL
              OR tc.sender_id = p_participant_id
              OR tc.receiver_id = p_participant_id
          ))
          -- Non-owner sees only their own conversation with the owner
          OR (v_me != v_listing_owner_id AND (
              tc.sender_id = v_me
              OR tc.receiver_id = v_me
          ))
      )
      -- Filter out messages before deleted_at if this user deleted the conversation
      AND NOT EXISTS (
          SELECT 1 FROM deleted_marketplace_conversations dmc
          WHERE dmc.user_id = v_me
            AND dmc.listing_id = p_listing_id
            AND dmc.counterparty_id = (CASE WHEN tc.sender_id = v_me THEN tc.receiver_id ELSE tc.sender_id END)
            AND tc.created_at <= dmc.deleted_at
      )
    ORDER BY tc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_chats(bigint, uuid) TO authenticated;

-- =========================================================================
-- 5. Update get_listing_chat_participants()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_listing_chat_participants(p_listing_id bigint)
RETURNS TABLE(
    user_id uuid,
    nickname text,
    avatar_url text,
    is_owner boolean,
    last_message text,
    last_message_at timestamp with time zone,
    unread_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_listing_owner_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    SELECT tl.user_id INTO v_listing_owner_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    IF v_listing_owner_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF auth.uid() != v_listing_owner_id THEN
        RAISE EXCEPTION 'Only the listing owner can view participants';
    END IF;

    RETURN QUERY
    WITH participant_messages AS (
        SELECT DISTINCT ON (
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END
        )
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END AS participant_id,
            tc.message AS last_msg,
            tc.created_at AS last_msg_at
        FROM trade_chats tc
        WHERE tc.listing_id = p_listing_id
          AND NOT EXISTS (
            SELECT 1 FROM deleted_marketplace_conversations dmc
            WHERE dmc.user_id = v_listing_owner_id
              AND dmc.listing_id = p_listing_id
              AND dmc.counterparty_id = (CASE WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id ELSE tc.sender_id END)
              AND tc.created_at <= dmc.deleted_at
          )
        ORDER BY
            CASE
                WHEN tc.sender_id = v_listing_owner_id THEN tc.receiver_id
                ELSE tc.sender_id
            END,
            tc.created_at DESC
    ),
    unread_counts AS (
        SELECT
            tc.sender_id AS participant_id,
            COUNT(*) AS unread
        FROM trade_chats tc
        WHERE tc.listing_id = p_listing_id
        AND tc.receiver_id = v_listing_owner_id
        AND tc.is_read = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM deleted_marketplace_conversations dmc
            WHERE dmc.user_id = v_listing_owner_id
              AND dmc.listing_id = p_listing_id
              AND dmc.counterparty_id = tc.sender_id
              AND tc.created_at <= dmc.deleted_at
        )
        GROUP BY tc.sender_id
    )
    SELECT
        prof.id AS user_id,
        COALESCE(prof.nickname, 'Usuario')::text,
        prof.avatar_url,
        (prof.id = v_listing_owner_id) AS is_owner,
        pm.last_msg AS last_message,
        pm.last_msg_at AS last_message_at,
        COALESCE(uc.unread, 0)::INTEGER AS unread_count
    FROM profiles prof
    INNER JOIN participant_messages pm ON prof.id = pm.participant_id
    LEFT JOIN unread_counts uc ON prof.id = uc.participant_id
    ORDER BY pm.last_msg_at DESC;
END;
$$;

GRANT ALL ON FUNCTION public.get_listing_chat_participants(bigint) TO authenticated;

-- =========================================================================
-- 6. Update send_listing_message() with auto-unhide
-- =========================================================================
CREATE OR REPLACE FUNCTION public.send_listing_message(
    p_listing_id bigint, 
    p_receiver_id uuid, 
    p_message text, 
    p_image_url text DEFAULT NULL::text, 
    p_thumbnail_url text DEFAULT NULL::text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_listing_user_id UUID;
    v_message_id BIGINT;
    v_message_length INTEGER := 500;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF TRIM(p_message) = '' AND p_image_url IS NULL THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;

    IF LENGTH(p_message) > v_message_length THEN
        RAISE EXCEPTION 'Message cannot be longer than 500 characters';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_receiver_id) THEN
        RAISE EXCEPTION 'Receiver not found';
    END IF;

    -- Block sending if receiver is deleted or suspended
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_receiver_id 
        AND (deleted_at IS NOT NULL OR is_suspended = true)
    ) THEN
        RAISE EXCEPTION 'Cannot send message: user is no longer available';
    END IF;

    IF auth.uid() = p_receiver_id THEN
        RAISE EXCEPTION 'You cannot send messages to yourself';
    END IF;

    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_listing_user_id IS NULL THEN
        -- If listing is deleted, check existing chat relationship
        IF NOT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE listing_id = p_listing_id
            AND (
                (sender_id = auth.uid() AND receiver_id = p_receiver_id)
                OR (sender_id = p_receiver_id AND receiver_id = auth.uid())
            )
        ) THEN
            RAISE EXCEPTION 'Listing not found';
        END IF;
    ELSE
        IF auth.uid() != v_listing_user_id THEN
            IF p_receiver_id != v_listing_user_id THEN
                RAISE EXCEPTION 'You can only send messages to the listing owner';
            END IF;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM trade_chats
                WHERE listing_id = p_listing_id
                AND sender_id = p_receiver_id
            ) THEN
                RAISE EXCEPTION 'You can only reply to users who have messaged you';
            END IF;
        END IF;
    END IF;

    INSERT INTO trade_chats (
        listing_id, sender_id, receiver_id, message, is_read, image_url, thumbnail_url
    ) VALUES (
        p_listing_id, auth.uid(), p_receiver_id, TRIM(p_message), FALSE, p_image_url, p_thumbnail_url
    ) RETURNING id INTO v_message_id;

    -- Auto-unhide for receiver and sender
    DELETE FROM public.hidden_conversations
    WHERE listing_id = p_listing_id
      AND (
        (user_id = p_receiver_id AND counterparty_id = auth.uid())
        OR (user_id = auth.uid() AND counterparty_id = p_receiver_id)
      );

    RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_listing_message(bigint, uuid, text, text, text) TO authenticated;
