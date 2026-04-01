ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS membership_plan text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS package_type text;

UPDATE public.payments p
SET membership_plan = m.membership_plan,
    package_type = m.package_type
FROM public.members m
WHERE p.member_id = m.id
AND (p.membership_plan IS NULL OR p.package_type IS NULL);