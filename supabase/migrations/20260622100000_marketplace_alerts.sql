-- ============================================================================
-- Marketplace Alerts System
-- Users can create alerts to be notified when listings matching their search
-- criteria are published. Supports instant, daily, and weekly frequencies
-- with multi-channel delivery (email, push, in-app).
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.marketplace_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Search criteria (at least one must be set)
    search_query TEXT,                          -- Free text search (e.g., "Messi")
    collection_id BIGINT REFERENCES public.collection_templates(id) ON DELETE SET NULL,
    template_id BIGINT REFERENCES public.collection_templates(id) ON DELETE SET NULL,
    slot_number INTEGER,                        -- Specific sticker number
    slot_variant TEXT,                          -- Specific sticker variant (A, B, C)

    -- Alert settings
    frequency TEXT NOT NULL DEFAULT 'weekly'
        CHECK (frequency IN ('instant', 'daily', 'weekly')),
    channel_email BOOLEAN NOT NULL DEFAULT true,
    channel_push BOOLEAN NOT NULL DEFAULT false,
    channel_in_app BOOLEAN NOT NULL DEFAULT true,

    -- State
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,             -- Last time this alert fired (instant)
    last_digest_at TIMESTAMPTZ,                -- Last digest sent (daily/weekly)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT marketplace_alerts_at_least_one_channel
        CHECK (channel_email OR channel_push OR channel_in_app),
    CONSTRAINT marketplace_alerts_has_search_criteria
        CHECK (
            search_query IS NOT NULL
            OR collection_id IS NOT NULL
            OR (template_id IS NOT NULL AND slot_number IS NOT NULL)
        ),
    CONSTRAINT marketplace_alerts_slot_variant_format
        CHECK (slot_variant IS NULL OR slot_variant ~ '^[A-Z]$')
);

COMMENT ON TABLE public.marketplace_alerts IS 'User-created marketplace alerts for sticker/listing notifications';
COMMENT ON COLUMN public.marketplace_alerts.search_query IS 'Free text search query to match against listing title/description/collection';
COMMENT ON COLUMN public.marketplace_alerts.collection_id IS 'Optional filter: only match listings from this collection template';
COMMENT ON COLUMN public.marketplace_alerts.template_id IS 'Specific template (album) to match — used for per-sticker alerts';
COMMENT ON COLUMN public.marketplace_alerts.slot_number IS 'Specific sticker number within the template';
COMMENT ON COLUMN public.marketplace_alerts.frequency IS 'instant = on each new listing, daily = digest at 9AM, weekly = digest on Mondays';
COMMENT ON COLUMN public.marketplace_alerts.last_triggered_at IS 'For instant alerts: last time a notification was sent. Used for 1h cooldown.';
COMMENT ON COLUMN public.marketplace_alerts.last_digest_at IS 'For daily/weekly: timestamp of last digest. New listings after this are included.';

-- Deduplication table: track which listings have already been matched for each alert
CREATE TABLE IF NOT EXISTS public.marketplace_alert_matches (
    alert_id BIGINT NOT NULL REFERENCES public.marketplace_alerts(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL REFERENCES public.trade_listings(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,  -- NULL = matched but not yet notified (queued for digest)
    PRIMARY KEY (alert_id, listing_id)
);

COMMENT ON TABLE public.marketplace_alert_matches IS 'Tracks which listings have been matched/notified for each alert to prevent duplicates';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_marketplace_alerts_user_id
    ON public.marketplace_alerts(user_id);

CREATE INDEX idx_marketplace_alerts_active_frequency
    ON public.marketplace_alerts(is_active, frequency)
    WHERE is_active = true;

CREATE INDEX idx_marketplace_alerts_active_instant
    ON public.marketplace_alerts(is_active, frequency, last_triggered_at)
    WHERE is_active = true AND frequency = 'instant';

CREATE INDEX idx_marketplace_alert_matches_alert
    ON public.marketplace_alert_matches(alert_id);

CREATE INDEX idx_marketplace_alert_matches_listing
    ON public.marketplace_alert_matches(listing_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.marketplace_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_alert_matches ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own alerts
CREATE POLICY "Users can view own alerts"
    ON public.marketplace_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
    ON public.marketplace_alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON public.marketplace_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
    ON public.marketplace_alerts FOR DELETE
    USING (auth.uid() = user_id);

-- Alert matches: users can view matches for their own alerts
CREATE POLICY "Users can view own alert matches"
    ON public.marketplace_alert_matches FOR SELECT
    USING (
        alert_id IN (
            SELECT id FROM public.marketplace_alerts WHERE user_id = auth.uid()
        )
    );

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access on alerts"
    ON public.marketplace_alerts FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on alert matches"
    ON public.marketplace_alert_matches FOR ALL
    USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marketplace_alerts_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER marketplace_alerts_updated_at
    BEFORE UPDATE ON public.marketplace_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.marketplace_alerts_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get all alerts for the current user with enriched data
CREATE OR REPLACE FUNCTION public.get_user_alerts()
RETURNS TABLE (
    id BIGINT,
    search_query TEXT,
    collection_id BIGINT,
    collection_name TEXT,
    template_id BIGINT,
    template_name TEXT,
    slot_number INTEGER,
    slot_variant TEXT,
    frequency TEXT,
    channel_email BOOLEAN,
    channel_push BOOLEAN,
    channel_in_app BOOLEAN,
    is_active BOOLEAN,
    last_triggered_at TIMESTAMPTZ,
    last_digest_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    total_matches BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT
        a.id,
        a.search_query,
        a.collection_id,
        ct_coll.title AS collection_name,
        a.template_id,
        ct_tmpl.title AS template_name,
        a.slot_number,
        a.slot_variant,
        a.frequency,
        a.channel_email,
        a.channel_push,
        a.channel_in_app,
        a.is_active,
        a.last_triggered_at,
        a.last_digest_at,
        a.created_at,
        COALESCE(m.cnt, 0) AS total_matches
    FROM public.marketplace_alerts a
    LEFT JOIN public.collection_templates ct_coll ON ct_coll.id = a.collection_id
    LEFT JOIN public.collection_templates ct_tmpl ON ct_tmpl.id = a.template_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM public.marketplace_alert_matches
        WHERE alert_id = a.id
    ) m ON true
    WHERE a.user_id = auth.uid()
    ORDER BY a.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_user_alerts() IS 'Returns all alerts for the current user with collection/template names and match counts';

-- Create a new alert
CREATE OR REPLACE FUNCTION public.create_marketplace_alert(
    p_search_query TEXT DEFAULT NULL,
    p_collection_id BIGINT DEFAULT NULL,
    p_template_id BIGINT DEFAULT NULL,
    p_slot_number INTEGER DEFAULT NULL,
    p_slot_variant TEXT DEFAULT NULL,
    p_frequency TEXT DEFAULT 'weekly',
    p_channel_email BOOLEAN DEFAULT true,
    p_channel_push BOOLEAN DEFAULT false,
    p_channel_in_app BOOLEAN DEFAULT true
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_alert_id BIGINT;
    v_alert_count INTEGER;
    v_max_alerts INTEGER := 100; -- Generous default; can be gated by pro status later
BEGIN
    -- Check alert count limit
    SELECT COUNT(*) INTO v_alert_count
    FROM public.marketplace_alerts
    WHERE user_id = auth.uid() AND is_active = true;

    IF v_alert_count >= v_max_alerts THEN
        RAISE EXCEPTION 'Has alcanzado el límite máximo de alertas (%)' , v_max_alerts
            USING ERRCODE = 'P0001';
    END IF;

    -- Validate at least one search criterion
    IF NULLIF(TRIM(p_search_query), '') IS NULL
       AND p_collection_id IS NULL
       AND (p_template_id IS NULL OR p_slot_number IS NULL) THEN
        RAISE EXCEPTION 'Debes especificar al menos un criterio de búsqueda'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.marketplace_alerts (
        user_id, search_query, collection_id, template_id,
        slot_number, slot_variant, frequency,
        channel_email, channel_push, channel_in_app,
        last_digest_at
    ) VALUES (
        auth.uid(),
        NULLIF(TRIM(p_search_query), ''),
        p_collection_id,
        p_template_id,
        p_slot_number,
        p_slot_variant,
        p_frequency,
        p_channel_email,
        p_channel_push,
        p_channel_in_app,
        now()  -- Set initial digest timestamp to avoid catching old listings
    ) RETURNING id INTO v_alert_id;

    RETURN v_alert_id;
END;
$$;

COMMENT ON FUNCTION public.create_marketplace_alert IS 'Creates a new marketplace alert for the current user. Returns the alert ID.';

-- Update an existing alert
CREATE OR REPLACE FUNCTION public.update_marketplace_alert(
    p_alert_id BIGINT,
    p_search_query TEXT DEFAULT NULL,
    p_collection_id BIGINT DEFAULT NULL,
    p_template_id BIGINT DEFAULT NULL,
    p_slot_number INTEGER DEFAULT NULL,
    p_slot_variant TEXT DEFAULT NULL,
    p_frequency TEXT DEFAULT 'weekly',
    p_channel_email BOOLEAN DEFAULT true,
    p_channel_push BOOLEAN DEFAULT false,
    p_channel_in_app BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.marketplace_alerts SET
        search_query = NULLIF(TRIM(p_search_query), ''),
        collection_id = p_collection_id,
        template_id = p_template_id,
        slot_number = p_slot_number,
        slot_variant = p_slot_variant,
        frequency = p_frequency,
        channel_email = p_channel_email,
        channel_push = p_channel_push,
        channel_in_app = p_channel_in_app
    WHERE id = p_alert_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerta no encontrada'
            USING ERRCODE = 'P0003';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.update_marketplace_alert IS 'Updates an existing marketplace alert. Only the owner can update.';

-- Delete an alert
CREATE OR REPLACE FUNCTION public.delete_marketplace_alert(p_alert_id BIGINT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.marketplace_alerts
    WHERE id = p_alert_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerta no encontrada'
            USING ERRCODE = 'P0003';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_marketplace_alert IS 'Deletes a marketplace alert. Only the owner can delete.';

-- Toggle alert active/paused state
CREATE OR REPLACE FUNCTION public.toggle_marketplace_alert(p_alert_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_new_status BOOLEAN;
BEGIN
    UPDATE public.marketplace_alerts
    SET is_active = NOT is_active
    WHERE id = p_alert_id AND user_id = auth.uid()
    RETURNING is_active INTO v_new_status;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Alerta no encontrada'
            USING ERRCODE = 'P0003';
    END IF;

    RETURN v_new_status;
END;
$$;

COMMENT ON FUNCTION public.toggle_marketplace_alert IS 'Toggles a marketplace alert between active and paused. Returns new status.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. MATCHING FUNCTION (used by instant alert edge function)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Match a newly created/updated listing against all active instant alerts
-- Returns the alerts that match, excluding the listing author and recently triggered alerts
CREATE OR REPLACE FUNCTION public.match_listing_against_instant_alerts(p_listing_id BIGINT)
RETURNS TABLE (
    alert_id BIGINT,
    alert_user_id UUID,
    alert_search_query TEXT,
    alert_collection_name TEXT,
    alert_slot_info TEXT,
    channel_email BOOLEAN,
    channel_push BOOLEAN,
    channel_in_app BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_listing RECORD;
BEGIN
    -- Fetch listing data
    SELECT
        tl.id, tl.title, tl.description, tl.collection_name,
        tl.sticker_number, tl.user_id AS author_id,
        tl.copy_id, tl.slot_id, tl.status,
        -- Get template info if linked to a slot
        ts.template_id AS linked_template_id,
        ts.slot_number AS linked_slot_number,
        ts.slot_variant AS linked_slot_variant
    INTO v_listing
    FROM public.trade_listings tl
    LEFT JOIN public.template_slots ts ON ts.id = tl.slot_id
    WHERE tl.id = p_listing_id;

    -- Only process active, non-deleted listings
    IF v_listing IS NULL OR v_listing.status != 'active' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        a.id AS alert_id,
        a.user_id AS alert_user_id,
        a.search_query AS alert_search_query,
        ct.title AS alert_collection_name,
        CASE
            WHEN a.slot_number IS NOT NULL
            THEN '#' || a.slot_number || COALESCE(a.slot_variant, '')
            ELSE NULL
        END AS alert_slot_info,
        a.channel_email,
        a.channel_push,
        a.channel_in_app
    FROM public.marketplace_alerts a
    LEFT JOIN public.collection_templates ct ON ct.id = COALESCE(a.collection_id, a.template_id)
    WHERE a.is_active = true
      AND a.frequency = 'instant'
      -- Don't alert the listing author about their own listing
      AND a.user_id != v_listing.author_id
      -- Cooldown: skip if triggered within the last hour
      AND (a.last_triggered_at IS NULL OR a.last_triggered_at < now() - interval '1 hour')
      -- Not already matched for this listing
      AND NOT EXISTS (
          SELECT 1 FROM public.marketplace_alert_matches m
          WHERE m.alert_id = a.id AND m.listing_id = p_listing_id
      )
      -- Text search match (if search_query is set)
      AND (
          a.search_query IS NULL
          OR v_listing.title ILIKE '%' || a.search_query || '%'
          OR COALESCE(v_listing.description, '') ILIKE '%' || a.search_query || '%'
          OR COALESCE(v_listing.collection_name, '') ILIKE '%' || a.search_query || '%'
          OR COALESCE(v_listing.sticker_number, '') ILIKE '%' || a.search_query || '%'
      )
      -- Collection match (if collection_id is set)
      AND (
          a.collection_id IS NULL
          OR EXISTS (
              SELECT 1 FROM public.user_template_copies utc
              WHERE utc.id = v_listing.copy_id
                AND utc.template_id = a.collection_id
          )
          OR COALESCE(v_listing.collection_name, '') ILIKE '%' || ct.title || '%'
      )
      -- Specific sticker match (if template_id + slot_number are set)
      AND (
          a.template_id IS NULL
          OR (
              v_listing.linked_template_id = a.template_id
              AND (a.slot_number IS NULL OR v_listing.linked_slot_number = a.slot_number)
              AND (a.slot_variant IS NULL OR v_listing.linked_slot_variant = a.slot_variant)
          )
      );
END;
$$;

COMMENT ON FUNCTION public.match_listing_against_instant_alerts IS 'Matches a listing against active instant alerts. Used by the process-instant-alert edge function.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. DIGEST MATCHING FUNCTION (used by daily/weekly digest edge function)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Find new matching listings for digest alerts since their last_digest_at
CREATE OR REPLACE FUNCTION public.get_digest_alert_matches(p_frequency TEXT)
RETURNS TABLE (
    alert_id BIGINT,
    alert_user_id UUID,
    alert_search_query TEXT,
    alert_collection_name TEXT,
    alert_slot_info TEXT,
    channel_email BOOLEAN,
    channel_push BOOLEAN,
    channel_in_app BOOLEAN,
    listing_id BIGINT,
    listing_title TEXT,
    listing_collection_name TEXT,
    listing_sticker_number TEXT,
    listing_image_url TEXT,
    listing_author_nickname TEXT,
    listing_created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT
        a.id AS alert_id,
        a.user_id AS alert_user_id,
        a.search_query AS alert_search_query,
        ct.title AS alert_collection_name,
        CASE
            WHEN a.slot_number IS NOT NULL
            THEN '#' || a.slot_number || COALESCE(a.slot_variant, '')
            ELSE NULL
        END AS alert_slot_info,
        a.channel_email,
        a.channel_push,
        a.channel_in_app,
        tl.id AS listing_id,
        tl.title AS listing_title,
        tl.collection_name AS listing_collection_name,
        tl.sticker_number AS listing_sticker_number,
        tl.image_url AS listing_image_url,
        p.nickname AS listing_author_nickname,
        tl.created_at AS listing_created_at
    FROM public.marketplace_alerts a
    LEFT JOIN public.collection_templates ct ON ct.id = COALESCE(a.collection_id, a.template_id)
    CROSS JOIN LATERAL (
        SELECT tl2.*
        FROM public.trade_listings tl2
        WHERE tl2.status = 'active'
          AND tl2.deleted_at IS NULL
          -- Only listings created/updated after last digest
          AND tl2.created_at > COALESCE(a.last_digest_at, a.created_at)
          -- Don't alert about user's own listings
          AND tl2.user_id != a.user_id
          -- Not already matched
          AND NOT EXISTS (
              SELECT 1 FROM public.marketplace_alert_matches m
              WHERE m.alert_id = a.id AND m.listing_id = tl2.id
          )
          -- Text search match
          AND (
              a.search_query IS NULL
              OR tl2.title ILIKE '%' || a.search_query || '%'
              OR COALESCE(tl2.description, '') ILIKE '%' || a.search_query || '%'
              OR COALESCE(tl2.collection_name, '') ILIKE '%' || a.search_query || '%'
              OR COALESCE(tl2.sticker_number, '') ILIKE '%' || a.search_query || '%'
          )
          -- Collection match
          AND (
              a.collection_id IS NULL
              OR EXISTS (
                  SELECT 1 FROM public.user_template_copies utc
                  WHERE utc.id = tl2.copy_id
                    AND utc.template_id = a.collection_id
              )
              OR COALESCE(tl2.collection_name, '') ILIKE '%' || ct.title || '%'
          )
          -- Specific sticker match
          AND (
              a.template_id IS NULL
              OR EXISTS (
                  SELECT 1 FROM public.template_slots ts
                  WHERE ts.id = tl2.slot_id
                    AND ts.template_id = a.template_id
                    AND (a.slot_number IS NULL OR ts.slot_number = a.slot_number)
                    AND (a.slot_variant IS NULL OR ts.slot_variant = a.slot_variant)
              )
          )
        ORDER BY tl2.created_at DESC
        LIMIT 50  -- Cap matches per alert per digest
    ) tl
    LEFT JOIN public.profiles p ON p.id = tl.user_id
    WHERE a.is_active = true
      AND a.frequency = p_frequency
    ORDER BY a.user_id, a.id, tl.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_digest_alert_matches IS 'Finds new matching listings for all active daily/weekly alerts. Used by the send-alert-digest edge function.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. DB TRIGGER FOR INSTANT ALERTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger function: when a listing is inserted or updated to 'active',
-- call the edge function to process instant alerts
CREATE OR REPLACE FUNCTION public.trigger_instant_alert_check()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_has_instant_alerts BOOLEAN;
BEGIN
    -- Quick check: are there any active instant alerts at all?
    -- This avoids an HTTP call on every listing insert if no one has instant alerts
    SELECT EXISTS (
        SELECT 1 FROM public.marketplace_alerts
        WHERE is_active = true AND frequency = 'instant'
        LIMIT 1
    ) INTO v_has_instant_alerts;

    IF NOT v_has_instant_alerts THEN
        RETURN NEW;
    END IF;

    -- Call edge function via pg_net (async, non-blocking)
    PERFORM net.http_post(
        url := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/process-instant-alert',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('listing_id', NEW.id)
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_instant_alert_check() IS 'Async trigger: calls process-instant-alert edge function when a listing becomes active';

-- Trigger on INSERT (new listing)
CREATE TRIGGER on_listing_insert_check_alerts
    AFTER INSERT ON public.trade_listings
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION public.trigger_instant_alert_check();

-- Trigger on UPDATE to 'active' (re-listing or status change)
CREATE TRIGGER on_listing_update_check_alerts
    AFTER UPDATE OF status ON public.trade_listings
    FOR EACH ROW
    WHEN (NEW.status = 'active' AND OLD.status != 'active')
    EXECUTE FUNCTION public.trigger_instant_alert_check();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. CRON SCHEDULES FOR DIGESTS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $cron$
BEGIN
    -- Only schedule if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Daily digest at 9:00 AM UTC (11:00 AM Madrid time in summer)
        PERFORM cron.schedule(
            'alert-daily-digest',
            '0 9 * * *',
            $$
            SELECT net.http_post(
                url := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-alert-digest',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := '{"frequency": "daily"}'::jsonb
            );
            $$
        );

        -- Weekly digest on Mondays at 9:00 AM UTC
        PERFORM cron.schedule(
            'alert-weekly-digest',
            '0 9 * * 1',
            $$
            SELECT net.http_post(
                url := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-alert-digest',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := '{"frequency": "weekly"}'::jsonb
            );
            $$
        );
    END IF;
END
$cron$;

-- Update the notifications constraint to include the new alert kinds
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
  'trade_confirmed'::text,
  'marketplace_alert'::text,
  'marketplace_alert_digest'::text
]));

-- Redefine send_email_notification_trigger to return early for marketplace_alert kinds
CREATE OR REPLACE FUNCTION public.send_email_notification_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_action_url TEXT;
    v_url TEXT := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-email-notification';
    v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o';
    v_base_url TEXT := 'https://cromos-web.vercel.app';
BEGIN
    -- Bypassed for marketplace alerts/digests as their notification dispatch is handled directly by edge functions
    IF NEW.kind = 'marketplace_alert' OR NEW.kind = 'marketplace_alert_digest' THEN
        RETURN NEW;
    END IF;

    -- Determine title, body, and action URL based on notification kind
    CASE NEW.kind
        WHEN 'chat_unread' THEN
            v_title := 'Nuevo mensaje';
            v_body := 'Tienes un mensaje nuevo en un intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'listing_chat' THEN
            v_title := 'Pregunta sobre tu anuncio';
            v_body := COALESCE(NEW.payload->>'message_preview', 'Alguien ha preguntado por tu cromo');
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_reserved' THEN
            v_title := '¡Cromo reservado!';
            v_body := 'Alguien ha reservado uno de tus cromos';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_completed' THEN
            v_title := 'Venta completada';
            v_body := 'Se ha confirmado la venta de tu cromo';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id;
        WHEN 'proposal_accepted' THEN
            v_title := '¡Oferta aceptada!';
            v_body := 'Tu oferta de intercambio ha sido aceptada';
            v_action_url := v_base_url || '/chats';
        WHEN 'proposal_rejected' THEN
            v_title := 'Oferta rechazada';
            v_body := 'Tu oferta de intercambio ha sido rechazada';
            v_action_url := v_base_url || '/chats';
        WHEN 'finalization_requested' THEN
            v_title := 'Finalización solicitada';
            v_body := 'La otra parte ha solicitado finalizar el intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'user_rated' THEN
            v_title := 'Nueva valoración';
            v_body := 'Has recibido una nueva valoración de usuario';
            v_action_url := v_base_url || '/profile';
        WHEN 'template_rated' THEN
            v_title := 'Valoración de plantilla';
            v_body := 'Alguien ha valorado una de tus plantillas';
            v_action_url := v_base_url || '/templates/' || NEW.template_id;
        WHEN 'badge_earned' THEN
            v_title := '¡Nuevo logro!';
            v_body := 'Has desbloqueado un nuevo logro';
            v_action_url := v_base_url || '/profile';
        WHEN 'system_message' THEN
            v_title := 'Mensaje del sistema';
            v_body := COALESCE(NEW.payload->>'message', 'Tienes un mensaje importante del sistema');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'admin_action' THEN
            v_title := 'Acción administrativa';
            v_body := COALESCE(NEW.payload->>'message', 'Un administrador ha realizado una acción en tu cuenta');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'level_up' THEN
            v_title := '¡Subiste de nivel!';
            v_body := COALESCE(NEW.payload->>'message', 'Has alcanzado un nuevo nivel');
            v_action_url := v_base_url || '/profile';
        ELSE
            v_title := 'Nueva notificación';
            v_body := 'Tienes una nueva actividad en CambioCromos';
            v_action_url := v_base_url || '/profile/notifications';
    END CASE;

    -- Call Edge Function via pg_net
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'notification_kind', NEW.kind,
            'title', v_title,
            'body', v_body,
            'data', NEW.payload || jsonb_build_object('action_url', v_action_url)
        )
    );

    RETURN NEW;
END;
$$;

-- Redefine send_push_notification_trigger to return early for marketplace_alert kinds
CREATE OR REPLACE FUNCTION public.send_push_notification_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_action_url TEXT;
    v_url TEXT := 'https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/send-push-notification';
    v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o';
    v_base_url TEXT := 'https://cromos-web.vercel.app';
BEGIN
    -- Bypassed for marketplace alerts/digests as their notification dispatch is handled directly by edge functions
    IF NEW.kind = 'marketplace_alert' OR NEW.kind = 'marketplace_alert_digest' THEN
        RETURN NEW;
    END IF;

    -- Determine title, body, and action URL based on notification kind
    CASE NEW.kind
        WHEN 'chat_unread' THEN
            v_title := 'Nuevo mensaje';
            v_body := 'Tienes un mensaje nuevo en un intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'listing_chat' THEN
            v_title := 'Pregunta sobre tu anuncio';
            v_body := COALESCE(NEW.payload->>'message_preview', 'Alguien ha preguntado por tu cromo');
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_reserved' THEN
            v_title := '¡Cromo reservado!';
            v_body := 'Alguien ha reservado uno de tus cromos';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id || '/chat';
        WHEN 'listing_completed' THEN
            v_title := 'Venta completada';
            v_body := 'Se ha confirmado la venta de tu cromo';
            v_action_url := v_base_url || '/marketplace/' || NEW.listing_id;
        WHEN 'proposal_accepted' THEN
            v_title := '¡Oferta aceptada!';
            v_body := 'Tu oferta de intercambio ha sido aceptada';
            v_action_url := v_base_url || '/chats';
        WHEN 'proposal_rejected' THEN
            v_title := 'Oferta rechazada';
            v_body := 'Tu oferta de intercambio ha sido rechazada';
            v_action_url := v_base_url || '/chats';
        WHEN 'finalization_requested' THEN
            v_title := 'Finalización solicitada';
            v_body := 'La otra parte ha solicitado finalizar el intercambio';
            v_action_url := v_base_url || '/chats';
        WHEN 'user_rated' THEN
            v_title := 'Nueva valoración';
            v_body := 'Has recibido una nueva valoración de usuario';
            v_action_url := v_base_url || '/profile';
        WHEN 'template_rated' THEN
            v_title := 'Valoración de plantilla';
            v_body := 'Alguien ha valorado una de tus plantillas';
            v_action_url := v_base_url || '/templates/' || NEW.template_id;
        WHEN 'badge_earned' THEN
            v_title := '¡Nuevo logro!';
            v_body := 'Has desbloqueado un nuevo logro';
            v_action_url := v_base_url || '/profile';
        WHEN 'system_message' THEN
            v_title := 'Mensaje del sistema';
            v_body := COALESCE(NEW.payload->>'message', 'Tienes un mensaje importante del sistema');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'admin_action' THEN
            v_title := 'Acción administrativa';
            v_body := COALESCE(NEW.payload->>'message', 'Un administrador ha realizado una acción en tu cuenta');
            v_action_url := v_base_url || '/profile/notifications';
        WHEN 'level_up' THEN
            v_title := '¡Subiste de nivel!';
            v_body := COALESCE(NEW.payload->>'message', 'Has alcanzado un nuevo nivel');
            v_action_url := v_base_url || '/profile';
        ELSE
            v_title := 'Nueva notificación';
            v_body := 'Tienes una nueva actividad en CambioCromos';
            v_action_url := v_base_url || '/profile/notifications';
    END CASE;

    -- Call Edge Function via pg_net
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'notification_kind', NEW.kind,
            'title', v_title,
            'body', v_body,
            'data', NEW.payload || jsonb_build_object('action_url', v_action_url)
        )
    );

    RETURN NEW;
END;
$$;

-- Ensure locale column exists on profiles table (which might be configured in production but missing locally)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'es';

-- Ensure country_code column exists on profiles table (which might be configured in production but missing locally)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'ES';

-- Fix get_ignored_listings RPC definition to return listing_image_url and author_nickname as expected by frontend
DROP FUNCTION IF EXISTS public.get_ignored_listings();
CREATE OR REPLACE FUNCTION public.get_ignored_listings()
RETURNS TABLE(
    listing_id bigint,
    listing_title text,
    listing_description text,
    listing_status text,
    collection_name text,
    listing_image_url text,
    author_nickname text,
    ignored_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        il.listing_id,
        tl.title,
        tl.description,
        tl.status,
        tl.collection_name,
        tl.image_url AS listing_image_url,
        p.nickname AS author_nickname,
        il.created_at
    FROM ignored_listings il
    JOIN trade_listings tl ON tl.id = il.listing_id
    LEFT JOIN profiles p ON p.id = tl.user_id
    WHERE il.user_id = auth.uid()
      AND tl.deleted_at IS NULL
    ORDER BY il.created_at DESC;
END;
$$;

-- Ensure the missing features columns exist in collection_templates
ALTER TABLE public.collection_templates ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.collection_templates ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;
ALTER TABLE public.collection_templates ADD COLUMN IF NOT EXISTS featured_priority INTEGER DEFAULT 0;
ALTER TABLE public.collection_templates ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Ensure completion statistics and reputation columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_trades INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trade_reputation_tier TEXT DEFAULT 'bronze';

-- Admin templates features management RPCs
CREATE OR REPLACE FUNCTION public.admin_toggle_featured_template(p_template_id bigint, p_featured boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $$
BEGIN
  PERFORM require_admin();
  
  UPDATE collection_templates
  SET
    is_featured = p_featured,
    featured_at = CASE WHEN p_featured THEN NOW() ELSE NULL END
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_featured_priority(p_template_id bigint, p_priority integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  PERFORM require_admin();
  
  UPDATE collection_templates
  SET featured_priority = p_priority
  WHERE id = p_template_id AND is_featured = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or not featured';
  END IF;
END;
$$;

-- Override admin_list_templates to return features columns
DROP FUNCTION IF EXISTS public.admin_list_templates(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_list_templates(text, text, integer, integer, text);
CREATE OR REPLACE FUNCTION public.admin_list_templates(p_status text DEFAULT NULL::text, p_query text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20, p_country_code text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, title text, status text, deleted_at timestamp with time zone, created_at timestamp with time zone, author_id uuid, author_nickname text, rating_avg numeric, rating_count bigint, copies_count integer, is_public boolean, is_featured boolean, featured_priority integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        CASE
            WHEN ct.deleted_at IS NOT NULL THEN 'deleted'
            WHEN ct.suspended_at IS NOT NULL THEN 'suspended'
            ELSE 'active'
        END AS status,
        ct.deleted_at,
        ct.created_at,
        ct.author_id,
        p.nickname AS author_nickname,
        COALESCE(ct.rating_avg, 0)::DECIMAL AS rating_avg,
        COALESCE(ct.rating_count, 0)::BIGINT AS rating_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM user_template_copies utc
            WHERE utc.template_id = ct.id
        ) AS copies_count,
        ct.is_public,
        ct.is_featured,
        ct.featured_priority
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE
        (p_status IS NULL OR
         (p_status = 'deleted' AND ct.deleted_at IS NOT NULL) OR
         (p_status = 'suspended' AND ct.suspended_at IS NOT NULL AND ct.deleted_at IS NULL) OR
         (p_status = 'active' AND ct.deleted_at IS NULL AND ct.suspended_at IS NULL))
        AND (p_query IS NULL OR ct.title ILIKE '%' || p_query || '%')
        AND (p_country_code IS NULL OR ct.country_code = p_country_code)
    ORDER BY ct.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

-- Recreate/override update_trade_listing
CREATE OR REPLACE FUNCTION public.update_trade_listing(p_listing_id bigint, p_title text, p_description text DEFAULT NULL::text, p_sticker_number text DEFAULT NULL::text, p_collection_name text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_listing_type text DEFAULT NULL::text, p_price numeric DEFAULT NULL::numeric, p_thumbnail_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_user_id UUID;
    v_final_listing_type TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to update a listing';
    END IF;
    SELECT user_id INTO v_user_id FROM trade_listings WHERE id = p_listing_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only update your own listings';
    END IF;
    IF p_listing_type IS NOT NULL THEN
        IF p_listing_type NOT IN ('intercambio', 'venta', 'ambos') THEN
            RAISE EXCEPTION 'listing_type must be intercambio, venta, or ambos';
        END IF;
        v_final_listing_type := p_listing_type;
    ELSE
        SELECT listing_type INTO v_final_listing_type FROM trade_listings WHERE id = p_listing_id;
    END IF;
    IF v_final_listing_type IN ('venta', 'ambos') AND (p_price IS NULL OR p_price <= 0) THEN
        RAISE EXCEPTION 'Price must be greater than 0 when listing is for sale';
    END IF;
    UPDATE trade_listings
    SET title = p_title,
        description = p_description,
        sticker_number = p_sticker_number,
        collection_name = p_collection_name,
        image_url = p_image_url,
        -- Only update thumbnail_url if a new one was provided
        thumbnail_url = COALESCE(p_thumbnail_url, thumbnail_url),
        listing_type = v_final_listing_type,
        price = p_price,
        updated_at = NOW()
    WHERE id = p_listing_id;
END;
$$;


