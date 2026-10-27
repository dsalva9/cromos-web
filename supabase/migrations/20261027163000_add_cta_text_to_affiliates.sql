-- Migration: Add customizable cta_text column to affiliate_links
-- Allows configuring the CTA button text (e.g., "¿Te faltan cromos?") per affiliate from the Admin console

-- 1. Add cta_text column to affiliate_links
ALTER TABLE public.affiliate_links
ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT NULL;

-- 2. Refresh SQL functions returning SETOF public.affiliate_links
CREATE OR REPLACE FUNCTION public.get_random_email_affiliate()
RETURNS SETOF public.affiliate_links
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.affiliate_links
  WHERE placement = 'email' AND is_active = true
  ORDER BY random()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_affiliate_links()
RETURNS SETOF public.affiliate_links
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.affiliate_links
  ORDER BY
    CASE placement
      WHEN 'banner' THEN 1
      WHEN 'card_1' THEN 2
      WHEN 'card_2' THEN 3
      WHEN 'email' THEN 4
    END,
    created_at DESC;
$$;

-- 3. Drop old 9-param RPC overload and recreate with p_cta_text
DROP FUNCTION IF EXISTS public.admin_upsert_affiliate_link(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, JSONB);

CREATE OR REPLACE FUNCTION public.admin_upsert_affiliate_link(
  p_id UUID DEFAULT NULL,
  p_placement TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_subtitle TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_destination_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_image_config JSONB DEFAULT '{"mobile":{"scale":1,"x":0,"y":0},"desktop":{"scale":1,"x":0,"y":0}}',
  p_cta_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.affiliate_links
    SET
      image_url = COALESCE(p_image_url, image_url),
      title = COALESCE(p_title, title),
      subtitle = COALESCE(p_subtitle, subtitle),
      rating = COALESCE(p_rating, rating),
      destination_url = COALESCE(p_destination_url, destination_url),
      is_active = COALESCE(p_is_active, is_active),
      image_config = COALESCE(p_image_config, image_config),
      cta_text = NULLIF(TRIM(p_cta_text), ''),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;

    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Affiliate link not found';
    END IF;
  ELSE
    INSERT INTO public.affiliate_links (
      placement,
      image_url,
      title,
      subtitle,
      rating,
      destination_url,
      is_active,
      image_config,
      cta_text
    )
    VALUES (
      p_placement,
      p_image_url,
      p_title,
      p_subtitle,
      p_rating,
      p_destination_url,
      p_is_active,
      COALESCE(p_image_config, '{"mobile":{"scale":1,"x":0,"y":0},"desktop":{"scale":1,"x":0,"y":0}}'::jsonb),
      NULLIF(TRIM(p_cta_text), '')
    )
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;
