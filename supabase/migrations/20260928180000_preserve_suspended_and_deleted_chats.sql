-- Migration: Preserve chats with suspended and deleted users
-- Description:
-- 1. Allow authenticated users to view profiles of their chat counterparties (even if suspended/deleted)
--    using a SECURITY DEFINER helper function to avoid infinite RLS recursion.
-- 2. Update get_user_conversations() to distinguish between counterparty_is_suspended and counterparty_is_deleted,
--    and preserve counterparty nickname instead of masking.
-- 3. Update get_match_conversations() to distinguish between other_user_is_suspended and other_user_is_deleted.
-- 4. Update get_listing_chat_participants() to LEFT JOIN profiles and return is_suspended and is_deleted.

-- 1. Helper function to check if a user is a chat counterparty
CREATE OR REPLACE FUNCTION public.is_chat_counterparty(p_target_user_id uuid, p_viewer_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trade_chats
    WHERE (sender_id = p_target_user_id AND receiver_id = p_viewer_user_id)
       OR (receiver_id = p_target_user_id AND sender_id = p_viewer_user_id)
  ) OR EXISTS (
    SELECT 1 FROM match_conversations
    WHERE (user_a_id = p_target_user_id AND user_b_id = p_viewer_user_id)
       OR (user_b_id = p_target_user_id AND user_a_id = p_viewer_user_id)
  );
$$;

-- 2. RLS policy on profiles allowing chat counterparties to read profile info (for nickname, avatar, status)
DROP POLICY IF EXISTS "Chat counterparties can view profile status" ON public.profiles;
CREATE POLICY "Chat counterparties can view profile status"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_chat_counterparty(id, auth.uid())
);

-- 3. get_user_conversations()
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
  counterparty_is_pro boolean,
  counterparty_is_suspended boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
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
        WHEN tl.user_id = v_user_id THEN (CASE WHEN tc.sender_id = v_user_id THEN tc.receiver_id ELSE tc.sender_id END)
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
    COALESCE(p.nickname, 'Usuario eliminado')::text AS counterparty_nickname,
    p.avatar_url AS counterparty_avatar_url,
    COALESCE(lm.last_message, '') AS last_message,
    lm.last_message_at,
    COALESCE(uc_count.unread_count, 0)::bigint AS unread_count,
    vuc.is_seller,
    (p.id IS NULL OR p.deleted_at IS NOT NULL) AS counterparty_is_deleted,
    (tl.id IS NULL OR tl.status IN ('archived', 'removed')) AS listing_is_unavailable,
    COALESCE(p.is_pro, false) AS counterparty_is_pro,
    (COALESCE(p.is_suspended, false) = true AND p.deleted_at IS NULL) AS counterparty_is_suspended
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

-- 4. get_match_conversations()
CREATE OR REPLACE FUNCTION public.get_match_conversations()
RETURNS TABLE(
  id bigint,
  created_at timestamp with time zone,
  other_user_id uuid,
  other_nickname text,
  other_avatar_url text,
  template_id integer,
  template_title text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint,
  other_is_patron boolean,
  other_user_is_deleted boolean,
  other_is_pro boolean,
  other_user_is_suspended boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    mc.id,
    mc.created_at,
    CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END AS other_user_id,
    COALESCE(p.nickname, 'Usuario eliminado')::text AS other_nickname,
    p.avatar_url::text AS other_avatar_url,
    mc.template_id,
    t.title::text AS template_title,
    mc.last_message::text,
    mc.last_message_at,
    COALESCE((
      SELECT COUNT(*)
      FROM trade_chats tc
      WHERE tc.match_conversation_id = mc.id
        AND tc.receiver_id = v_me
        AND tc.is_read = false
        AND tc.created_at > COALESCE(CASE WHEN mc.user_a_id = v_me THEN mc.user_a_deleted_at ELSE mc.user_b_deleted_at END, '1970-01-01'::timestamptz)
    ), 0) AS unread_count,
    COALESCE(p.is_patron, false) AS other_is_patron,
    (p.id IS NULL OR p.deleted_at IS NOT NULL) AS other_user_is_deleted,
    COALESCE(p.is_pro, false) AS other_is_pro,
    (COALESCE(p.is_suspended, false) = true AND p.deleted_at IS NULL) AS other_user_is_suspended
  FROM match_conversations mc
  LEFT JOIN profiles p ON p.id = CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END
  LEFT JOIN collection_templates t ON t.id = mc.template_id
  WHERE (mc.user_a_id = v_me OR mc.user_b_id = v_me)
    -- Filter out hidden conversations
    AND NOT EXISTS (
      SELECT 1 FROM hidden_conversations hc
      WHERE hc.user_id = v_me
        AND hc.match_conversation_id = mc.id
    )
    -- Filter out deleted conversations unless a new message arrived after deletion
    AND (
      (mc.user_a_id = v_me AND (mc.user_a_deleted_at IS NULL OR (mc.last_message_at IS NOT NULL AND mc.last_message_at > mc.user_a_deleted_at)))
      OR
      (mc.user_b_id = v_me AND (mc.user_b_deleted_at IS NULL OR (mc.last_message_at IS NOT NULL AND mc.last_message_at > mc.user_b_deleted_at)))
    )
  ORDER BY
    (CASE WHEN COALESCE((
      SELECT COUNT(*)
      FROM trade_chats tc2
      WHERE tc2.match_conversation_id = mc.id
        AND tc2.receiver_id = v_me
        AND tc2.is_read = false
        AND tc2.created_at > COALESCE(CASE WHEN mc.user_a_id = v_me THEN mc.user_a_deleted_at ELSE mc.user_b_deleted_at END, '1970-01-01'::timestamptz)
    ), 0) > 0 AND COALESCE(p.is_pro, false) THEN 1 ELSE 0 END) DESC,
    mc.last_message_at DESC NULLS LAST,
    mc.created_at DESC;
END;
$$;

-- 5. get_listing_chat_participants()
CREATE OR REPLACE FUNCTION public.get_listing_chat_participants(p_listing_id bigint)
RETURNS TABLE(
  user_id uuid,
  nickname text,
  avatar_url text,
  is_owner boolean,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count integer,
  is_suspended boolean,
  is_deleted boolean
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
        pm.participant_id AS user_id,
        COALESCE(prof.nickname, 'Usuario eliminado')::text AS nickname,
        prof.avatar_url,
        (pm.participant_id = v_listing_owner_id) AS is_owner,
        pm.last_msg AS last_message,
        pm.last_msg_at AS last_message_at,
        COALESCE(uc.unread, 0)::INTEGER AS unread_count,
        (COALESCE(prof.is_suspended, false) = true AND prof.deleted_at IS NULL) AS is_suspended,
        (prof.id IS NULL OR prof.deleted_at IS NOT NULL) AS is_deleted
    FROM participant_messages pm
    LEFT JOIN profiles prof ON prof.id = pm.participant_id
    LEFT JOIN unread_counts uc ON pm.participant_id = uc.participant_id
    ORDER BY pm.last_msg_at DESC;
END;
$$;
