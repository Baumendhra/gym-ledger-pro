-- Enable public (anonymous) access for check-in kiosk functionality
-- These policies allow gym members to check themselves in without authentication

-- Allow public check-in page to look up members by gym
CREATE POLICY "Public check-in member read"
ON public.members
FOR SELECT
TO anon
USING (true);

-- Allow public check-in page to insert attendance records
CREATE POLICY "Public check-in insert"
ON public.check_ins
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public check-in page to update last_visit_date
CREATE POLICY "Public check-in member update"
ON public.members
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);