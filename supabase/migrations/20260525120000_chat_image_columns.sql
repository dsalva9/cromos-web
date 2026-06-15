DROP FUNCTION IF EXISTS "public"."get_listing_chats"(bigint, uuid);
DROP FUNCTION IF EXISTS "public"."send_listing_message"(bigint, uuid, text);

-- ============================================================
-- 1. Add image columns to trade_chats
-- ============================================================
ALTER TABLE public.trade_chats
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.trade_chats.image_url IS 'Full-size image URL in Supabase Storage (chat-images/ prefix)';
COMMENT ON COLUMN public.trade_chats.thumbnail_url IS 'Thumbnail image URL (~300px wide) for chat feed display';

-- ============================================================
-- 2. Update get_listing_chats to return image_url & thumbnail_url
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."get_listing_chats"("p_listing_id" bigint, "p_participant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" bigint, "sender_id" "uuid", "receiver_id" "uuid", "sender_nickname" "text", "message" "text", "is_read" boolean, "is_system" boolean, "created_at" timestamp with time zone, "image_url" "text", "thumbnail_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_listing_owner_id UUID;
    v_has_chat_access BOOLEAN;
    v_reservation_buyer_id UUID;
    v_reservation_status TEXT;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get listing owner (FIXED: Alias table to avoid ambiguity with output parameter 'id')
    SELECT user_id INTO v_listing_owner_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    -- If listing doesn't exist, check if user has chat history (for deleted listings)
    IF v_listing_owner_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE trade_chats.listing_id = p_listing_id
            AND (trade_chats.sender_id = auth.uid() OR trade_chats.receiver_id = auth.uid())
        ) INTO v_has_chat_access;

        IF NOT v_has_chat_access THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        -- Get listing owner from chat history
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

    -- Check transaction status for visibility rules
    SELECT buyer_id, status INTO v_reservation_buyer_id, v_reservation_status
    FROM listing_transactions lt
    WHERE lt.listing_id = p_listing_id
    AND lt.status IN ('reserved', 'pending_completion', 'completed')
    ORDER BY lt.created_at DESC
    LIMIT 1;

    -- Logic for fetching chats based on role
    IF auth.uid() = v_listing_owner_id THEN
        -- Owner viewing chats
        IF p_participant_id IS NOT NULL THEN
            -- Viewing specific conversation
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.is_system,
                tc.created_at,
                tc.image_url,
                tc.thumbnail_url
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (
                (tc.is_system = TRUE AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())) OR
                tc.sender_id = p_participant_id OR
                tc.receiver_id = p_participant_id
            )
            ORDER BY tc.created_at ASC;
        ELSE
            -- Viewing all conversations
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.is_system,
                tc.created_at,
                tc.image_url,
                tc.thumbnail_url
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())
            ORDER BY tc.created_at ASC;
        END IF;
    ELSE
        -- Buyer viewing own conversation with seller
        IF p_participant_id IS NOT NULL AND p_participant_id != v_listing_owner_id THEN
            RAISE EXCEPTION 'You can only view your own conversation';
        END IF;

        RETURN QUERY
        SELECT
            tc.id,
            tc.sender_id,
            tc.receiver_id,
            COALESCE(p.nickname, '') AS sender_nickname,
            tc.message,
            tc.is_read,
            tc.is_system,
            tc.created_at,
            tc.image_url,
            tc.thumbnail_url
        FROM trade_chats tc
        LEFT JOIN profiles p ON tc.sender_id = p.id
        WHERE tc.listing_id = p_listing_id
        AND (
            (tc.is_system = TRUE AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid())) OR
            tc.sender_id = auth.uid() OR
            tc.receiver_id = auth.uid()
        )
        ORDER BY tc.created_at ASC;
    END IF;
END;
$$;

-- ============================================================
-- 3. Update send_listing_message to accept optional image params
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."send_listing_message"("p_listing_id" bigint, "p_receiver_id" "uuid", "p_message" "text", "p_image_url" "text" DEFAULT NULL, "p_thumbnail_url" "text" DEFAULT NULL) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_listing_user_id UUID;
    v_message_id BIGINT;
    v_message_length INTEGER := 500;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate message is not empty
    IF TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;

    -- Validate message length
    IF LENGTH(p_message) > v_message_length THEN
        RAISE EXCEPTION 'Message cannot be longer than 500 characters';
    END IF;

    -- Validate receiver exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_receiver_id) THEN
        RAISE EXCEPTION 'Receiver not found';
    END IF;

    -- Validate not sending to yourself
    IF auth.uid() = p_receiver_id THEN
        RAISE EXCEPTION 'You cannot send messages to yourself';
    END IF;

    -- Get the listing owner and validate listing exists
    SELECT user_id INTO v_listing_user_id
    FROM trade_listings
    WHERE id = p_listing_id;

    IF v_listing_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Validate sender is either listing owner or has previously messaged
    IF auth.uid() != v_listing_user_id THEN
        -- Buyer must be sending to owner
        IF p_receiver_id != v_listing_user_id THEN
            RAISE EXCEPTION 'You can only send messages to the listing owner';
        END IF;
    ELSE
        -- Seller sending reply - ensure receiver has previously messaged
        IF NOT EXISTS (
            SELECT 1 FROM trade_chats
            WHERE listing_id = p_listing_id
            AND sender_id = p_receiver_id
        ) THEN
            RAISE EXCEPTION 'You can only reply to users who have messaged you';
        END IF;
    END IF;

    -- Insert the message (with optional image URLs)
    INSERT INTO trade_chats (
        listing_id,
        sender_id,
        receiver_id,
        message,
        is_read,
        image_url,
        thumbnail_url
    ) VALUES (
        p_listing_id,
        auth.uid(),
        p_receiver_id,
        TRIM(p_message),
        FALSE,
        p_image_url,
        p_thumbnail_url
    ) RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

-- ============================================================
-- 4. Storage RLS policies for chat-images/ prefix
--    NOTE: These must be applied via the Supabase Dashboard
--    in production since storage policies are managed there.
-- ============================================================
-- Policy: Authenticated users can upload to chat-images/{listing_id}/{uid}/*
-- CREATE POLICY "chat_images_upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'sticker-images'
--     AND (storage.foldername(name))[1] = 'chat-images'
--   );

-- Policy: Authenticated users can read any chat image
-- CREATE POLICY "chat_images_read" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (
--     bucket_id = 'sticker-images'
--     AND (storage.foldername(name))[1] = 'chat-images'
--   );

-- Policy: Only uploaders can delete their own chat images
-- CREATE POLICY "chat_images_delete" ON storage.objects
--   FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'sticker-images'
--     AND (storage.foldername(name))[1] = 'chat-images'
--     AND owner = auth.uid()
--   );
