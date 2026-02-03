-- Email Forwarding System Migration
-- Creates tables and RPC functions for managing email forwarding

-- Create email_forwarding_addresses table
CREATE TABLE IF NOT EXISTS email_forwarding_addresses (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create inbound_email_log table
CREATE TABLE IF NOT EXISTS inbound_email_log (
    id SERIAL PRIMARY KEY,
    resend_email_id TEXT,
    from_address TEXT NOT NULL,
    to_addresses TEXT[] NOT NULL,
    subject TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    forwarded_to TEXT[],
    forwarding_status TEXT NOT NULL CHECK (forwarding_status IN ('success', 'partial_failure', 'failed')),
    error_details JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_forwarding_active ON email_forwarding_addresses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_received_at ON inbound_email_log(received_at DESC);

-- Enable RLS
ALTER TABLE email_forwarding_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only access through RPC functions)
CREATE POLICY "Admin only access to forwarding addresses"
    ON email_forwarding_addresses
    FOR ALL
    USING (false);

CREATE POLICY "Admin only access to email logs"
    ON inbound_email_log
    FOR ALL
    USING (false);

-- RPC Function: List all forwarding addresses
CREATE OR REPLACE FUNCTION admin_list_forwarding_addresses()
RETURNS TABLE (
    id INTEGER,
    email TEXT,
    is_active BOOLEAN,
    added_by UUID,
    added_by_username TEXT,
    added_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can access forwarding addresses';
    END IF;

    RETURN QUERY
    SELECT
        efa.id,
        efa.email,
        efa.is_active,
        efa.added_by,
        p.username as added_by_username,
        efa.added_at,
        efa.last_used_at
    FROM email_forwarding_addresses efa
    LEFT JOIN profiles p ON efa.added_by = p.id
    ORDER BY efa.added_at DESC;
END;
$$;

-- RPC Function: Add forwarding address
CREATE OR REPLACE FUNCTION admin_add_forwarding_address(p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can add forwarding addresses';
    END IF;

    -- Validate email format
    IF p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Insert new address
    INSERT INTO email_forwarding_addresses (email, added_by)
    VALUES (p_email, auth.uid())
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- RPC Function: Remove forwarding address
CREATE OR REPLACE FUNCTION admin_remove_forwarding_address(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can remove forwarding addresses';
    END IF;

    DELETE FROM email_forwarding_addresses
    WHERE id = p_id;

    RETURN FOUND;
END;
$$;

-- RPC Function: Toggle forwarding address active status
CREATE OR REPLACE FUNCTION admin_toggle_forwarding_address(p_id INTEGER, p_is_active BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can toggle forwarding addresses';
    END IF;

    UPDATE email_forwarding_addresses
    SET is_active = p_is_active
    WHERE id = p_id;

    RETURN FOUND;
END;
$$;

-- RPC Function: Get inbound email logs
CREATE OR REPLACE FUNCTION admin_get_inbound_email_logs(p_limit INTEGER DEFAULT 25, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    id INTEGER,
    resend_email_id TEXT,
    from_address TEXT,
    to_addresses TEXT[],
    subject TEXT,
    received_at TIMESTAMPTZ,
    forwarded_to TEXT[],
    forwarding_status TEXT,
    error_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can access email logs';
    END IF;

    RETURN QUERY
    SELECT
        iel.id,
        iel.resend_email_id,
        iel.from_address,
        iel.to_addresses,
        iel.subject,
        iel.received_at,
        iel.forwarded_to,
        iel.forwarding_status,
        iel.error_details
    FROM inbound_email_log iel
    ORDER BY iel.received_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- RPC Function: Log inbound email (SERVICE_ROLE only)
CREATE OR REPLACE FUNCTION log_inbound_email(
    p_resend_email_id TEXT,
    p_from_address TEXT,
    p_to_addresses TEXT[],
    p_subject TEXT,
    p_forwarded_to TEXT[],
    p_forwarding_status TEXT,
    p_error_details JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    -- This function should only be called by the Edge Function with SERVICE_ROLE
    -- No auth.uid() check needed as it won't be set for service role calls

    INSERT INTO inbound_email_log (
        resend_email_id,
        from_address,
        to_addresses,
        subject,
        forwarded_to,
        forwarding_status,
        error_details
    )
    VALUES (
        p_resend_email_id,
        p_from_address,
        p_to_addresses,
        p_subject,
        p_forwarded_to,
        p_forwarding_status,
        p_error_details
    )
    RETURNING id INTO v_log_id;

    -- Update last_used_at for forwarded addresses
    IF p_forwarded_to IS NOT NULL AND array_length(p_forwarded_to, 1) > 0 THEN
        UPDATE email_forwarding_addresses
        SET last_used_at = NOW()
        WHERE email = ANY(p_forwarded_to);
    END IF;

    RETURN v_log_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_list_forwarding_addresses() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_forwarding_address(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_forwarding_address(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_forwarding_address(INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_inbound_email_logs(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_inbound_email(TEXT, TEXT, TEXT[], TEXT, TEXT[], TEXT, JSONB) TO service_role;
