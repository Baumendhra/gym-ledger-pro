ALTER TABLE public.members
ADD COLUMN membership_type text DEFAULT 'Regular';

ALTER TABLE public.members
ADD CONSTRAINT members_membership_type_check
CHECK (membership_type IN ('Regular', 'Premium', 'Sessions'));
