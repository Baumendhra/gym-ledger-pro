-- Add last_visit_date for fast duplicate-check today
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS last_visit_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_members_last_visit_date
  ON public.members (last_visit_date);

-- History table for full check-in audit
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_member_id ON public.check_ins (member_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_at ON public.check_ins (checked_in_at DESC);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Owners (members.user_id = auth.uid()) can view their members' check-ins
CREATE POLICY "Owners can view check-ins of their members"
  ON public.check_ins
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

-- Owners can insert check-ins for their members
CREATE POLICY "Owners can insert check-ins for their members"
  ON public.check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );
