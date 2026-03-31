ALTER TABLE public.members ADD COLUMN IF NOT EXISTS package_type text DEFAULT 'strengthening';
UPDATE public.members SET package_type = 'strengthening' WHERE package_type IS NULL;
ALTER TABLE public.members ADD CONSTRAINT package_type_check CHECK (package_type IN ('strengthening', 'cardio'));