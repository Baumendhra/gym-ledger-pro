-- Create checkins table to log member check-ins
CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/unauthenticated inserts (members checking in via QR)
CREATE POLICY "Allow public checkin inserts"
  ON public.checkins
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading checkins (for duplicate detection within same day)
CREATE POLICY "Allow public checkin reads"
  ON public.checkins
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated (gym owners) to read members without auth filter
-- so the check-in page can look up members by name only (no user_id filter)
CREATE POLICY "Allow anon to read members for checkin"
  ON public.members
  FOR SELECT
  TO anon
  USING (true);
