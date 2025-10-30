-- =====================================================
-- Add context-aware system messages for listings
-- =====================================================
-- Purpose: Enable different system messages for different users
-- - Reserved buyer sees "Reserved for you"
-- - Other buyers see "Reserved for another user"
-- - Seller sees full reservation details
-- =====================================================

-- Add visible_to_user_id column to trade_chats for targeted system messages
-- NULL means visible to all participants
ALTER TABLE trade_chats
ADD COLUMN IF NOT EXISTS visible_to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trade_chats_visible_to_user ON trade_chats(visible_to_user_id);

COMMENT ON COLUMN trade_chats.visible_to_user_id IS 'If set, this system message is only visible to this specific user. NULL means visible to all.';

-- Update add_system_message_to_listing_chat to support targeted messages
DROP FUNCTION IF EXISTS add_system_message_to_listing_chat(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION add_system_message_to_listing_chat(
    p_listing_id BIGINT,
    p_message TEXT,
    p_visible_to_user_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_message_id BIGINT;
BEGIN
    -- Insert system message
    INSERT INTO trade_chats (
        listing_id,
        message,
        is_system,
        is_read,
        visible_to_user_id
    ) VALUES (
        p_listing_id,
        p_message,
        TRUE,
        TRUE,  -- System messages are auto-read
        p_visible_to_user_id
    ) RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_system_message_to_listing_chat(BIGINT, TEXT, UUID) TO authenticated;

-- Update get_listing_chats to filter system messages by visibility
DROP FUNCTION IF EXISTS get_listing_chats(BIGINT, UUID);

CREATE OR REPLACE FUNCTION get_listing_chats(
    p_listing_id BIGINT,
    p_participant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    sender_id UUID,
    receiver_id UUID,
    sender_nickname TEXT,
    message TEXT,
    is_read BOOLEAN,
    is_system BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_listing_owner_id UUID;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get the listing owner
    SELECT tl.user_id INTO v_listing_owner_id
    FROM trade_listings tl
    WHERE tl.id = p_listing_id;

    IF v_listing_owner_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Determine access and filtering
    IF auth.uid() = v_listing_owner_id THEN
        -- Seller viewing chats
        IF p_participant_id IS NOT NULL THEN
            -- Viewing specific buyer conversation
            RETURN QUERY
            SELECT
                tc.id,
                tc.sender_id,
                tc.receiver_id,
                COALESCE(p.nickname, '') AS sender_nickname,
                tc.message,
                tc.is_read,
                tc.is_system,
                tc.created_at
            FROM trade_chats tc
            LEFT JOIN profiles p ON tc.sender_id = p.id
            WHERE tc.listing_id = p_listing_id
            AND (
                tc.is_system = TRUE AND (tc.visible_to_user_id IS NULL OR tc.visible_to_user_id = auth.uid()) OR
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
                tc.created_at
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
            tc.created_at
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

COMMENT ON FUNCTION get_listing_chats IS 'Get chat messages for a listing with context-aware system message filtering';

-- Create helper function to send targeted system messages to all chat participants
CREATE OR REPLACE FUNCTION add_listing_status_messages(
    p_listing_id BIGINT,
    p_reserved_buyer_id UUID DEFAULT NULL,
    p_message_type TEXT DEFAULT 'reserved' -- 'reserved', 'unreserved', 'completed'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_nickname TEXT;
    v_buyer_nickname TEXT;
    v_participant RECORD;
BEGIN
    -- Get listing owner and their nickname
    SELECT tl.user_id, p.nickname
    INTO v_seller_id, v_seller_nickname
    FROM trade_listings tl
    JOIN profiles p ON tl.user_id = p.id
    WHERE tl.id = p_listing_id;

    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Get all unique participants in this listing's chats (buyers)
    -- We'll send targeted messages to each
    FOR v_participant IN
        SELECT DISTINCT
            CASE
                WHEN tc.sender_id != v_seller_id THEN tc.sender_id
                WHEN tc.receiver_id != v_seller_id THEN tc.receiver_id
            END AS buyer_id
        FROM trade_chats tc
        WHERE tc.listing_id = p_listing_id
        AND tc.is_system = FALSE
        AND (tc.sender_id = v_seller_id OR tc.receiver_id = v_seller_id)
    LOOP
        IF v_participant.buyer_id IS NULL THEN
            CONTINUE;
        END IF;

        -- Send appropriate message based on type and recipient
        IF p_message_type = 'reserved' THEN
            IF v_participant.buyer_id = p_reserved_buyer_id THEN
                -- Message for the reserved buyer
                PERFORM add_system_message_to_listing_chat(
                    p_listing_id,
                    v_seller_nickname || ' ha reservado este anuncio para ti.',
                    v_participant.buyer_id
                );
            ELSE
                -- Message for other buyers
                PERFORM add_system_message_to_listing_chat(
                    p_listing_id,
                    'Este anuncio ha sido reservado para otro usuario.',
                    v_participant.buyer_id
                );
            END IF;
        ELSIF p_message_type = 'unreserved' THEN
            -- Message for all buyers when unreserved
            PERFORM add_system_message_to_listing_chat(
                p_listing_id,
                'El anuncio ha sido liberado y está disponible nuevamente.',
                v_participant.buyer_id
            );
        ELSIF p_message_type = 'completed' THEN
            IF v_participant.buyer_id = p_reserved_buyer_id THEN
                -- Message for the buyer who completed the transaction
                PERFORM add_system_message_to_listing_chat(
                    p_listing_id,
                    'La transacción se ha completado. ¡Ahora puedes valorar a ' || v_seller_nickname || '!',
                    v_participant.buyer_id
                );
            ELSE
                -- Message for other buyers
                PERFORM add_system_message_to_listing_chat(
                    p_listing_id,
                    'Este anuncio ya no está disponible.',
                    v_participant.buyer_id
                );
            END IF;
        END IF;
    END LOOP;

    -- Add message for seller
    IF p_message_type = 'reserved' THEN
        SELECT nickname INTO v_buyer_nickname
        FROM profiles
        WHERE id = p_reserved_buyer_id;

        PERFORM add_system_message_to_listing_chat(
            p_listing_id,
            'Has reservado este anuncio para ' || v_buyer_nickname || '.',
            v_seller_id
        );
    ELSIF p_message_type = 'unreserved' THEN
        PERFORM add_system_message_to_listing_chat(
            p_listing_id,
            'Has liberado la reserva de este anuncio.',
            v_seller_id
        );
    ELSIF p_message_type = 'completed' THEN
        SELECT nickname INTO v_buyer_nickname
        FROM profiles
        WHERE id = p_reserved_buyer_id;

        PERFORM add_system_message_to_listing_chat(
            p_listing_id,
            'La transacción con ' || v_buyer_nickname || ' se ha completado. ¡Ahora puedes valorarle!',
            v_seller_id
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION add_listing_status_messages(BIGINT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION add_listing_status_messages IS 'Send context-aware system messages to all chat participants based on listing status change';
