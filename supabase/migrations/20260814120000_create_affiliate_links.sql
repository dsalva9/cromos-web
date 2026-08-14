-- Migration: Create affiliate_links table and supporting infrastructure
-- Centralizes all Amazon affiliate link management into a DB-driven system

-- =============================================================================
-- 1. Create the affiliate_links table
-- =============================================================================
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement TEXT NOT NULL CHECK (placement IN ('banner', 'card_1', 'card_2', 'email')),
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  destination_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment
COMMENT ON TABLE public.affiliate_links IS 'Manages affiliate product links displayed in marketplace (banner, cards) and emails';

-- =============================================================================
-- 2. Partial unique index: only one active row per fixed placement
-- =============================================================================
CREATE UNIQUE INDEX uq_affiliate_active_placement
  ON public.affiliate_links (placement)
  WHERE is_active = true AND placement != 'email';

-- =============================================================================
-- 3. Enable RLS
-- =============================================================================
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- Public read access (marketplace components + edge functions need to read)
CREATE POLICY "Anyone can read affiliate links"
  ON public.affiliate_links
  FOR SELECT
  USING (true);

-- Admin-only write access
CREATE POLICY "Admins can insert affiliate links"
  ON public.affiliate_links
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update affiliate links"
  ON public.affiliate_links
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete affiliate links"
  ON public.affiliate_links
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- 4. RPC: Get random active email affiliate (for edge functions)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_random_email_affiliate()
RETURNS SETOF public.affiliate_links
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM public.affiliate_links
  WHERE placement = 'email' AND is_active = true
  ORDER BY random()
  LIMIT 1;
$$;

-- =============================================================================
-- 5. RPC: List all affiliate links (admin)
-- =============================================================================
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

-- =============================================================================
-- 6. RPC: Upsert affiliate link (admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_upsert_affiliate_link(
  p_id UUID DEFAULT NULL,
  p_placement TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_subtitle TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_destination_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
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
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;

    IF v_result_id IS NULL THEN
      RAISE EXCEPTION 'Affiliate link not found';
    END IF;
  ELSE
    -- Insert new
    INSERT INTO public.affiliate_links (placement, image_url, title, subtitle, rating, destination_url, is_active)
    VALUES (p_placement, p_image_url, p_title, p_subtitle, p_rating, p_destination_url, p_is_active)
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

-- =============================================================================
-- 7. RPC: Delete affiliate link (admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_affiliate_link(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.affiliate_links WHERE id = p_id;
END;
$$;

-- =============================================================================
-- 8. Storage bucket for affiliate images
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'affiliate-images',
  'affiliate-images',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for affiliate images
CREATE POLICY "Public read access for affiliate images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'affiliate-images');

-- Admin upload access for affiliate images
CREATE POLICY "Admins can upload affiliate images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'affiliate-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin update access for affiliate images
CREATE POLICY "Admins can update affiliate images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'affiliate-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin delete access for affiliate images
CREATE POLICY "Admins can delete affiliate images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'affiliate-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- 9. Seed initial data from current hardcoded values
-- =============================================================================
INSERT INTO public.affiliate_links (placement, image_url, title, subtitle, rating, destination_url, is_active)
VALUES
  ('banner', '/assets/amazon_images/book.jpg', 'Panini Copa Mundial Colecciones 1970-2026', 'Libro de colecciones oficiales de la Copa del Mundo de Panini', 4.8, 'https://amzn.to/3QNkf7q', true),
  ('card_1', '/assets/amazon_images/cubo.png', 'Panini - FIFA WC 2026 Cromos Caja 50 sobres', 'Caja oficial de 50 sobres para empezar tu colección', 4.4, 'https://amzn.to/4fll9SB', true),
  ('card_2', '/assets/amazon_images/album.png', 'Panini - FIFA WC 2026 Álbum', 'Álbum oficial de coleccionista para guardar tus cromos de la Copa Mundial 2026', 3.4, 'https://amzn.to/4vnjMr9', true);
