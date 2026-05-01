-- Fix type mismatch in list_public_templates:
-- rating_count and copies_count were declared as bigint in the RETURNS TABLE
-- but the actual collection_templates columns are integer, causing error 42804:
-- "Returned type integer does not match expected type bigint in column 8"

-- Drop the existing function (required because RETURNS TABLE signature changed)
DROP FUNCTION IF EXISTS public.list_public_templates(text, text, integer, integer);

-- Recreate with correct types: rating_count INTEGER, copies_count INTEGER
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
    is_featured boolean
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
        ct.is_featured
    FROM collection_templates ct
    JOIN profiles p ON ct.author_id = p.id
    LEFT JOIN (
        SELECT template_id, COUNT(*) AS page_count
        FROM template_pages
        GROUP BY template_id
    ) page_counts ON ct.id = page_counts.template_id
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

-- Restore permissions
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer) TO anon;
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.list_public_templates(text, text, integer, integer) TO service_role;

COMMENT ON FUNCTION public.list_public_templates(text, text, integer, integer)
IS 'Lists public templates (hides deleted from non-admins). Featured templates sorted first.';
