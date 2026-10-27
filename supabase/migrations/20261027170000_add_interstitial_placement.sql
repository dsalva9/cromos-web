-- Migration: Add 'interstitial' placement to affiliate_links and event tracking
-- Supports full-screen custom affiliate interstitial for Web (Desktop/Mobile) and Android post-login

-- =============================================================================
-- 1. Update placement CHECK constraint on affiliate_links
-- =============================================================================
ALTER TABLE public.affiliate_links
  DROP CONSTRAINT IF EXISTS affiliate_links_placement_check;

ALTER TABLE public.affiliate_links
  ADD CONSTRAINT affiliate_links_placement_check
  CHECK (placement IN ('banner', 'card_1', 'card_2', 'email', 'interstitial'));

-- =============================================================================
-- 2. Update admin_list_affiliate_links ordering to include 'interstitial'
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_affiliate_links()
RETURNS SETOF public.affiliate_links
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.affiliate_links
  ORDER BY
    CASE placement
      WHEN 'interstitial' THEN 0
      WHEN 'banner' THEN 1
      WHEN 'card_1' THEN 2
      WHEN 'card_2' THEN 3
      WHEN 'email' THEN 4
    END,
    created_at DESC;
$$;

-- =============================================================================
-- 3. RPC: Get active interstitial affiliate (client-facing)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_active_interstitial_affiliate()
RETURNS SETOF public.affiliate_links
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.affiliate_links
  WHERE placement = 'interstitial' AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

-- =============================================================================
-- 4. Create affiliate_events table for tracking impressions, clicks, dismissals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'dismiss')),
  platform TEXT NOT NULL CHECK (platform IN ('web_desktop', 'web_mobile', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_events_affiliate_id ON public.affiliate_events(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_created_at ON public.affiliate_events(created_at);

ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own events" ON public.affiliate_events;
CREATE POLICY "Users can insert own events"
  ON public.affiliate_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all events" ON public.affiliate_events;
CREATE POLICY "Admins can read all events"
  ON public.affiliate_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- 5. RPCs for recording and querying interstitial events
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_affiliate_event(
  p_affiliate_id UUID,
  p_event_type TEXT,
  p_platform TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.affiliate_events (affiliate_id, user_id, event_type, platform)
  VALUES (p_affiliate_id, auth.uid(), p_event_type, p_platform);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_interstitial_stats()
RETURNS TABLE (
  impressions BIGINT,
  clicks BIGINT,
  dismissals BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE e.event_type = 'impression')::BIGINT AS impressions,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::BIGINT AS clicks,
    COUNT(*) FILTER (WHERE e.event_type = 'dismiss')::BIGINT AS dismissals
  FROM public.affiliate_events e
  JOIN public.affiliate_links a ON a.id = e.affiliate_id
  WHERE a.placement = 'interstitial';
END;
$$;
