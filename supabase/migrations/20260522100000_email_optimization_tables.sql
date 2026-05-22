-- Migration: Email Optimization Tables
-- Creates tables for email send cooldowns and bounce suppression.

-- =============================================================================
-- email_send_log: tracks when emails were sent to implement per-kind cooldowns
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_send_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_kind TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cooldown lookups:
-- "was an email of kind X sent to user Y in the last N hours?"
CREATE INDEX idx_email_send_log_user_kind_sent
    ON public.email_send_log (user_id, notification_kind, sent_at DESC);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed – only service_role accesses this table from Edge Functions.

-- =============================================================================
-- email_bounces: tracks bounced email addresses for suppression
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_bounces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    bounce_count INT NOT NULL DEFAULT 1,
    last_bounced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_email_bounces_email ON public.email_bounces (email);
CREATE INDEX idx_email_bounces_suppressed ON public.email_bounces (suppressed) WHERE suppressed = TRUE;

ALTER TABLE public.email_bounces ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed – only service_role accesses this table from Edge Functions.

-- =============================================================================
-- Permissions: grant access to service_role (Edge Functions use this role)
-- =============================================================================
GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.email_bounces TO service_role;
