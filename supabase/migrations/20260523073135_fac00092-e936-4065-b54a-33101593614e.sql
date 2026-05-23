-- Add profile_image_url to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create storage bucket for member_profiles if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('member_profiles', 'member_profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to member_profiles bucket
CREATE POLICY "Public Access member_profiles" ON storage.objects FOR SELECT USING (bucket_id = 'member_profiles');

-- Allow authenticated users to insert objects in member_profiles
CREATE POLICY "Authenticated Insert member_profiles" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'member_profiles');

-- Allow authenticated users to update objects in member_profiles
CREATE POLICY "Authenticated Update member_profiles" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'member_profiles');

-- Allow authenticated users to delete objects in member_profiles
CREATE POLICY "Authenticated Delete member_profiles" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'member_profiles');