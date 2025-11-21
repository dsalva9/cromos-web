-- Phase 07: Administration & Moderation - Schema Fixes
-- Date: 2025-11-21
-- Description: Functions, triggers, and constraints for admin infrastructure

-- ============================================================================
-- 1. MODIFY is_admin_user FUNCTION
-- ============================================================================
-- Add suspension check to existing is_admin_user function
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
      AND is_admin = TRUE
      AND (is_suspended IS FALSE OR is_suspended IS NULL)
  );
END;
$function$;

-- ============================================================================
-- 2. CREATE log_admin_action TRIGGER FUNCTION
-- ============================================================================
-- Automates logging of administrative actions to audit_log table
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_action TEXT;
    v_entity_id BIGINT;
    v_entity_name TEXT;
BEGIN
    -- Check if user is admin using the secure function
    IF NOT public.is_admin_user() THEN
        RETURN NEW;
    END IF;

    v_admin_id := auth.uid();
    v_action := TG_ARGV[0];
    
    -- Map table name to allowed entity name
    IF TG_TABLE_NAME = 'profiles' THEN
        v_entity_name := 'user';
    ELSIF TG_TABLE_NAME = 'collection_templates' THEN
        v_entity_name := 'template';
    ELSE
        v_entity_name := TG_TABLE_NAME;
    END IF;
    
    -- Try to cast ID to bigint if possible, otherwise null
    BEGIN
        v_entity_id := NEW.id::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        v_entity_id := NULL;
    END;

    INSERT INTO audit_log (
        user_id,
        admin_id,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        occurred_at
    ) VALUES (
        v_admin_id,
        v_admin_id,
        v_action,
        v_entity_name,
        v_entity_id,
        row_to_json(OLD),
        row_to_json(NEW),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREATE AUDIT LOG TRIGGERS
-- ============================================================================
-- Trigger for profile changes
DROP TRIGGER IF EXISTS log_admin_profile_changes ON profiles;
CREATE TRIGGER log_admin_profile_changes
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_admin_action('update');

-- Trigger for template moderation
DROP TRIGGER IF EXISTS log_admin_template_moderation ON collection_templates;
CREATE TRIGGER log_admin_template_moderation
AFTER UPDATE ON collection_templates
FOR EACH ROW
EXECUTE FUNCTION log_admin_action('moderation');

-- ============================================================================
-- 4. CREATE SELF-REPORT PREVENTION TRIGGER
-- ============================================================================
-- Prevents users from reporting their own content
CREATE OR REPLACE FUNCTION public.check_self_report()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    IF NEW.target_type = 'listing' THEN
        SELECT user_id INTO v_owner_id FROM trade_listings WHERE id = NEW.target_id;
        IF v_owner_id = NEW.reporter_id THEN
            RAISE EXCEPTION 'Cannot report your own listing';
        END IF;
    ELSIF NEW.target_type = 'template' THEN
        SELECT user_id INTO v_owner_id FROM collection_templates WHERE id = NEW.target_id;
        IF v_owner_id = NEW.reporter_id THEN
            RAISE EXCEPTION 'Cannot report your own template';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_self_report_trigger ON reports;
CREATE TRIGGER check_self_report_trigger
BEFORE INSERT OR UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION check_self_report();

-- ============================================================================
-- 5. CREATE PERFORMANCE INDEXES
-- ============================================================================
-- Indexes for reports moderation dashboard
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Verify is_admin_user function
-- SELECT public.is_admin_user();

-- Verify audit_log triggers
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE 'log_admin%';

-- Verify self-report trigger
-- SELECT tgname FROM pg_trigger WHERE tgname = 'check_self_report_trigger';

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'reports';
