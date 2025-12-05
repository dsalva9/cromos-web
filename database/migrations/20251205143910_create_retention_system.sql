-- Migration: 20251205143910_create_retention_system.sql
-- Phase 1B: Core Retention Schema

-- =====================================================
-- DATA RETENTION SYSTEM - Core Schema
-- =====================================================
-- This migration creates the foundational retention system
-- that tracks all scheduled deletions and anonymizations.
-- =====================================================

-- =====================================================
-- Table: retention_schedule
-- Central tracking for all data retention/deletion
-- =====================================================

CREATE TABLE IF NOT EXISTS retention_schedule (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'listing', 'template', 'user', 'message', 'report', 'rating', 'notification'
    )),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('delete', 'anonymize')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    legal_hold_until TIMESTAMPTZ,
    initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    initiated_by_type TEXT CHECK (initiated_by_type IN ('user', 'admin', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    CONSTRAINT unique_entity_schedule UNIQUE(entity_type, entity_id, action)
);

-- Indices for efficient querying
CREATE INDEX idx_retention_schedule_pending ON retention_schedule(scheduled_for)
    WHERE processed_at IS NULL;

CREATE INDEX idx_retention_schedule_entity ON retention_schedule(entity_type, entity_id);

CREATE INDEX idx_retention_schedule_legal_hold ON retention_schedule(legal_hold_until)
    WHERE legal_hold_until IS NOT NULL;

CREATE INDEX idx_retention_schedule_initiated_by ON retention_schedule(initiated_by)
    WHERE initiated_by IS NOT NULL;

-- Comments
COMMENT ON TABLE retention_schedule IS
    'Centralized schedule for data retention and deletion. All entities scheduled for deletion tracked here.';

COMMENT ON COLUMN retention_schedule.entity_type IS
    'Type of entity: listing, template, user, message, report, rating, notification';

COMMENT ON COLUMN retention_schedule.entity_id IS
    'ID of the entity to be deleted/anonymized (stored as TEXT for flexibility)';

COMMENT ON COLUMN retention_schedule.action IS
    'Action to perform: delete (permanent removal) or anonymize (remove PII, keep data)';

COMMENT ON COLUMN retention_schedule.scheduled_for IS
    'When this action should be performed (checked by cleanup job)';

COMMENT ON COLUMN retention_schedule.reason IS
    'Why this was scheduled: user_requested, admin_suspended, policy_expiry, etc.';

COMMENT ON COLUMN retention_schedule.legal_hold_until IS
    'Prevents deletion until this date (police preservation order). NULL = no hold.';

COMMENT ON COLUMN retention_schedule.initiated_by IS
    'User who initiated this action (NULL if system-initiated)';

COMMENT ON COLUMN retention_schedule.initiated_by_type IS
    'Who initiated: user (self-deletion), admin (moderation), system (automatic policy)';

COMMENT ON COLUMN retention_schedule.processed_at IS
    'When this action was completed. NULL = pending.';

-- =====================================================
-- Add deletion markers to existing tables
-- =====================================================

-- trade_listings: Track deleted listings
ALTER TABLE trade_listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE trade_listings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE trade_listings ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('user', 'admin'));

COMMENT ON COLUMN trade_listings.deleted_at IS
    'When listing was marked for deletion. Hidden from all users except admins during retention period.';

COMMENT ON COLUMN trade_listings.deleted_by IS
    'Who deleted this listing (user_id or admin_id). NULL if deleted by system.';

COMMENT ON COLUMN trade_listings.deletion_type IS
    'user = owner deleted it, admin = moderator removed it';

-- collection_templates: Track deleted templates
ALTER TABLE collection_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE collection_templates ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE collection_templates ADD COLUMN IF NOT EXISTS deletion_type TEXT CHECK (deletion_type IN ('user', 'admin'));

COMMENT ON COLUMN collection_templates.deleted_at IS
    'When template was marked for deletion. Hidden from all users except admins during retention period.';

COMMENT ON COLUMN collection_templates.deleted_by IS
    'Who deleted this template (author_id or admin_id). NULL if deleted by system.';

COMMENT ON COLUMN collection_templates.deletion_type IS
    'user = author deleted it, admin = moderator removed it';

-- profiles: Track account deletion and suspension
-- Note: deleted_at might already exist from previous system, ADD COLUMN IF NOT EXISTS handles this
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

COMMENT ON COLUMN profiles.deleted_at IS
    'When user requested account deletion or admin deleted account. User cannot log in during retention period.';

COMMENT ON COLUMN profiles.suspended_at IS
    'When admin suspended this account. Suspended accounts cannot log in.';

COMMENT ON COLUMN profiles.suspended_by IS
    'Admin who suspended this account. NULL if account not suspended.';

COMMENT ON COLUMN profiles.suspension_reason IS
    'Why this account was suspended (for admin reference and user notification).';

COMMENT ON COLUMN profiles.deletion_reason IS
    'Why account was deleted: user_requested, admin_action, policy_violation, etc.';

-- =====================================================
-- Performance indices for filtering
-- =====================================================

-- Listings: Fast lookup of active (non-deleted) listings
CREATE INDEX IF NOT EXISTS idx_listings_not_deleted ON trade_listings(id) WHERE deleted_at IS NULL;

-- Templates: Fast lookup of active (non-deleted) templates
CREATE INDEX IF NOT EXISTS idx_templates_not_deleted ON collection_templates(id) WHERE deleted_at IS NULL;

-- Profiles: Fast lookup of active (non-deleted, non-suspended) users
CREATE INDEX IF NOT EXISTS idx_profiles_not_deleted ON profiles(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(id) WHERE suspended_at IS NOT NULL;

-- =====================================================
-- Summary
-- =====================================================
-- Created:
-- - retention_schedule table (central tracking)
-- - deleted_at, deleted_by, deletion_type columns on listings/templates
-- - suspended_at, suspended_by, suspension_reason, deletion_reason on profiles
-- - Indices for efficient querying
-- =====================================================
