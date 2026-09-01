-- Migration: 20260901113400_find_missing_slot_by_search.sql
-- Description: New RPC to find if the current user has a missing slot
-- whose label matches a search string. Used to show the "Usuarios con repe"
-- banner when searching directly in the marketplace without URL params.

CREATE OR REPLACE FUNCTION public.find_missing_slot_by_search(p_search text)
RETURNS TABLE (
  slot_id bigint,
  copy_id bigint,
  template_id bigint,
  label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_search IS NULL OR length(trim(p_search)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ts.id AS slot_id,
    utc.id AS copy_id,
    utc.template_id,
    ts.label
  FROM user_template_copies utc
  JOIN template_slots ts ON ts.template_id = COALESCE(utc.template_id, utc.original_template_id)
  LEFT JOIN user_template_progress utp ON utp.slot_id = ts.id AND utp.copy_id = utc.id
  WHERE utc.user_id = v_user_id
    AND (utp.slot_id IS NULL OR utp.status = 'missing')
    AND ts.label ILIKE '%' || trim(p_search) || '%'
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_missing_slot_by_search(text) TO authenticated;
