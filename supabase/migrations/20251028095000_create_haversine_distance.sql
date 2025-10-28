-- Migration: Create haversine_distance helper for location-aware scoring
BEGIN;

CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT
    6371.0 * 2.0 * asin(
      sqrt(
        pow(sin(radians((lat2 - lat1) / 2.0)), 2)
        + cos(radians(lat1)) * cos(radians(lat2))
          * pow(sin(radians((lon2 - lon1) / 2.0)), 2)
      )
    );
$$;

COMMENT ON FUNCTION haversine_distance
  IS 'Returns the great-circle distance in kilometers between two latitude/longitude pairs.';

COMMIT;
