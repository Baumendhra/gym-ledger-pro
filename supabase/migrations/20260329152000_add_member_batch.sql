ALTER TABLE public.members
ADD COLUMN batch text NOT NULL DEFAULT 'Morning';

ALTER TABLE public.members
ADD CONSTRAINT members_batch_check
CHECK (batch IN ('Morning', 'Evening'));
