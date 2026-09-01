-- Migration: 20260901133000_increment_listing_views.sql
-- Description: Secure RPC function to increment trade_listing views count for both authenticated and anonymous visitors.

CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE trade_listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_listing_id
    AND status = 'active'
    AND deleted_at IS NULL;
END;
$$;

-- Grant execution permissions to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.increment_listing_views(bigint) TO anon, authenticated, service_role;
