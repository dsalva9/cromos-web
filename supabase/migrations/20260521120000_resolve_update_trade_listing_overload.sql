-- Drop the ambiguous 8-parameter overload of update_trade_listing
-- This ensures that only the 9-parameter version (which supports p_thumbnail_url) is used,
-- resolving PostgREST function resolution ambiguity and preventing "Update listing error:" bugs.
DROP FUNCTION IF EXISTS public.update_trade_listing(
  bigint,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric
);
