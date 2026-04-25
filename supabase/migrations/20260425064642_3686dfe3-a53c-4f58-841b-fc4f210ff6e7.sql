ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public check-in insert" ON public.check_ins;
DROP POLICY IF EXISTS "Allow public check-in insert" ON public.check_ins;
DROP POLICY IF EXISTS "Allow read checkins" ON public.check_ins;

CREATE POLICY "Allow public check-in insert"
ON public.check_ins
FOR INSERT
TO anon
WITH CHECK (member_id IS NOT NULL);

CREATE POLICY "Allow read checkins"
ON public.check_ins
FOR SELECT
TO anon
USING (true);