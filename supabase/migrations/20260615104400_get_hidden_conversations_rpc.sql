-- Migration: get_hidden_conversations RPC
-- Returns all hidden marketplace conversations for the current user

CREATE OR REPLACE FUNCTION public.get_hidden_conversations()
RETURNS TABLE(
    listing_id bigint,
    listing_title text,
    listing_image_url text,
    counterparty_id uuid,
    counterparty_nickname text,
    counterparty_avatar_url text,
    hidden_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hc.listing_id,
        tl.title,
        tl.image_url,
        hc.counterparty_id,
        p.nickname,
        p.avatar_url,
        hc.hidden_at
    FROM hidden_conversations hc
    JOIN trade_listings tl ON tl.id = hc.listing_id
    JOIN profiles p ON p.id = hc.counterparty_id
    WHERE hc.user_id = auth.uid()
      AND hc.listing_id IS NOT NULL
    ORDER BY hc.hidden_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_hidden_conversations IS 'Returns all hidden marketplace conversations for the current user, for the settings page.';

GRANT ALL ON FUNCTION public.get_hidden_conversations() TO authenticated;
