-- Recreate haversine_distance with math safety guards to prevent floating-point errors
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions
AS $$
  SELECT
    6371.0 * 2.0 * asin(
      LEAST(1.0, sqrt(
        GREATEST(0.0,
          pow(sin(radians((lat2 - lat1) / 2.0)), 2)
          + cos(radians(lat1)) * cos(radians(lat2))
            * pow(sin(radians((lon2 - lon1) / 2.0)), 2)
        )
      ))
    );
$$;

COMMENT ON FUNCTION public.haversine_distance IS 'Returns the great-circle distance in kilometers between two latitude/longitude pairs. Math guarded against float overflow/negative sqrt.';
