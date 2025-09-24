-- Enable Row Level Security (RLS) for trade tables

-- Enable RLS on both tables
ALTER TABLE public.trade_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_proposal_items ENABLE ROW LEVEL SECURITY;

--
-- RLS Policies for trade_proposals
--
-- 1. SELECT: Allow users to see proposals they sent or received.
CREATE POLICY "Allow select access to involved users"
ON public.trade_proposals
FOR SELECT
USING (auth.uid() = from_user OR auth.uid() = to_user);

-- 2. DML: Disallow direct modification from clients. All changes must go through RPCs.
CREATE POLICY "Disallow all modification"
ON public.trade_proposals
FOR ALL
USING (false);

--
-- RLS Policies for trade_proposal_items
--
-- 1. SELECT: Allow users to see items belonging to proposals they can see.
CREATE POLICY "Allow select access via parent proposal"
ON public.trade_proposal_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trade_proposals WHERE id = proposal_id
  )
);
