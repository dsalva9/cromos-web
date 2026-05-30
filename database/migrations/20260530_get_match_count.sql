-- Get match conversation count for a user
CREATE OR REPLACE FUNCTION get_match_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM match_conversations
  WHERE user_a_id = p_user_id OR user_b_id = p_user_id;
$$;

COMMENT ON FUNCTION get_match_count IS 'Returns the number of match conversations for a user.';
GRANT EXECUTE ON FUNCTION get_match_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_count(uuid) TO anon;

NOTIFY pgrst, 'reload schema';
