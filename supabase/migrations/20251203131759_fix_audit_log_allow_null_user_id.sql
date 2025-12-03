-- Remove NOT NULL constraint from audit_log.user_id
-- This allows audit entries to be preserved when users are deleted

ALTER TABLE audit_log
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN audit_log.user_id IS
'User who is the subject of the audit entry. NULL when user has been deleted but audit history is preserved.';
