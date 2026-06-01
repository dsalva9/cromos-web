-- ============================================================
-- Migration to support Trade Confirmations in Match Chats
-- ============================================================

-- 1. Alter trade_confirmations table:
--    Make listing_id nullable and add match_conversation_id column
ALTER TABLE public.trade_confirmations ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE public.trade_confirmations 
  ADD COLUMN IF NOT EXISTS match_conversation_id BIGINT REFERENCES public.match_conversations(id) ON DELETE CASCADE;

-- 2. Add check constraint to ensure only listing_id OR match_conversation_id is provided
ALTER TABLE public.trade_confirmations DROP CONSTRAINT IF EXISTS trade_confirmations_target_check;
ALTER TABLE public.trade_confirmations ADD CONSTRAINT trade_confirmations_target_check 
  CHECK (
    (listing_id IS NOT NULL AND match_conversation_id IS NULL) OR 
    (listing_id IS NULL AND match_conversation_id IS NOT NULL)
  );

-- 3. Drop and recreate unique index for pending confirmations on trade listings
DROP INDEX IF EXISTS public.trade_confirmations_unique_pending;
CREATE UNIQUE INDEX trade_confirmations_unique_pending 
  ON public.trade_confirmations (listing_id, requester_id, confirmer_id) 
  WHERE status = 'pending' AND listing_id IS NOT NULL;

-- 4. Create new unique index for pending confirmations on match conversations
CREATE UNIQUE INDEX IF NOT EXISTS trade_confirmations_match_unique_pending 
  ON public.trade_confirmations (match_conversation_id, requester_id, confirmer_id) 
  WHERE status = 'pending' AND match_conversation_id IS NOT NULL;

-- 5. RPC function to request a trade confirmation inside a match conversation
CREATE OR REPLACE FUNCTION public.request_match_trade_confirmation(
  p_match_conversation_id BIGINT,
  p_confirmer_id UUID,
  p_sticker_count INT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_requester_id UUID;
  v_confirmation_id BIGINT;
  v_messages_from_requester INT;
  v_messages_from_confirmer INT;
BEGIN
  -- 1. Get authenticated user ID
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate requester is not confirmer
  IF v_requester_id = p_confirmer_id THEN
    RAISE EXCEPTION 'You cannot request trade confirmation from yourself';
  END IF;

  -- 3. Validate messages exchanged on this match conversation
  -- At least 1 message sent by requester to confirmer and at least 1 message sent by confirmer to requester
  SELECT COUNT(*) INTO v_messages_from_requester
  FROM public.trade_chats
  WHERE match_conversation_id = p_match_conversation_id 
    AND sender_id = v_requester_id 
    AND receiver_id = p_confirmer_id;

  SELECT COUNT(*) INTO v_messages_from_confirmer
  FROM public.trade_chats
  WHERE match_conversation_id = p_match_conversation_id 
    AND sender_id = p_confirmer_id 
    AND receiver_id = v_requester_id;

  IF v_messages_from_requester = 0 OR v_messages_from_confirmer = 0 THEN
    RAISE EXCEPTION 'Debe haber un intercambio de mensajes previo en el chat para solicitar confirmación';
  END IF;

  -- 4. Check if duplicate pending confirmation exists
  IF EXISTS (
    SELECT 1 FROM public.trade_confirmations
    WHERE match_conversation_id = p_match_conversation_id
      AND requester_id = v_requester_id
      AND confirmer_id = p_confirmer_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya hay una solicitud de confirmación pendiente';
  END IF;

  -- 5. Insert into trade_confirmations
  INSERT INTO public.trade_confirmations (
    match_conversation_id, requester_id, confirmer_id, status, sticker_count, note, requested_at
  )
  VALUES (
    p_match_conversation_id, v_requester_id, p_confirmer_id, 'pending', p_sticker_count, p_note, now()
  )
  RETURNING id INTO v_confirmation_id;

  -- 6. Insert notification for confirmer
  INSERT INTO public.notifications (
    user_id, kind, actor_id, created_at, payload
  )
  VALUES (
    p_confirmer_id,
    'trade_confirmation_request',
    v_requester_id,
    now(),
    jsonb_build_object(
      'sticker_count', p_sticker_count,
      'note', p_note,
      'confirmation_id', v_confirmation_id,
      'match_conversation_id', p_match_conversation_id
    )
  );

  RETURN v_confirmation_id;
END;
$$;

-- 6. Redefine confirm_trade RPC function to return match_conversation_id and include it in notification payload
CREATE OR REPLACE FUNCTION public.confirm_trade(
  p_confirmation_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_requester_id UUID;
  v_listing_id BIGINT;
  v_match_conversation_id BIGINT;
  v_sticker_count INT;
  v_note TEXT;
  v_row_updated INT;
BEGIN
  -- 1. Get authenticated user ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Find and update the confirmation
  -- Only the confirmer can confirm, and it must be pending
  UPDATE public.trade_confirmations
  SET status = 'confirmed',
      confirmed_at = now()
  WHERE id = p_confirmation_id
    AND confirmer_id = v_caller_id
    AND status = 'pending'
  RETURNING requester_id, listing_id, match_conversation_id, sticker_count, note 
  INTO v_requester_id, v_listing_id, v_match_conversation_id, v_sticker_count, v_note;

  GET DIAGNOSTICS v_row_updated = ROW_COUNT;
  IF v_row_updated = 0 THEN
    RAISE EXCEPTION 'No pending confirmation found or you are not authorized to confirm it';
  END IF;

  -- 3. Increment completed_trades on BOTH users
  UPDATE public.profiles
  SET completed_trades = completed_trades + 1
  WHERE id IN (v_requester_id, v_caller_id);

  -- 4. Recalculate trade_reputation_tier for both users
  -- Thresholds: 3→coleccionista, 10→experto, 25→veterano, 50→leyenda
  UPDATE public.profiles
  SET trade_reputation_tier = CASE
    WHEN completed_trades >= 50 THEN 'leyenda'
    WHEN completed_trades >= 25 THEN 'veterano'
    WHEN completed_trades >= 10 THEN 'experto'
    WHEN completed_trades >= 3  THEN 'coleccionista'
    ELSE 'novato'
  END
  WHERE id IN (v_requester_id, v_caller_id);

  -- 5. Update user badge progress for 'trader' category
  -- Call increment_badge_progress for both users
  PERFORM public.increment_badge_progress(v_requester_id, 'trader');
  PERFORM public.increment_badge_progress(v_caller_id, 'trader');

  -- 6. Insert notification for requester
  INSERT INTO public.notifications (
    user_id, kind, listing_id, actor_id, created_at, payload
  )
  VALUES (
    v_requester_id,
    'trade_confirmed',
    v_listing_id,
    v_caller_id,
    now(),
    jsonb_build_object(
      'sticker_count', v_sticker_count,
      'note', v_note,
      'confirmation_id', p_confirmation_id,
      'match_conversation_id', v_match_conversation_id
    )
  );

  RETURN TRUE;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.request_match_trade_confirmation TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_trade TO authenticated;
