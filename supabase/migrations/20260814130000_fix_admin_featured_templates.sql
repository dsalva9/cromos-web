-- Migration: Fix Admin Featured Templates Management
-- Description:
-- 1. Updates admin_list_templates to support native filtering by p_is_featured and p_status = 'featured'
-- 2. Updates admin_toggle_featured_template to assign sequential featured_priority and re-compact on removal
-- 3. Adds admin_reorder_featured_templates for atomic batch reordering
-- 4. Normalizes existing featured templates to sequential 1-indexed ranks preserving existing public order

-- 1. Recreate admin_list_templates with p_is_featured support
DROP FUNCTION IF EXISTS public.admin_list_templates(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_list_templates(text, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.admin_list_templates(text, text, integer, integer, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_list_templates(
    p_status text DEFAULT NULL::text,
    p_query text DEFAULT NULL::text,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 20,
    p_country_code text DEFAULT NULL::text,
    p_is_featured boolean DEFAULT NULL::boolean
)
 RETURNS TABLE(
    id bigint,
    title text,
    status text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone,
    author_id uuid,
    author_nickname text,
    rating_avg numeric,
    rating_count bigint,
    copies_count integer,
    is_public boolean,
    is_featured boolean,
    featured_priority integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    PERFORM require_admin();

    v_offset := (p_page - 1) * p_page_size;

    RETURN QUERY
    SELECT
        ct.id,
        ct.title,
        CASE
            WHEN ct.deleted_at IS NOT NULL THEN 'deleted'
            WHEN ct.suspended_at IS NOT NULL THEN 'suspended'
            ELSE 'active'
        END AS status,
        ct.deleted_at,
        ct.created_at,
        ct.author_id,
        p.nickname AS author_nickname,
        COALESCE(ct.rating_avg, 0)::DECIMAL AS rating_avg,
        COALESCE(ct.rating_count, 0)::BIGINT AS rating_count,
        (
            SELECT COUNT(*)::INTEGER
            FROM user_template_copies utc
            WHERE utc.template_id = ct.id
        ) AS copies_count,
        ct.is_public,
        ct.is_featured,
        ct.featured_priority
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    WHERE
        (p_status IS NULL OR
         (p_status = 'deleted' AND ct.deleted_at IS NOT NULL) OR
         (p_status = 'suspended' AND ct.suspended_at IS NOT NULL AND ct.deleted_at IS NULL) OR
         (p_status = 'active' AND ct.deleted_at IS NULL AND ct.suspended_at IS NULL) OR
         (p_status = 'featured' AND ct.is_featured = TRUE))
        AND (p_is_featured IS NULL OR ct.is_featured = p_is_featured)
        AND (p_query IS NULL OR ct.title ILIKE '%' || p_query || '%')
        AND (p_country_code IS NULL OR ct.country_code = p_country_code)
    ORDER BY
        CASE WHEN (p_status = 'featured' OR p_is_featured = TRUE) THEN ct.featured_priority END ASC NULLS LAST,
        ct.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset;
END;
$$;

GRANT ALL ON FUNCTION public.admin_list_templates(text, text, integer, integer, text, boolean) TO anon;
GRANT ALL ON FUNCTION public.admin_list_templates(text, text, integer, integer, text, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.admin_list_templates(text, text, integer, integer, text, boolean) TO service_role;

-- 2. Update admin_toggle_featured_template to handle priority assignment
CREATE OR REPLACE FUNCTION public.admin_toggle_featured_template(p_template_id bigint, p_featured boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_max_priority INTEGER;
BEGIN
  PERFORM require_admin();
  
  IF p_featured THEN
    SELECT COALESCE(MAX(featured_priority), 0) INTO v_max_priority
    FROM collection_templates
    WHERE is_featured = TRUE;

    UPDATE collection_templates
    SET
      is_featured = TRUE,
      featured_at = NOW(),
      featured_priority = v_max_priority + 1
    WHERE id = p_template_id;
  ELSE
    UPDATE collection_templates
    SET
      is_featured = FALSE,
      featured_at = NULL,
      featured_priority = 0
    WHERE id = p_template_id;

    -- Re-normalize remaining featured priorities
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY featured_priority ASC, featured_at ASC) as new_priority
      FROM collection_templates
      WHERE is_featured = TRUE
    )
    UPDATE collection_templates ct
    SET featured_priority = n.new_priority
    FROM numbered n
    WHERE ct.id = n.id;
  END IF;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
END;
$$;

GRANT ALL ON FUNCTION public.admin_toggle_featured_template(bigint, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.admin_toggle_featured_template(bigint, boolean) TO service_role;

-- 3. Create admin_reorder_featured_templates for atomic batch reordering
CREATE OR REPLACE FUNCTION public.admin_reorder_featured_templates(p_template_ids bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  i INTEGER;
BEGIN
  PERFORM require_admin();

  IF p_template_ids IS NOT NULL AND array_length(p_template_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_template_ids, 1) LOOP
      UPDATE collection_templates
      SET featured_priority = i
      WHERE id = p_template_ids[i] AND is_featured = TRUE;
    END LOOP;
  END IF;
END;
$$;

GRANT ALL ON FUNCTION public.admin_reorder_featured_templates(bigint[]) TO authenticated;
GRANT ALL ON FUNCTION public.admin_reorder_featured_templates(bigint[]) TO service_role;

-- 4. Normalize existing featured templates, preserving exact public order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY ct.featured_priority ASC NULLS LAST, ct.created_at DESC
  ) as new_priority
  FROM collection_templates ct
  WHERE ct.is_featured = TRUE
)
UPDATE collection_templates ct
SET featured_priority = n.new_priority
FROM numbered n
WHERE ct.id = n.id;
