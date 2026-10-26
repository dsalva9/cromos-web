-- Migration: Fix admin email bounce suppression and deleted user nickname index
-- 1. Remove false-positive bounce suppression entries for admin forwarding addresses
--    (caused by Gmail rejecting forwarded inbound spam/phishing emails)
-- 2. Exclude tombstoned users ('usuario eliminado' / deleted_at IS NOT NULL) from
--    idx_profiles_nickname_ci so process_retention_schedule() can tombstone multiple users.

DELETE FROM public.email_bounces
WHERE lower(email) IN (
  SELECT lower(email) FROM public.email_forwarding_addresses
);

DROP INDEX IF EXISTS public.idx_profiles_nickname_ci;

CREATE UNIQUE INDEX idx_profiles_nickname_ci
  ON public.profiles USING btree (lower(TRIM(BOTH FROM nickname)))
  WHERE TRIM(BOTH FROM COALESCE(nickname, ''::text)) <> ''::text
    AND lower(TRIM(BOTH FROM nickname)) <> 'sin nombre'::text
    AND lower(TRIM(BOTH FROM nickname)) <> 'usuario eliminado'::text
    AND deleted_at IS NULL;
