-- =====================================================
-- FIX: Add 'moderation' to audit_log action constraint
-- =====================================================
-- Purpose: Allow 'moderation' as a valid action in audit_log
-- Issue: log_moderation_action tries to insert 'moderation' but constraint only allows
--        'create', 'update', 'delete', 'bulk_upsert', 'remove_image'
-- =====================================================

-- Drop the existing constraint
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;

-- Add the updated constraint with 'moderation' included
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('create', 'update', 'delete', 'bulk_upsert', 'remove_image', 'moderation'));

COMMENT ON CONSTRAINT audit_log_action_check ON audit_log IS 'Allowed actions: create, update, delete, bulk_upsert, remove_image, moderation';
