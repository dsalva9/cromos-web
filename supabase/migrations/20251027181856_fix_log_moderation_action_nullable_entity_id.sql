-- =====================================================
-- FIX: Make p_moderated_entity_id nullable in log_moderation_action
-- =====================================================
-- Purpose: Allow NULL entity IDs for moderation actions that don't target specific entities
-- Issue: resolve_report calls log_moderation_action with NULL for suspend_user action
-- =====================================================

DROP FUNCTION IF EXISTS log_moderation_action(TEXT, TEXT, BIGINT, TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION log_moderation_action(
    p_moderation_action_type TEXT,
    p_moderated_entity_type TEXT,
    p_moderated_entity_id BIGINT DEFAULT NULL,
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
    v_effective_entity TEXT;
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

    v_effective_entity := COALESCE(p_moderated_entity_type, 'moderation');

    -- Insert into audit log with legacy and moderation columns populated
    INSERT INTO audit_log (
        user_id,
        admin_id,
        admin_nickname,
        entity,
        entity_id,
        action,
        before_json,
        after_json,
        entity_type,
        old_values,
        new_values,
        moderation_action_type,
        moderated_entity_type,
        moderated_entity_id,
        moderation_reason,
        created_at
    ) VALUES (
        auth.uid(),
        auth.uid(),
        v_admin_nickname,
        v_effective_entity,
        p_moderated_entity_id,
        'moderation',
        p_old_values,
        p_new_values,
        p_moderated_entity_type,
        p_old_values,
        p_new_values,
        p_moderation_action_type,
        p_moderated_entity_type,
        p_moderated_entity_id,
        p_moderation_reason,
        NOW()
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION log_moderation_action IS 'Logs moderation actions with optional entity ID for cases like suspend_user where entity ID may be NULL';
