-- Enforce mandatory nickname/postcode and case-insensitive uniqueness
BEGIN;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_nickname_present
  CHECK (
    trim(coalesce(nickname, '')) <> ''
    AND lower(trim(nickname)) <> 'sin nombre'
  ) NOT VALID;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_postcode_present
  CHECK (trim(coalesce(postcode, '')) <> '') NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname_ci
ON profiles ((lower(trim(nickname))))
WHERE trim(coalesce(nickname, '')) <> ''
  AND lower(trim(nickname)) <> 'sin nombre';

COMMIT;
