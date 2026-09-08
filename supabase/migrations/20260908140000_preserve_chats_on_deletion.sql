-- Migration: Preserve Chats on Listing Deletion/Archival and User Deletion
-- Ensures conversations and messages remain accessible to participants:
-- 1. get_user_conversations: does not filter archived listings or suspended/deleted users, returns counterparty_is_deleted and listing_is_unavailable
-- 2. get_listing_chats: removes restriction blocking archived listing chats
-- 3. get_match_conversations: does not hide deleted users, returns other_user_is_deleted
-- 4. send_listing_message: blocks sending if receiver is deleted/suspended
-- 5. send_match_message: blocks sending if counterparty is deleted/suspended
-- 6. hard_delete_listing: archives listing instead of deleting when chats exist
-- 7. process_retention_schedule: archives listings with chats, tombstones users with chats
-- 8. admin_permanently_delete_user: archives listings with chats, tombstones profiles with chats
-- 9. RLS policies: allows participants to view chat messages, listing metadata, and counterparty status

-- =========================================================================
-- 1. Update get_user_conversations()
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
    is_seller boolean,
    counterparty_is_deleted boolean,
    listing_is_unavailable boolean
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
        WHEN tc.sender_id = auth.uid() THEN tc.receiver_id
        ELSE COALESCE(tl.user_id, tc.sender_id)
      END AS counterparty_id,
      (tl.user_id = auth.uid()) AS is_seller
    FROM trade_chats tc
    LEFT JOIN trade_listings tl ON tc.listing_id = tl.id
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
    COALESCE(tl.title, 'Anuncio') AS listing_title,
    tl.image_url AS listing_image_url,
    COALESCE(tl.status, 'archived') AS listing_status,
    uc.counterparty_id,
    COALESCE(p.nickname, 'Usuario eliminado') AS counterparty_nickname,
    p.avatar_url AS counterparty_avatar_url,
    COALESCE(lm.last_message, '') AS last_message,
    lm.last_message_at,
    COALESCE(uc_count.unread_count, 0) AS unread_count,
    uc.is_seller,
    (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.is_suspended = true) AS counterparty_is_deleted,
    (tl.id IS NULL OR tl.status IN ('archived', 'removed')) AS listing_is_unavailable
  FROM user_chats uc
  LEFT JOIN trade_listings tl ON tl.id = uc.listing_id
  LEFT JOIN profiles p ON p.id = uc.counterparty_id
  LEFT JOIN last_messages lm ON lm.listing_id = uc.listing_id
    AND lm.counterparty_id = uc.counterparty_id
    AND lm.rn = 1
  LEFT JOIN unread_counts uc_count ON uc_count.listing_id = uc.listing_id
    AND uc_count.counterparty_id = uc.counterparty_id
  WHERE uc.counterparty_id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM hidden_conversations hc
      WHERE hc.user_id = auth.uid()
        AND hc.listing_id = uc.listing_id
        AND hc.counterparty_id = uc.counterparty_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM ignored_listings il
      WHERE il.user_id = auth.uid()
        AND il.listing_id = uc.listing_id
    )
  ORDER BY COALESCE(lm.last_message_at, tl.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated;

-- =========================================================================
-- 2. Update get_listing_chats()
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
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner and status
    SELECT user_id, status INTO v_listing_owner_id, v_listing_status
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    -- NOTE: Archived listings are no longer blocked. Chat participants can always view chat history.

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
    AND lt.status IN ('reserved', 'pending_completion', 'completed')
    ORDER BY lt.created_at DESC
    LIMIT 1;

    -- Check if caller has access to read the chat messages
    IF auth.uid() != v_listing_owner_id 
       AND auth.uid() != COALESCE(p_participant_id, auth.uid()) 
       AND auth.uid() != v_reservation_buyer_id
       AND NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.is_admin = TRUE) 
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
          (auth.uid() = v_listing_owner_id AND (
              p_participant_id IS NULL
              OR tc.sender_id = p_participant_id
              OR tc.receiver_id = p_participant_id
          ))
          -- Non-owner sees only their own conversation with the owner
          OR (auth.uid() != v_listing_owner_id AND (
              tc.sender_id = auth.uid()
              OR tc.receiver_id = auth.uid()
          ))
      )
    ORDER BY tc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_chats(bigint, uuid) TO authenticated;

-- =========================================================================
-- 3. Update get_match_conversations()
-- =========================================================================
DROP FUNCTION IF EXISTS public.get_match_conversations();

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
  other_user_is_deleted boolean
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
    ), 0) AS unread_count,
    COALESCE(p.is_patron, false) AS other_is_patron,
    (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.is_suspended = true) AS other_user_is_deleted
  FROM match_conversations mc
  LEFT JOIN profiles p ON p.id = CASE WHEN mc.user_a_id = v_me THEN mc.user_b_id ELSE mc.user_a_id END
  LEFT JOIN collection_templates t ON t.id = mc.template_id
  WHERE mc.user_a_id = v_me OR mc.user_b_id = v_me
  ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_conversations() TO authenticated;

-- =========================================================================
-- 4. Update send_listing_message()
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

    RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_listing_message(bigint, uuid, text, text, text) TO authenticated;

-- =========================================================================
-- 5. Update send_match_message()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.send_match_message(
    p_conversation_id bigint, 
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
  v_me uuid := auth.uid();
  v_other_user_id uuid;
  v_msg_id bigint;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF length(trim(p_message)) = 0 AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Message too long (max 2000 chars)';
  END IF;

  -- Get other user from conversation
  SELECT CASE WHEN user_a_id = v_me THEN user_b_id ELSE user_a_id END
  INTO v_other_user_id
  FROM match_conversations
  WHERE match_conversations.id = p_conversation_id
    AND (user_a_id = v_me OR user_b_id = v_me);

  IF v_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  -- Block sending if other participant is deleted or suspended
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_other_user_id
    AND (deleted_at IS NOT NULL OR is_suspended = true)
  ) THEN
    RAISE EXCEPTION 'Cannot send message: user is no longer available';
  END IF;

  -- Insert message
  INSERT INTO trade_chats (
    match_conversation_id, sender_id, receiver_id,
    message, image_url, thumbnail_url, is_read, is_system
  )
  VALUES (
    p_conversation_id, v_me, v_other_user_id,
    trim(p_message), p_image_url, p_thumbnail_url, false, false
  )
  RETURNING trade_chats.id INTO v_msg_id;

  -- Update conversation denormalized fields
  UPDATE match_conversations
  SET last_message = trim(p_message),
      last_message_at = now(),
      last_message_sender_id = v_me
  WHERE match_conversations.id = p_conversation_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_match_message(bigint, text, text, text) TO authenticated;

-- =========================================================================
-- 6. Update hard_delete_listing()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.hard_delete_listing(p_listing_id bigint)
RETURNS TABLE(success boolean, message text, deleted_chat_count integer, deleted_transaction_count integer, media_files_deleted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing_user_id UUID;
  v_listing_status TEXT;
  v_chat_count INTEGER := 0;
  v_transaction_count INTEGER := 0;
  v_media_count INTEGER := 0;
  v_image_url TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT user_id, status, image_url 
  INTO v_listing_user_id, v_listing_status, v_image_url
  FROM trade_listings 
  WHERE id = p_listing_id;
  
  IF v_listing_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Listing not found'::TEXT, 0, 0, 0;
    RETURN;
  END IF;
  
  IF v_listing_user_id <> v_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND is_admin = true
  ) THEN
    RETURN QUERY SELECT false, 'Permission denied: You can only delete your own listings'::TEXT, 0, 0, 0;
    RETURN;
  END IF;
  
  IF v_listing_status::TEXT NOT IN ('ELIMINADO', 'removed', 'archived') THEN
    RETURN QUERY SELECT false, 'Can only hard delete listings with ELIMINADO or removed status'::TEXT, 0, 0, 0;
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO v_chat_count
  FROM trade_chats 
  WHERE listing_id = p_listing_id;
  
  SELECT COUNT(*) INTO v_transaction_count
  FROM listing_transactions 
  WHERE listing_id = p_listing_id;
  
  -- If listing has chats, archive it instead of hard deleting to preserve conversation history
  IF v_chat_count > 0 THEN
    UPDATE trade_listings SET
      status = 'archived',
      archived_at = NOW(),
      deleted_at = NULL,
      updated_at = NOW()
    WHERE id = p_listing_id;

    DELETE FROM listing_transactions WHERE listing_id = p_listing_id;
    DELETE FROM favourites WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
    DELETE FROM reports WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;

    RETURN QUERY SELECT 
      true, 
      'Listing archived to preserve chat history'::TEXT, 
      0, 
      v_transaction_count, 
      0;
    RETURN;
  END IF;

  -- Otherwise delete related data
  DELETE FROM trade_chats WHERE listing_id = p_listing_id;
  DELETE FROM listing_transactions WHERE listing_id = p_listing_id;
  DELETE FROM favourites WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
  DELETE FROM reports WHERE target_type = 'listing' AND target_id = p_listing_id::TEXT;
  
  IF v_image_url IS NOT NULL AND v_image_url <> '' THEN
    BEGIN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'sticker-images' 
      AND (
        v_image_url LIKE '%' || id || '%' OR
        v_image_url LIKE '%' || name || '%'
      );
      GET DIAGNOSTICS v_media_count = ROW_COUNT;
    EXCEPTION
      WHEN OTHERS THEN
        v_media_count := 0;
    END;
  END IF;
  
  DELETE FROM trade_listings WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Failed to delete listing'::TEXT, v_chat_count, v_transaction_count, v_media_count;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    'Listing and all associated data deleted permanently'::TEXT, 
    v_chat_count, 
    v_transaction_count, 
    v_media_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hard_delete_listing(bigint) TO authenticated;

-- =========================================================================
-- 7. Update process_retention_schedule()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.process_retention_schedule()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
                IF v_item.reason = 'user_deleted' THEN
                    IF EXISTS (SELECT 1 FROM trade_chats WHERE listing_id = v_item.entity_id::BIGINT) THEN
                        UPDATE trade_listings SET
                            status = 'archived',
                            archived_at = NOW(),
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
                ELSE
                    UPDATE trade_listings SET
                        status = 'archived',
                        archived_at = NOW(),
                        deleted_at = NULL,
                        updated_at = NOW()
                    WHERE id = v_item.entity_id::BIGINT;
                    v_delete_count := 1;
                END IF;

            WHEN 'template' THEN
                DELETE FROM collection_templates
                WHERE id = v_item.entity_id::BIGINT
                AND deleted_at IS NOT NULL;
                GET DIAGNOSTICS v_delete_count = ROW_COUNT;

            WHEN 'user' THEN
                IF EXISTS (
                    SELECT 1 FROM trade_chats WHERE sender_id = v_item.entity_id::UUID OR receiver_id = v_item.entity_id::UUID
                ) OR EXISTS (
                    SELECT 1 FROM match_conversations WHERE user_a_id = v_item.entity_id::UUID OR user_b_id = v_item.entity_id::UUID
                ) THEN
                    UPDATE profiles SET
                        nickname = 'Usuario eliminado',
                        avatar_url = NULL,
                        postcode = NULL,
                        onesignal_player_id = NULL,
                        notification_preferences = '{"push_enabled": false, "email_enabled": false}'::jsonb,
                        deleted_at = COALESCE(deleted_at, NOW()),
                        is_suspended = true,
                        updated_at = NOW()
                    WHERE id = v_item.entity_id::UUID;
                    v_delete_count := 1;
                ELSE
                    DELETE FROM profiles
                    WHERE id = v_item.entity_id::UUID
                    AND deleted_at IS NOT NULL;
                    GET DIAGNOSTICS v_delete_count = ROW_COUNT;
                END IF;

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
-- 8. Update admin_permanently_delete_user() and admin_purge_user()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_permanently_delete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    v_admin_id UUID;
    v_user_nickname TEXT;
    v_user_email TEXT;
    v_is_on_legal_hold BOOLEAN;
    v_has_conversations BOOLEAN;
BEGIN
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Only admins can permanently delete users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    SELECT nickname INTO v_user_nickname
    FROM profiles
    WHERE id = p_user_id;

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    SELECT EXISTS (
        SELECT 1 FROM retention_schedule
        WHERE entity_id = p_user_id::TEXT
            AND entity_type = 'user'
            AND legal_hold_until IS NOT NULL
            AND legal_hold_until > NOW()
    ) INTO v_is_on_legal_hold;

    IF v_is_on_legal_hold THEN
        RAISE EXCEPTION 'Cannot delete user % - currently on legal hold', v_user_nickname;
    END IF;

    INSERT INTO audit_log (
        entity, entity_id, action, admin_id, user_id,
        moderation_action_type, moderated_entity_type, moderated_entity_id,
        moderation_reason, after_json, created_at
    ) VALUES (
        'moderation', NULL, 'moderation', v_admin_id, p_user_id,
        'permanent_delete_user', 'user', NULL,
        'Admin initiated permanent deletion',
        jsonb_build_object(
            'user_id', p_user_id,
            'nickname', v_user_nickname,
            'email', v_user_email,
            'deleted_by_admin', v_admin_id,
            'deleted_at', NOW()
        ),
        NOW()
    );

    DELETE FROM retention_schedule
    WHERE entity_id = p_user_id::TEXT
        AND entity_type = 'user';

    DELETE FROM xp_history WHERE user_id = p_user_id;
    DELETE FROM user_badge_progress WHERE user_id = p_user_id;
    DELETE FROM user_badges WHERE user_id = p_user_id;
    DELETE FROM notifications WHERE user_id = p_user_id;
    DELETE FROM trade_reads WHERE user_id = p_user_id;
    DELETE FROM trade_finalizations WHERE user_id = p_user_id;

    -- Archive listings that have chats to preserve chat context; delete the rest
    UPDATE trade_listings SET
        status = 'archived',
        archived_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND EXISTS (SELECT 1 FROM trade_chats WHERE listing_id = trade_listings.id);

    DELETE FROM listing_transactions WHERE listing_id IN (
        SELECT id FROM trade_listings WHERE user_id = p_user_id
    );

    DELETE FROM trade_listings 
    WHERE user_id = p_user_id
      AND NOT EXISTS (SELECT 1 FROM trade_chats WHERE listing_id = trade_listings.id);

    -- Delete trade proposals
    DELETE FROM trade_proposal_items WHERE proposal_id IN (
        SELECT id FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id
    );
    DELETE FROM trade_proposals WHERE from_user = p_user_id OR to_user = p_user_id;

    DELETE FROM user_template_progress WHERE user_id = p_user_id;
    DELETE FROM user_template_copies WHERE user_id = p_user_id;

    DELETE FROM template_slots WHERE template_id IN (
        SELECT ct.id FROM collection_templates ct
        WHERE ct.author_id = p_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_template_copies utc
              WHERE utc.template_id = ct.id
          )
    );
    DELETE FROM template_pages WHERE template_id IN (
        SELECT ct.id FROM collection_templates ct
        WHERE ct.author_id = p_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_template_copies utc
              WHERE utc.template_id = ct.id
          )
    );
    DELETE FROM template_ratings WHERE template_id IN (
        SELECT id FROM collection_templates WHERE author_id = p_user_id
    );
    DELETE FROM collection_templates WHERE author_id = p_user_id;

    DELETE FROM user_ratings WHERE rater_id = p_user_id OR rated_id = p_user_id;
    DELETE FROM favourites WHERE user_id = p_user_id;
    DELETE FROM reports WHERE reporter_id = p_user_id;
    DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;

    -- Check if user has chats or match conversations to preserve
    SELECT (
        EXISTS (SELECT 1 FROM trade_chats WHERE sender_id = p_user_id OR receiver_id = p_user_id)
        OR EXISTS (SELECT 1 FROM match_conversations WHERE user_a_id = p_user_id OR user_b_id = p_user_id)
    ) INTO v_has_conversations;

    IF v_has_conversations THEN
        UPDATE profiles SET
            nickname = 'Usuario eliminado',
            avatar_url = NULL,
            postcode = NULL,
            onesignal_player_id = NULL,
            notification_preferences = '{"push_enabled": false, "email_enabled": false}'::jsonb,
            deleted_at = COALESCE(deleted_at, NOW()),
            is_suspended = true,
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        DELETE FROM profiles WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN v_has_conversations THEN 'User tombstoned (conversations preserved)' ELSE 'User permanently deleted' END,
        'user_id', p_user_id,
        'nickname', v_user_nickname,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_purge_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_has_conversations BOOLEAN;
BEGIN
    PERFORM require_admin();

    -- Delete user's trade offers
    DELETE FROM trade_offers WHERE sender_id = p_user_id OR receiver_id = p_user_id;

    -- Archive listings with chats, delete listings without chats
    UPDATE trade_listings SET
        status = 'archived',
        archived_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND EXISTS (SELECT 1 FROM trade_chats WHERE listing_id = trade_listings.id);

    DELETE FROM trade_listings 
    WHERE user_id = p_user_id
      AND NOT EXISTS (SELECT 1 FROM trade_chats WHERE listing_id = trade_listings.id);

    DELETE FROM collection_templates WHERE author_id = p_user_id;
    DELETE FROM collections WHERE user_id = p_user_id;
    DELETE FROM template_ratings WHERE user_id = p_user_id;
    DELETE FROM user_ratings WHERE rated_user_id = p_user_id OR rating_user_id = p_user_id;
    DELETE FROM favourites WHERE user_id = p_user_id;
    DELETE FROM listing_transactions WHERE buyer_id = p_user_id OR seller_id = p_user_id;
    DELETE FROM messages WHERE sender_id = p_user_id OR recipient_id = p_user_id;
    DELETE FROM ignored_users WHERE user_id = p_user_id OR ignored_user_id = p_user_id;
    DELETE FROM notification_preferences WHERE user_id = p_user_id;

    SELECT (
        EXISTS (SELECT 1 FROM trade_chats WHERE sender_id = p_user_id OR receiver_id = p_user_id)
        OR EXISTS (SELECT 1 FROM match_conversations WHERE user_a_id = p_user_id OR user_b_id = p_user_id)
    ) INTO v_has_conversations;

    IF v_has_conversations THEN
        UPDATE profiles SET
            nickname = 'Usuario eliminado',
            avatar_url = NULL,
            postcode = NULL,
            onesignal_player_id = NULL,
            notification_preferences = '{"push_enabled": false, "email_enabled": false}'::jsonb,
            deleted_at = COALESCE(deleted_at, NOW()),
            is_suspended = true,
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        DELETE FROM profiles WHERE id = p_user_id;
    END IF;

    INSERT INTO audit_log (
        user_id, admin_id, entity, entity_type, action,
        moderation_action_type, moderated_entity_type, moderation_reason,
        new_values, occurred_at
    ) VALUES (
        p_user_id, auth.uid(), 'user', 'user', 'purge',
        'purge_user', 'user', 'User data purged by admin',
        jsonb_build_object('purged_at', NOW(), 'conversations_preserved', v_has_conversations),
        NOW()
    );
END;
$$;

-- =========================================================================
-- 9. Update RLS Policies
-- =========================================================================

-- A. Allow chat participants to view listing metadata (title, image, status)
DROP POLICY IF EXISTS "Chat participants can view listing metadata" ON public.trade_listings;
CREATE POLICY "Chat participants can view listing metadata"
    ON public.trade_listings FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM trade_chats tc
            WHERE tc.listing_id = trade_listings.id
            AND (tc.sender_id = (SELECT auth.uid()) OR tc.receiver_id = (SELECT auth.uid()))
        )
    );

-- B. Ensure users can always view their own chats even if counterparty is suspended/deleted
DROP POLICY IF EXISTS "Users can view chats with active participants" ON public.trade_chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON public.trade_chats;

CREATE POLICY "Users can view their own chats" ON public.trade_chats
  FOR SELECT USING (
    (sender_id = (SELECT auth.uid())) OR (receiver_id = (SELECT auth.uid()))
  );

-- C. Allow chat counterparties to view profile status (deleted_at, is_suspended, nickname)
DROP POLICY IF EXISTS "Chat counterparties can view profile status" ON public.profiles;
CREATE POLICY "Chat counterparties can view profile status"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trade_chats tc
      WHERE (tc.sender_id = profiles.id AND tc.receiver_id = (SELECT auth.uid()))
         OR (tc.receiver_id = profiles.id AND tc.sender_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM match_conversations mc
      WHERE (mc.user_a_id = profiles.id AND mc.user_b_id = (SELECT auth.uid()))
         OR (mc.user_b_id = profiles.id AND mc.user_a_id = (SELECT auth.uid()))
    )
  );
