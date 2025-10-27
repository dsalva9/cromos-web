-- Drop all existing versions of the get_template_rating_summary function
DROP FUNCTION IF EXISTS get_template_rating_summary(INTEGER);
DROP FUNCTION IF EXISTS get_template_rating_summary(BIGINT);

-- Create the function with correct parameter and return types matching the table schema
-- The template_ratings.template_id column is BIGINT, so we use BIGINT throughout
CREATE OR REPLACE FUNCTION get_template_rating_summary(p_template_id BIGINT)
RETURNS TABLE (
  template_id BIGINT,
  average_rating NUMERIC,
  total_ratings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.template_id,
    ROUND(AVG(tr.rating)::NUMERIC, 2) AS average_rating,
    COUNT(tr.id) AS total_ratings
  FROM template_ratings tr
  WHERE tr.template_id = p_template_id
  GROUP BY tr.template_id;
END;
$$ LANGUAGE plpgsql STABLE;
