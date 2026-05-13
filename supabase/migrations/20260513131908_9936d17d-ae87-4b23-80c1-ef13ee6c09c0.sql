-- 1. Drop check_ins table (attendance tracked via members.last_visit_date)
DROP TABLE IF EXISTS public.check_ins CASCADE;

-- 2. Add notes column to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add index on members.last_visit_date
CREATE INDEX IF NOT EXISTS idx_members_last_visit_date ON public.members(last_visit_date);

-- 4. Cleanup old notification_logs (>30 days)
DELETE FROM public.notification_logs WHERE sent_at < now() - INTERVAL '30 days';