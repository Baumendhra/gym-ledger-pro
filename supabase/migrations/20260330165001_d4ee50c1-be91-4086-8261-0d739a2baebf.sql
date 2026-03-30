ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_plan text NOT NULL DEFAULT 'monthly';
UPDATE public.members SET membership_plan = 'monthly' WHERE membership_plan IS NULL;