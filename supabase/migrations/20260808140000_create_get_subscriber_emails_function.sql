-- Create function to query auth.users for subscriber emails by date range
-- This bypasses GoTrue's listUsers API which has a known bug where
-- NULL confirmation_token values cause "sql: Scan error" 500 responses

CREATE OR REPLACE FUNCTION public.get_subscriber_emails(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(email text) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.email::text
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND (p_start_date IS NULL OR u.created_at >= p_start_date)
    AND (p_end_date IS NULL OR u.created_at <= p_end_date)
  ORDER BY u.email;
$$;
