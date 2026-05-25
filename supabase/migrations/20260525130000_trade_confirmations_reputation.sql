-- Create trade_confirmations table
CREATE TABLE IF NOT EXISTS public.trade_confirmations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id      BIGINT NOT NULL REFERENCES public.trade_listings(id) ON DELETE CASCADE,
  requester_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'expired')),
  sticker_count   INT,
  note            TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ,
  expired_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT requester_not_confirmer CHECK (requester_id <> confirmer_id)
);

-- Unique constraint to prevent duplicate pending confirmations between the same requester + confirmer + listing
CREATE UNIQUE INDEX IF NOT EXISTS trade_confirmations_unique_pending 
  ON public.trade_confirmations (listing_id, requester_id, confirmer_id) 
  WHERE status = 'pending';

-- Add standard indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_trade_confirmations_confirmer_status 
  ON public.trade_confirmations (confirmer_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_confirmations_requester 
  ON public.trade_confirmations (requester_id);

-- Alter profiles table to add reputation fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS completed_trades INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trade_reputation_tier TEXT NOT NULL DEFAULT 'novato'
    CHECK (trade_reputation_tier IN ('novato','coleccionista','experto','veterano','leyenda'));

-- Drop existing constraint on notifications kind and re-add with trade confirmation kinds
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
  'chat_unread'::text, 
  'proposal_accepted'::text, 
  'proposal_rejected'::text, 
  'finalization_requested'::text, 
  'listing_chat'::text, 
  'listing_reserved'::text, 
  'listing_completed'::text, 
  'user_rated'::text, 
  'template_rated'::text, 
  'badge_earned'::text, 
  'admin_action'::text, 
  'system_message'::text, 
  'level_up'::text,
  'trade_confirmation_request'::text,
  'trade_confirmed'::text
]));

-- RLS Policies on trade_confirmations
ALTER TABLE public.trade_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trade confirmations" ON public.trade_confirmations;
CREATE POLICY "Users can view their own trade confirmations" ON public.trade_confirmations
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = confirmer_id);

DROP POLICY IF EXISTS "Users can request trade confirmations" ON public.trade_confirmations;
CREATE POLICY "Users can request trade confirmations" ON public.trade_confirmations
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Confirmers can update pending trade confirmations" ON public.trade_confirmations;
CREATE POLICY "Confirmers can update pending trade confirmations" ON public.trade_confirmations
  FOR UPDATE
  USING (auth.uid() = confirmer_id AND status = 'pending')
  WITH CHECK (auth.uid() = confirmer_id AND status IN ('confirmed', 'expired'));

-- RPC: request_trade_confirmation
CREATE OR REPLACE FUNCTION public.request_trade_confirmation(
  p_listing_id INT,
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

  -- 3. Validate messages exchanged on this listing
  -- At least 1 message sent by requester to confirmer and at least 1 message sent by confirmer to requester
  SELECT COUNT(*) INTO v_messages_from_requester
  FROM public.trade_chats
  WHERE listing_id = p_listing_id 
    AND sender_id = v_requester_id 
    AND receiver_id = p_confirmer_id;

  SELECT COUNT(*) INTO v_messages_from_confirmer
  FROM public.trade_chats
  WHERE listing_id = p_listing_id 
    AND sender_id = p_confirmer_id 
    AND receiver_id = v_requester_id;

  IF v_messages_from_requester = 0 OR v_messages_from_confirmer = 0 THEN
    RAISE EXCEPTION 'Debe haber un intercambio de mensajes previo en el chat para solicitar confirmación';
  END IF;

  -- 4. Check if duplicate pending confirmation exists
  IF EXISTS (
    SELECT 1 FROM public.trade_confirmations
    WHERE listing_id = p_listing_id
      AND requester_id = v_requester_id
      AND confirmer_id = p_confirmer_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya hay una solicitud de confirmación pendiente';
  END IF;

  -- 5. Insert into trade_confirmations
  INSERT INTO public.trade_confirmations (
    listing_id, requester_id, confirmer_id, status, sticker_count, note, requested_at
  )
  VALUES (
    p_listing_id, v_requester_id, p_confirmer_id, 'pending', p_sticker_count, p_note, now()
  )
  RETURNING id INTO v_confirmation_id;

  -- 6. Insert notification for confirmer
  INSERT INTO public.notifications (
    user_id, kind, listing_id, actor_id, created_at, payload
  )
  VALUES (
    p_confirmer_id,
    'trade_confirmation_request',
    p_listing_id,
    v_requester_id,
    now(),
    jsonb_build_object(
      'sticker_count', p_sticker_count,
      'note', p_note,
      'confirmation_id', v_confirmation_id
    )
  );

  RETURN v_confirmation_id;
END;
$$;

-- RPC: confirm_trade
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
  RETURNING requester_id, listing_id, sticker_count, note INTO v_requester_id, v_listing_id, v_sticker_count, v_note;

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
      'confirmation_id', p_confirmation_id
    )
  );

  RETURN TRUE;
END;
$$;

-- RPC: dismiss_trade_confirmation
CREATE OR REPLACE FUNCTION public.dismiss_trade_confirmation(
  p_confirmation_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_row_updated INT;
BEGIN
  -- 1. Get authenticated user ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Set to expired
  UPDATE public.trade_confirmations
  SET status = 'expired',
      expired_at = now()
  WHERE id = p_confirmation_id
    AND confirmer_id = v_caller_id
    AND status = 'pending';

  GET DIAGNOSTICS v_row_updated = ROW_COUNT;
  RETURN v_row_updated > 0;
END;
$$;

-- pg_cron schedule to expire pending confirmations older than 14 days
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule first if it exists
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-trade-confirmations';
    
    -- Schedule using explicit dollar tag naming to avoid nesting issues
    PERFORM cron.schedule('expire-trade-confirmations', '0 3 * * *',
      $cron_cmd$UPDATE public.trade_confirmations 
        SET status = 'expired', expired_at = now() 
        WHERE status = 'pending' AND requested_at < now() - interval '14 days'$cron_cmd$
    );
  END IF;
END $$;
