-- Migration: Add image_scale column to affiliate_links
-- Allows admins to zoom in/out the product image for better visual framing

-- Drop old 8-param overload to avoid function ambiguity
DROP FUNCTION IF EXISTS public.admin_upsert_affiliate_link(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN);

ALTER TABLE public.affiliate_links ADD COLUMN IF NOT EXISTS image_scale NUMERIC(3,2) NOT NULL DEFAULT 1.0;

-- Update the upsert RPC to include image_scale
CREATE OR REPLACE FUNCTION public.admin_upsert_affiliate_link(
  p_id UUID DEFAULT NULL,
  p_placement TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_subtitle TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_destination_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_image_scale NUMERIC DEFAULT 1.0
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.affiliate_links
    SET
      image_url = COALESCE(p_image_url, image_url),
      title = COALESCE(p_title, title),
      subtitle = COALESCE(p_subtitle, subtitle),
      rating = COALESCE(p_rating, rating),
      destination_url = COALESCE(p_destination_url, destination_url),
      is_active = COALESCE(p_is_active, is_active),
      image_scale = COALESCE(p_image_scale, image_scale),
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;

    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Affiliate link not found';
    END IF;
  ELSE
    -- Insert new
    INSERT INTO public.affiliate_links (placement, image_url, title, subtitle, rating, destination_url, is_active, image_scale)
    VALUES (p_placement, p_image_url, p_title, p_subtitle, p_rating, p_destination_url, p_is_active, COALESCE(p_image_scale, 1.0))
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;
