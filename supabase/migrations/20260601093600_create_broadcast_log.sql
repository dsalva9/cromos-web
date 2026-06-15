-- Create broadcast_log table to log email broadcasts sent by admins
CREATE TABLE IF NOT EXISTS public.broadcast_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_broadcast_id text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  error_details text,
  recipient_count integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.broadcast_log ENABLE ROW LEVEL SECURITY;

-- Create placeholder policies to be updated by the next migration (20260601093700)
CREATE POLICY "Admins can insert broadcast_log" ON public.broadcast_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read broadcast_log" ON public.broadcast_log
  FOR SELECT TO authenticated
  USING (true);
