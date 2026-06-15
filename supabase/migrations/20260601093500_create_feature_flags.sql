-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id TEXT PRIMARY KEY,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage flags"
  ON public.feature_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Create user_feature_overrides table
CREATE TABLE IF NOT EXISTS public.user_feature_overrides (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_id TEXT REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, flag_id)
);

ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own overrides"
  ON public.user_feature_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage overrides"
  ON public.user_feature_overrides FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Create check_feature_flag function
CREATE OR REPLACE FUNCTION public.check_feature_flag(p_flag_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- First: check per-user override
    (SELECT enabled FROM public.user_feature_overrides
     WHERE user_id = auth.uid() AND flag_id = p_flag_id),
    -- Fallback: global flag value
    (SELECT enabled FROM public.feature_flags WHERE id = p_flag_id),
    -- Default: disabled
    false
  );
$$;

-- Create get_all_feature_flags function
CREATE OR REPLACE FUNCTION public.get_all_feature_flags()
RETURNS TABLE (
  id TEXT,
  description TEXT,
  enabled BOOLEAN,
  override_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    ff.id,
    ff.description,
    ff.enabled,
    (SELECT count(*) FROM public.user_feature_overrides WHERE flag_id = ff.id) AS override_count,
    ff.created_at,
    ff.updated_at
  FROM public.feature_flags ff
  ORDER BY ff.created_at;
$$;

-- Seed initial flags
INSERT INTO public.feature_flags (id, description, enabled) VALUES
  ('multi_country', 'Enable multi-country features (country picker, scoped content)', false),
  ('i18n', 'Enable internationalization (language selector, translated UI)', false)
ON CONFLICT (id) DO NOTHING;
