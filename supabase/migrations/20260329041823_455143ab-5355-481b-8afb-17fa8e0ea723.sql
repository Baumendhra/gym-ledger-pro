
-- Remove orphan members with no user_id
DELETE FROM public.members WHERE user_id IS NULL;

-- Drop global unique constraint on phone
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_phone_key;

-- Add composite unique constraint per user
ALTER TABLE public.members ADD CONSTRAINT members_user_phone_unique UNIQUE (user_id, phone);

-- Make user_id NOT NULL
ALTER TABLE public.members ALTER COLUMN user_id SET NOT NULL;
