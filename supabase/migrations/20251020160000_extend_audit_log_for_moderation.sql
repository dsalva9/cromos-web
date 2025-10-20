-- =====================================================
-- ADMIN MODERATION: Extend audit log for moderation
-- =====================================================
-- Purpose: Track all moderation actions with proper context
-- Note: Extends existing audit_log table with moderation-specific columns
-- =====================================================

-- Add missing columns to audit_log if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'admin_id'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'entity_type'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN entity_type TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'entity_id'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN entity_id BIGINT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'action'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN action TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'old_values'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN old_values JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'new_values'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN new_values JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'admin_nickname'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN admin_nickname TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add moderation-specific columns to audit_log
ALTER TABLE audit_log 
ADD COLUMN IF NOT EXISTS moderation_action_type TEXT,
ADD COLUMN IF NOT EXISTS moderated_entity_type TEXT,
ADD COLUMN IF NOT EXISTS moderated_entity_id BIGINT,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Add comments for new columns
COMMENT ON COLUMN audit_log.admin_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN audit_log.admin_nickname IS 'Nickname of the admin who performed the action';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected by the action';
COMMENT ON COLUMN audit_log.entity_id IS 'ID of the entity affected by the action';
COMMENT ON COLUMN audit_log.action IS 'Action performed';
COMMENT ON COLUMN audit_log.old_values IS 'Previous values before the action';
COMMENT ON COLUMN audit_log.new_values IS 'New values after the action';
COMMENT ON COLUMN audit_log.created_at IS 'Timestamp when the action was performed';
COMMENT ON COLUMN audit_log.moderation_action_type IS 'Type of moderation action: suspend_user, delete_content, resolve_report, etc.';
COMMENT ON COLUMN audit_log.moderated_entity_type IS 'Type of moderated entity: listing, template, user, rating, report';
COMMENT ON COLUMN audit_log.moderated_entity_id IS 'ID of the moderated entity';
COMMENT ON COLUMN audit_log.moderation_reason IS 'Reason for the moderation action';

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_moderation_action ON audit_log(moderation_action_type) WHERE moderation_action_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_moderated_entity ON audit_log(moderated_entity_type, moderated_entity_id) WHERE moderated_entity_type IS NOT NULL;

-- Create a view for moderation audit logs only
CREATE OR REPLACE VIEW moderation_audit_logs AS
SELECT 
    al.id,
    al.admin_id,
    al.admin_nickname,
    al.entity_type,
    al.entity_id,
    al.action,
    al.old_values,
    al.new_values,
    al.moderation_action_type,
    al.moderated_entity_type,
    al.moderated_entity_id,
    al.moderation_reason,
    al.created_at
FROM audit_log al
WHERE al.moderation_action_type IS NOT NULL
ORDER BY al.created_at DESC;

-- Add comment for the view
COMMENT ON VIEW moderation_audit_logs IS 'View of audit logs filtered for moderation actions only';

-- RPCs for moderation audit logging

-- FUNCTION 1: log_moderation_action
-- Logs a moderation action to the audit log
CREATE OR REPLACE FUNCTION log_moderation_action(
    p_moderation_action_type TEXT,
    p_moderated_entity_type TEXT,
    p_moderated_entity_id BIGINT,
    p_moderation_reason TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id BIGINT;
    v_admin_nickname TEXT;
BEGIN
    -- Validate user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Get admin nickname
    SELECT nickname INTO v_admin_nickname
    FROM profiles
    WHERE id = auth.uid();
    
    -- Insert into audit log
    INSERT INTO audit_log (
        admin_id,
        admin_nickname,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        created_at
    ) VALUES (
        auth.uid(),
        v_admin_nickname,
        p_moderated_entity_type,
        p_moderated_entity_id,
        'moderation',
        p_old_values,
        p_new_values,
        p_moderation_action_type,
        p_moderated_entity_type,
        p_moderated_entity_id,
        p_moderation_reason,
        NOW()
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- FUNCTION 2: get_moderation_audit_logs
-- Gets moderation audit logs with optional filtering
CREATE OR REPLACE FUNCTION get_moderation_audit_logs(
    p_moderation_action_type TEXT DEFAULT NULL,
    p_moderated_entity_type TEXT DEFAULT NULL,
    p_admin_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    admin_id UUID,
    admin_nickname TEXT,
    moderated_entity_type TEXT,
    moderated_entity_id BIGINT,
    moderation_action_type TEXT,
    moderation_reason TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id,
        al.admin_id,
        al.admin_nickname,
        al.moderated_entity_type,
        al.moderated_entity_id,
        al.moderation_action_type,
        al.moderation_reason,
        al.old_values,
        al.new_values,
        al.created_at
    FROM audit_log al
    WHERE al.moderation_action_type IS NOT NULL
    AND (p_moderation_action_type IS NULL OR al.moderation_action_type = p_moderation_action_type)
    AND (p_moderated_entity_type IS NULL OR al.moderated_entity_type = p_moderated_entity_type)
    AND (p_admin_id IS NULL OR al.admin_id = p_admin_id)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION 3: get_entity_moderation_history
-- Gets moderation history for a specific entity
CREATE OR REPLACE FUNCTION get_entity_moderation_history(
    p_entity_type TEXT,
    p_entity_id BIGINT
)
RETURNS TABLE (
    id BIGINT,
    admin_id UUID,
    admin_nickname TEXT,
    moderation_action_type TEXT,
    moderation_reason TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id,
        al.admin_id,
        al.admin_nickname,
        al.moderation_action_type,
        al.moderation_reason,
        al.old_values,
        al.new_values,
        al.created_at
    FROM audit_log al
    WHERE al.moderated_entity_type = p_entity_type
    AND al.moderated_entity_id = p_entity_id
    ORDER BY al.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_moderation_action TO authenticated;
GRANT EXECUTE ON FUNCTION get_moderation_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_entity_moderation_history TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION log_moderation_action IS 'Logs a moderation action to the audit log';
COMMENT ON FUNCTION get_moderation_audit_logs IS 'Gets moderation audit logs with optional filtering';
COMMENT ON FUNCTION get_entity_moderation_history IS 'Gets moderation history for a specific entity';