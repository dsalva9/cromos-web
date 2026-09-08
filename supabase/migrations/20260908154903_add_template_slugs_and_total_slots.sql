-- Add slug column to collection_templates for SEO-friendly URLs
-- Backfill existing public templates and create auto-generation trigger

-- 1. Add slug column
ALTER TABLE public.collection_templates
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Create unique index on slug (only for non-deleted templates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_templates_slug_unique
  ON public.collection_templates (slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;

-- 3. Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_collection_templates_slug_lookup
  ON public.collection_templates (slug)
  WHERE slug IS NOT NULL;

-- 4. Create slug generator function
CREATE OR REPLACE FUNCTION public.generate_template_slug(p_title TEXT, p_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_base_slug TEXT;
  v_exists BOOLEAN;
BEGIN
  v_base_slug := p_title;
  v_base_slug := translate(v_base_slug,
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÑñÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'
  );
  v_base_slug := lower(v_base_slug);
  v_base_slug := regexp_replace(v_base_slug, '[^a-z0-9-]+', '-', 'g');
  v_base_slug := trim(BOTH '-' FROM v_base_slug);
  v_base_slug := regexp_replace(v_base_slug, '-{2,}', '-', 'g');
  v_base_slug := left(v_base_slug, 80);
  v_base_slug := trim(TRAILING '-' FROM v_base_slug);

  v_slug := v_base_slug;

  SELECT EXISTS(
    SELECT 1 FROM public.collection_templates
    WHERE slug = v_slug AND deleted_at IS NULL AND id != p_id
  ) INTO v_exists;

  IF v_exists THEN
    v_slug := v_base_slug || '-' || p_id::TEXT;
  END IF;

  RETURN v_slug;
END;
$$;

-- 5. Backfill slugs for existing public templates
UPDATE public.collection_templates
SET slug = public.generate_template_slug(title, id)
WHERE is_public = TRUE AND deleted_at IS NULL AND slug IS NULL;

-- 6. Create trigger to auto-generate slug when template becomes public
CREATE OR REPLACE FUNCTION public.auto_generate_template_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_public = TRUE AND NEW.slug IS NULL THEN
    NEW.slug := public.generate_template_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_template_slug ON public.collection_templates;
CREATE TRIGGER trg_auto_generate_template_slug
  BEFORE INSERT OR UPDATE OF is_public ON public.collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_template_slug();

-- 7. Update list_public_templates RPC (4-param version) to include slug and total_slots
DROP FUNCTION IF EXISTS public.list_public_templates(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.list_public_templates(
    p_search text DEFAULT NULL,
    p_sort_by text DEFAULT 'recent',
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id bigint,
    author_id uuid,
    author_nickname text,
    title text,
    description text,
    image_url text,
    rating_avg numeric,
    rating_count integer,
    copies_count integer,
    pages_count bigint,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_featured boolean,
    slug text,
    total_slots bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    );

    RETURN QUERY
    SELECT
        ct.id,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.title,
        ct.description,
        ct.image_url,
        ct.rating_avg,
        ct.rating_count,
        ct.copies_count,
        COALESCE(page_counts.page_count, 0) AS pages_count,
        ct.created_at,
        ct.deleted_at,
        ct.is_featured,
        ct.slug,
        COALESCE(slot_counts.total_count, 0) AS total_slots
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS page_count
        FROM template_pages
        GROUP BY template_id
    ) page_counts ON ct.id = page_counts.template_id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS total_count
        FROM template_slots
        GROUP BY template_id
    ) slot_counts ON ct.id = slot_counts.template_id
    WHERE ct.is_public = TRUE
    AND (v_is_admin OR ct.deleted_at IS NULL)
    AND (
        p_search IS NULL
        OR
        (
            ct.title ILIKE '%' || p_search || '%' OR
            COALESCE(ct.description, '') ILIKE '%' || p_search || '%'
        )
    )
    ORDER BY
        ct.is_featured DESC,
        ct.featured_priority ASC NULLS LAST,
        CASE WHEN p_sort_by = 'recent' THEN ct.created_at END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rating' THEN ct.rating_avg END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rating' THEN ct.rating_count END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'popular' THEN ct.copies_count END DESC NULLS LAST,
        ct.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer) TO anon;
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer) TO service_role;

-- 8. Update list_public_templates RPC (5-param version with country_code)
DROP FUNCTION IF EXISTS public.list_public_templates(text, text, integer, integer, text);

CREATE OR REPLACE FUNCTION public.list_public_templates(
    p_search text DEFAULT NULL,
    p_sort_by text DEFAULT 'recent',
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0,
    p_country_code text DEFAULT NULL
)
RETURNS TABLE(
    id bigint,
    author_id uuid,
    author_nickname text,
    title text,
    description text,
    image_url text,
    rating_avg numeric,
    rating_count integer,
    copies_count integer,
    pages_count bigint,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_featured boolean,
    country_code text,
    slug text,
    total_slots bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    );

    RETURN QUERY
    SELECT
        ct.id,
        ct.author_id,
        p.nickname AS author_nickname,
        ct.title,
        ct.description,
        ct.image_url,
        ct.rating_avg,
        ct.rating_count,
        ct.copies_count,
        COALESCE(page_counts.page_count, 0) AS pages_count,
        ct.created_at,
        ct.deleted_at,
        ct.is_featured,
        ct.country_code,
        ct.slug,
        COALESCE(slot_counts.total_count, 0) AS total_slots
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS page_count
        FROM template_pages
        GROUP BY template_id
    ) page_counts ON ct.id = page_counts.template_id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS total_count
        FROM template_slots
        GROUP BY template_id
    ) slot_counts ON ct.id = slot_counts.template_id
    WHERE ct.is_public = TRUE
    AND (v_is_admin OR ct.deleted_at IS NULL)
    AND (
        p_search IS NULL
        OR
        (
            ct.title ILIKE '%' || p_search || '%' OR
            COALESCE(ct.description, '') ILIKE '%' || p_search || '%'
        )
    )
    ORDER BY
        ct.is_featured DESC,
        ct.featured_priority ASC NULLS LAST,
        CASE WHEN p_country_code IS NOT NULL AND ct.country_code = p_country_code THEN 0 ELSE 1 END ASC,
        CASE WHEN p_sort_by = 'recent' THEN ct.created_at END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rating' THEN ct.rating_avg END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'rating' THEN ct.rating_count END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'popular' THEN ct.copies_count END DESC NULLS LAST,
        ct.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer, text) TO anon;
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer, text) TO service_role;

-- 9. Create slug-to-id lookup function
CREATE OR REPLACE FUNCTION public.resolve_template_slug(p_slug TEXT)
RETURNS TABLE(template_id BIGINT, template_slug TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id AS template_id, slug AS template_slug
  FROM collection_templates
  WHERE slug = p_slug AND is_public = TRUE AND deleted_at IS NULL
  LIMIT 1;
$$;

GRANT ALL ON FUNCTION public.resolve_template_slug(text) TO anon;
GRANT ALL ON FUNCTION public.resolve_template_slug(text) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_template_slug(text) TO service_role;

-- 10. Create id-to-slug lookup function
CREATE OR REPLACE FUNCTION public.resolve_template_id(p_id BIGINT)
RETURNS TABLE(template_slug TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT slug AS template_slug
  FROM collection_templates
  WHERE id = p_id AND is_public = TRUE AND deleted_at IS NULL AND slug IS NOT NULL
  LIMIT 1;
$$;

GRANT ALL ON FUNCTION public.resolve_template_id(bigint) TO anon;
GRANT ALL ON FUNCTION public.resolve_template_id(bigint) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_template_id(bigint) TO service_role;
