-- Migration: Replace image_scale with image_config JSONB
-- Supports separate zoom + position for mobile and desktop previews

-- Add image_config JSONB column
ALTER TABLE public.affiliate_links ADD COLUMN IF NOT EXISTS image_config JSONB NOT NULL DEFAULT '{"mobile":{"scale":1,"x":0,"y":0},"desktop":{"scale":1,"x":0,"y":0}}';

-- Migrate existing image_scale data into image_config
UPDATE public.affiliate_links
SET image_config = jsonb_build_object(
  'mobile', jsonb_build_object('scale', image_scale, 'x', 0, 'y', 0),
  'desktop', jsonb_build_object('scale', image_scale, 'x', 0, 'y', 0)
);

-- Drop old image_scale column
ALTER TABLE public.affiliate_links DROP COLUMN IF EXISTS image_scale;

-- Drop old 9-param RPC overload
DROP FUNCTION IF EXISTS public.admin_upsert_affiliate_link(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, NUMERIC);

-- Recreate upsert RPC with image_config
CREATE OR REPLACE FUNCTION public.admin_upsert_affiliate_link(
  p_id UUID DEFAULT NULL,
  p_placement TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_subtitle TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_destination_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_image_config JSONB DEFAULT '{"mobile":{"scale":1,"x":0,"y":0},"desktop":{"scale":1,"x":0,"y":0}}'
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
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;

    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Affiliate link not found';
    END IF;
  ELSE
    INSERT INTO public.affiliate_links (placement, image_url, title, subtitle, rating, destination_url, is_active, image_config)
    VALUES (p_placement, p_image_url, p_title, p_subtitle, p_rating, p_destination_url, p_is_active, COALESCE(p_image_config, '{"mobile":{"scale":1,"x":0,"y":0},"desktop":{"scale":1,"x":0,"y":0}}'::jsonb))
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;
